// 🛒 Salesgram — Telegram sales bot (entry point)
import { Bot } from "grammy";
import { cfg } from "./config.js";
import { api } from "./api.js";
import * as start from "./handlers/start.js";
import * as shop from "./handlers/shop.js";
import * as services from "./handlers/services.js";
import * as wallet from "./handlers/wallet.js";
import * as support from "./handlers/support.js";
import * as admin from "./handlers/admin.js";
import { startCallbackServer } from "./server.js";

if (!cfg.token) {
  console.error("❌ BOT_TOKEN is missing — set it in .env (get one from @BotFather)");
  process.exit(1);
}

const bot = new Bot(cfg.token);

// Track every user + deliver pending notifications (wallet top-ups approved in the web panel, etc.)
bot.use(async (ctx, next) => {
  if (ctx.from) {
    try {
      await api("users/upsert", { telegram_id: String(ctx.from.id), username: ctx.from.username || "", first_name: ctx.from.first_name || "" });
      const notes = await api("transactions/consume", { telegram_id: String(ctx.from.id) });
      for (const n of notes || []) await ctx.reply(`🔔 ${n.note}`).catch(() => {});
    } catch (e) {
      console.error("user sync failed:", e.message);
    }
  }
  await next();
});

start.register(bot);
shop.register(bot);
services.register(bot);
wallet.register(bot);
support.register(bot);
admin.register(bot);

bot.catch((err) => console.error("⛔ bot error:", err.error?.message || err.message));

startCallbackServer(bot);
bot.start();
console.log("🏬 Salesgram bot is running...");