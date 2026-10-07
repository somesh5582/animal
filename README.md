# HerdBook Livestock Manager

A full-stack livestock business application for recording purchase batches, monitoring available animals, registering sales, and tracking revenue and realized profit.

## Features

- Dashboard with current stock, inventory value, investment, revenue, and realized profit
- Purchase ledger with supplier, species, breed, quantity, transport cost, and landed unit cost
- Live inventory grouped into purchase batches
- Sales ledger with customer, batch, quantity, revenue, cost, and profit
- Transactional stock validation that prevents selling more animals than are available
- Safe deletion: deleting a sale returns animals to stock, while purchases with linked sales are protected
- Responsive desktop and mobile interface
- Local SQLite storage with no external database service

## Technology

- React 19 and Vite 8
- Express 5
- SQLite through `better-sqlite3`
- npm workspaces

## Requirements

Install [Node.js](https://nodejs.org/) **22.12 or newer**. The current dependency versions require Node 22+.

## Run locally

From the project root:

```powershell
npm install
npm run dev
```

Open `http://localhost:5173`. The API runs on `http://localhost:4000` and Vite proxies `/api` requests to it.

> `npm run dev` starts long-running development processes. Run it in your own terminal and stop it with `Ctrl+C`.

## Production build

```powershell
npm run build
npm start
```

After the client build is created, Express serves the application and API together at `http://localhost:4000`.

## Data storage

The SQLite database is created automatically at:

```text
server/data/livestock.db
```

Database files are excluded from Git. To use another location, set `DATABASE_PATH` before starting the server.

```powershell
$env:DATABASE_PATH = "C:\data\livestock.db"
npm start
```

## Currency

The interface defaults to Indian rupees (`INR`). Copy `client/.env.example` to `client/.env` and change `VITE_CURRENCY` to any supported ISO 4217 currency code before starting or building the client.

```text
VITE_CURRENCY=USD
```

## Accounting method

Each purchase batch has a landed unit cost:

```text
unit cost + (transport and other costs / purchased quantity)
```

Realized profit is calculated only for completed sales:

```text
sale quantity × (sale unit price − landed unit cost)
```

Unsold animals remain in inventory at their landed unit cost.

## API routes

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Service health check |
| `GET` | `/api/dashboard` | Business totals and KPIs |
| `GET` | `/api/purchases` | Purchase ledger |
| `POST` | `/api/purchases` | Add a purchase batch |
| `DELETE` | `/api/purchases/:id` | Delete an unused purchase batch |
| `GET` | `/api/inventory` | Available purchase batches |
| `GET` | `/api/sales` | Sales ledger |
| `POST` | `/api/sales` | Record a sale |
| `DELETE` | `/api/sales/:id` | Delete a sale and restore stock |
