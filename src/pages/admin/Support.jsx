import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { MessageCircle, CheckCircle2 } from "lucide-react";
import { PageHeader, StatusChip, EmptyState, BTN, faNum } from "./ui";

export default function Support() {
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(null);

  const load = async () => {
    const res = await base44.entities.SupportMessage.list("-created_date", 100);
    setItems(res.items || res);
  };
  useEffect(() => { load().catch(() => {}); }, []);

  const markAnswered = async (m) => {
    setBusy(m.id);
    try {
      await base44.entities.SupportMessage.update(m.id, { status: "answered" });
      await load();
    } finally { setBusy(null); }
  };

  const open = items.filter(m => m.status !== "answered");
  const rest = items.filter(m => m.status === "answered");

  return (
    <div className="max-w-4xl">
      <PageHeader title="پشتیبانی" subtitle="پیام‌های پشتیبانی کاربران — پاسخ از داخل ربات تلگرام ارسال می‌شود" />

      {items.length === 0 ? <EmptyState icon={MessageCircle} text="پیامی ثبت نشده." /> : (
        <>
          {open.length > 0 && (
            <div className="space-y-3 mb-6">
              {open.map(m => (
                <div key={m.id} className="bg-[#1c1e21] border border-amber-500/30 rounded-2xl px-5 py-4">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="text-sm font-bold">@{m.username || "—"} <span dir="ltr" className="text-gray-500 text-xs">({m.telegram_id})</span></div>
                    <div className="flex items-center gap-2">
                      <StatusChip status={m.status} />
                      <button disabled={busy === m.id} onClick={() => markAnswered(m)} className={`px-3 py-1.5 rounded-lg text-[11px] flex items-center gap-1 ${BTN.success}`}>
                        <CheckCircle2 className="w-3 h-3" /> پاسخ داده شد
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-300 leading-6">{m.text}</p>
                  <div className="text-[11px] text-gray-500 mt-1">{faNum((m.created_date || "").slice(0, 16).replace("T", " "))}</div>
                </div>
              ))}
            </div>
          )}
          {rest.length > 0 && (
            <div className="bg-[#1c1e21] border border-[#2a2d33] rounded-2xl divide-y divide-[#2a2d33]">
              {rest.map(m => (
                <div key={m.id} className="px-5 py-3 flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <span className="font-bold">@{m.username || "—"}</span>
                    <span className="text-gray-400 mr-2 truncate">{m.text}</span>
                  </div>
                  <StatusChip status={m.status} />
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}