import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Pencil, Trash2, PlugZap, CheckCircle2, XCircle } from "lucide-react";
import { PageHeader, Modal, Field, inputCls, BTN, EmptyState } from "./ui";

export const NAMING_PATTERNS = [
  { value: "tg_user_random", label: "نام کاربری + حروف و عدد رندم" },
  { value: "numeric_random", label: "آیدی عددی + حروف و عدد رندم" },
  { value: "tg_custom_random", label: "نام کاربری + دلخواه + عدد رندم" },
  { value: "custom_random", label: "متن دلخواه + عدد رندم" },
  { value: "custom_sequential", label: "متن دلخواه + عدد ترتیبی" },
  { value: "tg_sequential", label: "نام کاربری + عدد ترتیبی" },
  { value: "coworker_custom_seq", label: "متن دلخواه همکار + عدد ترتیبی" },
  { value: "coworker_numeric_seq", label: "آیدی عددی همکار + عدد ترتیبی" },
  { value: "custom_choice", label: "نام کاربری دلخواه (انتخاب مشتری)" },
];

const TYPES = [
  { value: "3xui", label: "3x-ui (MHSanaei)" },
  { value: "gurdv2", label: "Gurd v2 (Solid Layer)" },
];

const empty = { name: "", type: "3xui", url: "", username: "", password: "", token: "", inbound_id: "", naming_pattern: "tg_user_random", custom_text: "" };

export default function Panels() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [test, setTest] = useState(null); // {id, ok, msg}

  const load = async () => setItems(await base44.entities.Panel.list("-created_date"));
  useEffect(() => { load().catch(() => {}); }, []);

  const save = async () => {
    if (!form.name || !form.type) return;
    setBusy(true);
    try {
      if (editId) await base44.entities.Panel.update(editId, form);
      else await base44.entities.Panel.create(form);
      setOpen(false); setForm(empty); setEditId(null);
      await load();
    } finally { setBusy(false); }
  };

  const remove = async (id) => {
    if (!window.confirm("این پنل حذف شود؟")) return;
    await base44.entities.Panel.delete(id);
    await load();
  };

  const testConnection = async (id) => {
    setTest({ id, ok: null, msg: "در حال بررسی..." });
    try {
      const res = await base44.functions.invoke("botapi", { action: "panelTest", payload: { panel_id: id } });
      setTest({ id, ok: true, msg: res.result || "اتصال برقرار است ✅" });
    } catch (e) {
      setTest({ id, ok: false, msg: String(e?.message || e) });
    }
  };

  return (
    <div className="max-w-5xl">
      <PageHeader title="پنل‌ها و سرورها" subtitle="اتصال پنل‌های 3x-ui و Gurd v2 و تنظیم قواعد نام‌گذاری کانفیگ">
        <button className={`px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 ${BTN.success}`} onClick={() => { setForm(empty); setEditId(null); setOpen(true); }}>
          <Plus className="w-4 h-4" /> اتصال پنل جدید
        </button>
      </PageHeader>

      {items.length === 0 ? (
        <EmptyState icon={PlugZap} text="هنوز پنلی متصل نشده — روی «اتصال پنل جدید» بزنید." />
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {items.map(p => (
            <div key={p.id} className="bg-[#1c1e21] border border-[#2a2d33] rounded-2xl p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-bold flex items-center gap-2"><PlugZap className="w-4 h-4 text-[#3282b8]" />{p.name}</div>
                  <div className="text-xs text-gray-500 mt-1">{(TYPES.find(t => t.value === p.type) || {}).label || p.type}</div>
                </div>
                <div className="flex gap-1">
                  <button className="p-2 rounded-lg hover:bg-[#26292f]" onClick={() => { setForm({ ...empty, ...p }); setEditId(p.id); setOpen(true); }} aria-label="ویرایش"><Pencil className="w-4 h-4 text-gray-300" /></button>
                  <button className="p-2 rounded-lg hover:bg-[#26292f]" onClick={() => remove(p.id)} aria-label="حذف"><Trash2 className="w-4 h-4 text-[#d32f2f]" /></button>
                </div>
              </div>
              <div className="text-xs text-gray-400 space-y-1 break-all">
                <div>🔗 {p.url || "—"}</div>
                <div>🧩 Inbound: {p.inbound_id || "—"}</div>
                <div>✍️ نام‌گذاری: {(NAMING_PATTERNS.find(n => n.value === p.naming_pattern) || {}).label || "—"}</div>
              </div>
              <div className="flex items-center gap-3">
                <button className={`px-3 py-2 rounded-xl text-xs ${BTN.ghost}`} onClick={() => testConnection(p.id)}>تست اتصال</button>
                {test?.id === p.id && (
                  <span className={`text-xs flex items-center gap-1 ${test.ok ? "text-[#4caf50]" : test.ok === false ? "text-[#d32f2f]" : "text-gray-400"}`}>
                    {test.ok === true ? <CheckCircle2 className="w-3.5 h-3.5" /> : test.ok === false ? <XCircle className="w-3.5 h-3.5" /> : null}
                    {test.msg}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editId ? "ویرایش پنل" : "اتصال پنل جدید"}>
        <Field label="نام پنل / سرور"><input className={inputCls} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="مثلاً: سرور آلمان ۱" /></Field>
        <Field label="نوع پنل">
          <select className={inputCls} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
            {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </Field>
        <Field label={form.type === "gurdv2" ? "آدرس API پایه" : "آدرس پنل (با http/https)"}><input dir="ltr" className={inputCls} value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} placeholder={form.type === "gurdv2" ? "https://panel.example.com" : "https://panel.example.com:2053"} /></Field>
        {form.type === "gurdv2" ? (
          <Field label="توکن API"><input dir="ltr" className={inputCls} value={form.token} onChange={e => setForm({ ...form, token: e.target.value })} /></Field>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="نام کاربری پنل"><input dir="ltr" className={inputCls} value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} /></Field>
              <Field label="رمز عبور پنل"><input dir="ltr" type="password" className={inputCls} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></Field>
            </div>
            <Field label="شناسه Inbound"><input dir="ltr" className={inputCls} value={form.inbound_id} onChange={e => setForm({ ...form, inbound_id: e.target.value })} placeholder="1" /></Field>
          </>
        )}
        <Field label="روش ساخت نام کاربری کانفیگ">
          <select className={inputCls} value={form.naming_pattern} onChange={e => setForm({ ...form, naming_pattern: e.target.value })}>
            {NAMING_PATTERNS.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
          </select>
        </Field>
        <Field label="متن دلخواه برای نام‌گذاری (در صورت نیاز)"><input dir="ltr" className={inputCls} value={form.custom_text} onChange={e => setForm({ ...form, custom_text: e.target.value })} placeholder="myshop" /></Field>
        <div className="flex justify-end gap-2 pt-2">
          <button className={`px-4 py-2.5 rounded-xl text-sm ${BTN.ghost}`} onClick={() => setOpen(false)}>انصراف</button>
          <button className={`px-4 py-2.5 rounded-xl text-sm ${BTN.success}`} disabled={busy} onClick={save}>{busy ? "..." : "ذخیره"}</button>
        </div>
      </Modal>
    </div>
  );
}