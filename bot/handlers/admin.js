// Admin menu — everything the owner needs inside the bot (mirrors the web panel).
import { InlineKeyboard } from "grammy";
import { api, money, faDate, faNum } from "../api.js";
import { boot, feat, setting, FEATURE_LIST, invalidate } from "../store.js";
import { setState, getState, clearState } from "../state.js";
import { getAdapter, listAdapters } from "../adapters/index.js";
import { NAMING_PATTERNS, patternLabel } from "../username.js";
import { cfg } from "../config.js";
import { adminMainMenu, shopAdminMenu, mainMenu } from "../keyboards.js";

export async function adminRoute(ctx, text) {
  switch (text) {
    case "🏬 فروشگاه": await ctx.reply("🏬 منوی فروشگاه 👇", { reply_markup: shopAdminMenu() }); return true;
    case "🛒 فروشگاه مشتری": { const { shopEntry } = await import("./shop.js"); await shopEntry(ctx); return true; }
    case "⏪ منوی اصلی": await ctx.reply("منوی اصلی 👇", { reply_markup: adminMainMenu() }); return true;
    case "🌐 پنل وب": {
      const b = await boot();
      const url = setting(b.settings, "web.url", "");
      if (url) await ctx.reply("🌐 پنل مدیریت وب:", { reply_markup: { inline_keyboard: [[{ text: "باز کردن پنل", url }]] } });
      else await ctx.reply("آدرس پنل وب در تنظیمات (web.url) ثبت نشده است.");
      return true;
    }
    case "🧾 رسیدها در انتظار": return showPendingReceipts(ctx) || true;
    case "📊 نمای کلی و آمار": return showStats(ctx) || true;
    case "💰 امور مالی": return showFinance(ctx) || true;
    case "🎧 مدیریت پشتیبانی": return showSupport(ctx) || true;
    case "👥 کاربران": {
      setState(ctx.chat.id, "users_search", {});
      await ctx.reply("👥 آیدی عددی یا یوزرنیم کاربر را ارسال کنید:");
      return true;
    }
    case "🎓 مرکز آموزش": await ctx.reply("🎓 مرکز آموزش:\n\n• آموزش خرید: از فروشگاه، دسته و پلن را انتخاب و پرداخت کنید.\n• آموزش اتصال: کانفیگ را کپی یا QR را اسکن کنید.\n• آموزش تمدید: سرویس‌های من → انتخاب سرویس → تمدید."); return true;
    case "⚙️ تنظیمات": return showSettingsMenu(ctx) || true;
    case "🤖 دستیار راهنما": await ctx.reply("🤖 دستیار راهنما:\n\nبرای هر مشکل:\n1) وضعیت اتصال سرور را از «🖥 سرورها» بررسی کنید.\n2) پیام‌های خطای کاربران را از بخش پشتیبانی ببینید.\n3) موجودی انبار را از پنل وب چک کنید."); return true;
    case "📚 راهنمای ادمین": await ctx.reply("📚 راهنمای ادمین:\n\n• اتصال پنل: 🖥 سرورها → ➕ اتصال سرور جدید\n• محصولات، پلن‌ها و انبار: پنل وب\n• قابلیت‌های فروشگاه: 📏 قابلیت‌های فروشگاه\n• تایید پرداخت: 🧾 رسیدها در انتظار\n• پاسخ به کاربر: /reply <آیدی_کاربر> <متن>"); return true;
    case "🖥 سرورها": case "📦 مدیریت پنل‌ها": return showPanels(ctx) || true;
    case "🗂 دسته‌بندی‌ها": return showCategories(ctx) || true;
    case "📏 قابلیت‌های فروشگاه": return showFeatures(ctx) || true;
    case "📊 نرخ‌گذاری حجمی": case "⏱ نرخ‌گذاری زمانی": {
      await ctx.reply("📊 نرخ‌گذاری حجمی/زمانی در پلن‌های هر محصول انجام می‌شود (حجم گیگ + مدت روز + قیمت).\nمدیریت کامل پلن‌ها در پنل وب انجام می‌شود.");
      return true;
    }
    case "⬇️ حداقل موجودی خرید عمده": {
      setState(ctx.chat.id, "set_setting", { key: "wholesale.min_qty", title: "حداقل موجودی خرید عمده (عدد)" });
      await ctx.reply("⬇️ حداقل موجودی برای خرید عمده را ارسال کنید (عدد):");
      return true;
    }
    case "💲 کش‌بک تمدید": {
      setState(ctx.chat.id, "set_setting", { key: "cashback.percent", title: "درصد کش‌بک تمدید" });
      await ctx.reply("💲 درصد کش‌بک برای تمدید را ارسال کنید (عدد 0 تا 100):");
      return true;
    }
    case "🏷 جشنواره و تخفیف‌ها": {
      const b = await boot();
      const current = setting(b.settings, "discount.percent", "0");
      setState(ctx.chat.id, "set_setting", { key: "discount.percent", title: "درصد تخفیف جشنواره" });
      await ctx.reply(`🏷 تخفیف فعلی: ${faNum(current)}٪\n\nدرصد جدید را ارسال کنید (0 برای حذف تخفیف):`);
      return true;
    }
    default: return false;
  }
}

