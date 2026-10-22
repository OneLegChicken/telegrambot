import { X, Inbox } from "lucide-react";

export const BTN = {
  primary: "bg-[#3282b8] hover:bg-[#2a6f9e] text-white font-bold",
  success: "bg-[#4caf50] hover:bg-[#43a047] text-white font-bold",
  danger: "bg-[#d32f2f] hover:bg-[#b71c1c] text-white font-bold",
  ghost: "bg-[#26292f] hover:bg-[#2f333a] text-gray-200 font-bold",
  subtle: "bg-transparent border border-[#2a2d33] hover:bg-[#26292f] text-gray-300",
};

export const inputCls =
  "w-full bg-[#23262c] border border-[#2a2d33] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#3282b8] transition-colors";

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {subtitle && <p className="text-gray-400 text-sm mt-1">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export function StatusChip({ status }) {
  const map = {
    delivered: { label: "تحویل شده", cls: "bg-[#4caf50]/15 text-[#4caf50]" },
    paid: { label: "پرداخت شده", cls: "bg-[#3282b8]/15 text-[#82c3ea]" },
    pending: { label: "در انتظار", cls: "bg-amber-500/15 text-amber-400" },
    approved: { label: "تایید شده", cls: "bg-[#4caf50]/15 text-[#4caf50]" },
    rejected: { label: "رد شده", cls: "bg-[#d32f2f]/15 text-[#d32f2f]" },
    cancelled: { label: "لغو شده", cls: "bg-gray-500/15 text-gray-400" },
    failed: { label: "ناموفق", cls: "bg-[#d32f2f]/15 text-[#d32f2f]" },
    open: { label: "باز", cls: "bg-amber-500/15 text-amber-400" },
    answered: { label: "پاسخ داده شد", cls: "bg-[#4caf50]/15 text-[#4caf50]" },
    available: { label: "موجود", cls: "bg-[#4caf50]/15 text-[#4caf50]" },
    sold: { label: "فروخته شده", cls: "bg-gray-500/15 text-gray-400" },
  };
  const s = map[status] || { label: status, cls: "bg-gray-500/15 text-gray-400" };
  return <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>;
}

export function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative bg-[#1c1e21] border border-[#2a2d33] rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2d33] sticky top-0 bg-[#1c1e21] z-10">
          <h3 className="font-bold">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#26292f]" aria-label="بستن">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">{children}</div>
      </div>
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs text-gray-400">{label}</span>
      {children}
    </label>
  );
}

export function EmptyState({ text, icon: Icon = Inbox }) {
  return (
    <div className="py-12 text-center">
      <Icon className="w-10 h-10 text-gray-600 mx-auto mb-3" />
      <p className="text-gray-500 text-sm">{text}</p>
    </div>
  );
}

export const faNum = (n) => String(n ?? "").replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);
export const money = (n) => faNum(Number(n || 0).toLocaleString("en-US")) + " تومان";