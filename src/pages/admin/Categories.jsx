import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Pencil, Trash2, FolderTree } from "lucide-react";
import { PageHeader, Modal, Field, inputCls, BTN, EmptyState } from "./ui";

const empty = { name: "", icon: "🗂", position: 0, active: true };

export default function Categories() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async () => setItems(await base44.entities.Category.list("position"));
  useEffect(() => { load().catch(() => {}); }, []);

  const save = async () => {
    if (!form.name) return;
    setBusy(true);
    try {
      const data = { ...form, position: Number(form.position) || 0 };
      if (editId) await base44.entities.Category.update(editId, data);
      else await base44.entities.Category.create(data);
      setOpen(false); setForm(empty); setEditId(null);
      await load();
    } finally { setBusy(false); }
  };

  const remove = async (id) => {
    if (!window.confirm("این دسته‌بندی حذف شود؟ محصولات آن حذف نمی‌شوند.")) return;
    await base44.entities.Category.delete(id);
    await load();
  };

  return (
    <div className="max-w-3xl">
      <PageHeader title="دسته‌بندی‌ها" subtitle="دسته‌های فروشگاه (سرویس‌های VPN، اپل آیدی، گیفت کارت و ...)">
        <button className={`px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 ${BTN.success}`} onClick={() => { setForm(empty); setEditId(null); setOpen(true); }}>
          <Plus className="w-4 h-4" /> دسته‌بندی جدید
        </button>
      </PageHeader>

      {items.length === 0 ? <EmptyState icon={FolderTree} text="هنوز دسته‌بندی‌ای ساخته نشده." /> : (
        <div className="bg-[#1c1e21] border border-[#2a2d33] rounded-2xl divide-y divide-[#2a2d33]">
          {items.map(c => (
            <div key={c.id} className="flex items-center justify-between px-5 py-3.5">
              <div className="flex items-center gap-3">
                <span className="text-xl">{c.icon || "🗂"}</span>
                <div>
                  <div className="font-bold text-sm">{c.name}</div>
                  <div className="text-[11px] text-gray-500">ترتیب: {c.position ?? 0}{c.active === false ? " — غیرفعال" : ""}</div>
                </div>
              </div>
              <div className="flex gap-1">
                <button className="p-2 rounded-lg hover:bg-[#26292f]" onClick={() => { setForm({ ...empty, ...c }); setEditId(c.id); setOpen(true); }} aria-label="ویرایش"><Pencil className="w-4 h-4 text-gray-300" /></button>
                <button className="p-2 rounded-lg hover:bg-[#26292f]" onClick={() => remove(c.id)} aria-label="حذف"><Trash2 className="w-4 h-4 text-[#d32f2f]" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editId ? "ویرایش دسته‌بندی" : "دسته‌بندی جدید"}>
        <Field label="نام"><input className={inputCls} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="اپل آیدی و گیفت کارت" /></Field>
        <Field label="آیکون (ایموجی)"><input className={inputCls} value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })} placeholder="🗂" /></Field>
        <Field label="ترتیب نمایش"><input type="number" className={inputCls} value={form.position} onChange={e => setForm({ ...form, position: e.target.value })} /></Field>
        <label className="flex items-center gap-2 text-sm text-gray-300">
          <input type="checkbox" checked={form.active !== false} onChange={e => setForm({ ...form, active: e.target.checked })} className="accent-[#4caf50]" />
          فعال
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <button className={`px-4 py-2.5 rounded-xl text-sm ${BTN.ghost}`} onClick={() => setOpen(false)}>انصراف</button>
          <button className={`px-4 py-2.5 rounded-xl text-sm ${BTN.success}`} disabled={busy} onClick={save}>{busy ? "..." : "ذخیره"}</button>
        </div>
      </Modal>
    </div>
  );
}