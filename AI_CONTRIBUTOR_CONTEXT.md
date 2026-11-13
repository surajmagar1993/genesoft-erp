# 🤖 AI System Context — Genesoft ERP & CRM

> **Last Updated:** 2026-11-13
>
> **Read `CLAUDE.md` first.** Its Security Rules describe the code as it is today and override anything below. The module sections further down were written when each module was first built (2026-03 to 2026-09) and are kept for history; where they disagree with `CLAUDE.md`, `CLAUDE.md` wins.

## 🎯 Project Overview
This repository contains the **Genesoft ERP & CRM**, a multi-tenant SaaS application.
If an AI agent or contributor is newly opening this repository, read this file to understand the architecture, module checklists, and design rules so that you do not break the existing scaffolding.

### 📚 Core Documentation
This project uses several Markdown files to track state and requirements:
1. **`DESIGN_DOCUMENT.md`**: Contains the UX/UI rules, color palettes, spacing standards, and frontend technology decisions.
2. **`MODULE_CHECKLIST.md`**: Contains the high-level roadmap of 120+ ERP modules broken into Phase 1, Phase 2, and Phase 3.
3. **`TASK_TRACKER.md`**: The active checklist of what has been built versus what remains.
4. **`REMAINING_TASKS.md`**: Pending work; start with "Open items" at the bottom.
5. **`GO_LIVE_CHECKLIST.md`**: Domain switch, keys and steps before real customers.
6. **`BUG_REPORT.md`**: The 2026-10-14 module audit and its fix log (fully worked through).
7. **`WEBSITE_OVERHAUL_PLAN.md`**: Plan for the genesoftinfotech.com company website.
8. **`.memory/`**: Architectural decisions and patterns.

## 🛠 Tech Stack
*   **Framework**: Next.js 16 (App Router)
*   **Language**: TypeScript (strict)
*   **Styling**: Tailwind CSS + shadcn/ui
*   **Icons**: lucide-react
*   **Charts**: recharts (v3)
*   **Backend & API**: Next.js Server Actions (replaces tRPC for data mutations)
*   **Database**: PostgreSQL
*   **ORM**: Prisma 7 (schema at `app/prisma/schema.prisma`) with `@prisma/adapter-pg`
*   **Auth & Storage**: Supabase (@supabase/ssr)
*   **Email**: Resend
*   **Payments**: Razorpay only (plan billing), every region
*   **Tests**: Vitest unit tests + PGlite integration tests (`npm run test:all`); GitHub Actions CI on `main`
*   **PDF**: @react-pdf/renderer + custom server rendering
*   **CSV**: papaparse (client-side import/export)

## 🗄 Database Design Schema (Prisma)
The database uses a multi-tenant architecture. Supabase RLS is enabled on every table, but the app queries only through Prisma (never `supabase.from(...)`), which bypasses RLS, so tenant isolation must be enforced in each server action (see Rule 7).
*   **Tenant Mapping**: Every major table (`User`, `Contact`, `Product`, `Invoice`, etc.) **MUST** contain a `tenantId` mapping to the `Tenant` schema.
*   **Users**: Linked to Supabase Auth via `authId` mapped against the `Tenant`.
*   **Models built**: Accounts (CoA), Contacts, Companies, Leads, Deals, Products, TaxGroups, TaxRates, Invoices, InvoiceItems (`invoice_line_items`), Payments, Tasks, CommunicationLog, LedgerEntry, Bill, BillItem, SupportTicket, SupportMessage, AdminAuditLog, SystemLog, PricingPlan, Warehouse, WarehouseStock, StockMovement, PurchaseOrder, PurchaseOrderItem, Form, FormSubmission, RentalAsset, RentalAgreement, PortalTicket, PortalTicketMessage, JournalEntry/JournalEntryLine (general ledger), Site* (website CMS) and many more; see `schema.prisma`. The live database has drifted from the schema in places: never run `prisma db push`/`migrate` on it; schema changes are reviewed SQL files in `app/*.sql`.

## ⚠️ Critical Rules for AI Contributors

### Rule 1: Form Placeholders
**NEVER** hardcode example values inside form field placeholders. Always use instructional text:
- ❌ Wrong: `placeholder="QT-2024-001"` or `placeholder="John Doe"`
- ✅ Right: `placeholder="Enter quotation number"` or `placeholder="Contact full name"`

