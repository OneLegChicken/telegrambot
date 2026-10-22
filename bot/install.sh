#!/usr/bin/env bash
set -euo pipefail

# ═══════════════════════════════════════════════════════════
#  🛒 Salesgram — Telegram Sales Bot | Ubuntu VPS installer
#  Usage:  sudo bash install.sh
# ═══════════════════════════════════════════════════════════

BOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_NAME="salesgram"

if [[ $EUID -ne 0 ]]; then
  echo "⚠️  Please run as root:  sudo bash install.sh"
  exit 1
fi

echo "🏬 Salesgram installer"
echo "📁 Bot directory: $BOT_DIR"

# ── 1) Node.js 20 ──────────────────────────────────────────
if ! command -v node >/dev/null 2>&1 || [[ "$(node -v | sed 's/v//' | cut -d. -f1)" -lt 18 ]]; then
  echo "⬇️  Installing Node.js 20..."
  apt-get update -y
  apt-get install -y ca-certificates curl gnupg
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
echo "✅ Node $(node -v)"

# ── 2) Dependencies ────────────────────────────────────────
cd "$BOT_DIR"
echo "📦 Installing dependencies..."
npm install --omit=dev --no-audit --no-fund

# ── 3) .env configuration ──────────────────────────────────
if [[ ! -f .env ]]; then
  echo "⚙️  Creating .env — please answer the prompts:"
  prompt() { local v; read -rp "$1 [$2]: " v; echo "${v:-$2}"; }
  BOT_TOKEN=$(prompt "Telegram bot token (from @BotFather)" "")
  ADMIN_IDS=$(prompt "Admin Telegram numeric IDs (comma separated)" "")
  APP_API_BASE=$(prompt "Salesgram web admin base URL" "")
  BOT_API_SECRET=$(prompt "Bot API secret (same value as web admin > Settings)" "$(head -c 24 /dev/urandom | base64 | tr -dc 'a-zA-Z0-9')")
  ZARINPAL_MERCHANT_ID=$(prompt "Zarinpal merchant ID (Enter to skip gateway)" "")
  BASE_URL=$(prompt "Public HTTPS URL of this server (for payment callbacks)" "http://${BASE_URL:-$(curl -s ifconfig.me 2>/dev/null || echo YOUR_SERVER_IP)}:8787")
  cat > .env <<EOF
BOT_TOKEN=$BOT_TOKEN
ADMIN_IDS=$ADMIN_IDS
APP_API_BASE=$APP_API_BASE
BOT_API_SECRET=$BOT_API_SECRET
ZARINPAL_MERCHANT_ID=$ZARINPAL_MERCHANT_ID
BASE_URL=$BASE_URL
PORT=8787
EOF
  chmod 600 .env
  echo "✅ .env created (edit later with: nano $BOT_DIR/.env)"
else
  echo "✅ .env already exists — keeping it"
fi

# ── 4) systemd service ─────────────────────────────────────
echo "🔧 Setting up systemd service ($SERVICE_NAME)..."
cat > "/etc/systemd/system/$SERVICE_NAME.service" <<EOF
[Unit]
Description=Salesgram Telegram Sales Bot
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=$BOT_DIR
ExecStart=$(command -v node) $BOT_DIR/index.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now "$SERVICE_NAME"
sleep 3

# ── 5) Health check ────────────────────────────────────────
if systemctl is-active --quiet "$SERVICE_NAME"; then
  echo ""
  echo "🎉 Salesgram is running!"
  echo "   Status : systemctl status $SERVICE_NAME"
  echo "   Logs   : journalctl -u $SERVICE_NAME -f"
  echo "   Restart: systemctl restart $SERVICE_NAME"
else
  echo "❌ Bot failed to start — last logs:"
  journalctl -u "$SERVICE_NAME" -n 40 --no-pager || true
  exit 1
fi