#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/root/spendfox}"
BRANCH="${BRANCH:-main}"
PM2_NAME="${PM2_NAME:-spendfox-backend}"

cd "$APP_DIR"

git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

cd "$APP_DIR/backend"

npm ci --omit=dev

if pm2 describe "$PM2_NAME" >/dev/null 2>&1; then
  pm2 restart "$PM2_NAME" --update-env
else
  pm2 start src/server.js --name "$PM2_NAME"
fi

pm2 save

curl --fail --silent --show-error --max-time 10 http://127.0.0.1:5000/api/health
echo
