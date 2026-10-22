// Support: customer messages reach the admin (in Telegram + web panel).
import { api } from "../api.js";
import { setState, clearState } from "../state.js";
import { cfg, isAdminId } from "../config.js";

export async function startSupport(ctx) {
  setState(ctx.chat.id, "support", {});
  await ctx.reply("🎧 پشتیبانی\n\nپیام خود را ارسال کنید؛ به‌زودی پاسخ می‌گیرید.\nبرای لغو /start را بزنید.");
}

export async function handleInput(ctx, state) {
  if (state.flow !== "support") return false;
  clearState(ctx.chat.id);
  const text = ctx.msg.text || "[تصویر / فایل]";
  await api("support/create", { telegram_id: String(ctx.from.id), username: ctx.from.username || "", text });
  for (const adminId of cfg.adminIds) {
    if (ctx.msg.photo) await ctx.api.sendPhoto(adminId, ctx.msg.photo[ctx.msg.photo.length - 1].file_id, { caption: `🎧 از @${ctx.from.username || ctx.from.id} (${ctx.from.id})` }).catch(() => {});
    else await ctx.api.sendMessage(adminId, `🎧 پیام پشتیبانی از ${ctx.from.first_name} (@${ctx.from.username || ctx.from.id})\n\n${text}`).catch(() => {});
  }
  await ctx.reply("✅ پیام شما به پشتیبانی ارسال شد.", { reply_markup: { keyboard: [[{ text: "🏬 فروشگاه" }], [{ text: "🖥 سرویس‌های من" }, { text: "💰 کیف پول" }], [{ text: "🎧 پشتیبانی" }, { text: "🤖 راهنما" }]], resize_keyboard: true } });
  return true;
}