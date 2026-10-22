// Central bootstrap cache + feature defaults (mirrors the web admin panel).
import { api } from "./api.js";

let CACHE = null;
let CACHE_TS = 0;
const TTL = 60_000; // refetch config at most once per minute

export async function boot(force = false) {
  if (!CACHE || force || Date.now() - CACHE_TS > TTL) {
    CACHE = await api("bootstrap");
    CACHE_TS = Date.now();
  }
  return CACHE;
}
export const invalidate = () => { CACHE = null; };

export const setting = (settings, key, dflt = "") => (settings && settings[key] !== undefined && settings[key] !== "" ? settings[key] : dflt);

const FEATURE_DEFAULTS = {
  shop: true, direct_buy: true, add_time: true, add_volume: true,
  categories: true, show_price: true, get_config: true, why_no_connect: true,
  auto_renew: true, add_existing: true,
  outage_notice: false, time_categories: false, disable_sub_status: false,
  refund: false, welcome_gift: false,
};

/** Feature toggle: true/false according to the web admin panel (default per FEATURE_DEFAULTS). */
export const feat = (settings, key) => {
  const v = settings ? settings[`features.${key}`] : undefined;
  if (v === "true") return true;
  if (v === "false") return false;
  return FEATURE_DEFAULTS[key] ?? false;
};

export const FEATURE_LIST = [
  { key: "shop", label: "وضعیت فروشگاه", icon: "🏬" },
  { key: "direct_buy", label: "خرید مستقیم", icon: "⚡" },
  { key: "add_volume", label: "حجم اضافه", icon: "📊" },
  { key: "add_time", label: "زمان اضافه", icon: "⏱" },
  { key: "outage_notice", label: "اعلام اخطار", icon: "📢" },
  { key: "categories", label: "دسته‌بندی", icon: "🗂" },
  { key: "time_categories", label: "دسته‌بندی زمانی", icon: "⏳" },
  { key: "disable_sub_status", label: "وضعیت غیرفعال‌سازی اشتراک", icon: "🚫" },
  { key: "show_price", label: "نمایش قیمت پلن", icon: "💲" },
  { key: "get_config", label: "دکمه دریافت کانفیگ", icon: "📄" },
  { key: "refund", label: "دکمه استرداد وجه", icon: "🌱" },
  { key: "why_no_connect", label: "چرا وصل نمی‌شم؟", icon: "🔧" },
  { key: "auto_renew", label: "تمدید خودکار از کیف پول", icon: "🔄" },
  { key: "add_existing", label: "اضافه کردن اکانت موجود", icon: "🔗" },
  { key: "welcome_gift", label: "هدیه امد (بعد از احراز شماره)", icon: "🎁" },
];