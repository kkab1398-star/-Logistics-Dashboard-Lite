# الشلال — Al-Shalal Logistics Platform

> **مؤسسة الشلال للنقل والرافعات الشوكية**
> A production-grade, bilingual (Arabic / English / Urdu) driver-management and logistics accounting system built for the Saudi Arabian market.

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Key Features](#2-key-features)
3. [Technology Stack](#3-technology-stack)
4. [Architecture](#4-architecture)
5. [Project Structure](#5-project-structure)
6. [Getting Started — Local Development](#6-getting-started--local-development)
7. [Deployment](#7-deployment)
   - [Option A — Docker Compose (VPS / bare-metal)](#option-a--docker-compose-vps--bare-metal)
   - [Option B — Vercel (frontend) + Railway/Render (API)](#option-b--vercel-frontend--railwayrender-api)
   - [Option C — Manual VPS (PM2 + nginx)](#option-c--manual-vps-pm2--nginx)
8. [Environment Variables Reference](#8-environment-variables-reference)
9. [Database Schema](#9-database-schema)
10. [Settlement & Profit Engine](#10-settlement--profit-engine)
11. [Deferred Payment State Machine](#11-deferred-payment-state-machine)
12. [Telegram Notification System](#12-telegram-notification-system)
13. [RBAC & Security Model](#13-rbac--security-model)
14. [API Reference](#14-api-reference)
15. [Internationalisation](#15-internationalisation)
16. [Business Model & Investor Notes](#16-business-model--investor-notes)
17. [Roadmap](#17-roadmap)
18. [Contact](#18-contact)

---

## 1. Product Overview

Al-Shalal is a **full-stack logistics driver-management platform** purpose-built for fleet owners and forklift rental operators in Saudi Arabia. It replaces manual spreadsheets and WhatsApp bookkeeping with a structured, mobile-first web application that:

- Gives each driver a personal dashboard to log expenses, record revenues, and track owner advances.
- Gives the fleet owner a real-time analytics dashboard across all drivers with date-range filtering.
- Automates profit-cycle settlement — computing the 50 / 50 net split, archiving all records, and resetting the cycle.
- Sends instant Telegram alerts to the owner on every financial event (revenue, expense, transfer).
- Supports **deferred revenues** with a proper state machine: an invoice can be marked as "will pay later", tracked as a postponed balance, and later marked as paid — with all KPIs recalculating instantly.

**Target market:** Saudi logistics companies, trucking fleets, and forklift rental operators managing 1–50 drivers.

---

## 2. Key Features

| Area | Capabilities |
|---|---|
| **Driver Portal** | Login with username + password; personal dashboard with cycle KPIs; log expenses (diesel, oil, maintenance, other); record revenues with receipt upload; view owner transfers; settle cycle |
| **Admin Portal** | Login with admin code; manage all drivers (add / edit / freeze / delete); per-driver analytics with date range; global KPI dashboard; settlement archive with search |
| **Expense Tracking** | Diesel (1.79 SAR/litre auto-calc), Oil, Maintenance, Other; photo invoice upload (base64) |
| **Revenue Tracking** | Per-driver revenue entries; optional client name; receipt photo upload; **deferred payment** flag with state machine |
| **Owner Transfers** | Cash advances from owner to driver; tracked per cycle |
| **Settlement Engine** | Compute cycle (cash revenue − expenses, 50 / 50 split, net owner payout after transfers); archive all records; reset cycle to zero |
| **Deferred Payments** | Mark revenue as deferred → shows negative postponed balance; "Mark as Paid" → moves to cash revenue; all KPIs update immediately |
| **Notifications** | Telegram bot sends owner instant alerts on every save |
| **Multilingual** | Arabic (RTL), English (LTR), Urdu (RTL) — full UI translation |
| **Mobile-first** | Noto Kufi Arabic font; drawer navigation; responsive cards |

---

## 3. Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, Vite 6, Tailwind CSS 4, shadcn/ui (Radix UI), TanStack Query, Wouter, Framer Motion |
| **Backend** | Node.js 24, Express 5, Pino structured logging |
| **Database** | PostgreSQL 16, Drizzle ORM, drizzle-zod |
| **Validation** | Zod v4 (shared between API and frontend via OpenAPI codegen) |
| **API Contract** | OpenAPI 3.1 spec → Orval codegen → typed React Query hooks + Zod schemas |
| **Auth** | Session-less RBAC — role + driverId stored in localStorage; driver passwords bcrypt-hashed |
| **Notifications** | Telegram Bot API (fire-and-forget, non-blocking) |
| **Monorepo** | pnpm workspaces, TypeScript 5.9 project references |
| **Containerisation** | Docker + Docker Compose, nginx reverse proxy |

---

## 4. Architecture

```
┌─────────────────────────────────────────────┐
│             Browser / Mobile                │
│                                             │
│  React + Vite SPA  (port 3000 / nginx:80)  │
│  ┌──────────────┐  ┌───────────────────┐   │
│  │  Driver UI   │  │    Admin UI       │   │
│  └──────┬───────┘  └────────┬──────────┘   │
└─────────┼────────────────────┼─────────────┘
          │  REST /api/*        │
          ▼                     ▼
┌─────────────────────────────────────────────┐
│       Express 5 API Server (port 8080)      │
│                                             │
│  Routes: auth, drivers, expenses, revenues, │
│          transfers, settlements, analytics,  │
│          admin, invoices, health             │
│                                             │
│  Drizzle ORM ──► PostgreSQL 16              │
│  Telegram Notifier (fire-and-forget)        │
│  Global Totals (Postgres triggers, O(1))    │
└─────────────────────────────────────────────┘
```

**Monorepo layout:**
```
artifacts/al-shalal     ← React/Vite frontend
artifacts/api-server    ← Express API
lib/db                  ← Drizzle schema + client (shared)
lib/api-spec            ← OpenAPI 3.1 spec + Orval config
lib/api-client-react    ← Generated React Query hooks
lib/api-zod             ← Generated Zod validators
scripts/                ← Utility scripts
```

---

## 5. Project Structure

```
.
├── artifacts/
│   ├── al-shalal/          # React + Vite frontend
│   │   ├── src/
│   │   │   ├── components/ # Reusable UI components (shadcn/ui base)
│   │   │   ├── lib/        # i18n, utils, API client helpers
│   │   │   └── pages/      # Route pages (dashboard, expenses, revenues …)
│   │   └── vite.config.ts
│   └── api-server/         # Express 5 API
│       ├── src/
│       │   ├── lib/        # logger, notifier, global-totals init
│       │   └── routes/     # One file per resource
│       └── build.mjs       # esbuild bundle script
├── lib/
│   ├── db/                 # Drizzle ORM (schema, migrations, client)
│   ├── api-spec/           # openapi.yaml + orval.config.ts
│   ├── api-client-react/   # Generated TanStack Query hooks
│   └── api-zod/            # Generated Zod schemas
├── scripts/
│   └── post-merge.sh       # CI hook: pnpm install + db push
├── .env.example            # All required environment variables
├── docker-compose.yml      # One-command local/VPS deployment
├── Dockerfile.api          # Multi-stage API image
├── Dockerfile.frontend     # Multi-stage frontend image (nginx)
├── nginx.conf              # Reverse-proxy config
├── vercel.json             # Vercel deployment config
├── pnpm-workspace.yaml     # Workspace + catalog pins
└── tsconfig.base.json      # Shared TypeScript strict config
```

---

## 6. Getting Started — Local Development

### Prerequisites

- **Node.js 22+** (LTS) — `node --version`
- **pnpm 9+** — `npm install -g pnpm`
- **PostgreSQL 16** running locally

### Steps

```bash
# 1. Clone the repo
git clone https://github.com/your-org/al-shalal.git
cd al-shalal

# 2. Install dependencies
pnpm install

# 3. Configure environment
cp .env.example .env
# Edit .env — at minimum set DATABASE_URL and SESSION_SECRET

# 4. Push the database schema (creates all tables)
pnpm --filter @workspace/db run push

# 5. Start API server (terminal 1)
PORT=8080 NODE_ENV=development pnpm --filter @workspace/api-server run dev

# 6. Start frontend (terminal 2)
PORT=3000 BASE_PATH=/ pnpm --filter @workspace/al-shalal run dev

# 7. Open http://localhost:3000
#    Admin login code: 1234
```

### Useful scripts

```bash
# Full typecheck
pnpm run typecheck

# Regenerate API hooks + Zod schemas from openapi.yaml
pnpm --filter @workspace/api-spec run codegen

# Build everything
pnpm run build
```

---

## 7. Deployment

### Option A — Docker Compose (VPS / bare-metal)

**Recommended for production.** Spins up PostgreSQL, the API server, and the static frontend behind nginx in one command.

```bash
# 1. Copy and configure environment
cp .env.example .env
# Set: DATABASE_URL (not needed — docker-compose builds it from POSTGRES_* vars),
#      SESSION_SECRET, TELEGRAM_BOT_TOKEN, TELEGRAM_OWNER_CHAT_ID

# 2. Build and start all services
docker compose up --build -d

# 3. Run database migrations (first deploy only)
docker compose exec api node -e "
  import('@workspace/db').then(({ db }) => {
    console.log('DB connected:', db ? 'ok' : 'fail');
  });
"

# 4. The app is live at http://<your-server-ip>
```

For HTTPS, put Cloudflare (free proxy) or Certbot + nginx in front of port 80.

### Option B — Vercel (frontend) + Railway/Render (API)

1. **API**: Deploy `artifacts/api-server` to Railway or Render as a Node.js service.
   - Build command: `pnpm --filter @workspace/api-server run build`
   - Start command: `node --enable-source-maps artifacts/api-server/dist/index.mjs`
   - Add all env vars from `.env.example`.

2. **Frontend**: Deploy to Vercel.
   - Root: project root
   - Build command: `pnpm --filter @workspace/al-shalal run build`
   - Output directory: `artifacts/al-shalal/dist/public`
   - Add env var: `VITE_API_BASE_URL=https://your-api.railway.app`

3. Update `vercel.json` routes to point `/api/*` at your Railway/Render API URL.

### Option C — Manual VPS (PM2 + nginx)

```bash
# On server
npm install -g pnpm pm2

git clone https://github.com/your-org/al-shalal.git /opt/al-shalal
cd /opt/al-shalal
cp .env.example .env && nano .env

pnpm install --frozen-lockfile
pnpm run build

# Start API with PM2
pm2 start "node --enable-source-maps artifacts/api-server/dist/index.mjs" \
  --name al-shalal-api \
  --env production

pm2 save && pm2 startup

# Copy nginx config and serve frontend
sudo cp nginx.conf /etc/nginx/sites-available/al-shalal
# Edit: replace `frontend` container with static path to
#   /opt/al-shalal/artifacts/al-shalal/dist/public
sudo ln -s /etc/nginx/sites-available/al-shalal /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

---

## 8. Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | Full PostgreSQL connection string |
| `PORT` | ✅ | Port the API server listens on (e.g. `8080`) |
| `NODE_ENV` | ✅ | `development` or `production` |
| `SESSION_SECRET` | ✅ | Random string ≥ 32 chars for session signing |
| `TELEGRAM_BOT_TOKEN` | Optional | Bot token from @BotFather — enables owner alerts |
| `TELEGRAM_OWNER_CHAT_ID` | Optional | Owner's Telegram chat ID from @userinfobot |

---

## 9. Database Schema

All tables use PostgreSQL with Drizzle ORM. Schema lives in `lib/db/src/schema/`.

### `drivers`
| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `name` | text | Driver's full name |
| `phone` | text | |
| `vehicle_number` | text | |
| `username` | text UNIQUE | Login username |
| `password_hash` | text | bcrypt hash |
| `status` | text | `active` \| `frozen` |
| `created_at` | timestamptz | |

### `revenues`
| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `driver_id` | integer FK | → drivers.id |
| `amount` | numeric(10,2) | Total invoice amount |
| `client_name` | text | Optional client |
| `description` | text | |
| `receipt_image_url` | text | Base64 data URL |
| `date` | date | |
| `settlement_id` | integer | Set on settlement |
| `is_deferred` | boolean | Invoice not yet collected |
| `deferred_amount` | numeric(10,2) | Deferred portion |
| `is_paid` | boolean | True once deferred is repaid |
| `has_saved_invoice` | boolean | |
| `saved_invoice_id` | integer | |
| `created_at` | timestamptz | |

### `expenses`
| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `driver_id` | integer FK | |
| `type` | text | `diesel` \| `oil` \| `maintenance` \| `other` |
| `amount` | numeric(10,2) | |
| `liters` | numeric(10,2) | Diesel only |
| `notes` | text | |
| `invoice_image_url` | text | |
| `date` | date | |
| `settlement_id` | integer | |
| `created_at` | timestamptz | |

### `owner_transfers`
| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `driver_id` | integer FK | |
| `amount` | numeric(10,2) | |
| `description` | text | |
| `receipt_image_url` | text | |
| `date` | date | |
| `settlement_id` | integer | |
| `created_at` | timestamptz | |

### `settlements`
| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `driver_id` | integer FK | |
| `total_revenue` | numeric | Cash revenue only |
| `total_expenses` | numeric | |
| `total_transfers` | numeric | |
| `net_profit` | numeric | cash_revenue − expenses |
| `driver_share` | numeric | net_profit / 2 |
| `owner_payout` | numeric | driver_share − transfers |
| `period_start` | date | |
| `period_end` | date | |
| `created_at` | timestamptz | |

### `global_totals`
Single-row table kept in sync via Postgres triggers (O(1) admin dashboard reads).

---

## 10. Settlement & Profit Engine

```
cashRevenue      = SUM(revenues WHERE isPaid = true AND settlementId IS NULL)
grossRevenue     = SUM(revenues WHERE settlementId IS NULL)        ← all including deferred
postponedBalance = SUM(revenues WHERE isDeferred = true AND isPaid = false AND settlementId IS NULL) × −1
totalExpenses    = SUM(expenses WHERE settlementId IS NULL)
totalTransfers   = SUM(owner_transfers WHERE settlementId IS NULL)

netProfit   = cashRevenue − totalExpenses
driverShare = netProfit / 2
ownerPayout = (netProfit / 2) − totalTransfers
```

On `POST /api/settle`:
1. Snapshot all unsettled records into a new `settlements` row.
2. Set `settlement_id` on all matching revenues, expenses, and transfers.
3. The cycle resets to zero for the driver.

---

## 11. Deferred Payment State Machine

```
          ┌──────────────┐
  Add     │  isDeferred  │  Mark Paid
 ─────►   │  isPaid=false│  ──────────►  isPaid=true
          │  amount in   │               isDeferred=false
          │  gross only  │               amount moves to
          └──────────────┘               cashRevenue
```

- Deferred revenues appear in **Gross Revenue** but NOT in Cash Revenue.
- `postponedBalance` is displayed as a negative red figure — it is money owed by the customer.
- "Mark as Paid" calls `POST /api/revenues/:id/repay` → flips `isPaid=true`, instantly recalculates all cycle KPIs.

---

## 12. Telegram Notification System

The server fires a non-blocking Telegram message on every:
- New revenue saved
- New expense saved
- New owner transfer saved

Configuration: set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_OWNER_CHAT_ID` in your `.env`. If either is missing the feature silently no-ops.

```
lib/notifier → fetch Telegram sendMessage API (fire-and-forget)
             → failure logs a warning only, never breaks the HTTP response
```

---

## 13. RBAC & Security Model

| Role | Access |
|---|---|
| **Admin** | All drivers, all data, analytics, settle any driver, manage users |
| **Driver** | Own dashboard only (scoped by `driverId`) |

- Admin authenticates with a shared code (`1234` by default — change in `artifacts/api-server/src/routes/admin.ts`).
- Driver authenticates with username + bcrypt-hashed password.
- Role is stored in `localStorage` — stateless, no server-side session.
- Passwords are hashed with bcrypt (cost factor 10) before storage.

**Production hardening recommendations:**
- Replace the hardcoded admin code with a proper admin user table + bcrypt.
- Add rate-limiting middleware (e.g. `express-rate-limit`) to auth endpoints.
- Enable HTTPS (TLS) in nginx — use Let's Encrypt / Certbot or Cloudflare proxy.
- Set `CORS` origin whitelist in `app.ts` to your production domain.

---

## 14. API Reference

The full contract is defined in `lib/api-spec/openapi.yaml`. Key endpoints:

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/healthz` | Health check |
| `POST` | `/api/auth/driver-login` | Driver login (username + password) |
| `GET` | `/api/drivers` | List all drivers (admin) |
| `POST` | `/api/drivers` | Create driver |
| `PUT` | `/api/drivers/:id` | Update driver |
| `DELETE` | `/api/drivers/:id` | Delete driver |
| `GET` | `/api/expenses?driverId=` | List expenses |
| `POST` | `/api/expenses` | Add expense |
| `DELETE` | `/api/expenses/:id` | Delete expense |
| `GET` | `/api/revenues?driverId=` | List revenues |
| `POST` | `/api/revenues` | Add revenue |
| `POST` | `/api/revenues/:id/repay` | Mark deferred revenue as paid |
| `DELETE` | `/api/revenues/:id` | Delete revenue |
| `GET` | `/api/transfers?driverId=` | List owner transfers |
| `POST` | `/api/transfers` | Add transfer |
| `DELETE` | `/api/transfers/:id` | Delete transfer |
| `GET` | `/api/cycle-summary?driverId=` | Current cycle KPIs |
| `POST` | `/api/settle` | Settle cycle |
| `GET` | `/api/admin/global-summary` | Global KPIs |
| `GET` | `/api/admin/analytics` | Per-driver analytics (date range) |
| `GET` | `/api/admin/archive` | Settlement history |

---

## 15. Internationalisation

Translation keys live in `artifacts/al-shalal/src/lib/i18n.tsx`. Three languages are supported:

| Code | Language | Direction |
|---|---|---|
| `ar` | Arabic | RTL |
| `en` | English | LTR |
| `ur` | Urdu | RTL |

The active language is stored in `localStorage` and toggled from the app header. RTL/LTR is applied via the `dir` attribute on `<html>`.

---

## 16. Business Model & Investor Notes

### Problem
Saudi fleet operators — especially forklift rental and trucking companies — currently manage driver finances on paper or WhatsApp. This creates:
- Zero visibility into per-driver profitability.
- Manual settlement errors that cause disputes.
- No audit trail for tax / zakat purposes.
- Delayed owner notifications (days, not seconds).

### Solution
Al-Shalal provides a structured, mobile-first SaaS platform that:
1. Eliminates manual bookkeeping for drivers.
2. Gives the fleet owner real-time KPIs and profit splits.
3. Creates a digital audit trail for every SAR collected or spent.
4. Supports deferred billing (common in B2B logistics) with automatic tracking.

### Revenue Model (suggested)
- **SaaS subscription**: SAR 200–500 / month per fleet (1–10 drivers).
- **Per-driver add-on**: SAR 30–50 / driver / month for larger fleets.
- **White-label**: Resell to logistics software resellers.

### Market
- Saudi Arabia has 150,000+ registered freight companies (CITC, 2023).
- Vision 2030 logistics investments are driving rapid fleet growth.
- No dominant Arabic-first, mobile-native driver-finance product exists in the market.

### Traction & Differentiation
- Built for Saudi culture: Arabic-first UI, SAR currency, Hijri-compatible date inputs.
- Deferred payment tracking is a first-class feature — critical for B2B logistics.
- Telegram integration provides instant owner visibility without requiring a mobile app.

---

## 17. Roadmap

- [ ] Admin user table + proper auth (replace shared code)
- [ ] Multi-tenant / multi-company support
- [ ] Hijri calendar support
- [ ] PDF settlement reports with Arabic layout
- [ ] Push notifications (PWA)
- [ ] Mobile app (React Native / Expo)
- [ ] VAT (15%) tracking for Saudi compliance
- [ ] Zakat calculation helper
- [ ] Stripe / Moyasar payment integration for SaaS billing
- [ ] Bulk import from Excel

---

## 18. Contact

**مؤسسة الشلال للنقل والرافعات الشوكية**

| | |
|---|---|
| Email | shalal4rentalforkleft@gmail.com |
| Phone 1 | +966 50 XXX XXXX |
| Phone 2 | +966 55 XXX XXXX |

---

*Built with ❤️ for the Saudi logistics sector.*
