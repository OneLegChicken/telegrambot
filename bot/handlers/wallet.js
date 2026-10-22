// Wallet: balance, card-to-card top-up receipts, welcome gift.
import { InlineKeyboard } from "grammy";
import { api, money, faNum } from "../api.js";
import { boot, feat, setting } from "../store.js";
import { setState, getState, clearState } from "../state.js";
import { cfg, isAdminId } from "../config.js";
import { makeT } from "../i18n.js";

export async function walletMenu(ctx) {
  const b = await boot();
  const user = await api("users/get", { telegram_id: String(ctx.from.id) });
  let text = `💰 کیف پول\n\n💵 موجودی فعلی: ${money(user?.balance)}\n`;
  text += `\nبرای افزایش موجودی، یکی از مبالغ زیر را انتخاب کنید (یا «💲 مبلغ دلخواه»):`;
  const ik = new InlineKeyboard();
  [100000, 300000, 500000, 1000000].forEach((a) => ik.text(money(a), `top:${a}`).row());
  ik.text("💲 مبلغ دلخواه", "top:custom").row();
  if (feat(b.settings, "welcome_gift") && !user?.phone) ik.text("🎁 دریافت هدیه (احراز شماره)", "gift:phone").row();
  ik.text("⏪ منوی اصلی", "back:main");
  await ctx.reply(text, { reply_markup: ik });
}

export async function startTopUp(ctx, amount) {
  const b = await boot();
  if (amount === "custom") {
    setState(ctx.chat.id, "topup_amount", {});
    return ctx.reply("💲 مبلغ شارژ را به تومان ارسال کنید (مثلاً 250000):");
  }
  setState(ctx.chat.id, "receipt_await", { amount });
  const card = setting(b.settings, "payment.card_number", "(در پنل تنظیم نشده)");
  const holder = setting(b.settings, "payment.card_holder", "");
  await ctx.reply(`🏦 کارت‌به‌کارت:\n\n💳 شماره کارت:\n${card}\n${holder ? `👤 به نام: ${holder}\n` : ""}💲 مبلغ: ${money(amount)}\n\nپس از واریز، تصویر یا متن رسید را ارسال کنید ⬇️`, { reply_markup: { keyboard: [[{ text: "❌ لغو" }]], resize_keyboard: true } });
}

export async function handleStateInput(ctx, state) {
  const t = makeT("fa");
  if (state.flow === "topup_amount") {
    const amount = Number(String(ctx.msg.text || "").replace(/[^\d]/g, ""));
    if (!amount || amount <= 0) {
      await ctx.reply(t("invalid_amount"));
      return true;
    }
    clearState(ctx.chat.id);
    await startTopUp(ctx, amount);
    return true;
  }
  return false;
}

/** Photo/text receipt while awaiting one. */
export async function handleReceipt(ctx, state) {
  if (state.flow !== "receipt_await") return false;
  const amount = Number(state.data.amount);
  clearState(ctx.chat.id);
  if (String(ctx.msg.text || "").trim() === "❌ لغو") {
    return ctx.reply("لغو شد.", { reply_markup: { keyboard: [[{ text: "🏬 فروشگاه" }], [{ text: "🖥 سرویس‌های من" }, { text: "💰 کیف پول" }], [{ text: "🎧 پشتیبانی" }, { text: "🤖 راهنما" }]], resize_keyboard: true } });
  }
  const receipt = await api("receipt/create", {
    telegram_id: String(ctx.from.id), username: ctx.from.username || "", amount,
    note: ctx.msg.photo ? "رسید تصویری" : String(ctx.msg.text || "").slice(0, 300),
  });
  await ctx.reply("✅ رسید شما ثبت شد. پس از تایید مدیر، موجودی کیف پول شما شارژ می‌شود. 🙏", { reply_markup: { keyboard: [[{ text: "🏬 فروشگاه" }], [{ text: "🖥 سرویس‌های من" }, { text: "💰 کیف پول" }], [{ text: "🎧 پشتیبانی" }, { text: "🤖 راهنما" }]], resize_keyboard: true } });
  for (const adminId of cfg.adminIds) {
    try {
      const ik = new InlineKeyboard().text("✅ تایید", `rapp:${receipt.id}`).text("❌ رد", `rrej:${receipt.id}`).row();
      if (ctx.msg.photo) await ctx.api.sendPhoto(adminId, ctx.msg.photo[ctx.msg.photo.length - 1].file_id, { caption: `🧾 رسید ${money(amount)} از @${ctx.from.username || ctx.from.id}`, reply_markup: ik });
      else await ctx.api.sendMessage(adminId, `🧾 رسید ${money(amount)} از @${ctx.from.username || ctx.from.id}\n\n${receipt.note}`, { reply_markup: ik });
    } catch { /* admin may have never started the bot */ }
  }
  return true;
}

export function register(bot) {
  bot.callbackQuery(/^top:/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const v = ctx.callbackQuery.data.split(":")[1];
    await startTopUp(ctx, v === "custom" ? "custom" : Number(v));
  });

  // welcome gift: phone verification → gift code from the configured stock product
  bot.callbackQuery(/^gift:/, async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply("📱 برای احراز و دریافت هدیه، شماره تماس خود را ارسال کنید:", { reply_markup: { keyboard: [[{ text: "📱 ارسال شماره تماس", request_contact: true }]], resize_keyboard: true, one_time_keyboard: true } });
    setState(ctx.chat.id, "gift_contact", {});
  });

  bot.on("message:contact", async (ctx) => {
    const state = getState(ctx.chat.id);
    if (!state || state.flow !== "gift_contact") return;
    clearState(ctx.chat.id);
    const b = await boot(true);
    const user = await api("users/get", { telegram_id: String(ctx.from.id) });
    if (user?.phone) return ctx.reply("🎁 شما قبلاً هدیه خود را دریافت کرده‌اید.");
    await api("users/update", { id: user?.id, patch: { phone: ctx.msg.contact.phone_number } });
    const giftProductId = setting(b.settings, "gift.product_id", "");
    if (!giftProductId) return ctx.reply("✅ شماره شما ثبت شد. (هدیه فعلاً تامین نشده است)");
    const gift = await api("stock/sell", { product_id: giftProductId, order_id: "" });
    await ctx.reply(gift ? `🎁 هدیه شما:\n\n${gift.code}` : "🎁 هدیه فعلاً تامین نشده است — به‌زودی اضافه می‌شود.");
  });
}