// Shop: catalog browsing + purchase + payment. Registered callbacks are shared with wallet/extend flows.
import { InlineKeyboard } from "grammy";
import { api, money, faNum } from "../api.js";
import { boot, feat, setting } from "../store.js";
import { setState, getState, clearState, patchState } from "../state.js";
import { deliverOrder } from "../deliver.js";
import { requestPayment, gatewayEnabled } from "../payments/zarinpal.js";
import { cfg } from "../config.js";
import { makeT } from "../i18n.js";

const planPrice = (settings, plan) => {
  const pct = Number(setting(settings, "discount.percent", "0")) || 0;
  const price = Number(plan.price) || 0;
  return pct > 0 && pct < 100 ? Math.round(price * (1 - pct / 100)) : price;
};

export async function shopEntry(ctx) {
  const b = await boot();
  const t = makeT(setting(b.settings, "bot.language", "fa"));
  if (!feat(b.settings, "shop")) return ctx.reply("🚫 فروشگاه موقتاً غیرفعال است.");
  if (setting(b.settings, "texts.outage", "") && feat(b.settings, "outage_notice")) {
    await ctx.reply(`📢 ${setting(b.settings, "texts.outage")}`);
  }
  const cats = (b.categories || []).filter((c) => c.active !== false);
  if (feat(b.settings, "categories") && cats.length) {
    const ik = new InlineKeyboard();
    cats.forEach((c) => ik.text(`${c.icon || "🗂"} ${c.name}`, `cat:${c.id}`).row());
    await ctx.reply(t("choose"), { reply_markup: ik });
  } else {
    await showProductList(ctx, null);
  }
}

async function showProductList(ctx, categoryId) {
  const b = await boot();
  const products = (b.products || []).filter((p) => p.active !== false && (!categoryId || p.category_id === categoryId));
  if (!products.length) return ctx.reply("❌ فعلاً محصولی در این بخش نیست.");
  const ik = new InlineKeyboard();
  products.forEach((p) => ik.text(`📦 ${p.name}`, `prod:${p.id}`).row());
  if (categoryId) ik.text("⏪ بازگشت", "shop:cats");
  await ctx.reply("🖥 لیست محصولات:\nیکی را انتخاب کنید 👇", { reply_markup: ik });
}

async function showProduct(ctx, productId) {
  const b = await boot();
  const product = (b.products || []).find((p) => p.id === productId);
  if (!product) return ctx.reply("❌ محصول یافت نشد.");
  const plans = (b.plans || []).filter((p) => p.product_id === productId).sort((a, x) => (a.position || 0) - (x.position || 0));
  let text = `📦 ${product.name}\n`;
  if (product.description) text += `\n${product.description}\n`;
  if (!plans.length) text += "\n❌ برای این محصول پلنی تعریف نشده است.";
  const ik = new InlineKeyboard();
  const showPrice = feat(b.settings, "show_price");
  plans.forEach((pl) => {
    const parts = [];
    if (pl.volume_gb > 0) parts.push(`📊 ${faNum(pl.volume_gb)} گیگ`);
    if (pl.duration_days > 0) parts.push(`⏱ ${faNum(pl.duration_days)} روز`);
    if (showPrice) parts.push(money(planPrice(b.settings, pl)));
    ik.text(`${pl.title}${parts.length ? ` (${parts.join(" | ")})` : ""}`, `plan:${pl.id}`).row();
  });
  ik.text("⏪ بازگشت", `cat:${product.category_id || ""}`);
  await ctx.reply(text, { reply_markup: ik });
}