async function showStats(ctx) {
  const s = await api("stats", {});
  await ctx.reply(
    `📊 نمای کلی و آمار\n\n` +
    `✅ سفارش تحویل‌شده: ${faNum(s.delivered)}\n` +
    `⏳ پرداخت‌شده و بی‌تحویل: ${faNum(s.paidUndelivered)}\n` +
    `👥 کاربران: ${faNum(s.users)}\n` +
    `🧾 رسید در انتظار: ${faNum(s.pendingReceipts)}\n` +
    `💰 درآمد کل: ${money(s.revenue)}`
  );
}

async function showPendingReceipts(ctx) {
  const receipts = await api("receipts/pending", {});
  if (!receipts.length) return ctx.reply("🧾 رسید در انتظاری وجود ندارد. ✅");
  const ik = new InlineKeyboard();
  receipts.forEach((r) => {
    ik.text(`${money(r.amount)} — @${r.username || r.telegram_id}`, `rvw:${r.id}`).row();
  });
  await ctx.reply(`🧾 ${faNum(receipts.length)} رسید در انتظار تایید:`, { reply_markup: ik });
}

async function showFinance(ctx) {
  const b = await boot();
  const txs = await api("transactions/list", {});
  let text = `💰 امور مالی\n\n💳 کارت: ${setting(b.settings, "payment.card_number", "—")}\n👤 به نام: ${setting(b.settings, "payment.card_holder", "—")}\n\nآخرین تراکنش‌ها:\n`;
  (txs || []).slice(0, 10).forEach((tx) => {
    text += `\n• ${tx.type === "topup" ? "⬆️" : tx.type === "purchase" ? "🛒" : "🔔"} ${money(tx.amount)} — ${tx.note || tx.type}`;
  });
  await ctx.reply(text);
}

async function showSupport(ctx) {
  const msgs = await api("support/list", {});
  if (!msgs.length) return ctx.reply("🎧 پیام پشتیبانی جدیدی نیست. ✅");
  let text = "🎧 آخرین پیام‌های پشتیبانی:\n";
  (msgs || []).forEach((m) => { text += `\n• @${m.username || m.telegram_id}: ${String(m.text).slice(0, 80)}${m.status === "answered" ? " ✅" : " ⏳"}`; });
  text += "\n\nبرای پاسخ: /reply <آیدی_عددی_کاربر> <متن>";
  await ctx.reply(text);
}

