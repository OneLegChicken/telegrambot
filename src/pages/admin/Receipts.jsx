import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { ReceiptText, Check, X } from "lucide-react";
import { PageHeader, StatusChip, EmptyState, BTN, faNum, money } from "./ui";

export default function Receipts() {
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(null);

  const load = async () => {
    const res = await base44.entities.Receipt.filter({}, { sort: "-created_date", limit: 100 });
    setItems(res.items || res);
  };
  useEffect(() => { load().catch(() => {}); }, []);

  // Approve/reject runs through the same botapi function the bot uses,
  // so balance crediting, transaction logging and the bot's user notification are all consistent.
  const decide = async (r, approve) => {
    setBusy(r.id);
    try {
      await base44.functions.invoke("botapi", { action: "receipt/decide", payload: { id: r.id, approve } });
      await load();
    } catch (e) {
      window.alert(String(e?.response?.data?.error || e?.message || e));
    } finally { setBusy(null); }
  };

  const pending = items.filter((r) => r.status === "pending");
  const rest = items.filter((r) => r.status !== "pending");

  return (
    <div className="max-w-4xl">
      <PageHeader title="رسیدهای در انتظار" subtitle="تایید پرداخت‌های کارت‌به‌کارت و شارژ خودکار کیف پول کاربر" />

      {pending.length > 0 && (
        <div className="space-y-3 mb-6">
          {pending.map((r) => (
            <div key={r.id} className="bg-[#1c1e21] border border-[#d32f2f]/40 rounded-2xl px-5 py-4 flex items-center justify-between gap-3">
              <div>
                <div className="font-bold text-sm">@{r.username || "—"} <span dir="ltr" className="text-gray-500 text-xs">({r.telegram_id})</span></div>
                <div className="text-[11px] text-gray-500 mt-1">{faNum((r.created_date || "").slice(0, 16).replace("T", " "))} • {r.note || "—"}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-bold text-[#4caf50]">{money(r.amount)}</span>
                <button disabled={busy === r.id} onClick={() => decide(r, true)} className={`px-3 py-2 rounded-xl text-xs flex items-center gap-1 ${BTN.success}`}><Check className="w-3.5 h-3.5" /> تایید</button>
                <button disabled={busy === r.id} onClick={() => decide(r, false)} className={`px-3 py-2 rounded-xl text-xs flex items-center gap-1 ${BTN.danger}`}><X className="w-3.5 h-3.5" /> رد</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {items.length === 0 ? <EmptyState icon={ReceiptText} text="رسیدی ثبت نشده — رسیدها از داخل ربات تلگرام ثبت می‌شوند." /> : (
        <div className="bg-[#1c1e21] border border-[#2a2d33] rounded-2xl divide-y divide-[#2a2d33]">
          {rest.map((r) => (
            <div key={r.id} className="px-5 py-3.5 flex items-center justify-between text-sm">
              <div>
                <span className="font-bold">@{r.username || "—"}</span>
                <span className="text-[11px] text-gray-500 mr-2">{faNum((r.created_date || "").slice(0, 16).replace("T", " "))}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[#4caf50]">{money(r.amount)}</span>
                <StatusChip status={r.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}