async function showPlan(ctx, planId) {
  const b = await boot();
  const plan = (b.plans || []).find((p) => p.id === planId);
  const product = plan && (b.products || []).find((p) => p.id === plan.product_id);
  if (!plan || !product) return ctx.reply("❌ پلن یافت نشد.");
  const price = planPrice(b.settings, plan);
  let text = `🛒 خرید: ${product.name}\n📌 ${plan.title}\n`;
  if (plan.volume_gb > 0) text += `📊 حجم: ${faNum(plan.volume_gb)} گیگ\n`;
  if (plan.duration_days > 0) text += `⏱ مدت: ${faNum(plan.duration_days)} روز\n`;
  text += `\n💲 مبلغ: ${money(price)}\n\nروش پرداخت را انتخاب کنید:`;
  const ik = new InlineKeyboard();
  if (gatewayEnabled()) ik.text("🌐 پرداخت آنلاین (درگاه)", `payg:${plan.id}`).row();
  ik.text("💰 پرداخت از کیف پول", `payw:${plan.id}`).row();
  ik.text("⏪ بازگشت", `prod:${product.id}`);
  // customer-chosen username for panels with the custom_choice naming pattern
  const panel = (b.panels || []).find((p) => p.id === product.panel_id);
  if (product.type === "vpn" && panel && panel.naming_pattern === "custom_choice") {
    setState(ctx.chat.id, "buy_username", { planId: plan.id });
    text += `\n\n✍️ برای این سرور، نام کاربری دلخواه می‌گذارید — بعد از پرداخت از شما پرسیده می‌شود.`;
  }
  await ctx.reply(text, { reply_markup: ik });
}

export async function payGateway(ctx, planId) {
  const b = await boot();
  const plan = (b.plans || []).find((p) => p.id === planId);
  const product = plan && (b.products || []).find((p) => p.id === plan.product_id);
  if (!plan || !product) return ctx.reply("❌ پلن یافت نشد.");
  const price = planPrice(b.settings, plan);
  const order = await api("order/create", {
    telegram_id: String(ctx.from.id), buyer_name: ctx.from.first_name || "",
    product_id: product.id, plan_id: plan.id, product_name: product.name, plan_title: plan.title,
    amount: price, method: "gateway", kind: "buy", status: "pending",
  });
  try {
    const callbackUrl = `${setting(b.settings, "bot.base_url", "") || cfg.baseUrl}/pay/callback?orderId=${order.id}`;
    const pay = await requestPayment({ amount: price, description: `${product.name} — ${plan.title}`, callbackUrl });
    await api("order/update", { id: order.id, patch: { authority: pay.authority } });
    const ik = new InlineKeyboard().url("🌐 باز کردن درگاه پرداخت", pay.url).row().text("✅ پرداخت کردم", `paid:${order.id}`);
    await ctx.reply(`🧾 سفارش ثبت شد.\n\n📦 ${product.name} — ${plan.title}\n💲 مبلغ: ${money(price)}\n\nپس از پرداخت، دکمه «✅ پرداخت کردم» را بزنید (باز شدن خودکار صفحه پرداخت هم بررسی می‌شود).`, { reply_markup: ik });
  } catch (e) {
    await api("order/update", { id: order.id, patch: { status: "failed" } });
    await ctx.reply(`❌ ${e.message}`);
  }
}

export async function payWallet(ctx, planId, kind = "buy", serviceId = null, chosenUsername = null) {
  const b = await boot();
  const plan = (b.plans || []).find((p) => p.id === planId);
  const product = plan && (b.products || []).find((p) => p.id === plan.product_id);
  if (!plan || !product) return ctx.reply("❌ پلن یافت نشد.");
  const t = makeT(setting(b.settings, "bot.language", "fa"));
  const user = await api("users/get", { telegram_id: String(ctx.from.id) });
  const price = planPrice(b.settings, plan);
  if (!user || (Number(user.balance) || 0) < price) return ctx.reply(t("wallet_empty"));

  const order = await api("order/create", {
    telegram_id: String(ctx.from.id), buyer_name: ctx.from.first_name || "",
    product_id: product.id, plan_id: plan.id, product_name: product.name, plan_title: plan.title,
    amount: price, method: "wallet", kind, service_id: serviceId || "", status: "paid",
  });
  await api("wallet/adjust", { telegram_id: String(ctx.from.id), delta: -price, type: "purchase", note: `خرید ${product.name} — ${plan.title}` });
  try {
    await deliverOrder(ctx.bot, ctx.chat.id, order, { product, plan, tg: ctx.from, chosenUsername });
  } catch (e) {
    await ctx.reply(`❌ تحویل ناموفق: ${e.message}\nمبلغ به کیف پول شما بازمی‌گردد.`);
    await api("wallet/adjust", { telegram_id: String(ctx.from.id), delta: price, type: "refund", note: "بازگشت وجه — تحویل ناموفق" });
    await api("order/update", { id: order.id, patch: { status: "failed" } });
  }
}

