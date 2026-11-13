# Genesoft ERP & CRM

Genesoft is a modern, multi-tenant SaaS ERP and CRM platform built with Next.js 16, Supabase, and Prisma. It provides a comprehensive suite for managing business operations with native multi-currency support, integrated GST handling, multi-warehouse inventory control, and a full **SaaS Super Admin Command Center** for platform-level governance.

---

## 🚀 Features

### 🏢 SaaS Super Admin Command Center
- **Tenant Management Lifecycle**: Complete CRUD for platform tenants (`/admin/tenants`), 360° tenant profile dashboards (`/admin/tenants/[id]`), manual business onboarding (`/admin/tenants/new`), trial extension (+7d), plan switching, and automatic Chart of Accounts (39 accounts) provisioning.
- **Platform Security & Governance (`/admin/security`)**: Super Admin screen for the sign-in policy (two-factor, idle timeout, login lockout, rate limit) and IP blocklist, plus the security audit log. Enforced since 2026-11-13: the request proxy applies rate limits, the idle timeout and two-factor (`/two-factor`), and the `login` action locks out repeated failures. Users set up 2FA in Settings → Account; the Super Admin resets a lost one in Admin → Users.
- **Platform Intelligence Hub**: Real-time KPI cards (tenants, users, MRR, tickets) with trend indicators and glassmorphism styling.
- **Interactive Charts**: Tenant Growth (line chart) and Global Presence (pie chart) powered by `recharts`.
- **Database Health Monitor**: Real-time latency and total platform record counts.
- **Incident Monitor**: Color-coded system event log feed with tenant attribution.
- **Support Inbox**: Platform-wide helpdesk command center with real-time ticket messaging (`/admin/support`).
- **Quick Actions Panel**: Direct navigation to Tenant Management, Support Tickets, Security, and Settings.

### 🏭 Inventory & Multi-Warehouse Management (`/inventory`)
- **Multi-Facility Stock Control**: Multi-depot and warehouse tracking with unique facility codes, managers, and addresses.
- **Auto-Provisioning**: Automatically provisions a default "Central Logistics Hub" (`WH-MAIN`) on demand for zero empty-state friction.
- **Atomic Stock Adjustments**: Fast logging of PO receipts (`IN`), shipments (`OUT`), physical count reconciliations (`ADJUSTMENT`), and damage write-offs (`DAMAGE`).
- **Inter-Depot Transfers**: Seamless inventory movement between physical facilities with source balance checks.
- **Reorder Alerts & Deficit Tracking**: Real-time monitoring of items below reorder points with calculated replenishment deficits and estimated restock costs.
- **Transaction Ledger**: Immutable audit log of all historical inventory movements.

### 🤝 CRM (Customer Relationship Management)
- **Leads & Deals**: Track sales pipeline from prospect to conversion.
- **Contacts & Companies**: Centralized repository for all business partners.
- **Tasks**: Activity management and follow-ups.
- **Customer Ledger**: Real-time account history with debit/credit tracking and automatic balance sync.

### 💰 Finance & Accounting
- **Accounts Payable**: Manage vendor bills, payments, and aging.
- **Accounts Receivable**: Track customer invoices and incoming payments.
- **GST Engine**: Integrated Indian GST calculations (CGST, SGST, IGST split) for all financial documents.
- **Chart of Accounts**: Comprehensive financial structure management (seeded with 39 standard Indian accounts).
- **Multi-Currency Support**: Dynamic currency formatting ($, €, ₹, AED) and exchange rate-aware ledger balances.
- **Invoice PDF Export**: Server-rendered PDF generation for Tax Invoices with HSN/SAC breakdown.

### 🧭 Customer Portal
- **Customer Self-Service Portal (`/portal/[token]`)**: Client portal for viewing and downloading invoices, checking transaction history, and submitting support tickets without consuming user seats. Customers can't pay online from it.

### ⏸ Switched off (code and data kept)
- **CRM Emails, WhatsApp, Web Forms and Finance → Bank Reconciliation** are hidden for every business behind `NEXT_PUBLIC_ENABLE_PARKED_MODULES` (`PARKED_ROUTES` in `src/lib/features.ts`).
- **Government-filing modules** are hidden behind `NEXT_PUBLIC_ENABLE_COMPLIANCE_MODULES`; the engines below only prepare figures and files and aren't connected to any government system.
- The POS Terminal was removed completely on 2026-11-12. Stripe and PayPal were removed on 2026-11-13: Razorpay is the only payment gateway.

### 🌍 Multi-Country Statutory Tax Engines (hidden; see above)
- **India**: GST Returns GSTR-1 & GSTR-3B with Table 4 ITC balancing, E-Way Bill Rule 138 with distance calculators and NIC JSON, TDS & TCS with 206AA penalty and Form 26Q.
- **UAE**: VAT (5%) Federal Decree-Law No. (8), 15-digit TRN, Form VAT201 7-Emirates supply apportionment, Article 48 RCM, and FTA FAF audit file exporter.
- **Saudi Arabia (KSA)**: VAT (15%), ZATCA Fatoora Phase 1 & 2 UBL 2.1 XML, UTF-8 TLV Base64 QR code, bilingual invoices, and Zakat base calculator.
- **United Kingdom**: HMRC MTD VAT (20%, 5%, 0%), 9-digit VRN Modulus 97 validation, MTD 9-Box return compiler, and HMRC JSON/CSV exports.
- **Australia**: ATO GST (10%), 11-digit ABN Modulus 89 validation, BAS Form (G1-G11, 1A, 1B, 9), and PAYG withholding.