### Rule 2: Build Stability & Dynamic Routes
All API routes that initialize Prisma or access the DB **MUST** export:
```typescript
export const dynamic = "force-dynamic";
```
Additionally, `lib/prisma.ts` is configured to skip connection errors during the build phase to prevent blocking deployment when `DATABASE_URL` is missing.

### Rule 3: Null-Safety for Admin Metrics
Admin dashboard health metrics may be `undefined` at render time. Always use null-coalescing:
```typescript
health.metrics?.tenants ?? 0
```

### Rule 4: React 19 Purity & State Sync
*   **Impure Functions**: Never use `Date.now()`, `Math.random()`, or `new Date()` directly during the render phase or in `useState` initializers (unless using a stable ID). These cause hydration mismatches and React 19 lint errors. Generate these in `useEffect` or on the server.
*   **State Synchronization**: Avoid calling `setState` inside `useEffect` logic if it's dependent on props (cascading renders). Instead, perform state updates during the render phase using the "derived state" or "previous prop check" pattern.

### Rule 5: Tenant Context Helper Import
Always import `getTenantId` from `@/lib/get-tenant-id` (NOT from `@/lib/auth`).

### Rule 6: Knowledge Graph Synchronization
After completing code changes in a session, run `graphify update .` from the repo root to keep the knowledge graph (`graphify-out/`) synchronized.

### Rule 7: Tenant Scoping & Admin-Only Settings
Every query using a client-supplied id must include `tenantId`, and referenced ids (contacts, accounts, products, warehouses…) must be checked against the tenant. Pick the helper by role: `getTenantId()` reads, `getTenantWriterId()` writes, `getTenantManagerId()` deletes/voids/approvals/finance/HR, `getTenantAdminId()` workspace settings and credentials, each with the action file's `MODULE`. Stored credentials go through `sealSecret()`/`openSecret()` in `@/lib/secret-box`. See the Security Rules section in `CLAUDE.md`.

---

## 🏢 Tenant Management Lifecycle (Completed — 2026-09-10)
Full multi-tenant provisioning, inspection, and administration under `/admin/tenants`:
- **`app/admin/tenants/new/page.tsx`** — Super Admin manual onboarding:
  - Configures business profile, operating country, currency, subscription tier, and trial duration.
  - Automatically provisions the tenant and seeds 39 standard Indian Chart of Accounts (Assets, Liabilities, Equity, Revenue, Expenses) atomically.
- **`app/admin/tenants/[id]/page.tsx` & `TenantDetailClient.tsx`** — 360° Tenant Intelligence View:
  - 4-column metric cards: Billed Revenue, Total Invoices, Contacts, Active Users.
  - 4 tabs: Overview & Settings, Team Members roster, Business Footprint metrics, and Governance Audit Trail.
  - In-place management: Extend trial (+7d), change subscription plan, suspend/activate account, and edit company profile.
- **`app/actions/saas/admin.ts`** includes:
  - `getTenantById(tenantId)` — fetches tenant with users, module counts, and audit logs.
  - `createTenant(payload)` — provisions tenant with auto-seeded CoA and logs action in `AdminAuditLog`.
  - `updateTenantDetails(tenantId, payload)` — updates tenant properties and revalidates paths.

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

## 🛡️ Platform Security & Governance (Completed — 2026-09-10; enforced 2026-11-13)
Full platform security command center under `/admin/security`. Since 2026-11-13 the policy is enforced: the proxy applies rate limits, the idle timeout and two-factor (`/two-factor`), and the `login` action locks out repeated failures (see `CLAUDE.md` → Sign-in security):
- **`app/admin/security/page.tsx` & `SecurityDashboardClient.tsx`** — Telemetry cards (2FA, Rate Limit, Blocked IPs, Session Guard), policy toggles, IP blocklist manager, and security incident feed.
- **`app/actions/saas/admin.ts`** — `getSecurityOverview`, `updateSecurityPolicy`, `addBlockedIp`, `removeBlockedIp`.
- **Audit**: All actions logged to `AdminAuditLog` with target type `SECURITY` or `IP_RULE`.

