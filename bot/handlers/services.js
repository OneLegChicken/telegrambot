// Services: my services, usage/expiry view, extend, re-send config.
import { InlineKeyboard } from "grammy";
import { api, money, faDate, faNum } from "../api.js";
import { boot, feat, setting } from "../store.js";
import { getAdapter } from "../adapters/index.js";
import { deliverOrder } from "../deliver.js";

export async function showServices(ctx) {
  const services = await api("services/list", { telegram_id: String(ctx.from.id) });
  if (!services.length) {
    return ctx.reply("🖥 شما هنوز سرویسی ندارید.\nاز 🏬 فروشگاه خرید کنید 👇", { reply_markup: { keyboard: [[{ text: "🏬 فروشگاه" }], [{ text: "⏪ منوی اصلی" }]], resize_keyboard: true } });
  }
  let text = "🖥 سرویس‌های شما:\n";
  const ik = new InlineKeyboard();
  services.forEach((s, i) => {
    text += `\n${i + 1}. ${s.product_name}${s.plan_title ? ` — ${s.plan_title}` : ""}\n   ⏳ انقضا: ${s.expire_date ? faDate(s.expire_date) : "نامحدود"}\n`;
    ik.text(`${i + 1}. ${s.product_name}`, `svc:${s.id}`).row();
  });
  ik.text("⏪ منوی اصلی", "back:main");
  await ctx.reply(text, { reply_markup: ik });
}

async function showService(ctx, serviceId) {
  const b = await boot();
  const s = await api("services/get", { id: serviceId });
  if (!s) return ctx.reply("❌ سرویس یافت نشد.");
  let text = `🖥 ${s.product_name}${s.plan_title ? ` — ${s.plan_title}` : ""}\n👤 نام کاربری: ${s.panel_username}\n📅 انقضا: ${s.expire_date ? faDate(s.expire_date) : "نامحدود"}\n`;
  const ik = new InlineKeyboard();
  const panel = (b.panels || []).find((p) => p.id === s.panel_id);
  if (panel && s.panel_type) {
    try {
      const adapter = getAdapter(panel);
      const usage = await adapter.getUsage(panel, { username: s.panel_username });
      if (usage.usedGb != null) text += `\n📊 مصرف: ${faNum(usage.usedGb)} از ${usage.totalGb != null ? faNum(usage.totalGb) + " گیگ" : "نامحدود"}`;
    } catch { /* usage is best-effort */ }
  }
  const plans = (b.plans || []).filter((p) => p.product_id === s.product_id);
  if (feat(b.settings, "add_time") || feat(b.settings, "add_volume")) {
    if (plans.length) {
      text += "\n\nبرای تمدید، یک پلن انتخاب کنید 👇";
      plans.forEach((pl) => ik.text(`🔄 ${pl.title} (${money(pl.price)})`, `xw:${s.id}:${pl.id}`).row());
    }
  }
  if (feat(b.settings, "get_config")) ik.text("📄 دریافت کانفیگ", `svccfg:${s.id}`).row();
  ik.text("⏪ بازگشت", "svc:list");
  await ctx.reply(text, { reply_markup: ik });
}

export function register(bot) {
  bot.callbackQuery(/^svc:list/, async (ctx) => {
    await ctx.answerCallbackQuery();
    await showServices(ctx);
  });

  bot.callbackQuery(/^svc:/, async (ctx) => {
    await ctx.answerCallbackQuery();
    await showService(ctx, ctx.callbackQuery.data.split(":")[1]);
  });

  bot.callbackQuery(/^svccfg:/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const s = await api("services/get", { id: ctx.callbackQuery.data.split(":")[1] });
    if (!s) return;
    await ctx.reply(`🔗 کانفیگ:\n${s.config_url || "—"}${s.subscription_url ? `\n\n📡 لینک اشتراک:\n${s.subscription_url}` : ""}`);
  });

  // extend from wallet: xw:{serviceId}:{planId}
  bot.callbackQuery(/^xw:/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const [, serviceId, planId] = ctx.callbackQuery.data.split(":");
    const b = await boot();
    const plan = (b.plans || []).find((p) => p.id === planId);
    const service = await api("services/get", { id: serviceId });
    if (!plan || !service) return ctx.reply("❌ یافت نشد.");
    const user = await api("users/get", { telegram_id: String(ctx.from.id) });
    if (!user || (Number(user.balance) || 0) < Number(plan.price)) {
      return ctx.reply("❌ موجودی کیف پول کافی نیست. از 💰 کیف پول شارژ کنید.");
    }
    const order = await api("order/create", {
      telegram_id: String(ctx.from.id), buyer_name: ctx.from.first_name || "",
      product_id: service.product_id, plan_id: plan.id, product_name: service.product_name, plan_title: plan.title,
      amount: Number(plan.price), method: "wallet", kind: "extend", service_id: service.id, status: "paid",
    });
    await api("wallet/adjust", { telegram_id: String(ctx.from.id), delta: -Number(plan.price), type: "purchase", note: `تمدید ${service.product_name} — ${plan.title}` });
    try {
      await deliverOrder(bot, ctx.chat.id, order, { plan });
    } catch (e) {
      await ctx.reply(`❌ تمدید ناموفق: ${e.message} — مبلغ بازگردانده شد.`);
      await api("wallet/adjust", { telegram_id: String(ctx.from.id), delta: Number(plan.price), type: "refund", note: "بازگشت وجه — تمدید ناموفق" });
    }
  });
}