### 📤 Bulk Data Management
- **Import/Export**: Bulk CSV import and export for Contacts & Products using `papaparse`.
- **Batch Processing**: High-performance insertion using Supabase-native array batching.

### 🔔 Notifications
- **Cross-module Triggers**: Real-time notifications for leads, bills, and key business events.
- **Actionable Alerts**: Clickable notifications that lead directly to the relevant record.
- **Unread Tracking**: Per-user unread status and bulk "mark as read" capability.

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router) with Turbopack |
| **Database** | Supabase (PostgreSQL); tenant isolation in code (Prisma bypasses RLS) |
| **ORM** | Prisma 7 (with `@prisma/adapter-pg`) |
| **Auth** | Supabase Auth (`@supabase/ssr`) |
| **Styling** | Tailwind CSS & shadcn/ui |
| **Charts** | Recharts (v3) |
| **PDF** | @react-pdf/renderer |
| **Email** | Resend |
| **Payments** | Razorpay (plan billing only) |
| **Types** | TypeScript Strict |

---

## 🏁 Getting Started

### 1. Install Dependencies
```bash
# from app/ (the only npm project; Vercel builds it with app/package-lock.json)
npm install
```

### 2. Environment Setup
Create `.env.local` in `app/` (never commit it). Variables the code reads:

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes | App connection. On Vercel this is the Supabase **pooler** (port 6543, pgbouncer). |
| `DIRECT_URL` | For Prisma CLI | Direct connection (port 5432) for introspection and schema tooling. |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase Auth and storage. |
| `NEXT_PUBLIC_APP_URL` | Yes | Base URL for signup confirmation and checkout return links. |
| `NEXT_PUBLIC_SITE_URL` | Yes | Base URL for password-reset links. |
| `RESEND_API_KEY`, `RESEND_DOMAIN` | For email | Transactional email; sender domain must be verified in Resend. |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | For SaaS billing | Plan checkout and the `/api/webhooks/razorpay` signature check. |
| `SUPABASE_SERVICE_ROLE_KEY` | For uploads & admin | Server-only uploads to Supabase Storage (`src/lib/storage.ts`: tenant logos, website media, CVs), Super Admin create-tenant login and 2FA reset. Never expose it to the browser. |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | Optional | Cloudflare Turnstile spam check on website forms and sign-up. Off until both are set. The site key is public; store the secret as a Sensitive variable. |
| `TURNSTILE_HOSTNAMES` | No | Comma-separated hostnames a Turnstile token may come from. Default: genesoftinfotech.com, www.genesoftinfotech.com, genesoftdev.vercel.app, localhost and the host of `NEXT_PUBLIC_SITE_URL`. |
| `NEXT_PUBLIC_ALLOW_INDEXING` | No | Overrides search-engine indexing (by default only genesoftinfotech.com is indexed; test copies send noindex). |
| `NEXT_PUBLIC_ENABLE_PARKED_MODULES` | No | `true` brings back CRM Emails, WhatsApp, Web Forms and Bank Reconciliation. |
| `CRON_SECRET` | Recommended | Protects the daily job at `/api/cron/workflows` (scheduled in `vercel.json`): overdue-invoice / bill-due workflow rules, due recurring invoices and IMAP inbox sync. Vercel sends it automatically; without it the job refuses to run. |
| `MARKETING_UNSUBSCRIBE_SECRET` | Optional | Signs the unsubscribe links in marketing emails (Admin → Marketing Emails). Falls back to `ENCRYPTION_KEY`, then `CRON_SECRET`. Changing whichever one is used breaks the links in emails already sent, so set this once and keep it. |
| `ERROR_ALERT_EMAIL` | Optional | Where new-error alerts go (default: errorserp@genesoftinfotech.com, `PLATFORM.errorAlertEmail`). Every server error is also kept in Admin → System Logs. |
| `SYSTEM_LOG_RETENTION_DAYS` | Optional | How long System Logs are kept (default 30); the daily job deletes older ones. |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | Optional | Platform-wide Meta webhook verify token (tenants also get their own). Only used while WhatsApp is switched back on. |
| `ENCRYPTION_KEY` | Recommended | Encrypts stored tenant credentials (gateway keys, WhatsApp tokens, SMTP passwords). Any long random string, e.g. `openssl rand -base64 32`. Changing it makes stored secrets unreadable. |
| `PLATFORM_GSTIN` | Optional | Genesoft's own GSTIN, printed on platform subscription receipts. Unset = no tax ID printed. `PLATFORM_LEGAL_NAME`, `PLATFORM_EMAIL`, `PLATFORM_PHONE` override the defaults in `src/lib/constants/platform.ts`. |
| `COMPANY_NAME`, `COMPANY_ADDRESS`, `COMPANY_GSTIN`, `COMPANY_STATE` | No | Last-resort seller details for single-company installs. Leave unset on the SaaS: each tenant's own Settings are used, and nothing is invented when they're empty. |
| `NEXT_PUBLIC_ENABLE_COMPLIANCE_MODULES` | No | `true` shows the government-filing modules (GST returns, TDS, e-way, VAT 201, ZATCA returns, MTD, BAS, 1099). Leave unset until they're connected to the official APIs. |
| `ENABLE_DEMO_SEED` | No | `true` fills empty modules with sample data. Leave unset in production. |

