#!/usr/bin/env bash
#
# HerdBook production setup for Ubuntu (22.04 / 24.04 / 25.x / 26.x).
#
# Installs Node 22, MySQL, builds the client, writes server/.env, runs the
# optional SQLite->MySQL migration, and launches the app under PM2.
#
# Usage (run from the repository root on the server):
#
#   DB_PASSWORD='your-db-password' \
#   DB_USER=herdbook \
#   DB_NAME=herdbook \
#   bash deploy/setup.sh
#
# The database password is read from the environment and written only to
# server/.env on this machine. It is never committed to git.
#
set -euo pipefail

# ---- Configuration (override via environment variables) --------------------
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-herdbook}"
DB_NAME="${DB_NAME:-herdbook}"
APP_PORT="${PORT:-4000}"
SESSION_DAYS="${SESSION_DAYS:-7}"
RUN_MIGRATION="${RUN_MIGRATION:-0}"   # set to 1 to import an existing SQLite db

if [[ -z "${DB_PASSWORD:-}" ]]; then
  echo "ERROR: DB_PASSWORD must be set. Example:" >&2
  echo "  DB_PASSWORD='secret' bash deploy/setup.sh" >&2
  exit 1
fi

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"
echo "==> Repository root: $REPO_ROOT"

# ---- 1. System packages ----------------------------------------------------
echo "==> Installing system packages (Node 22, MySQL, git, build tools)"
sudo apt-get update -y
if ! command -v node >/dev/null 2>&1 || [[ "$(node -v | cut -d. -f1 | tr -d v)" -lt 22 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
sudo apt-get install -y build-essential git mysql-server

# ---- 2. MySQL database + user ---------------------------------------------
echo "==> Ensuring MySQL is running"
sudo systemctl enable --now mysql

echo "==> Creating database '$DB_NAME' and user '$DB_USER' (idempotent)"
sudo mysql <<SQL
CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`
  CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';
ALTER USER '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'localhost';
FLUSH PRIVILEGES;
SQL

# ---- 3. Dependencies -------------------------------------------------------
echo "==> Installing npm dependencies"
npm install

# ---- 4. server/.env (secret stays on this machine only) --------------------
echo "==> Writing server/.env"
cat > server/.env <<ENV
DB_HOST=${DB_HOST}
DB_PORT=${DB_PORT}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
DB_NAME=${DB_NAME}
PORT=${APP_PORT}
NODE_ENV=production
SESSION_DAYS=${SESSION_DAYS}
ENV
chmod 600 server/.env

# ---- 5. Optional data migration from an existing SQLite file ---------------
if [[ "$RUN_MIGRATION" == "1" ]]; then
  if [[ -f server/data/livestock.db ]]; then
    echo "==> Migrating existing SQLite data into MySQL"
    npm run migrate --workspace=server
  else
    echo "==> RUN_MIGRATION=1 but server/data/livestock.db not found; skipping"
  fi
fi

# ---- 6. Build the client ---------------------------------------------------
echo "==> Building client"
npm run build

# ---- 7. Run under PM2 ------------------------------------------------------
echo "==> Starting app under PM2"
if ! command -v pm2 >/dev/null 2>&1; then
  sudo npm install -g pm2
fi
pm2 delete herdbook >/dev/null 2>&1 || true
pm2 start npm --name herdbook -- start
pm2 save

echo
echo "==> Done. App is running on http://127.0.0.1:${APP_PORT}"
echo "    Enable start-on-boot with the command printed by: pm2 startup"
echo "    Next: configure Nginx (see DEPLOY.md) to expose it on port 80/443."