async function showSettingsMenu(ctx) {
  const b = await boot();
  const items = [
    ["payment.card_number", "💳 شماره کارت", setting(b.settings, "payment.card_number", "—")],
    ["payment.card_holder", "👤 صاحب کارت", setting(b.settings, "payment.card_holder", "—")],
    ["gateway.zarinpal_merchant", "🌐 مرچنت زرین‌پال", setting(b.settings, "gateway.zarinpal_merchant", "(از .env) —")],
    ["texts.welcome", "👋 متن خوش‌آمد", "(ویرایش)"],
    ["texts.help", "🤖 متن راهنما", "(ویرایش)"],
    ["texts.outage", "📢 متن اعلام اخطار", "(ویرایش)"],
    ["bot.language", "🌐 زبان ربات", setting(b.settings, "bot.language", "fa")],
    ["gift.product_id", "🎁 محصول هدیه", setting(b.settings, "gift.product_id", "—")],
  ];
  const ik = new InlineKeyboard();
  items.forEach(([key, label, cur]) => ik.text(`${label} — ${cur}`, `set:${key}`).row());
  await ctx.reply("⚙️ تنظیمات:\nروی هر مورد بزنید و مقدار جدید را ارسال کنید:", { reply_markup: ik });
}

async function showPanels(ctx) {
  const b = await boot();
  const panels = b.panels || [];
  const ik = new InlineKeyboard();
  panels.forEach((p) => ik.text(`${p.name} (${p.type === "3xui" ? "3x-ui" : "Gurd v2"})`, `pnl:${p.id}`).row());
  ik.text("➕ اتصال سرور جدید", "pnl:new").row();
  ik.text("⏪ منوی اصلی", "back:main");
  await ctx.reply(panels.length ? "🖥 سرورها و پنل‌ها:\nیکی را انتخاب کنید یا سرور جدید اضافه کنید:" : "🖥 هنوز سروری ثبت نشده — اتصال سرور جدید را بزنید:", { reply_markup: ik });
}

async function showCategories(ctx) {
  const b = await boot();
  const ik = new InlineKeyboard();
  (b.categories || []).forEach((c) => ik.text(`${c.icon || "🗂"} ${c.name}${c.active === false ? " (غیرفعال)" : ""}`, `catx:${c.id}`).row());
  ik.text("➕ دسته‌بندی جدید", "catx:new").row();
  ik.text("⏪ منوی اصلی", "back:main");
  await ctx.reply("🗂 دسته‌بندی‌ها (مدیریت کامل در پنل وب):", { reply_markup: ik });
}

async function showFeatures(ctx) {
  const b = await boot();
  const ik = new InlineKeyboard();
  FEATURE_LIST.forEach((f) => {
    const on = feat(b.settings, f.key);
    ik.text(`${f.icon} ${f.label}`, `noop:`);
    ik.text(on ? "✅ روشن" : "🚫 خاموش", `tgl:${f.key}`).row();
  });
  await ctx.reply("📏 قابلیت‌های فروشگاه — وضعیت هر قابلیت را با دکمه سمت چپ تغییر دهید:", { reply_markup: ik });
}

