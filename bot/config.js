import "dotenv/config";

export const cfg = {
  token: process.env.BOT_TOKEN || "",
  adminIds: (process.env.ADMIN_IDS || "").split(",").map((s) => s.trim()).filter(Boolean),
  appApiBase: (process.env.APP_API_BASE || "").replace(/\/+$/, ""),
  botApiSecret: process.env.BOT_API_SECRET || "",
  zarinpalMerchant: process.env.ZARINPAL_MERCHANT_ID || "",
  baseUrl: (process.env.BASE_URL || "").replace(/\/+$/, ""),
  port: Number(process.env.PORT || 8787),
};

export const isAdminId = (id) => cfg.adminIds.includes(String(id));