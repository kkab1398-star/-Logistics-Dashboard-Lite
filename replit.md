# Workspace

## Overview

Al-Shalal (الشلال) — A logistics driver dashboard web app for Saudi Arabia. Drivers log fuel/maintenance expenses, upload invoices, add revenues, track owner transfers, and settle profit cycles. Supports Arabic (RTL), English, and Urdu. Deployed as a React + Vite frontend with an Express/PostgreSQL backend.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (artifact: al-shalal, path: /)
- **API framework**: Express 5 (artifact: api-server, path: /api)
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Features

- Multi-language support: Arabic (RTL), English (LTR), Urdu (RTL)
- **RBAC auth**: Admin (code: `1234`) or Driver (username + bcrypt-hashed password via POST /api/auth/driver-login)
- **User management**: Admin can add/edit/delete/freeze drivers. Each driver has a unique username + password.
- Identity: مؤسسة الشلال للنقل والرافعات الشوكية | 5 official phones | shalal4rentalforkleft@gmail.com
- Driver profiles management (admin-owned)
- **Expense tracking**: Diesel (1.79 SAR/liter auto-calc), Oil, Maintenance, Other
- **Revenue tracking**: per-driver revenue entries with receipt upload
- **Owner transfers**: cash advances/transfers from owner to driver
- **Settlement engine**: compute cycle (Revenue - Expenses, 50/50 split, owner payout net of transfers), archive all records to settlement
- **Admin analytics dashboard**: global KPIs + per-driver breakdown with date range filter
- Invoice/receipt photo upload (base64 encoded)
- Mobile-first responsive design with Noto Kufi Arabic font
- Drawer navigation (sheet) with role-aware nav items

## DB Schema

- `drivers`: id, name, phone, vehicle_number, username (unique), password_hash, status (active/frozen), created_at
- `expenses`: id, driver_id, type, amount, liters, notes, invoice_image_url, date, settlement_id, created_at
- `revenues`: id, driver_id, amount, description, receipt_image_url, date, settlement_id, created_at
- `owner_transfers`: id, driver_id, amount, description, receipt_image_url, date, settlement_id, created_at
- `settlements`: id, driver_id, total_revenue, total_expenses, total_transfers, net_profit, driver_share, owner_payout, period_start, period_end, created_at

## Owner Notifications

- Telegram bot integration sends an owner alert on every new revenue, expense, or owner-transfer save (`artifacts/api-server/src/lib/notifier.ts`).
- Requires two secrets: `TELEGRAM_BOT_TOKEN` (from @BotFather) and `TELEGRAM_OWNER_CHAT_ID` (owner's Telegram chat id, e.g. from @userinfobot).
- If either secret is missing, the notifier silently no-ops — saves still succeed.
- Calls are fire-and-forget; failures only log a warning and never break the API response.

## Settlement Logic

```
netProfit = totalRevenue - totalExpenses
driverShare = netProfit / 2
ownerPayout = (netProfit / 2) - totalTransfers
```

On settlement POST: archives all unsettled records (sets `settlement_id`). Cycle resets to zero.

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
  - **IMPORTANT**: After codegen, manually fix `lib/api-zod/src/index.ts` to only contain: `export * from "./generated/api";`
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## RBAC Notes

- Admin code: `1234`
- Role stored in `localStorage` keys: `al-shalal-role`, `al-shalal-driverId`, `al-shalal-driverName`
- Admin can access all drivers, admin dashboard, settle any driver
- Driver can only see their own data (dashboard scoped by `driverId`)

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