## 🏭 Inventory & Multi-Warehouse Operations (Completed — 2026-09-10)
Full multi-depot stock management under `/inventory`:
- **`app/(dashboard)/inventory/page.tsx` & `inventory-client.tsx`** — 4-column KPI telemetry (Valuation, Units, Facilities, Alerts), Low Stock warning banner, 4 tabbed views (Stock Levels, Warehouses, Movement Ledger, Reorder Alerts), and operational modals for stock adjustments, transfers, and warehouse creation.
- **`app/actions/inventory.ts`** — `getInventoryOverview`, `createWarehouse`, `updateWarehouse`, `adjustStock`, `transferStock`.
- **Database**: `warehouses`, `warehouse_stocks`, and `stock_movements` with RLS.
- **Auto-Provisioning**: Automatically creates default `WH-MAIN` and links products upon initial tenant access.

## 💬 WhatsApp Business API Hub (Completed — 2026-09-12; switched off 2026-11-12)
> Hidden for every business behind `NEXT_PUBLIC_ENABLE_PARKED_MODULES` (with CRM Emails, Web Forms and Bank Reconciliation). Code and data are kept; the webhook route still answers.
- **`app/src/lib/whatsapp-engine.ts`**: Meta Graph API v20.0 client, E.164 phone normalizer (IN, US, UK, AE, SA, AU), 7 statutory templates, 1-click `wa.me` links, and webhook parser.
- **`app/src/app/actions/crm/whatsapp.ts`**: Config management, message/invoice dispatch, and communication timeline sync.
- **`app/src/app/api/webhooks/whatsapp/route.ts`**: Challenge verification (per-tenant verify token) and event receiver; each phone number's events are verified with that tenant's Meta App Secret (`X-Hub-Signature-256`).
- **`app/src/app/(dashboard)/crm/whatsapp/`**: 4-KPI studio with conversational WhatsApp bubbles, invoice dispatcher, and Meta gateway configuration desk.
- **`app/src/app/(dashboard)/sales/invoices/[id]/`**: In-place WhatsApp modal dispatch from invoice action toolbar.

## 🌍 Multi-Country Statutory Tax Engines (Completed — 2026-09-12; hidden)
> The filing screens are behind `NEXT_PUBLIC_ENABLE_COMPLIANCE_MODULES` and aren't connected to any government system. Documents use basic tax via `resolveTaxRegime`.

Pure TypeScript statutory tax calculation engines located in `app/src/lib/`:
- **India**: `gst-returns-engine.ts` (GSTR-1, GSTR-3B), `eway-bill-engine.ts` (Rule 138 CGST, distance), `tds-engine.ts` (194C/J/I/H/Q/A, 206AA).
- **UAE**: `uae-vat-engine.ts` (5% VAT, 15-digit TRN, Form VAT201, 7 Emirates supply split, FAF audit file).
- **KSA**: `ksa-zatca-engine.ts` (15% VAT, ZATCA Fatoora Phase 1 & 2 UBL 2.1 XML, TLV Base64 QR code, Zakat base).
- **UK**: `uk-vat-engine.ts` (20% Standard, 5% Reduced, 0% Zero, Modulus 97 VRN, HMRC MTD 9-Box return).
- **Australia**: `australia-tax-engine.ts` (10% GST, Modulus 89 ABN, ATO BAS Form, PAYG Option 4).

## 🧭 Customer Portal
- **`app/src/app/portal/[token]/`**: Token-authenticated customer self-service center for viewing and downloading invoices and submitting support tickets without requiring a SaaS user seat. Customers can't pay online from it.
- The Retail POS terminal (`/sales/pos`) was removed completely on 2026-11-12; past POS sales remain as ordinary invoices.

## 🚦 Contribution Workflow (For AI Agents)
1. **Never** deviate from `lucide-react` or `shadcn/ui` components for base UI.
2. **Never** put hardcoded example data in form placeholders (see Rule 1 above).
3. **Always** add `export const dynamic = "force-dynamic"` to new API routes (see Rule 2 above).
4. Always write UI first in standard TSX, then wire it up to server actions.
5. Once a module feature is complete, update `TASK_TRACKER.md` and remove it from `REMAINING_TASKS.md`.
6. Ensure components that interact with the database utilize the `tenantId` parameter from `@/lib/get-tenant-id`.
7. Any new code that creates, edits, deletes or changes the status of an invoice, credit note, refund, payment, bill or payroll run must call `postToLedger`.
8. Add an integration test (`*.int.test.ts`) when you change a money or data flow.
9. **Next work**: see "Open items" in `REMAINING_TASKS.md`. Stripe and PayPal were removed on 2026-11-13 (Razorpay only); don't re-add them.
