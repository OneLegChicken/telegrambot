// Delivery engine — turns a paid order into a delivered product.
// VPN → PanelAdapter (config + QR), stock → inventory code, service → custom text.
import QRCode from "qrcode";
import { InputFile } from "grammy";
import { api, money, faDate } from "./api.js";
import { cfg } from "./config.js";
import { boot } from "./store.js";
import { getAdapter } from "./adapters/index.js";
import { generateUsername, fallbackUsername } from "./username.js";

function find(list, id) { return (list || []).find((x) => x.id === id) || null; }

export async function deliverOrder(bot, chatId, order, extras = {}) {
  const b = await boot(true);
  const product = find(b.products, order.product_id) || extras.product;
  const plan = find(b.plans, order.plan_id) || extras.plan;
  const tg = extras.tg || {};
  if (!product) throw new Error("محصول یافت نشد");

  let text;
  if (product.type === "vpn") {
    text = await deliverVpn(bot, chatId, order, product, plan, tg, b, extras);
  } else if (product.type === "stock") {
    text = await deliverStock(bot, chatId, order, product);
  } else {
    text = `✅ خرید شما ثبت شد!\n\n📦 ${product.name}\n${product.description || ""}`;
    await api("order/update", { id: order.id, patch: { status: "delivered", delivery: text.slice(0, 900) } });
    await bot.api.sendMessage(chatId, text);
  }
  return text;
}

async function deliverVpn(bot, chatId, order, product, plan, tg, b, extras) {
  const panel = find(b.panels, product.panel_id);
  if (!panel) throw new Error("پنل این محصول پیکربندی نشده است");
  const adapter = getAdapter(panel);
  if (!adapter) throw new Error("آداپتر این نوع پنل پشتیبانی نمی‌شود");

  // Tمدید (extend) an existing service
  if (order.kind === "extend" && order.service_id) {
    const service = await api("services/get", { id: order.service_id });
    if (!service) throw new Error("سرویس موردنظر یافت نشد");
    const res = await adapter.extendSub(panel, {
      username: service.panel_username,
      addDays: plan?.duration_days || 0,
      addGb: plan?.volume_gb || 0,
    });
    const newExpire = res.expireDate || (plan?.duration_days
      ? new Date(Math.max(Date.now(), service.expire_date ? new Date(service.expire_date).getTime() : Date.now()) + plan.duration_days * 86400000).toISOString()
      : service.expire_date);
    await api("service/update", { id: service.id, patch: { expire_date: newExpire || "", plan_title: plan?.title || service.plan_title, volume_gb: (Number(service.volume_gb) || 0) + (plan?.volume_gb || 0) } });
    const text = `✅ تمدید با موفقیت انجام شد!\n\n🖥 ${service.product_name}\n👤 ${service.panel_username}\n📅 انقضای جدید: ${faDate(newExpire)}\n🔗 کانفیگ:\n${service.config_url}`;
    await api("order/update", { id: order.id, patch: { status: "delivered", delivery: text.slice(0, 900) } });
    await bot.api.sendMessage(chatId, text);
    return text;
  }

  // خرید جدید (new subscription)
  let username = extras.username || (await generateUsername(panel, tg));
  if (!username) username = extras.chosenUsername || fallbackUsername();

  let sub;
  try {
    sub = await adapter.createSub(panel, { username, volumeGb: plan?.volume_gb || 0, durationDays: plan?.duration_days || 0 });
  } catch (e) {
    // collision handling: a random number is appended if the name already exists
    if (/exist|duplicate|already|occupied|تکراری/i.test(String(e?.message || e))) {
      username = `${username}${Math.floor(Math.random() * 900 + 100)}`;
      sub = await adapter.createSub(panel, { username, volumeGb: plan?.volume_gb || 0, durationDays: plan?.duration_days || 0 });
    } else throw e;
  }

  const expire = plan?.duration_days ? new Date(Date.now() + plan.duration_days * 86400000).toISOString() : "";
  await api("service/create", {
    telegram_id: order.telegram_id, product_id: product.id, panel_id: panel.id, panel_type: panel.type,
    panel_username: sub.username || username, product_name: product.name, plan_title: plan?.title || "",
    volume_gb: plan?.volume_gb || 0, duration_days: plan?.duration_days || 0,
    config_url: sub.configUrl || "", subscription_url: sub.subscriptionUrl || "", expire_date: expire,
  });

  const text = [
    "✅ خرید شما با موفقیت انجام شد!",
    "",
    `🖥 ${product.name}${plan ? ` — ${plan.title}` : ""}`,
    `👤 نام کاربری: ${sub.username || username}`,
    `📅 انقضا: ${expire ? faDate(expire) : "نامحدود"}`,
    "",
    `🔗 کانفیگ:`,
    sub.configUrl || "—",
    sub.subscriptionUrl ? `\n📡 لینک اشتراک:\n${sub.subscriptionUrl}` : "",
  ].join("\n");

  await api("order/update", { id: order.id, patch: { status: "delivered", delivery: text.slice(0, 900) } });
  await bot.api.sendMessage(chatId, text);
  if (sub.subscriptionUrl) {
    try {
      const qr = await QRCode.toBuffer(sub.subscriptionUrl, { width: 512 });
      await bot.api.sendPhoto(chatId, new InputFile(qr, "subscription.png"), { caption: "📡 لینک اشتراک را در اپلیکیشن اسکن کنید" });
    } catch { /* QR is best-effort */ }
  }
  return text;
}

async function deliverStock(bot, chatId, order, product) {
  const item = await api("stock/sell", { product_id: product.id, order_id: order.id });
  let text;
  if (!item) {
    text = "❌ موجودی این محصول تمام شده است — مبلغ پرداختی به کیف پول شما بازگردانده می‌شود.";
    await api("wallet/adjust", { telegram_id: order.telegram_id, delta: Number(order.amount), type: "refund", note: `بازگشت وجه — موجودی ${product.name} تمام شد`, notified: false });
    await api("order/update", { id: order.id, patch: { status: "failed", delivery: text.slice(0, 900) } });
  } else {
    text = `✅ خرید شما با موفقیت انجام شد!\n\n📦 ${product.name}\n🔑 کد شما:\n${item.code}`;
    await api("order/update", { id: order.id, patch: { status: "delivered", delivery: text.slice(0, 900) } });
  }
  await bot.api.sendMessage(chatId, text);

  // low-stock alert to admins
  try {
    const cnt = await api("stock/count", { product_id: product.id }).catch(() => null);
    if (cnt && cnt.available <= (Number(product.low_stock_threshold) || 0)) {
      for (const adminId of cfg.adminIds) {
        await bot.api.sendMessage(adminId, `⚠️ موجودی محصول «${product.name}» کم است (${cnt.available} عدد باقی مانده).`).catch(() => {});
      }
    }
  } catch { /* alert is best-effort */ }
  return text;
}