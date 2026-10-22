# 🛒 Salesgram — Telegram Sales Bot

A self-hosted, Persian-first Telegram shop bot for selling **VPN subscriptions and any digital product** (Apple ID cards, gift codes, other services) — inspired by [mirzabot](https://github.com/mahdiMGF2/mirzabot), rebuilt with a pluggable architecture.

> فروشگاه تلگرامی کامل با درگاه پرداخت ایرانی، کیف پول، تحویل خودکار کانفیگ VPN و پنل مدیریت وب

## ✨ Highlights

- **Pluggable VPN panel adapters** — ships with **3x-ui** (MHSanaei) and **Gurd v2** (Solid Layer Management API). Adding a new panel = one file in `adapters/`, no rework.
- **Generic product model** — VPN products deliver via a PanelAdapter; stock products deliver a code from inventory; service products deliver custom text. Sell anything digital.
- **Fully automated sales** — browse → pay (Zarinpal instant gateway or wallet balance) → config link + QR delivered in chat.
- **Wallet + card-to-card top-ups** — customer sends a receipt, admin approves (in bot or web panel), balance is credited automatically.
- **9 config naming patterns** per server — username/numeric/custom text × random/sequential, or fully customer-chosen, with collision handling.
- **15 store feature toggles** — direct purchase, add-time, outage notices, categories, price display, auto-renew, welcome gift, and more.
- **Web admin panel** (companion app in this repo) — dark RTL dashboard for panels, products, stock, orders, receipts, users, stats, settings.
- **One-command Ubuntu install** — `install.sh` sets up Node.js, `.env`, a systemd service and health checks.

## 📁 Structure

```
bot/  (this folder)
├── index.js              # grammY bootstrap + routing
├── config.js             # env + settings loader
├── api.js                # client for the web admin panel (single source of truth)
├── i18n.js               # Persian (fa) + English strings
├── keyboards.js          # reply/inline keyboards (mirrors mirzabot menus)
├── username.js           # 9-pattern config username generator
├── payments/
│   └── zarinpal.js       # Zarinpal request/verify
├── adapters/
│   ├── index.js          # getAdapter(panel) factory
│   ├── three-xui.js      # 3x-ui login + inbound/user API
│   └── gurd-v2.js        # Gurd v2 Solid Layer Management API
└── handlers/
    ├── start.js          # /start + main menus (customer & admin)
    ├── shop.js           # catalog: categories → products → plans → buy
    ├── services.js       # my services: expiry/usage, extend, re-deliver
    ├── wallet.js         # balance, top-up receipt flow
    ├── support.js        # support inbox
    └── admin.js          # admin menu: shop mgmt, receipts, users, stats, settings
```

## 🚀 Quick start (Ubuntu VPS)

```bash
git clone https://github.com/<YOUR_USER>/<YOUR_REPO>.git
cd <YOUR_REPO>
sudo bash bot/install.sh
```

The installer asks for:
| Prompt | Where to get it |
|---|---|
| Bot token | [@BotFather](https://t.me/BotFather) → `/newbot` |
| Admin IDs | Send `/id` to [@userinfobot](https://t.me/userinfobot) |
| Web admin URL | The Salesgram web admin panel URL (same repo) |
| Bot API secret | Any long random string — must match the web panel |
| Zarinpal merchant | [zarinpal.com](https://www.zarinpal.com) panel (optional) |

Manual run: `sudo bash bot/run.sh`

Service management:
```bash
systemctl status salesgram      # status
journalctl -u salesgram -f      # live logs
systemctl restart salesgram     # restart
```

## 🧩 Adding a new panel adapter

Create `adapters/my-panel.js` exporting an object with:

```js
export default {
  name: "My Panel",
  async test(panel) { /* ping the panel API */ },
  async createSub(panel, { username, volumeGb, durationDays }) { /* return { configUrl, subscriptionUrl } */ },
  async extendSub(panel, { username, addDays, addGb }) { /* extend */ },
  async getUsage(panel, { username }) { /* return { usedGb, expireDate } */ },
};
```

Register it in `adapters/index.js`. That's it — every existing flow (buy, extend, usage, test connection in the web panel) works automatically.

## 💳 Payments

- **Instant gateway (Zarinpal)** — order → payment link → user taps «پرداخت کردم» → verify → deliver.
- **Wallet** — pay from balance; top up via card-to-card with admin approval.
- Card number, merchant ID and admin IDs are configured in the web admin panel (Settings) or `.env`.

## 🖥 Web admin panel

The companion React app in this repo is the web admin panel (dark RTL dashboard): panels & servers, categories, products/plans/stock, orders, pending receipts, users & balances, store feature toggles, support inbox, settings, and a deployment page. Data lives in the app's built-in database — the bot reads/writes through `api.js`, so both sides always see the same data.

## 📝 License

MIT