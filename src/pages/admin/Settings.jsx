import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Save } from "lucide-react";
import { PageHeader, Field, inputCls, BTN } from "./ui";

const FIELDS = [
  { key: "payment.card_number", label: "شماره کارت برای کارت‌به‌کارت", placeholder: "6104-XXXX-XXXX-XXXX", ltr: true },
  { key: "payment.card_holder", label: "نام صاحب کارت", placeholder: "نام و نام خانوادگی", ltr: false },
  { key: "gateway.zarinpal_merchant", label: "کد مرچنت زرین‌پال", placeholder: "ZP-XXXX", ltr: true },
  { key: "bot.api_secret", label: "رمز اتصال ربات به این پنل (BOT_API_SECRET در .env)", placeholder: "یک رشته تصادفی طولانی", ltr: true },
  { key: "bot.base_url", label: "آدرس عمومی سرور ربات (برای بازگشت پرداخت)", placeholder: "http://SERVER_IP:8787", ltr: true },
  { key: "gift.product_id", label: "شناسه محصول هدیه (بعد از احراز شماره)", placeholder: "اختیاری", ltr: true },
  { key: "bot.admin_ids", label: "آیدی عددی مدیران تلگرام (با کاما)", placeholder: "123456789,987654321", ltr: true },
  { key: "texts.welcome", label: "متن خوش‌آمد /start", placeholder: "به فروشگاه ما خوش آمدید 👇", ltr: false, textarea: true },
  { key: "texts.help", label: "متن راهنما", placeholder: "راهنمای خرید و اتصال...", ltr: false, textarea: true },
  { key: "texts.outage", label: "متن اعلام اخطار / قطعی", placeholder: "در حال حاضر سرورها در حال بروزرسانی است...", ltr: false, textarea: true },
  { key: "web.url", label: "آدرس همین پنل وب (برای دکمه «پنل وب» در ربات)", placeholder: "https://your-app.base44.app", ltr: true },
];

export default function SettingsPage() {
  const [values, setValues] = useState({});
  const [ids, setIds] = useState({});
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await base44.entities.Setting.list();
      const items = res.items || res;
      const v = {}, idMap = {};
      items.forEach(i => { v[i.key] = i.value; idMap[i.key] = i.id; });
      setValues(v); setIds(idMap);
    })().catch(() => {});
  }, []);

  const save = async () => {
    setBusy(true); setSaved(false);
    try {
      for (const f of FIELDS) {
        const val = values[f.key] ?? "";
        if (ids[f.key]) await base44.entities.Setting.update(ids[f.key], { value: val });
        else if (val) {
          const created = await base44.entities.Setting.create({ key: f.key, value: val });
          setIds(m => ({ ...m, [f.key]: created.id }));
        }
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally { setBusy(false); }
  };

  return (
    <div className="max-w-3xl">
      <PageHeader title="تنظیمات" subtitle="درگاه پرداخت، کارت‌به‌کارت، مدیران و متن‌های ربات">
        <button className={`px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 ${BTN.success}`} disabled={busy} onClick={save}>
          <Save className="w-4 h-4" /> {busy ? "..." : "ذخیره تنظیمات"}
        </button>
      </PageHeader>

      {saved && <div className="mb-4 text-xs text-[#4caf50] bg-[#4caf50]/10 border border-[#4caf50]/30 rounded-xl px-4 py-2.5">تنظیمات ذخیره شد ✅</div>}

      <div className="bg-[#1c1e21] border border-[#2a2d33] rounded-2xl p-5 space-y-4">
        {FIELDS.map(f => (
          <Field key={f.key} label={f.label}>
            {f.textarea ? (
              <textarea rows={3} className={inputCls} value={values[f.key] || ""} onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))} placeholder={f.placeholder} />
            ) : (
              <input dir={f.ltr ? "ltr" : "rtl"} className={inputCls} value={values[f.key] || ""} onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))} placeholder={f.placeholder} />
            )}
          </Field>
        ))}
      </div>
    </div>
  );
}