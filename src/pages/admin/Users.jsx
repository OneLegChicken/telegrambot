import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Users as UsersIcon, Wallet } from "lucide-react";
import { PageHeader, Modal, Field, inputCls, BTN, EmptyState, faNum, money } from "./ui";

export default function UsersPage() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [modal, setModal] = useState(null); // {user, amount, note}
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const res = await base44.entities.BotUser.list("-created_date", 200);
    setItems(res.items || res);
  };
  useEffect(() => { load().catch(() => {}); }, []);

  const filtered = items.filter(u => {
    const s = q.trim().toLowerCase();
    if (!s) return true;
    return String(u.telegram_id).includes(s) || String(u.username || "").toLowerCase().includes(s) || String(u.first_name || "").includes(q.trim());
  });

  const adjust = async () => {
    if (!modal?.amount) return;
    setBusy(true);
    try {
      const delta = Number(modal.amount);
      await base44.entities.BotUser.update(modal.user.id, { balance: (Number(modal.user.balance) || 0) + delta });
      await base44.entities.Transaction.create({
        telegram_id: modal.user.telegram_id,
        type: delta > 0 ? "topup" : "adjust",
        amount: Math.abs(delta),
        note: delta > 0 ? "شارژ دستی توسط مدیر" : "کسر دستی توسط مدیر",
        notified: false,
      });
      setModal(null);
      await load();
    } finally { setBusy(false); }
  };

  return (
    <div className="max-w-4xl">
      <PageHeader title="کاربران" subtitle="کاربران ربات و موجودی کیف پول آن‌ها" />

      <input className={`${inputCls} mb-4 max-w-sm`} placeholder="جستجو بر اساس نام، آیدی یا یوزرنیم..." value={q} onChange={e => setQ(e.target.value)} />

      {filtered.length === 0 ? <EmptyState icon={UsersIcon} text="کاربری یافت نشد." /> : (
        <div className="bg-[#1c1e21] border border-[#2a2d33] rounded-2xl divide-y divide-[#2a2d33]">
          {filtered.map(u => (
            <div key={u.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-[#3282b8]/20 text-[#82c3ea] flex items-center justify-center text-xs font-bold shrink-0">
                  {(u.first_name || "U").slice(0, 2)}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold truncate">{u.first_name || "—"} {u.username && <span dir="ltr" className="text-gray-500 text-xs">@{u.username}</span>}</div>
                  <div dir="ltr" className="text-[11px] text-gray-500 text-right">{u.telegram_id}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-left">
                  <div className="text-xs text-gray-500">موجودی</div>
                  <div className="text-sm font-bold text-[#4caf50]">{money(u.balance)}</div>
                </div>
                <button className={`p-2 rounded-lg hover:bg-[#26292f] ${BTN.subtle}`} onClick={() => setModal({ user: u, amount: "", note: "" })} aria-label="تغییر موجودی">
                  <Wallet className="w-4 h-4 text-[#82c3ea]" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title="تغییر موجودی کیف پول">
        <p className="text-xs text-gray-400">کاربر: {modal?.user?.first_name} — موجودی فعلی: {money(modal?.user?.balance)}</p>
        <Field label="مبلغ (برای کسر، عدد منفی وارد کنید)"><input type="number" className={inputCls} value={modal?.amount || ""} onChange={e => setModal(m => ({ ...m, amount: e.target.value }))} placeholder="مثلاً 500000 یا -100000" /></Field>
        <div className="flex justify-end gap-2 pt-2">
          <button className={`px-4 py-2.5 rounded-xl text-sm ${BTN.ghost}`} onClick={() => setModal(null)}>انصراف</button>
          <button className={`px-4 py-2.5 rounded-xl text-sm ${BTN.success}`} disabled={busy} onClick={adjust}>{busy ? "..." : "ثبت"}</button>
        </div>
      </Modal>
    </div>
  );
}