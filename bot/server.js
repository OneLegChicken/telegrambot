// Local HTTP server: /health + Zarinpal payment callback (auto-verify & deliver).
import http from "http";
import { cfg } from "./config.js";
import { verifyPayment } from "./payments/zarinpal.js";
import { api } from "./api.js";
import { deliverOrder } from "./deliver.js";

export function startCallbackServer(bot) {
  http
    .createServer(async (req, res) => {
      try {
        const url = new URL(req.url, `http://localhost:${cfg.port}`);
        if (url.pathname === "/health") {
          res.writeHead(200);
          return res.end("ok");
        }
        if (url.pathname === "/pay/callback") {
          const orderId = url.searchParams.get("orderId") || "";
          const authority = url.searchParams.get("Authority") || "";
          const status = url.searchParams.get("Status") || "";
          const order = await api("orders/get", { id: orderId });
          if (!order) {
            res.writeHead(404);
            return res.end("order not found");
          }
          if (order.status !== "pending") {
            res.writeHead(200);
            return res.end("already processed");
          }
          if (status !== "OK") {
            await api("order/update", { id: orderId, patch: { status: "failed" } });
            res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
            return res.end("<div dir='rtl' style='text-align:center;padding:40px'>❌ پرداخت ناموفق بود</div>");
          }
          const v = await verifyPayment({ authority, amount: order.amount });
          if (!v.ok) {
            await api("order/update", { id: orderId, patch: { status: "failed" } });
            res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
            return res.end("<div dir='rtl' style='text-align:center;padding:40px'>❌ پرداخت تایید نشد</div>");
          }
          await api("order/update", { id: orderId, patch: { status: "paid" } });
          await deliverOrder(bot, order.telegram_id, order).catch((e) => console.error("delivery failed:", e.message));
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          return res.end("<div dir='rtl' style='text-align:center;padding:40px'>✅ پرداخت با موفقیت انجام شد! کانفیگ در ربات ارسال شد.</div>");
        }
        res.writeHead(404);
        res.end();
      } catch (e) {
        console.error("callback server error:", e.message);
        try { res.writeHead(500); res.end("error"); } catch { /* already sent */ }
      }
    })
    .listen(cfg.port, () => console.log(`🌐 payment callback server on :${cfg.port}`));
}