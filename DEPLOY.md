# Deploying HerdBook on Ubuntu

This guide deploys the full application (React client + Express API + MySQL) on
a single Ubuntu server. The Express server serves both the built client and the
API on one port, so one Node process runs everything; Nginx sits in front for
ports 80/443.

> Security: never commit `server/.env`. It holds the database password and is
> git-ignored. Create it on the server only. Rotate any password that has been
> shared in plain text.

## Prerequisites

- An Ubuntu server (22.04 / 24.04 / 25.x / 26.x) with sudo access.
- A domain pointing at the server if you want HTTPS (optional; IP-only works over HTTP).

## Quick start (scripted)

```bash
cd /opt
sudo git clone https://github.com/somesh5582/animal.git herdbook
sudo chown -R "$USER":"$USER" herdbook
cd herdbook

# Fresh database:
DB_PASSWORD='your-db-password' bash deploy/setup.sh

# Or, to also import an existing SQLite database first copy it to
# server/data/livestock.db, then:
DB_PASSWORD='your-db-password' RUN_MIGRATION=1 bash deploy/setup.sh
```

The script installs Node 22 + MySQL, creates the `herdbook` database and user,
writes `server/.env`, builds the client, and starts the app under PM2 on
port 4000.

Enable start-on-boot:

```bash
pm2 startup   # run the command it prints
pm2 save
```

## Expose with Nginx

```bash
sudo apt install -y nginx
sudo cp deploy/nginx-herdbook.conf /etc/nginx/sites-available/herdbook
sudo ln -s /etc/nginx/sites-available/herdbook /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo ufw allow 'Nginx Full'   # if the ufw firewall is enabled
```

Edit `server_name` in the config to your domain or IP.

### HTTPS (requires a domain)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

`NODE_ENV=production` makes the session cookie `Secure`, so log in over HTTPS
once the certificate is installed.

## Managing the app

```bash
pm2 status            # process state
pm2 logs herdbook     # live logs
pm2 restart herdbook  # restart after changes
```

## Updating to a new version

```bash
cd /opt/herdbook
git pull
npm install
npm run build
pm2 restart herdbook
```

## Manual steps (what the script automates)

See `deploy/setup.sh` for the exact commands if you prefer to run them by hand:
install packages, create DB + user, `npm install`, write `server/.env`,
optional `npm run migrate --workspace=server`, `npm run build`, PM2 start.