/** Awaiting a customer-chosen username (custom_choice naming pattern). */
export async function handleStateInput(ctx, state) {
  if (state.flow !== "buy_username") return false;
  const username = String(ctx.msg.text || "").trim();
  const t = makeT("fa");
  if (!/^[a-zA-Z0-9_]{3,24}$/.test(username)) {
    await ctx.reply(t("invalid_username"));
    return true;
  }
  const { planId } = state.data;
  clearState(ctx.chat.id);
  await payWallet(ctx, planId, "buy", null, username);
  return true;
}

export function register(bot) {
  bot.callbackQuery(/^shop:cats/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const b = await boot();
    const cats = (b.categories || []).filter((c) => c.active !== false);
    const ik = new InlineKeyboard();
    cats.forEach((c) => ik.text(`${c.icon || "🗂"} ${c.name}`, `cat:${c.id}`).row());
    await ctx.editMessageText("🗂 دسته‌بندی‌ها:\nیکی را انتخاب کنید 👇", { reply_markup: ik });
  });

  bot.callbackQuery(/^cat:/, async (ctx) => {
    await ctx.answerCallbackQuery();
    await showProductList(ctx, ctx.callbackQuery.data.split(":")[1]);
  });

  bot.callbackQuery(/^prod:/, async (ctx) => {
    await ctx.answerCallbackQuery();
    await showProduct(ctx, ctx.callbackQuery.data.split(":")[1]);
  });

  bot.callbackQuery(/^plan:/, async (ctx) => {
    await ctx.answerCallbackQuery();
    await showPlan(ctx, ctx.callbackQuery.data.split(":")[1]);
  });

  bot.callbackQuery(/^payg:/, async (ctx) => {
    await ctx.answerCallbackQuery();
    await payGateway(ctx, ctx.callbackQuery.data.split(":")[1]);
  });

  bot.callbackQuery(/^payw:/, async (ctx) => {
    await ctx.answerCallbackQuery();
    await payWallet(ctx, ctx.callbackQuery.data.split(":")[1]);
  });

  bot.callbackQuery(/^paid:/, async (ctx) => {
    await ctx.answerCallbackQuery({ text: "در حال بررسی پرداخت..." });
    const orderId = ctx.callbackQuery.data.split(":")[1];
    const order = await api("orders/get", { id: orderId });
    if (!order || order.status !== "pending") {
      return ctx.reply(order && order.status === "delivered" ? "✅ این سفارش قبلاً تحویل شده است." : "❌ سفارش یافت نشد.");
    }
    try {
      const v = await verify(order);
      if (v.ok) {
        await api("order/update", { id: orderId, patch: { status: "paid" } });
        await deliverOrder(bot, ctx.chat.id, order);
      } else {
        await ctx.reply("❌ پرداخت هنوز تایید نشده است. چند لحظه بعد دوباره امتحان کنید.");
      }
    } catch (e) {
      await ctx.reply(`❌ ${e.message}`);
    }
  });
}

import { verifyPayment } from "../payments/zarinpal.js";
async function verify(order) {
  return verifyPayment({ authority: order.authority || "", amount: order.amount });
}