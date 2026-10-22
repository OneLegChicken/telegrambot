// botapi — the single bridge between the Telegram bot and the shop database.
// The bot authenticates with the shared secret stored in Setting("bot.api_secret");
// the web admin panel calls it while logged in as an admin (for panel connection tests).
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

const page = (res) => (res && res.items ? res.items : res || []);

export default async function (req) {
  try {
    if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || '');
    const p = body.payload || {};

    let authorized = false;
    if (action === 'panelTest') {
      const me = await base44.auth.me().catch(() => null);
      if (me && me.role === 'admin') authorized = true;
    }
    if (!authorized) {
      const secret = req.headers.get('x-bot-secret') || '';
      const settingRes = await base44.asServiceRole.entities.Setting.filter({ key: 'bot.api_secret' }, { limit: 1 });
      const stored = page(settingRes)[0]?.value || '';
      if (!stored || !secret || secret !== stored) {
        return Response.json({ error: 'Unauthorized — bot secret mismatch' }, { status: 401 });
      }
    }

    const E = base44.asServiceRole.entities;
    const result = await route(E, action, p);
    return Response.json({ result });
  } catch (error) {
    return Response.json({ error: String(error?.message || error) });
  }
}

async function route(E, action, p) {
  switch (action) {
    case 'bootstrap': {
      const [settings, panels, categories, products, plans] = await Promise.all([
        E.Setting.list(), E.Panel.list('-created_date'), E.Category.list('position'),
        E.Product.list('-created_date'), E.Plan.list('position'),
      ]);
      const settingsMap = {};
      for (const s of page(settings)) settingsMap[s.key] = s.value;
      return {
        settings: settingsMap,
        panels: page(panels),
        categories: page(categories),
        products: page(products),
        plans: page(plans),
      };
    }

    // ── users & wallet ──
    case 'users/upsert': {
      const found = page(await E.BotUser.filter({ telegram_id: p.telegram_id }, { limit: 1 }));
      if (found.length) return found[0];
      return E.BotUser.create({ telegram_id: p.telegram_id, username: p.username || '', first_name: p.first_name || '', balance: 0, phone: '' });
    }
    case 'users/get': {
      const found = page(await E.BotUser.filter({ telegram_id: p.telegram_id }, { limit: 1 }));
      return found[0] || null;
    }
    case 'wallet/adjust': {
      const found = page(await E.BotUser.filter({ telegram_id: p.telegram_id }, { limit: 1 }));
      let user = found[0];
      if (!user) user = await E.BotUser.create({ telegram_id: p.telegram_id, username: p.username || '', first_name: p.first_name || '', balance: 0, phone: '' });
      const updated = await E.BotUser.update(user.id, { balance: (Number(user.balance) || 0) + Number(p.delta) });
      await E.Transaction.create({
        telegram_id: p.telegram_id, type: p.type || 'adjust', amount: Math.abs(Number(p.delta)),
        note: p.note || '', notified: p.notified !== false ? true : false,
      });
      return updated;
    }
    case 'users/update': {
      return E.BotUser.update(p.id, p.patch || {});
    }

    // ── orders ──
    case 'order/create':
      return E.Order.create(p);
    case 'order/update':
      return E.Order.update(p.id, p.patch || {});
    case 'orders/get':
      return E.Order.get(p.id).catch(() => null);
    case 'orders/list':
      return page(await E.Order.filter(p.telegram_id ? { telegram_id: p.telegram_id } : {}, { sort: '-created_date', limit: p.limit || 50 }));

    // ── stock ──
    case 'stock/count': {
      const items = page(await E.StockItem.filter({ product_id: p.product_id, status: 'available' }, { limit: 500 }));
      return { available: items.length };
    }
    case 'stock/sell': {
      const found = page(await E.StockItem.filter({ product_id: p.product_id, status: 'available' }, { limit: 1 }));
      if (!found.length) return null;
      return E.StockItem.update(found[0].id, { status: 'sold', order_id: p.order_id || '' });
    }

    // ── receipts ──
    case 'receipt/create':
      return E.Receipt.create({ telegram_id: p.telegram_id, username: p.username || '', amount: Number(p.amount), status: 'pending', note: p.note || '' });
    case 'receipts/pending':
      return page(await E.Receipt.filter({ status: 'pending' }, { sort: '-created_date', limit: 50 }));
    case 'receipt/decide': {
      const receipt = await E.Receipt.get(p.id).catch(() => null);
      if (!receipt) throw new Error('رسید یافت نشد');
      if (p.approve) {
        const found = page(await E.BotUser.filter({ telegram_id: receipt.telegram_id }, { limit: 1 }));
        if (found[0]) await E.BotUser.update(found[0].id, { balance: (Number(found[0].balance) || 0) + Number(receipt.amount) });
        await E.Transaction.create({ telegram_id: receipt.telegram_id, type: 'topup', amount: Number(receipt.amount), note: 'شارژ کیف پول (تایید رسید)', notified: false });
        return E.Receipt.update(receipt.id, { status: 'approved' });
      }
      await E.Transaction.create({ telegram_id: receipt.telegram_id, type: 'notification', amount: 0, note: '❌ رسید پرداخت شما تایید نشد. لطفاً با پشتیبانی در تماس باشید.', notified: false });
      return E.Receipt.update(receipt.id, { status: 'rejected' });
    }

    // ── transactions ──
    case 'transaction/create':
      return E.Transaction.create(p);
    case 'transactions/list':
      return page(await E.Transaction.filter(p.telegram_id ? { telegram_id: p.telegram_id } : {}, { sort: '-created_date', limit: p.limit || 20 }));
    case 'transactions/consume': {
      const pending = page(await E.Transaction.filter({ telegram_id: p.telegram_id, notified: false }, { sort: '-created_date', limit: 5 }));
      for (const t of pending) await E.Transaction.update(t.id, { notified: true });
      return pending;
    }

    // ── settings ──
    case 'settings/set': {
      const found = page(await E.Setting.filter({ key: p.key }, { limit: 1 }));
      if (found.length) return E.Setting.update(found[0].id, { value: String(p.value) });
      return E.Setting.create({ key: p.key, value: String(p.value) });
    }
    case 'settings/inc': {
      const found = page(await E.Setting.filter({ key: p.key }, { limit: 1 }));
      const next = (Number(found[0]?.value) || 0) + 1;
      if (found.length) await E.Setting.update(found[0].id, { value: String(next) });
      else await E.Setting.create({ key: p.key, value: String(next) });
      return next;
    }

    // ── panels ──
    case 'panel/create':
      return E.Panel.create(p);
    case 'panel/update':
      return E.Panel.update(p.id, p.patch || {});
    case 'panel/delete':
      return E.Panel.delete(p.id);
    case 'panelTest': {
      const panel = await E.Panel.get(p.panel_id).catch(() => null);
      if (!panel) throw new Error('پنل یافت نشد');
      return testPanel(panel);
    }

    // ── services ──
    case 'services/list':
      return page(await E.Service.filter({ telegram_id: p.telegram_id }, { sort: '-created_date', limit: 50 }));
    case 'services/get':
      return E.Service.get(p.id).catch(() => null);
    case 'service/create':
      return E.Service.create(p);
    case 'service/update':
      return E.Service.update(p.id, p.patch || {});

    // ── support ──
    case 'support/create':
      return E.SupportMessage.create({ telegram_id: p.telegram_id, username: p.username || '', text: p.text || '', status: 'open' });
    case 'support/list':
      return page(await E.SupportMessage.filter({}, { sort: '-created_date', limit: 20 }));
    case 'support/update':
      return E.SupportMessage.update(p.id, p.patch || {});

    // ── stats (admin overview in bot) ──
    case 'stats': {
      const [orders, users, receipts, revenue, pending] = await Promise.all([
        E.Order.count({ status: 'delivered' }),
        E.BotUser.count({}),
        E.Receipt.count({ status: 'pending' }),
        E.Transaction.aggregate({ query: { type: 'purchase' }, sum: ['amount'] }),
        E.Order.count({ status: 'paid' }),
      ]);
      return {
        delivered: orders,
        users,
        pendingReceipts: receipts,
        paidUndelivered: pending,
        revenue: revenue?.rows?.[0]?.sum_amount || 0,
      };
    }

    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

async function testPanel(panel) {
  const base = String(panel.url || '').replace(/\/+$/, '');
  if (!base) throw new Error('آدرس پنل خالی است');
  if (panel.type === 'gurdv2') {
    const r = await fetch(`${base}/api/subscriptions/stats`, {
      headers: { Authorization: `Bearer ${panel.token || ''}` },
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) throw new Error(`اتصال ناموفق (HTTP ${r.status})`);
    return 'اتصال به Gurd v2 برقرار است ✅';
  }
  const loginRes = await fetch(`${base}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ username: panel.username || '', password: panel.password || '' }),
    signal: AbortSignal.timeout(10000),
  });
  const data = await loginRes.json().catch(() => ({}));
  if (!data.success) throw new Error(data.msg || 'ورود به پنل ناموفق بود');
  const cookie = (loginRes.headers.get('set-cookie') || '').split(';')[0];
  const inbRes = await fetch(`${base}/panel/api/inbounds/list`, { headers: { Cookie: cookie }, signal: AbortSignal.timeout(10000) });
  const inbData = await inbRes.json().catch(() => ({}));
  return `اتصال به 3x-ui برقرار است ✅ — ${(inbData.obj || []).length} inbound یافت شد`;
}