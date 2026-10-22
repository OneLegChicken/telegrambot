// Router: /start, main menus, text/photo state delegation.
import { boot, setting } from "../store.js";
import { getState, clearState } from "../state.js";
import { isAdminId } from "../config.js";
import { makeT } from "../i18n.js";
import { mainMenu, adminMainMenu } from "../keyboards.js";
import { shopEntry, handleStateInput as shopState } from "./shop.js";
import { showServices } from "./services.js";
import { walletMenu, handleStateInput as walletState, handleReceipt } from "./wallet.js";
import { startSupport, handleInput as supportInput } from "./support.js";
import { adminRoute, handleStateInput as adminState } from "./admin.js";

const menuFor = (ctx) => (isAdminId(ctx.from.id) ? adminMainMenu() : mainMenu());

export function register(bot) {
  bot.command("start", async (ctx) => {
    const b = await boot(true);
    const t = makeT(setting(b.settings, "bot.language", "fa"));
    clearState(ctx.chat.id);
    const welcome = setting(b.settings, "texts.welcome", t("welcome"));
    await ctx.reply(`${welcome}\n\n👇 یکی از گزینه‌های زیر را انتخاب کنید:`, { reply_markup: menuFor(ctx) });
  });

  bot.on("message:text", async (ctx) => {
    const text = ctx.msg.text.trim();
    const st = getState(ctx.chat.id);
    try {
      if (st) {
        if (await shopState(ctx, st)) return;
        if (await walletState(ctx, st)) return;
        if (await adminState(ctx, st)) return;
        if (await supportInput(ctx, st)) return;
      }
      if (isAdminId(ctx.from.id) && (await adminRoute(ctx, text))) return;

      switch (text) {
        case "🏬 فروشگاه":
          return void (await shopEntry(ctx));
        case "🖥 سرویس‌های من":
          return void (await showServices(ctx));
        case "💰 کیف پول":
          return void (await walletMenu(ctx));
        case "🎧 پشتیبانی":
          return void (await startSupport(ctx));
        case "🤖 راهنما": {
          const b = await boot();
          const why = feat(b.settings, "why_no_connect");
          return void (await ctx.reply(
            setting(b.settings, "texts.help", "🤖 راهنما:\n\n• خرید: 🏬 فروشگاه → دسته → محصول → پلن → پرداخت\n• کانفیگ VPN بلافاصله ارسال می‌شود؛ کد محصولات آماده هم مستقیم می‌آید.\n• سرویس‌ها و تاریخ انقضا: 🖥 سرویس‌های من (تمدید هم همان‌جاست).\n• مشکل؟ 🎧 پشتیبانی") +
            (why ? "\n\n🔧 چرا وصل نمی‌شم؟\n1) اپلیکیشن را بروز کنید.\n2) لینک اشتراک را دوباره وارد کنید.\n3) حجم یا زمان سرویس تمام نشده باشد.\n4) اپراتور خود را عوض کنید (WiFi/داده)." : "")
          ));
        }
        case "❌ لغو":
          clearState(ctx.chat.id);
          return void (await ctx.reply("لغو شد 👇", { reply_markup: menuFor(ctx) }));
      }
      await ctx.reply("👇 از دکمه‌های زیر استفاده کنید:", { reply_markup: menuFor(ctx) });
    } catch (e) {
      console.error("text handler:", e.message);
      await ctx.reply(`❌ ${e.message}`).catch(() => {});
    }
  });

  bot.on("message:photo", async (ctx) => {
    const st = getState(ctx.chat.id);
    if (st) {
      if (await handleReceipt(ctx, st)) return;
      if (await supportInput(ctx, st)) return;
    }
    await ctx.reply("👇 از دکمه‌های زیر استفاده کنید:", { reply_markup: menuFor(ctx) });
  });
}