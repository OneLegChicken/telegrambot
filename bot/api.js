import axios from "axios";
import { cfg } from "./config.js";

if (!cfg.appApiBase) console.warn("⚠️  APP_API_BASE is not set — the bot cannot reach the web admin panel.");
if (!cfg.botApiSecret) console.warn("⚠️  BOT_API_SECRET is not set — set the same secret in the web admin panel (Settings).");

const http = axios.create({
  baseURL: `${cfg.appApiBase}/functions/botapi`,
  timeout: 30000,
  headers: { "Content-Type": "application/json", "X-Bot-Secret": cfg.botApiSecret },
});

/** Call the web admin panel's botapi function. Throws Persian-friendly errors. */
export async function api(action, payload = {}) {
  const { data } = await http.post("", { action, payload });
  if (data?.error) throw new Error(data.error);
  return data?.result;
}

export const faNum = (n) => String(n ?? "").replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);
export const money = (n) => faNum(Number(n || 0).toLocaleString("en-US")) + " تومان";
export const faDate = (d) => (d ? new Date(d).toLocaleDateString("fa-IR") : "—");