// ── conversation states for admin ──
export async function handleStateInput(ctx, state) {
  const text = String(ctx.msg?.text || "").trim();

  if (state.flow === "set_setting") {
    clearState(ctx.chat.id);
    await api("settings/set", { key: state.data.key, value: text });
    invalidate();
    await ctx.reply("✅ ذخیره شد.");
    return true;
  }

  if (state.flow === "users_search") {
    clearState(ctx.chat.id);
    const id = text.replace(/^@/, "");
    const user = await api("users/get", { telegram_id: id }).catch(() => null);
    if (!user) return ctx.reply("❌ کاربری با این آیدی یافت نشد.");
    const ik = new InlineKeyboard().text("➕ شارژ کیف پول", `uadj:${user.id}`).row();
    await ctx.reply(
      `👤 ${user.first_name || "—"} (@${user.username || "—"})\n🆔 ${user.telegram_id}\n💰 موجودی: ${money(user.balance)}${user.phone ? `\n📱 ${user.phone}` : ""}`,
      { reply_markup: ik }
    );
    return true;
  }

  if (state.flow === "uadj_amount") {
    clearState(ctx.chat.id);
    const delta = Number(text.replace(/[^\d-]/g, ""));
    if (!delta) return ctx.reply("عدد معتبر وارد کنید:");
    await api("wallet/adjust", { telegram_id: state.data.telegram_id, delta, type: "adjust", note: delta > 0 ? "شارژ دستی توسط مدیر" : "کسر دستی توسط مدیر", notified: false });
    invalidate();
    await ctx.reply(`✅ انجام شد. مبلغ ${money(delta)} به کیف پول کاربر اعمال شد.`);
    return true;
  }

  if (await handlePanelEdit(ctx, state, text)) return true;

  if (state.flow === "addpanel") {
    const d = state.data;
    if (d.step === "url") {
      if (!/^https?:\/\//.test(text)) { await ctx.reply("آدرس باید با http:// یا https:// شروع شود:"); return true; }
      d.url = text; d.step = d.type === "3xui" ? "username" : "token";
      setState(ctx.chat.id, "addpanel", d);
      await ctx.reply(d.type === "3xui" ? "👤 نام کاربری پنل را ارسال کنید:" : "🔑 توکن API را ارسال کنید:");
      return true;
    }
    if (d.step === "username") { d.username = text; d.step = "password"; setState(ctx.chat.id, "addpanel", d); await ctx.reply("🔑 رمز عبور پنل را ارسال کنید:"); return true; }
    if (d.step === "password" || d.step === "token") {
      if (d.step === "password") d.password = text; else d.token = text;
      clearState(ctx.chat.id);
      try {
        const panelDraft = { type: d.type, url: d.url, username: d.username || "", password: d.password || "", token: d.token || "" };
        const adapter = getAdapter(panelDraft);
        const inbounds = adapter && d.type === "3xui" ? await adapter.listInbounds(panelDraft) : [];
        const ik = new InlineKeyboard();
        if (d.type === "3xui") {
          inbounds.slice(0, 15).forEach((i) => ik.text(`${i.remark || "inbound"} (#${i.id})`, `ib:${i.id}`).row());
        } else {
          ik.text("بدون inbound (Gurd v2)", "ib:0").row();
        }
        setState(ctx.chat.id, "addpanel_pick_inbound", d);
        await ctx.reply(d.type === "3xui" ? "🧩 Inbound موردنظر را انتخاب کنید:" : "✅ — ادامه دهید:", { reply_markup: ik });
      } catch (e) {
        await ctx.reply(`❌ اتصال به پنل ناموفق بود: ${e.message}\n\nاز نو تلاش کنید: 🖥 سرورها → ➕ اتصال سرور جدید`);
      }
      return true;
    }
  }

  if (state.flow === "addpanel_custom_text") {
    clearState(ctx.chat.id);
    state.data.custom_text = text;
    await api("panel/create", { ...state.data });
    invalidate();
    await ctx.reply(`✅ سرور «${state.data.name || state.data.url}» ثبت شد!`, { reply_markup: adminMainMenu() });
    return true;
  }

  if (state.flow === "addcat") {
    clearState(ctx.chat.id);
    const [name, icon] = text.split("|").map((s) => s.trim());
    await api("settings/set", { key: `cat.${Date.now()}`, value: name }); // placeholder — categories live in the web panel
    invalidate();
    await ctx.reply("✅ (دسته‌بندی‌ها به‌صورت کامل از پنل وب مدیریت می‌شوند.)");
    return true;
  }

  return false;
}

export function register(bot) {
  bot.command("reply", async (ctx) => {
    if (!cfg.adminIds.includes(String(ctx.from.id))) return;
    const parts = (ctx.msg.text || "").split(" ");
    const target = parts[1];
    const replyText = parts.slice(2).join(" ");
    if (!target || !replyText) return ctx.reply("استفاده: /reply <آیدی_عددی_کاربر> <متن>");
    await ctx.api.sendMessage(target, `🎧 پاسخ پشتیبانی:\n\n${replyText}`).catch(() => ctx.reply("❌ ارسال ناموفق (کاربر ربات را شروع نکرده است)."));
    await ctx.reply("✅ ارسال شد.");
  });

  bot.callbackQuery(/^rvw:/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const receipts = await api("receipts/pending", {});
    const r = receipts.find((x) => x.id === ctx.callbackQuery.data.split(":")[1]);
    if (!r) return ctx.reply("❌ رسید یافت نشد یا قبلاً بررسی شده است.");
    const ik = new InlineKeyboard().text("✅ تایید", `rapp:${r.id}`).text("❌ رد", `rrej:${r.id}`).row();
    await ctx.reply(`🧾 رسید\n👤 @${r.username || r.telegram_id}\n💲 ${money(r.amount)}\n📝 ${r.note || "—"}`, { reply_markup: ik });
  });

  const decide = (approve) => async (ctx) => {
    await ctx.answerCallbackQuery({ text: approve ? "تایید شد" : "رد شد" });
    await api("receipt/decide", { id: ctx.callbackQuery.data.split(":")[1], approve });
    await ctx.editMessageReplyMarkup({ reply_markup: undefined }).catch(() => {});
    await ctx.reply(approve ? "✅ رسید تایید شد و کیف پول کاربر شارژ شد." : "❌ رسید رد شد.");
  };
  bot.callbackQuery(/^rapp:/, decide(true));
  bot.callbackQuery(/^rrej:/, decide(false));

  bot.callbackQuery(/^uadj:/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const user = await api("users/get", { telegram_id: ctx.callbackQuery.data.split(":")[1] });
    if (!user) return;
    setState(ctx.chat.id, "uadj_amount", { telegram_id: user.telegram_id });
    await ctx.reply(`💰 مبلغ تغییر موجودی را ارسال کنید (منفی برای کسر). موجودی فعلی: ${money(user.balance)}`);
  });

  bot.callbackQuery(/^set:/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const key = ctx.callbackQuery.data.slice(4);
    setState(ctx.chat.id, "set_setting", { key });
    await ctx.reply(`✍️ مقدار جدید برای «${key}» را ارسال کنید:`);
  });

  bot.callbackQuery(/^tgl:/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const key = ctx.callbackQuery.data.split(":")[1];
    const b = await boot();
    const on = feat(b.settings, key);
    await api("settings/set", { key: `features.${key}`, value: String(!on) });
    invalidate();
    const bb = await boot(true);
    const ik = new InlineKeyboard();
    FEATURE_LIST.forEach((f) => {
      const isOn = feat(bb.settings, f.key);
      ik.text(`${f.icon} ${f.label}`, "noop:").text(isOn ? "✅ روشن" : "🚫 خاموش", `tgl:${f.key}`).row();
    });
    await ctx.editMessageReplyMarkup({ reply_markup: ik }).catch(() => {});
  });

  bot.callbackQuery(/^noop:/, (ctx) => ctx.answerCallbackQuery());

  bot.callbackQuery(/^catx:/, async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply("🗂 مدیریت دسته‌بندی‌ها (نام، آیکون، ترتیب و فعال/غیرفعال) از پنل وب انجام می‌شود.", { reply_markup: { inline_keyboard: [[{ text: "⏪ منوی اصلی", callback_data: "back:main" }]] } });
  });

  bot.callbackQuery(/^pnl:/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const arg = ctx.callbackQuery.data.split(":")[1];
    if (arg === "new") {
      const ik = new InlineKeyboard().text("3x-ui (MHSanaei)", "ptype:3xui").row().text("Gurd v2 (Solid Layer)", "ptype:gurdv2").row();
      return ctx.reply("🔌 نوع پنل را انتخاب کنید:", { reply_markup: ik });
    }
    const b = await boot();
    const panel = (b.panels || []).find((p) => p.id === arg);
    if (!panel) return;
    const ik = new InlineKeyboard()
      .text("🔐 تست اتصال", `ptest:${panel.id}`).row()
      .text("✍️ تغییر نام", `pnm:${panel.id}`).row()
      .text("🔗 تغییر آدرس", `purl:${panel.id}`).row()
      .text("⚙️ روش نام‌گذاری", `pnpat:${panel.id}`).row()
      .text("🗑 حذف", `pdel:${panel.id}`).row()
      .text("⏪ بازگشت", "pnls");
    await ctx.reply(`🖥 ${panel.name}\nنوع: ${panel.type}\nآدرس: ${panel.url}\nInbound: ${panel.inbound_id || "—"}\nنام‌گذاری: ${patternLabel(panel.naming_pattern)}`, { reply_markup: ik });
  });

  bot.callbackQuery(/^pnls/, async (ctx) => { await ctx.answerCallbackQuery(); await showPanels(ctx); });

  bot.callbackQuery(/^ptype:/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const type = ctx.callbackQuery.data.split(":")[1];
    setState(ctx.chat.id, "addpanel", { type, step: "url", name: "" });
    await ctx.reply("🔗 آدرس پنل را ارسال کنید (با https:// شروع شود):");
  });

  bot.callbackQuery(/^ib:/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const state = getState(ctx.chat.id);
    if (!state || state.flow !== "addpanel_pick_inbound") return;
    const inboundId = ctx.callbackQuery.data.split(":")[1];
    clearState(ctx.chat.id);
    const ik = new InlineKeyboard();
    NAMING_PATTERNS.forEach((n) => ik.text(n.label, `np:${n.value}`).row());
    setState(ctx.chat.id, "addpanel_pick_naming", { ...state.data, inbound_id: inboundId });
    await ctx.reply("✍️ روش ساخت نام کاربری کانفیگ را انتخاب کنید:", { reply_markup: ik });
  });

  bot.callbackQuery(/^np:/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const state = getState(ctx.chat.id);
    if (!state || state.flow !== "addpanel_pick_naming") return;
    const pattern = ctx.callbackQuery.data.split(":")[1];
    clearState(ctx.chat.id);
    setState(ctx.chat.id, "addpanel_custom_text", { ...state.data, naming_pattern: pattern });
    await ctx.reply("🏷 متن دلخواه برای نام‌گذاری را ارسال کنید (مثلاً نام فروشگاه):");
  });

  bot.callbackQuery(/^ptest:/, async (ctx) => {
    await ctx.answerCallbackQuery({ text: "در حال بررسی..." });
    const b = await boot();
    const panel = (b.panels || []).find((p) => p.id === ctx.callbackQuery.data.split(":")[1]);
    if (!panel) return;
    try {
      const adapter = getAdapter(panel);
      const msg = await adapter.test(panel);
      await ctx.reply(msg);
    } catch (e) {
      await ctx.reply(`❌ ${e.message}`);
    }
  });

  bot.callbackQuery(/^pnm:/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const id = ctx.callbackQuery.data.split(":")[1];
    setState(ctx.chat.id, "pedit", { id, field: "name" });
    await ctx.reply("✍️ نام جدید را ارسال کنید:");
  });

  bot.callbackQuery(/^purl:/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const id = ctx.callbackQuery.data.split(":")[1];
    setState(ctx.chat.id, "pedit", { id, field: "url" });
    await ctx.reply("🔗 آدرس جدید را ارسال کنید:");
  });

  bot.callbackQuery(/^pnpat:/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const id = ctx.callbackQuery.data.split(":")[1];
    const ik = new InlineKeyboard();
    NAMING_PATTERNS.forEach((n) => ik.text(n.label, `nps:${id}:${n.value}`).row());
    await ctx.reply("⚙️ روش نام‌گذاری را انتخاب کنید:", { reply_markup: ik });
  });

  bot.callbackQuery(/^nps:/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const [, id, pattern] = ctx.callbackQuery.data.split(":");
    await api("panel/update", { id, patch: { naming_pattern: pattern } });
    invalidate();
    await ctx.reply("✅ ذخیره شد.");
  });

  bot.callbackQuery(/^pdel:/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const id = ctx.callbackQuery.data.split(":")[1];
    await api("panel/delete", { id });
    invalidate();
    await ctx.reply("🗑 حذف شد.");
  });

  bot.callbackQuery(/^back:main/, async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply("منوی اصلی 👇", { reply_markup: adminMainMenu() });
  });

}

export async function handlePanelEdit(ctx, state, text) {
  if (state.flow !== "pedit") return false;
  clearState(ctx.chat.id);
  await api("panel/update", { id: state.data.id, patch: { [state.data.field]: text } });
  invalidate();
  await ctx.reply("✅ ذخیره شد.");
  return true;
}