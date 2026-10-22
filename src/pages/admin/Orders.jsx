import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { ShoppingCart, CheckCircle2 } from "lucide-react";
import { PageHeader, StatusChip, EmptyState, BTN, faNum, money, inputCls } from "./ui";

const FILTERS = [
  { value: "", label: "همه" },
  { value: "paid", label: "پرداخت شده" },
  { value: "delivered", label: "تحویل شده" },
  { value: "pending", label: "در انتظار" },
  { value: "cancelled", label: "لغو شده" },
  { value: "failed", label: "ناموفق" },
];

export default function Orders() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const q = filter ? { status: filter } : {};
    const res = await base44.entities.Order.filter(q, { sort: "-created_date", limit: 100 });
    setItems(res.items || res);
  };
  useEffect(() => { load().catch(() => {}); }, [filter]);

  const markDelivered = async (o) => {
    if (!window.confirm("این سفارش تحویل‌شده علامت بخورد؟")) return;
    setBusy(true);
    try {
      await base44.entities.Order.update(o.id, { status: "delivered" });
      await load();
    } finally { setBusy(false); }
  };

  return (
    <div className="max-w-4xl">
      <PageHeader title="سفارش‌ها" subtitle="سفارش‌های ثبت‌شده در ربات تلگرام" />

      <div className="flex gap-2 mb-4 flex-wrap">
        {FILTERS.map(f => (
          <button key={f.value} onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 rounded-full text-xs ${filter === f.value ? BTN.primary : BTN.subtle}`}>
            {f.label}
          </button>
        ))}
      </div>

      {items.length === 0 ? <EmptyState icon={ShoppingCart} text="سفارشی یافت نشد." /> : (
        <div className="bg-[#1c1e21] border border-[#2a2d33] rounded-2xl divide-y divide-[#2a2d33]">
          {items.map(o => (
            <div key={o.id} className="px-5 py-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-bold text-sm">{o.product_name}{o.plan_title ? ` — ${o.plan_title}` : ""}</div>
                <div className="text-[11px] text-gray-500 mt-1">
                  کاربر: {o.buyer_name || "—"} ({o.telegram_id}) • {o.method === "wallet" ? "💳 کیف پول" : "🌐 درگاه"} • {faNum((o.created_date || "").slice(0, 10))}
                </div>
                {o.delivery && <div dir="ltr" className="text-[11px] text-gray-400 mt-1 break-all bg-[#23262c] rounded-lg px-2 py-1">{o.delivery}</div>}
              </div>
              <div className="text-left shrink-0 space-y-2">
                <div className="text-sm font-bold text-[#4caf50]">{money(o.amount)}</div>
                <StatusChip status={o.status} />
                {o.status === "paid" && (
                  <button disabled={busy} onClick={() => markDelivered(o)} className={`px-3 py-1.5 rounded-lg text-[11px] flex items-center gap-1 ${BTN.success}`}>
                    <CheckCircle2 className="w-3 h-3" /> تحویل شد
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}