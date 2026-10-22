import { Outlet, Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import {
  LayoutDashboard, Server, FolderTree, Package, ShoppingCart, ReceiptText,
  Users, SlidersHorizontal, Settings, MessageCircle, Rocket, Menu, X, ShieldAlert,
} from "lucide-react";

const NAV = [
  { to: "/", label: "نمای کلی و آمار", icon: LayoutDashboard },
  { to: "/panels", label: "پنل‌ها و سرورها", icon: Server },
  { to: "/categories", label: "دسته‌بندی‌ها", icon: FolderTree },
  { to: "/products", label: "محصولات و موجودی", icon: Package },
  { to: "/orders", label: "سفارش‌ها", icon: ShoppingCart },
  { to: "/receipts", label: "رسیدهای در انتظار", icon: ReceiptText },
  { to: "/users", label: "کاربران", icon: Users },
  { to: "/features", label: "قابلیت‌های فروشگاه", icon: SlidersHorizontal },
  { to: "/support", label: "پشتیبانی", icon: MessageCircle },
  { to: "/settings", label: "تنظیمات", icon: Settings },
  { to: "/deployment", label: "استقرار روی سرور", icon: Rocket },
];

export default function AdminLayout() {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState(null);
  const location = useLocation();

  useEffect(() => { base44.auth.me().then(u => setRole(u?.role || "user")).catch(() => setRole("user")); }, []);
  useEffect(() => { setOpen(false); }, [location.pathname]);

  if (role && role !== "admin") {
    return (
      <div dir="rtl" className="min-h-screen bg-[#16181d] flex items-center justify-center p-6">
        <div className="max-w-sm w-full bg-[#1c1e21] border border-[#2a2d33] rounded-2xl p-8 text-center space-y-3">
          <ShieldAlert className="w-10 h-10 text-[#d32f2f] mx-auto" />
          <h1 className="text-white font-bold text-lg">دسترسی محدود</h1>
          <p className="text-gray-400 text-sm leading-6">این پنل فقط برای مدیر فروشگاه در دسترس است. با حساب مدیر وارد شوید.</p>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-[#16181d] text-white font-body">
      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-40 flex items-center justify-between px-4 h-14 bg-[#1c1e21] border-b border-[#2a2d33]">
        <div className="flex items-center gap-2 font-bold">
          <span className="w-8 h-8 rounded-lg bg-[#3282b8] flex items-center justify-center text-sm">🛒</span>
          سیلزگرام
        </div>
        <button onClick={() => setOpen(!open)} className="p-2 rounded-lg hover:bg-[#26292f]" aria-label="منو">
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`fixed lg:sticky top-0 lg:top-0 h-screen w-64 shrink-0 bg-[#1c1e21] border-l border-[#2a2d33] z-50 transition-transform duration-200 lg:translate-x-0 ${open ? "translate-x-0" : "translate-x-full lg:translate-x-0"} flex flex-col`}>
          <div className="hidden lg:flex items-center gap-3 px-5 h-16 border-b border-[#2a2d33]">
            <span className="w-9 h-9 rounded-xl bg-[#3282b8] flex items-center justify-center">🛒</span>
            <div>
              <div className="font-bold text-sm">سیلزگرام</div>
              <div className="text-[11px] text-gray-500">پنل مدیریت فروش</div>
            </div>
          </div>
          <nav className="flex-1 overflow-y-auto p-3 space-y-1">
            {NAV.map(({ to, label, icon: Icon }) => {
              const active = location.pathname === to;
              return (
                <Link key={to} to={to}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${active ? "bg-[#3282b8] text-white font-bold" : "text-gray-300 hover:bg-[#26292f]"}`}>
                  <Icon className="w-4.5 h-4.5 w-[18px] h-[18px] shrink-0" />
                  {label}
                </Link>
              );
            })}
          </nav>
          <div className="p-3 border-t border-[#2a2d33] text-[11px] text-gray-500 px-4">نسخه ۱.۰ — فروشگاه تلگرامی</div>
        </aside>
        {open && <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setOpen(false)} />}

        {/* Content */}
        <main className="flex-1 min-w-0 p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}