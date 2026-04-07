# 🤖 AI System Context — Genesoft ERP & CRM

> **Last Updated:** 2026-04-08

## 🎯 Project Overview
This repository contains the **Genesoft ERP & CRM**, a multi-tenant SaaS application.
If an AI agent or contributor is newly opening this repository, read this file to understand the architecture, module checklists, and design rules so that you do not break the existing scaffolding.

### 📚 Core Documentation
This project uses several Markdown files to track state and requirements:
1. **`DESIGN_DOCUMENT.md`**: Contains the UX/UI rules, color palettes, spacing standards, and frontend technology decisions.
2. **`MODULE_CHECKLIST.md`**: Contains the high-level roadmap of 120+ ERP modules broken into Phase 1, Phase 2, and Phase 3.
3. **`TASK_TRACKER.md`**: The active checklist of what has been built versus what remains.
4. **`REMAINING_TASKS.md`**: A filtered checklist comprising only tasks that are incomplete and still pending execution.

## 🛠 Tech Stack
*   **Framework**: Next.js 15 (App Router)
*   **Language**: TypeScript (strict)
*   **Styling**: Tailwind CSS + shadcn/ui
*   **Icons**: lucide-react
*   **Charts**: recharts (v2) — installed 2026-04-08
*   **Backend & API**: Next.js Server Actions (replaces tRPC for data mutations)
*   **Database**: PostgreSQL
*   **ORM**: Prisma 7 (schema at `app/prisma/schema.prisma`) with `@prisma/adapter-pg`
*   **Auth & Storage**: Supabase (@supabase/ssr)
*   **Email**: Resend
*   **PDF**: @react-pdf/renderer + custom server rendering
*   **CSV**: papaparse (client-side import/export)

## 🗄 Database Design Schema (Prisma)
The database uses a strict multi-tenant architecture with Row-Level Security handled via Supabase RLS policies.
*   **Tenant Mapping**: Every major table (`User`, `Contact`, `Product`, `Invoice`, etc.) **MUST** contain a `tenantId` mapping to the `Tenant` schema.
*   **Users**: Linked to Supabase Auth via `authId` mapped against the `Tenant`.
*   **Models built so far**: Accounts (CoA), Contacts, Companies, Leads, Deals, Products, TaxGroups, TaxRates, Invoices, InvoiceItems (`invoice_line_items`), Payments, Tasks, CommunicationLog, LedgerEntry, Bill, BillItem, SupportTicket, SupportMessage, AdminAuditLog, SystemLog, PricingPlan.

## ⚠️ Critical Rules for AI Contributors

### Rule 1: Form Placeholders
**NEVER** hardcode example values inside form field placeholders. Always use instructional text:
- ❌ Wrong: `placeholder="QT-2024-001"` or `placeholder="John Doe"`
- ✅ Right: `placeholder="Enter quotation number"` or `placeholder="Contact full name"`

### Rule 2: Dynamic API Routes
All API routes that initialize Prisma or access the DB **MUST** export:
```typescript
export const dynamic = "force-dynamic";
```
Without this, `npm run build` will fail with `DATABASE_URL is missing`.

### Rule 3: Null-Safety for Admin Metrics
Admin dashboard health metrics may be `undefined` at render time. Always use null-coalescing:
```typescript
health.metrics?.tenants ?? 0
```

---

## 🏠 Super Admin Command Center (Completed — 2026-04-08)
Full SaaS platform intelligence hub at `/admin/dashboard`:
- **`app/admin/dashboard/page.tsx`** — Server component fetching all 4 data sources in parallel.
- **`app/admin/dashboard/DashboardCharts.tsx`** — Client `recharts` component with:
  - `LineChart` — Tenant Growth over last 6 months.
  - `PieChart` — Global Presence (top 5 countries).
- **`app/actions/saas/admin.ts`** includes:
  - `getPlatformStats()` — KPI metrics (tenants, users, revenue, tickets).
  - `getDashboardCharts()` — time-series and regional data for charts.
  - `getDatabaseHealth()` — latency and record count monitoring.
  - `getRecentSystemLogs()` — color-coded incident feed.
