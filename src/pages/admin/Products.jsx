import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Pencil, Trash2, Package, KeyRound, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { PageHeader, Modal, Field, inputCls, BTN, EmptyState, faNum, money } from "./ui";

const PRODUCT_TYPES = [
  { value: "vpn", label: "اشتراک VPN (اتصال به پنل)" },
  { value: "stock", label: "کد / اکانت آماده (موجودی انبار)" },
  { value: "service", label: "خدمات دیگر (تحویل متنی)" },
];

const emptyProduct = { name: "", category_id: "", type: "vpn", panel_id: "", description: "", low_stock_threshold: 3, active: true };
const emptyPlan = { title: "", volume_gb: "", duration_days: "", price: "", position: 0 };

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [panels, setPanels] = useState([]);
  const [plans, setPlans] = useState([]);
  const [stock, setStock] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [pModal, setPModal] = useState(false);
  const [pForm, setPForm] = useState(emptyProduct);
  const [pEditId, setPEditId] = useState(null);
  const [planModal, setPlanModal] = useState(null); // {productId, editId, form}
  const [stockModal, setStockModal] = useState(null); // productId
  const [codesText, setCodesText] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [p, c, pn, pl, st] = await Promise.all([
      base44.entities.Product.list("-created_date"),
      base44.entities.Category.list("position"),
      base44.entities.Panel.list("-created_date"),
      base44.entities.Plan.list("position"),
      base44.entities.StockItem.list("-created_date", 1000),
    ]);
    setProducts(p.items || p);
    setCategories(c.items || c);
    setPanels(pn.items || pn);
    setPlans(pl.items || pl);
    setStock(st.items || st);
  };
  useEffect(() => { load().catch(() => {}); }, []);

  const catName = id => (categories.find(c => c.id === id) || {}).name || "—";

  const saveProduct = async () => {
    if (!pForm.name) return;
    setBusy(true);
    try {
      const data = { ...pForm, low_stock_threshold: Number(pForm.low_stock_threshold) || 0 };
      if (pEditId) await base44.entities.Product.update(pEditId, data);
      else await base44.entities.Product.create(data);
      setPModal(false); setPEditId(null); setPForm(emptyProduct);
      await load();
    } finally { setBusy(false); }
  };

  const removeProduct = async (id) => {
    if (!window.confirm("محصول به همراه پلن‌ها و موجودی آن حذف شود؟")) return;
    await Promise.all([
      base44.entities.Plan.deleteMany({ product_id: id }),
      base44.entities.StockItem.deleteMany({ product_id: id }),
      base44.entities.Product.delete(id),
    ]);
    await load();
  };

  const savePlan = async () => {
    const f = planModal.form;
    if (!f.title || !f.price) return;
    setBusy(true);
    try {
      const data = { ...f, product_id: planModal.productId, volume_gb: Number(f.volume_gb) || 0, duration_days: Number(f.duration_days) || 0, price: Number(f.price) || 0, position: Number(f.position) || 0 };
      if (planModal.editId) await base44.entities.Plan.update(planModal.editId, data);
      else await base44.entities.Plan.create(data);
      setPlanModal(null);
      await load();
    } finally { setBusy(false); }
  };

  const removePlan = async (id) => {
    if (!window.confirm("این پلن حذف شود؟")) return;
    await base44.entities.Plan.delete(id);
    await load();
  };

  const addStock = async () => {
    const codes = codesText.split("\n").map(s => s.trim()).filter(Boolean);
    if (!codes.length) return;
    setBusy(true);
    try {
      await base44.entities.StockItem.bulkCreate(codes.map(code => ({ product_id: stockModal, code, status: "available" })));
      setStockModal(null); setCodesText("");
      await load();
    } finally { setBusy(false); }
  };

  const plansOf = pid => plans.filter(p => p.product_id === pid);
  const stockOf = pid => stock.filter(s => s.product_id === pid);
  const availOf = pid => stockOf(pid).filter(s => s.status === "available").length;

  return (
    <div className="max-w-5xl">
      <PageHeader title="محصولات و موجودی" subtitle="محصولات VPN، کدهای آماده (اپل آیدی، گیفت کارت) و پلن‌های حجمی/زمانی">
        <button className={`px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 ${BTN.success}`} onClick={() => { setPForm(emptyProduct); setPEditId(null); setPModal(true); }}>
          <Plus className="w-4 h-4" /> محصول جدید
        </button>
      </PageHeader>

      {products.length === 0 ? <EmptyState icon={Package} text="هنوز محصولی اضافه نشده." /> : (
        <div className="space-y-3">
          {products.map(pr => {
            const avail = availOf(pr.id);
            const threshold = Number(pr.low_stock_threshold) || 0;
            const low = pr.type === "stock" && avail <= threshold;
            const open = expanded === pr.id;
            return (
              <div key={pr.id} className="bg-[#1c1e21] border border-[#2a2d33] rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 gap-3">
                  <button className="flex items-center gap-3 flex-1 text-right min-w-0" onClick={() => setExpanded(open ? null : pr.id)}>
                    {open ? <ChevronUp className="w-4 h-4 text-gray-500 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" />}
                    <div className="min-w-0">
                      <div className="font-bold text-sm flex items-center gap-2 flex-wrap">
                        {pr.name}
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#3282b8]/15 text-[#82c3ea]">{(PRODUCT_TYPES.find(t => t.value === pr.type) || {}).label?.split(" ")[0] || pr.type}</span>
                        {pr.active === false && <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-500/15 text-gray-400">غیرفعال</span>}
                      </div>
                      <div className="text-[11px] text-gray-500 mt-1 truncate">
                        {catName(pr.category_id)}
                        {pr.type === "stock" && <> — موجودی: {faNum(avail)}</>}
                        {low && <span className="text-[#d32f2f]"> ⚠ کم</span>}
                      </div>
                    </div>
                  </button>
                  <div className="flex gap-1 shrink-0">
                    <button className="p-2 rounded-lg hover:bg-[#26292f]" onClick={() => { setPForm({ ...emptyProduct, ...pr }); setPEditId(pr.id); setPModal(true); }} aria-label="ویرایش"><Pencil className="w-4 h-4 text-gray-300" /></button>
                    <button className="p-2 rounded-lg hover:bg-[#26292f]" onClick={() => removeProduct(pr.id)} aria-label="حذف"><Trash2 className="w-4 h-4 text-[#d32f2f]" /></button>
                  </div>
                </div>

                {open && (
                  <div className="border-t border-[#2a2d33] px-5 py-4 space-y-5">
                    {pr.description && <p className="text-xs text-gray-400 leading-6">{pr.description}</p>}

                    {/* Plans */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-bold text-gray-300">پلن‌ها (قیمت حجمی / زمانی)</h4>
                        <button className={`px-3 py-1.5 rounded-lg text-xs ${BTN.ghost}`} onClick={() => setPlanModal({ productId: pr.id, editId: null, form: emptyPlan })}>
                          <Plus className="w-3.5 h-3.5 inline ml-1" /> پلن جدید
                        </button>
                      </div>
                      {plansOf(pr.id).length === 0 ? <p className="text-xs text-gray-500 py-2">پلنی ثبت نشده.</p> : (
                        <div className="space-y-1.5">
                          {plansOf(pr.id).map(pl => (
                            <div key={pl.id} className="flex items-center justify-between bg-[#23262c] rounded-xl px-4 py-2.5 text-xs">
                              <div className="flex items-center gap-3 flex-wrap">
                                <span className="font-bold">{pl.title}</span>
                                {pl.volume_gb > 0 && <span className="text-gray-400">📊 {faNum(pl.volume_gb)} گیگ</span>}
                                {pl.duration_days > 0 && <span className="text-gray-400">⏱ {faNum(pl.duration_days)} روز</span>}
                                <span className="text-[#4caf50] font-bold">{money(pl.price)}</span>
                              </div>
                              <div className="flex gap-1">
                                <button className="p-1.5 rounded hover:bg-[#2f333a]" onClick={() => setPlanModal({ productId: pr.id, editId: pl.id, form: { ...emptyPlan, ...pl } })} aria-label="ویرایش پلن"><Pencil className="w-3.5 h-3.5 text-gray-300" /></button>
                                <button className="p-1.5 rounded hover:bg-[#2f333a]" onClick={() => removePlan(pl.id)} aria-label="حذف پلن"><Trash2 className="w-3.5 h-3.5 text-[#d32f2f]" /></button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Stock */}
                    {pr.type === "stock" && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-xs font-bold text-gray-300 flex items-center gap-2">
                            <KeyRound className="w-3.5 h-3.5" /> موجودی انبار (کدها)
                            {low && <span className="text-[#d32f2f] flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> کم است</span>}
                          </h4>
                          <button className={`px-3 py-1.5 rounded-lg text-xs ${BTN.ghost}`} onClick={() => { setStockModal(pr.id); setCodesText(""); }}>
                            <Plus className="w-3.5 h-3.5 inline ml-1" /> افزودن کد
                          </button>
                        </div>
                        <p className="text-xs text-gray-500">موجود: <span className="text-[#4caf50]">{faNum(avail)}</span> — فروخته‌شده: {faNum(stockOf(pr.id).length - avail)}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Product modal */}
      <Modal open={pModal} onClose={() => setPModal(false)} title={pEditId ? "ویرایش محصول" : "محصول جدید"}>
        <Field label="نام محصول"><input className={inputCls} value={pForm.name} onChange={e => setPForm({ ...pForm, name: e.target.value })} placeholder="اپل آیدی آمریکا / اشتراک ۱۰ گیگی" /></Field>
        <Field label="دسته‌بندی">
          <select className={inputCls} value={pForm.category_id} onChange={e => setPForm({ ...pForm, category_id: e.target.value })}>
            <option value="">— انتخاب کنید —</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
        </Field>
        <Field label="نوع محصول و نحوه تحویل">
          <select className={inputCls} value={pForm.type} onChange={e => setPForm({ ...pForm, type: e.target.value, panel_id: e.target.value === "vpn" ? pForm.panel_id : "" })}>
            {PRODUCT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </Field>
        {pForm.type === "vpn" && (
          <Field label="پنل متصل">
            <select className={inputCls} value={pForm.panel_id} onChange={e => setPForm({ ...pForm, panel_id: e.target.value })}>
              <option value="">— انتخاب پنل —</option>
              {panels.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
        )}
        <Field label="توضیحات (برای مشتری)"><textarea rows={3} className={inputCls} value={pForm.description} onChange={e => setPForm({ ...pForm, description: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="حد هشدار کمبود موجودی"><input type="number" className={inputCls} value={pForm.low_stock_threshold} onChange={e => setPForm({ ...pForm, low_stock_threshold: e.target.value })} /></Field>
          <label className="flex items-end gap-2 text-sm text-gray-300 pb-2">
            <input type="checkbox" checked={pForm.active !== false} onChange={e => setPForm({ ...pForm, active: e.target.checked })} className="accent-[#4caf50]" />
            فعال در فروشگاه
          </label>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button className={`px-4 py-2.5 rounded-xl text-sm ${BTN.ghost}`} onClick={() => setPModal(false)}>انصراف</button>
          <button className={`px-4 py-2.5 rounded-xl text-sm ${BTN.success}`} disabled={busy} onClick={saveProduct}>{busy ? "..." : "ذخیره"}</button>
        </div>
      </Modal>

      {/* Plan modal */}
      <Modal open={!!planModal} onClose={() => setPlanModal(null)} title={planModal?.editId ? "ویرایش پلن" : "پلن جدید"}>
        <Field label="عنوان پلن"><input className={inputCls} value={planModal?.form.title || ""} onChange={e => setPlanModal(m => ({ ...m, form: { ...m.form, title: e.target.value } }))} placeholder="یک ماهه ۱۰ گیگی" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="حجم (گیگ — ۰ = بدون محدودیت)"><input type="number" className={inputCls} value={planModal?.form.volume_gb ?? ""} onChange={e => setPlanModal(m => ({ ...m, form: { ...m.form, volume_gb: e.target.value } }))} /></Field>
          <Field label="مدت (روز — ۰ = نامحدود)"><input type="number" className={inputCls} value={planModal?.form.duration_days ?? ""} onChange={e => setPlanModal(m => ({ ...m, form: { ...m.form, duration_days: e.target.value } }))} /></Field>
        </div>
        <Field label="قیمت (تومان)"><input type="number" className={inputCls} value={planModal?.form.price ?? ""} onChange={e => setPlanModal(m => ({ ...m, form: { ...m.form, price: e.target.value } }))} /></Field>
        <Field label="ترتیب نمایش"><input type="number" className={inputCls} value={planModal?.form.position ?? 0} onChange={e => setPlanModal(m => ({ ...m, form: { ...m.form, position: e.target.value } }))} /></Field>
        <div className="flex justify-end gap-2 pt-2">
          <button className={`px-4 py-2.5 rounded-xl text-sm ${BTN.ghost}`} onClick={() => setPlanModal(null)}>انصراف</button>
          <button className={`px-4 py-2.5 rounded-xl text-sm ${BTN.success}`} disabled={busy} onClick={savePlan}>{busy ? "..." : "ذخیره"}</button>
        </div>
      </Modal>

      {/* Stock modal */}
      <Modal open={!!stockModal} onClose={() => setStockModal(null)} title="افزودن کد به انبار">
        <Field label="هر کد در یک خط (کپی/پیست انبوه)"><textarea rows={8} dir="ltr" className={inputCls} value={codesText} onChange={e => setCodesText(e.target.value)} placeholder={"CODE-AAAA-1111\nCODE-BBBB-2222"} /></Field>
        <p className="text-xs text-gray-500">{faNum(codesText.split("\n").filter(s => s.trim()).length)} کد آماده افزودن</p>
        <div className="flex justify-end gap-2 pt-2">
          <button className={`px-4 py-2.5 rounded-xl text-sm ${BTN.ghost}`} onClick={() => setStockModal(null)}>انصراف</button>
          <button className={`px-4 py-2.5 rounded-xl text-sm ${BTN.success}`} disabled={busy} onClick={addStock}>{busy ? "..." : "افزودن"}</button>
        </div>
      </Modal>
    </div>
  );
}