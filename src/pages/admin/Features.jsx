import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { SlidersHorizontal } from "lucide-react";
import { PageHeader, EmptyState } from "./ui";

const FEATURES = [
  { key: "shop", label: "فروشگاه (وضعیت)", icon: "🏬" },
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

export default function Features() {
  const [state, setState] = useState({}); // key -> boolean
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    (async () => {
      const res = await base44.entities.Setting.list();
      const items = res.items || res;
      const s = {};
      FEATURES.forEach(f => {
        const row = items.find(i => i.key === `features.${f.key}`);
        s[f.key] = row ? row.value === "true" : f.key === "shop" || f.key === "direct_buy" || f.key === "show_price";
      });
      setState(s);
      setLoaded(true);
    })().catch(() => {});
  }, []);

  const toggle = async (key) => {
    const next = !state[key];
    setBusy(key);
    setState(s => ({ ...s, [key]: next }));
    try {
      const fullKey = `features.${key}`;
      const res = await base44.entities.Setting.filter({ key: fullKey }, { limit: 1 });
      const items = res.items || res;
      if (items.length) await base44.entities.Setting.update(items[0].id, { value: String(next) });
      else await base44.entities.Setting.create({ key: fullKey, value: String(next) });
    } catch {
      setState(s => ({ ...s, [key]: !next }));
    } finally { setBusy(null); }
  };

  return (
    <div className="max-w-3xl">
      <PageHeader title="قابلیت‌های فروشگاه" subtitle="هر قابلیت را روشن (✅ روشن) یا خاموش (🚫 خاموش) کنید — بلافاصله در ربات اعمال می‌شود" />

      {!loaded ? <p className="text-gray-500 text-sm">در حال بارگذاری...</p> : (
        <div className="bg-[#1c1e21] border border-[#2a2d33] rounded-2xl divide-y divide-[#2a2d33]">
          {FEATURES.map(f => (
            <div key={f.key} className="flex items-center justify-between px-5 py-3.5">
              <div className="text-sm font-bold flex items-center gap-2"><span>{f.icon}</span>{f.label}</div>
              <button
                disabled={busy === f.key}
                onClick={() => toggle(f.key)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${state[f.key] ? "bg-[#4caf50] text-white" : "bg-[#26292f] text-gray-400 border border-[#2a2d33]"}`}
              >
                {state[f.key] ? "✅ روشن" : "🚫 خاموش"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}