- **KPI Cards**: Glassmorphism styling, trend indicators, decorative background icons.
- **Quick Actions Panel**: Navigation tiles for Tenants, Tickets, Security, Settings.

## 🧾 GST Engine & PDF Generation (Completed — 2026-03-31)
A full Indian GST engine and PDF generation pipeline:
- **`lib/gst-engine.ts`** — Core logic for CGST/SGST/IGST split and HSN summary.
- **`lib/pdf/TaxInvoice.tsx`** — React-PDF template with standard Indian layout.
- **`app/actions/sales/invoices.ts`** — Storage integration & email automation.
- **DB**: `pdf_url` added to `invoices`; `settings` added to `tenants`.

## 🤝 CRM Tasks & Lead Detail (Completed — 2026-04-01)
Integrated task management and detailed lead view:
- **`components/crm/EntityTasks.tsx`** — Reusable task management component for any entity (Leads, Deals, Contacts).
- **`app/(dashboard)/crm/leads/[id]`** — Complete tabbed detail view for Leads.
- **Server Actions**: `getTasks`, `createTask`, `updateTaskStatus`, `deleteTask` in `app/actions/crm/tasks.ts`.

## 📝 CRM Communication Log (Completed — 2026-04-01)
Added interaction-tracking timeline across CRM entities:
- **`components/crm/EntityCommunications.tsx`** — Reusable timeline with type icons, relative timestamps, add/delete.
- **`app/actions/crm/communications.ts`** — `getCommunicationLogs`, `createCommunicationLog`, `deleteCommunicationLog`.
- **Prisma**: `CommunicationLog` model with `CommunicationType` enum (NOTE, CALL, EMAIL, MEETING, SMS, OTHER).

## 💰 Customer Ledger / Statement (Completed — 2026-04-01)
Full contact detail with accounting ledger:
- **`app/(dashboard)/crm/contacts/[id]/ContactDetailClient.tsx`** — 4-tab view (Ledger, Details, Notes, Tasks).
- **`app/actions/crm/ledger.ts`** — `recordTransaction` updates `LedgerEntry` and `Contact.balance` atomically.
- **Automated Triggers**: `createInvoice`, `deleteInvoice`, `createPayment`, `deletePayment` all invoke the ledger.

## 📊 Chart of Accounts (Completed — 2026-04-01)
Full CoA module:
- **`app/actions/finance/accounts.ts`** — CRUD + `seedDefaultAccounts()` for Indian template (39 accounts).
- **UI**: Hierarchical tree, expand/collapse, type filters, New/Edit forms.

## 🏛 Accounts Payable (Completed — 2026-04-01)
- **`app/actions/finance/bills.ts`** — CRUD for vendor bills, payments, AP dashboard.
- **Prisma**: `Bill` and `BillItem` models.

## 📊 Financial Reports (Completed — 2026-04-05)
- **`app/actions/finance/reports.ts`** — P&L, Monthly Revenue, Cash Flow, Working Capital aggregations.

## 🎫 Support & Ticketing (Completed — 2026-04-07)
- **Prisma**: `SupportTicket` (Status/Priority) and `SupportMessage` (Admin/User flags).
- **RBAC**: Integrated with user roles.

## 💱 Multi-Currency Support (Completed — 2026-04-07)
- **`lib/utils.ts`** — `formatCurrency(amount, code)` using `Intl.NumberFormat`.
- **`app/actions/finance/exchange-rates.ts`** — `getExchangeRate` with built-in reference rates.
- **Models**: `currency_code` added to `Quote`, `SalesOrder`, `Bill`, and `Contact`.

## 🚦 Contribution Workflow (For AI Agents)
1. **Never** deviate from `lucide-react` or `shadcn/ui` components for base UI.
2. **Never** put hardcoded example data in form placeholders (see Rule 1 above).
3. **Always** add `export const dynamic = "force-dynamic"` to new API routes (see Rule 2 above).
4. Always write UI first in standard TSX, then wire it up to server actions.
5. Once a module feature is complete, update `TASK_TRACKER.md` and remove it from `REMAINING_TASKS.md`.
6. Ensure components that interact with the database utilize the `tenantId` parameter from the active session context.
7. **Next active block**: Tenant Management CRUD page (`/admin/tenants`).