> [!IMPORTANT]
> Schema changes go through migrations in `app/prisma/migrations` (since 2026-11-13; `0_baseline` is the live database as it was then). To change the database: edit `schema.prisma`, write the SQL as a new numbered folder (`N_name/migration.sql`; `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script` with `DATABASE_URL=<DIRECT_URL>?sslmode=require` prints it, read-only; drop any line touching `uq_site_items_kind_slug`, a partial index Prisma can't describe), then apply with `npx prisma migrate deploy` (same URL) before deploying code that needs it. `migrations.int.test.ts` fails if the migrations and the schema disagree. Never `prisma db push` or `prisma migrate dev`/`reset` against the shared database.

### 3. Generate Prisma Client
```bash
npx prisma generate
```

### 4. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to access the application. Note: local dev uses the shared database.

### 5. Tests
```bash
npm test                  # unit tests (src/**/*.test.ts)
npm run test:integration  # whole flows against in-memory Postgres (PGlite), never the shared DB
npm run test:all          # both
```
GitHub Actions (`.github/workflows/ci.yml`) runs type check, lint, tests and build on every push and pull request to `main`.

---

## 🏗️ Project Structure

```
CRM/
├── package.json         # Root workspace delegation
├── CLAUDE.md            # Current rules (security, data path, billing, website)
├── REMAINING_TASKS.md   # Open items
├── GO_LIVE_CHECKLIST.md # Domain switch & go-live steps
├── app/
│   ├── src/
│   │   ├── app/
│   │   │   ├── (marketing)/     # Public website genesoftinfotech.com (ERP pages under /erp)
│   │   │   ├── (auth)/          # Login, Register, Password Reset, /two-factor
│   │   │   ├── (dashboard)/
│   │   │   │   ├── crm/         # CRM module (leads, contacts, deals)
│   │   │   │   ├── sales/       # Sales module (quotes, invoices, orders, products)
│   │   │   │   ├── inventory/   # Inventory & warehouse management
│   │   │   │   ├── finance/     # Finance module (bills, accounts, ledger, reports)
│   │   │   │   ├── hr/ purchase/ projects/ manufacturing/ …
│   │   │   │   └── settings/    # Workspace settings, Team & Access, Data & Account
│   │   │   ├── admin/           # SaaS Super Admin Command Center
│   │   │   │   ├── dashboard/   # Intelligence telemetry hub
│   │   │   │   ├── tenants/     # Tenant lifecycle CRUD & 360 profiles
│   │   │   │   ├── security/    # Security policy & firewall control
│   │   │   │   ├── support/     # Support ticket orchestration
│   │   │   │   └── website/ pricing/ users/ audit/ …
│   │   │   ├── actions/         # Server Actions (tenant-scoped)
│   │   │   └── api/             # Force-dynamic API routes (webhooks, PDF export)
│   │   ├── components/          # Shared UI components (shadcn/ui)
│   │   ├── lib/                 # Shared business logic (ledger, plan-change, tax, security…)
│   │   └── proxy.ts             # Request proxy (session, 2FA, idle timeout, rate limit)
│   └── prisma/
│       └── schema.prisma        # Multi-tenant datamodel definition
```

---

## 🔒 Multi-Tenant Architecture

- Every tenant table has a `tenant_id`. Supabase RLS is enabled on all tables, but **the app talks to the database through Prisma, which bypasses RLS**. Tenant isolation therefore lives in the server actions: every query, including updates and deletes by id, must filter by the caller's `tenantId` from `getTenantId()`.
- Workspace-wide settings and credentials (company profile, SMTP, workflows, plan checkout, team & access) require a workspace admin via `getTenantAdminId()`.
- `src/proxy.ts` (Next.js 16's replacement for `middleware.ts`) refreshes the Supabase session and guards routes.
- Module access per member (NONE / VIEW / EDIT / FULL, `src/lib/access.ts`) and plan modules (`getPlanConfig()`) are applied in the tenant context.
- Super Admin routes (`/admin/*`) require the `SUPER_ADMIN` role via the server-side guard `ensureSuperAdmin()`.

---

## 📋 Production Deployment Verification

The application supports both root workspace delegation and direct `/app` deployments:
```bash
# Build from project root
npm run build

# Start production server on specified port
PORT=3000 npm start
```
See [DEPLOYMENT_AUDIT.md](../DEPLOYMENT_AUDIT.md) for the deployment checklist.
