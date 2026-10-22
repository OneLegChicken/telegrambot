const kb = (rows) => ({ keyboard: rows, resize_keyboard: true });

/** Customer main menu */
export const mainMenu = () =>
  kb([
    [{ text: "🏬 فروشگاه" }],
    [{ text: "🖥 سرویس‌های من" }, { text: "💰 کیف پول" }],
    [{ text: "🎧 پشتیبانی" }, { text: "🤖 راهنما" }],
  ]);

/** Admin main menu (mirrors mirzabot layout) */
export const adminMainMenu = () =>
  kb([
    [{ text: "🏬 فروشگاه" }, { text: "🌐 پنل وب" }],
    [{ text: "🧾 رسیدها در انتظار" }, { text: "📊 نمای کلی و آمار" }],
    [{ text: "💰 امور مالی" }, { text: "🎧 مدیریت پشتیبانی" }],
    [{ text: "👥 کاربران" }, { text: "🎓 مرکز آموزش" }],
    [{ text: "⚙️ تنظیمات" }, { text: "🤖 دستیار راهنما" }],
    [{ text: "📚 راهنمای ادمین" }, { text: "⏪ منوی اصلی" }],
  ]);

/** Admin shop menu */
export const shopAdminMenu = () =>
  kb([
    [{ text: "🛒 فروشگاه مشتری" }],
    [{ text: "🖥 سرورها" }],
    [{ text: "📦 مدیریت پنل‌ها" }, { text: "🗂 دسته‌بندی‌ها" }],
    [{ text: "📏 قابلیت‌های فروشگاه" }],
    [{ text: "📊 نرخ‌گذاری حجمی" }, { text: "⏱ نرخ‌گذاری زمانی" }],
    [{ text: "⬇️ حداقل موجودی خرید عمده" }, { text: "💲 کش‌بک تمدید" }],
    [{ text: "🏷 جشنواره و تخفیف‌ها" }],
    [{ text: "⏪ منوی اصلی" }],
  ]);

export const contactKeyboard = () => ({ keyboard: [[{ text: "📱 ارسال شماره تماس", request_contact: true }], [{ text: "⏪ منوی اصلی" }]], resize_keyboard: true });