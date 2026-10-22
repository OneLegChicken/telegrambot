import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ShoppingCart, Users, Wallet, ReceiptText, TrendingUp, ArrowLeft } from "lucide-react";

// نمونه داده اولیه — پس از اتصال ربات، آمار واقعی نمایش داده می‌شود
const SAMPLE_STATS = [
  { label: "فروش امروز", value: "۰ تومان", icon: TrendingUp, color: "#4caf50" },
  { label: "سفارش‌ها", value: "۰", icon: ShoppingCart, color: "#3282b8" },
  { label: "کاربران", value: "۰", icon: Users, color: "#3282b8" },
  { label: "رسید در انتظار", value: "۰", icon: ReceiptText, color: "#d32f2f" },
];

const faNum = n => String(n ?? 0).replace(/\d/g, d => "۰۱۲۳۴۵۶۷۸۹"[d]);
const money = n => faNum(Number(n || 0).toLocaleString("en-US")) + " تومان";

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const [o, u, r, s] = await Promise.all([
          base44.entities.Order.list("-created_date", 8),
          base44.entities.BotUser.count(),
          base44.entities.Receipt.count({ status: "pending" }),
          base44.entities.Order.count({ status: "delivered" }),
        ]);
        const revenue = (await base44.entities.Transaction.aggregate({ query: { type: "purchase" }, sum: ["amount"] })).rows?.[0]?.sum_amount || 0;
        setPending(r);
        setStats({ orders: o.length, users: u, pending: r, delivered: s, revenue });
        setOrders(o.items || []);
      } catch { setStats(null); }
    })();
  }, []);

  const cards = stats ? [
    { label: "درآمد کل", value: money(stats.revenue), color: "#4caf50" },
    { label: "سفارش تحویل‌شده", value: faNum(stats.delivered), color: "#3282b8" },
    { label: "کاربران", value: faNum(stats.users), color: "#3282b8" },
    { label: "رسید در انتظار", value: faNum(pending), color: pending > 0 ? "#d32f2f" : "#6b7280" },
  ] : SAMPLE_STATS.map(s => ({ label: s.label, value: s.value, color: s.color }));

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold">نمای کلی و آمار</h1>
        <p className="text-gray-400 text-sm mt-1">خلاصه وضعیت فروشگاه تلگرامی شما</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map(c => (
          <div key={c.label} className="bg-[#1c1e21] border border-[#2a2d33] rounded-2xl p-4">
            <div className="text-xs text-gray-400 mb-2">{c.label}</div>
            <div className="text-xl font-extrabold" style={{ color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      <div className="bg-[#1c1e21] border border-[#2a2d33] rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2d33]">
          <h2 className="font-bold text-sm">آخرین سفارش‌ها</h2>
          <Link to="/orders" className="text-xs text-[#3282b8] flex items-center gap-1">همه سفارش‌ها <ArrowLeft className="w-3.5 h-3.5" /></Link>
        </div>
        {orders.length === 0 ? (
          <div className="px-5 py-10 text-center text-gray-500 text-sm">
            هنوز سفارشی ثبت نشده — پس از راه‌اندازی ربات، سفارش‌ها اینجا نمایش داده می‌شوند.
          </div>
        ) : (
          <div className="divide-y divide-[#2a2d33]">
            {orders.map(o => (
              <div key={o.id} className="flex items-center justify-between px-5 py-3 text-sm">
                <div>
                  <div className="font-bold">{o.product_name} {o.plan_title ? `— ${o.plan_title}` : ""}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{o.buyer_name || o.telegram_id}</div>
                </div>
                <div className="text-left">
                  <div className="font-bold text-[#4caf50]">{money(o.amount)}</div>
                  <StatusChip status={o.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {pending > 0 && (
        <Link to="/receipts" className="flex items-center justify-between bg-[#d32f2f]/10 border border-[#d32f2f]/40 rounded-2xl px-5 py-4 hover:bg-[#d32f2f]/20 transition-colors">
          <span className="text-sm font-bold text-[#ff8a80]">{faNum(pending)} رسید پرداخت در انتظار تایید شماست</span>
          <ArrowLeft className="w-4 h-4 text-[#ff8a80]" />
        </Link>
      )}
    </div>
  );
}

export function StatusChip({ status }) {
  const map = {
    delivered: { label: "تحویل شده", cls: "bg-[#4caf50]/15 text-[#4caf50]" },
    paid: { label: "پرداخت شده", cls: "bg-[#3282b8]/15 text-[#3282b8]" },
    pending: { label: "در انتظار", cls: "bg-amber-500/15 text-amber-400" },
    cancelled: { label: "لغو شده", cls: "bg-gray-500/15 text-gray-400" },
    failed: { label: "ناموفق", cls: "bg-[#d32f2f]/15 text-[#d32f2f]" },
    approved: { label: "تایید شده", cls: "bg-[#4caf50]/15 text-[#4caf50]" },
    rejected: { label: "رد شده", cls: "bg-[#d32f2f]/15 text-[#d32f2f]" },
    open: { label: "باز", cls: "bg-amber-500/15 text-amber-400" },
    answered: { label: "پاسخ داده شده", cls: "bg-[#4caf50]/15 text-[#4caf50]" },
  };
  const s = map[status] || { label: status, cls: "bg-gray-500/15 text-gray-400" };
  return <span className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>;
}