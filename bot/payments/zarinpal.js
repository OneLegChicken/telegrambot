// Zarinpal instant gateway (amounts in Toman → Rial on the wire).
import axios from "axios";
import { cfg } from "../config.js";

export const gatewayEnabled = () => Boolean(cfg.zarinpalMerchant);

export async function requestPayment({ amount, description, callbackUrl }) {
  if (!gatewayEnabled()) throw new Error("درگاه پرداخت پیکربندی نشده است");
  const { data } = await axios.post(
    "https://payment.zarinpal.com/pg/v4/payment/request.json",
    {
      merchant_id: cfg.zarinpalMerchant,
      amount: Math.round(amount) * 10,
      currency: "IRR",
      description,
      callback_url: callbackUrl,
    },
    { timeout: 20000 }
  );
  const authority = data?.data?.authority;
  if (!authority) throw new Error("خطای درگاه زرین‌پال: " + JSON.stringify(data?.errors || data));
  return { authority, url: `https://payment.zarinpal.com/pg/StartPay/${authority}` };
}

export async function verifyPayment({ authority, amount }) {
  const { data } = await axios.post(
    "https://payment.zarinpal.com/pg/v4/payment/verify.json",
    {
      merchant_id: cfg.zarinpalMerchant,
      amount: Math.round(amount) * 10,
      authority,
    },
    { timeout: 20000 }
  );
  const code = data?.data?.code;
  if (code === 100 || code === 101) return { ok: true, refId: data?.data?.ref_id };
  return { ok: false };
}