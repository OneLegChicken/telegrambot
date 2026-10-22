#!/usr/bin/env bash
set -euo pipefail

# 🛒 Salesgram — manual run (for testing; use install.sh for production/systemd)
BOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$BOT_DIR"

if [[ ! -f .env ]]; then
  echo "❌ .env not found — run install.sh first, or: cp .env.example .env"
  exit 1
fi

if [[ ! -d node_modules ]]; then
  echo "📦 Installing dependencies..."
  npm install --omit=dev --no-audit --no-fund
fi

echo "🚀 Starting Salesgram bot (Ctrl+C to stop)..."
exec node index.js