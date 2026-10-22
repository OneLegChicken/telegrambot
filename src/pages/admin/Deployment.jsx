import { useState } from "react";
import { Download, Copy, Check, Terminal, Rocket, KeyRound, Upload } from "lucide-react";
import { PageHeader, BTN } from "./ui";
import installSh from "/bot/install.sh?raw";
import runSh from "/bot/run.sh?raw";
import envExample from "/bot/env.example.txt?raw";
import readme from "/bot/README.md?raw";
import pkg from "/bot/package.json?raw";

const FILES = [
  { name: "install.sh", desc: "نصب خودکار روی Ubuntu VPS (Node.js + systemd)", content: installSh, lang: "bash" },
  { name: "run.sh", desc: "اجرای دستی ربات", content: runSh, lang: "bash" },
  { name: ".env.example", desc: "فایل تنظیمات نمونه", content: envExample, lang: "env" },
  { name: "package.json", desc: "وابستگی‌های ربات", content: pkg, lang: "json" },
  { name: "README.md", desc: "مستندات کامل پروژه", content: readme, lang: "md" },
];

function CodeFile({ file }) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(file.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const download = () => {
    const blob = new Blob([file.content], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="bg-[#1c1e21] border border-[#2a2d33] rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 gap-3">
        <div>
          <div dir="ltr" className="text-sm font-bold text-[#82c3ea]">{file.name}</div>
          <div className="text-[11px] text-gray-500 mt-0.5">{file.desc}</div>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={() => setOpen(!open)} className={`px-3 py-1.5 rounded-lg text-xs ${BTN.ghost}`}>{open ? "بستن" : "مشاهده"}</button>
          <button onClick={copy} className={`px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 ${BTN.ghost}`}>
            {copied ? <Check className="w-3.5 h-3.5 text-[#4caf50]" /> : <Copy className="w-3.5 h-3.5" />} کپی
          </button>
          <button onClick={download} className={`px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 ${BTN.ghost}`}>
            <Download className="w-3.5 h-3.5" /> دانلود
          </button>
        </div>
      </div>
      {open && (
        <pre dir="ltr" className="bg-[#131519] border-t border-[#2a2d33] p-4 text-[11px] leading-5 text-gray-300 overflow-x-auto max-h-80 overflow-y-auto whitespace-pre">{file.content}</pre>
      )}
    </div>
  );
}

export default function Deployment() {
  const vpsSteps = [
    { icon: Upload, title: "۱. انتشار سورس روی گیت‌هاب", body: "حساب گیت‌هاب خود را از تنظیمات Base44 (بخش Code / GitHub sync) متصل کنید تا کل این مخزن — شامل پوشه کامل ربات در پوشه ربات — روی گیت‌هاب شما منتشر شود." },
    { icon: Terminal, title: "۲. نصب روی سرور اوبونتو", body: "روی VPS خود اجرا کنید:", code: "git clone <YOUR_REPO_URL>\ncd <YOUR_REPO>\nsudo bash bot/install.sh" },
    { icon: KeyRound, title: "۳. تنظیمات (.env)", body: "نصب‌کننده مقدارها را می‌پرسد: توکن ربات از @BotFather، آیدی عددی مدیر، آدرس همین پنل وب، رمز Bot API (از صفحه تنظیمات)، و مرچنت زرین‌پال (اختیاری)." },
    { icon: Rocket, title: "۴. اجرا و مانیتورینگ", body: "ربات به‌عنوان سرویس systemd اجرا می‌شود و پس از ری‌استارت سرور به‌صورت خودکار بالا می‌آید:", code: "systemctl status salesgram\njournalctl -u salesgram -f" },
  ];

  return (
    <div className="max-w-4xl">
      <PageHeader title="استقرار روی سرور" subtitle="انتشار سورس روی گیت‌هاب و نصب ربات روی VPS اوبونتو با یک دستور" />

      <div className="grid md:grid-cols-2 gap-3 mb-8">
        {vpsSteps.map((s, i) => (
          <div key={i} className="bg-[#1c1e21] border border-[#2a2d33] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <s.icon className="w-4.5 h-4.5 w-[18px] h-[18px] text-[#3282b8]" />
              <h3 className="font-bold text-sm">{s.title}</h3>
            </div>
            <p className="text-xs text-gray-400 leading-6">{s.body}</p>
            {s.code && (
              <pre dir="ltr" className="mt-3 bg-[#131519] border border-[#2a2d33] rounded-xl p-3 text-[11px] text-[#82c3ea] overflow-x-auto">{s.code}</pre>
            )}
          </div>
        ))}
      </div>

      <h2 className="font-bold mb-3">فایل‌های نصب و اجرا</h2>
      <div className="space-y-3">
        {FILES.map(f => <CodeFile key={f.name} file={f} />)}
      </div>

      <div className="mt-6 bg-[#3282b8]/10 border border-[#3282b8]/30 rounded-2xl p-5 text-xs text-gray-300 leading-6">
        💡 سورس کامل ربات (گرامY، آداپترهای 3x-ui و Gurd v2، درگاه زرین‌پال، سیستم نام‌گذاری ۹ حالته و منوهای فارسی) در پوشه رباتِ همین مخزن قرار دارد و همراه با آن روی گیت‌هاب منتشر می‌شود.
      </div>
    </div>
  );
}