# ERP & CRM Multi-Platform SaaS — Master Task Tracker

> **Last Updated:** 2026-04-08 (v6) | **Latest Commit:** Pending push | **Branch:** `main`

## Brainstorming Phase ✅
- [x] Define purpose & scale
- [x] Choose cross-platform strategy
- [x] Select tech stack
- [x] Determine hosting
- [x] Analyze existing invoice
- [x] Create module checklist (128 modules)
- [x] Set module priorities
- [x] Add retail/B2C features
- [x] Understanding Lock confirmed
- [x] Design document approved

## Project Setup & Scaffolding ✅
- [x] Initialize Next.js 15 project with TypeScript
- [x] Install core dependencies (Tailwind, shadcn/ui, tRPC, Prisma)
- [x] Set up project folder structure (monorepo layout)
- [x] Configure Supabase connection
- [x] Set up Prisma schema with multi-tenant core tables
- [x] Configure authentication (Supabase Auth + @supabase/ssr)
- [x] Build app shell (sidebar, navigation, layout)
- [x] Push initial codebase to GitHub repository

## Supabase Integration & Live Testing ✅
- [x] Unified Supabase client (`src/lib/supabase/client.ts`) and server (`src/lib/supabase/server.ts`) utilities
- [x] Created `crm_migration.sql` — tenants, profiles, contacts, leads, deals tables with RLS
- [x] Fixed missing `companies` table (was absent from original migration SQL)
- [x] Applied full migration to Supabase — all 6 tables confirmed live
- [x] Supabase Auth: email confirmation disabled for dev; login working end-to-end
- [x] Live browser verified: Dashboard, Contacts, Companies, Leads, Deals pages all load error-free
- [x] User account `suraj.magar1993@gmail.com` created and login confirmed

## Global UI Alignment & Standardization ✅
- [x] Standardize page wrappers (remove redundant padding in Sales pages)
- [x] Unified heading styles (convert h2 to h1 across all modules)
- [x] Consistent search bar widths
- [x] Implement responsive 4-column stats grids on all major listing pages
- [x] Verify alignment after standardization
- [x] Convert modals to full pages (Contacts, Companies, Leads, Deals)
- [x] **ERP-Wide Placeholder Cleanup** — Removed all hardcoded example values (e.g., "QT-2024-001") from form fields across ALL modules ✅ (2026-04-08)

---

## 🔴 P1 — MVP Launch (Month 1-3)

### CRM — Customer Relationship Management
- [x] **Contacts Management** — page live, Supabase-connected
- [x] **Company/Organization Management** — page live, migration fix applied
- [x] **Deals / Opportunities** — (Standardized: Pagination & Filtering) ✅ Done
- [x] **Lead Management** — (Standardized: Pagination & Filtering) ✅ Done
- [x] **Tasks & Activities** — Prisma model, server actions, and shared component ✅
- [x] **Notes & Communication Log** — CommunicationLog model, server actions, EntityCommunications timeline UI ✅
- [x] **CRUD forms (create/edit/delete)** — Contacts, Leads, Deals, Companies all have NEW + EDIT pages
- [x] **Company interface type-safety fix** — added optional `gstin`, `country_code` fields
- [x] **Git commit & push** — all CRM changes pushed to `main` on GitHub (commit `bc3ce3c`)
- [x] **Vercel env prep** — `.env.local` exported as `env_vercel.txt` on Desktop
- [x] **Dashboard KPI cards** — connected to live Supabase counts (commit `c509ff8`)
- [x] **Tenant-scoped RLS** — `get-tenant-id.ts` helper; all CRM actions scope by `tenant_id`
- [x] **Lead Detail Page** — Unified tabbed view with Overview + Integrated Tasks ✅
- [x] **`getById` helpers** — `getLeadById`, `getDealById`, `getContactById`, `getCompanyById` added

### Retail / Individual Customer Management
- [x] **Customer Types (B2B / B2C)**
- [x] **Quick Contact Creation**
- [x] **Customer Groups / Segments**
- [x] **Customer Credit Limit**
- [x] **Customer Ledger / Statement** ✅

### Sales & Commerce
- [x] **Products Catalog**
- [x] **Services Catalog**
- [x] **Sales Orders** — (Standardized: Pagination & Filtering) ✅ Done
- [x] **Quotations / Estimates** — (Standardized: Pagination & Filtering) ✅ Done
- [x] **Invoicing** — Full CRUD live, tenant-scoped, Supabase-connected
  - `invoices` + `invoice_line_items` tables with RLS (tenant-scoped via `my_tenant_id()`)
  - `updated_at` auto-trigger applied and verified
  - Server actions: `getInvoices`, `getInvoiceById`, `createInvoice`, `updateInvoice`, `deleteInvoice`
  - (Standardized: Pagination & Filtering / Prisma mapping fix) ✅ Done
  - List page: stats cards, search, status filter, table with actions
  - New/Edit invoice pages wired to server actions
  - All mock data removed — 100% live data
  - DB migration verified via Supabase MCP
- [x] **Payment Tracking** — DB + UI + Server Actions for partial payments ✅
- [x] **Invoice PDF Export** — `export const dynamic = "force-dynamic"` applied to `/api/invoices/[id]/pdf/route.ts` — build-time error resolved ✅ (2026-04-08)

### Finance & Accounting (Core)
- [x] **Chart of Accounts** — CRUD, seed Indian CoA (39 accounts), hierarchical UI ✅
- [x] **Accounts Receivable (AR)** — aging buckets, top debtors ✅
- [x] **Accounts Payable (AP)** — Bills CRUD, AP dashboard, vendor payments, bill edit ✅
- [x] **Financial Reports (Basic)** — P&L, Revenue Trend, Cash Flow, Working Capital ✅
- [x] **Multi-Currency Support** — INR, USD, AED, SAR with exchange rate-aware ledger ✅

### Multi-Country Tax & Compliance (India) ✅
- [x] **GST (CGST + SGST + IGST) Logic & Engine**
- [x] **HSN / SAC Codes** (Added to Schema/UI)
- [x] **GSTIN Validation**
- [x] **Place of Supply Rules**
- [x] **MSME / Udyam Display**

### Invoice Design & Features ✅
- [x] Tax Invoice PDF Template
- [x] Company Header (Logo, GSTIN, MSME/Udyam)
- [x] Bill To / Ship To Formatting
- [x] HSN/SAC Column
- [x] Split Tax Columns (CGST/SGST/IGST)
- [x] HSN/SAC Summary Table
- [x] Total In Words
- [x] Payment Bank Details
- [x] Invoice Numbering Sequence
- [x] PDF Generation
- [x] Email Invoice

### Administration & Settings
- [x] **Multi-Tenant Management** (Schema complete)
- [x] **User Roles & Permissions** (Schema complete)
- [x] **Company Settings (UI)** — Logo, Address, Bank details, Tax Groups ✅
- [x] **Notification System** — In-app with unread tracking, cross-module triggers ✅
- [x] **Import / Export Data** — Bulk CSV import for Contacts & Products ✅

### SaaS Super Admin Command Center ✅ (2026-04-08)
- [x] **Platform Stats** — `getPlatformStats()` for KPI cards
- [x] **Dashboard Charts** — `getDashboardCharts()` for time-series & regional data
- [x] **Database Health** — `getDatabaseHealth()` for latency and record counts
- [x] **System Logs** — `getRecentSystemLogs()` for incident feed
- [x] **Tenant Growth Chart** — `LineChart` via recharts
- [x] **Global Presence Chart** — `PieChart` via recharts
- [x] **KPI Cards** — glassmorphism, trend indicators, decorative icons
- [x] **Quick Actions Panel** — Tiles for Tenants, Tickets, Security, Settings
- [x] **Incident Monitor** — Color-coded severity feed
- [x] **`recharts` installed** ✅

### Subscription & Billing
- [x] **SaaS Infrastructure**
    - [x] Subscription Plans (Free, Pro, Enterprise)
    - [x] Razorpay Integration ✅ (Stripe Deferred for P1)
    - [x] Multi-tenant Data Isolation (RLS / Middleware)
    - [x] 15-Day PRO Trial Management ✅
    - [x] Live Support Chat System ✅

---

## 🟡 P2 — Growth (Month 4-6)

- [ ] CRM: Email Integration
- [ ] CRM: Web Forms / Lead Capture
- [ ] Retail: Customer Portal
- [ ] Retail: Walk-in / POS Sales
- [ ] Sales: Credit Notes / Refunds
- [ ] Sales: Price Lists
- [ ] Purchase: Vendor / Supplier Management
- [ ] Purchase: Purchase Orders
- [ ] Purchase: Bills / Vendor Invoices
- [ ] Purchase: Purchase Receipts
- [ ] Inventory: Stock Management
- [ ] Inventory: Barcode / QR Code Support
- [ ] Inventory: Stock Adjustments
- [ ] Finance: General Ledger
- [ ] Finance: Bank Reconciliation
- [ ] Finance: Expense Management
- [ ] Tax (India): TDS
- [ ] Tax (India): E-Way Bill Integration
- [ ] Tax (India): GST Returns Data
- [ ] Tax (UAE): VAT, TRN Validation
- [ ] Tax (KSA): VAT, Fatoora E-Invoicing, QR Code
- [ ] Invoice Features: Terms & Conditions
- [ ] Invoice Features: Authorized Signature
- [ ] Invoice Features: Declaration / Notes
- [ ] Invoice Features: Proforma Invoice
- [ ] Invoice Features: Credit/Debit Note
- [ ] Invoice Features: Recurring Invoices
- [ ] HR: Employee Directory
- [ ] HR: Attendance Tracking
- [ ] HR: Leave Management
- [ ] Projects: Projects & Teams
- [ ] Projects: Tasks & Subtasks
- [ ] Projects: Time Tracking
- [ ] Rentals: Asset Management
- [ ] Rentals: Agreements & Invoicing
- [ ] Admin: Audit Logs (expand `AdminAuditLog`)
- [ ] Admin: Email Templates
- [ ] SaaS: Tenant Management CRUD page (`/admin/tenants`) ← **NEXT**
- [ ] SaaS: Support Ticket management from Command Center
- [ ] SaaS: Plan Upgrade/Downgrade
- [ ] SaaS: Invoice Generation
- [ ] Integrations: WhatsApp Business API
- [ ] Integrations: Stripe / PayPal

---

## 🟢 P3 — Scale (Month 7+)

- [ ] Retail: Customer Loyalty / Points
- [ ] Sales: Discount & Coupon Management
- [ ] Purchase: Request for Quotation (RFQ)
- [ ] Inventory: Warehouse Management
- [ ] Inventory: Stock Transfers
- [ ] Inventory: Batch & Serial Tracking
- [ ] Finance: Budgeting
- [ ] Tax (UAE): VAT Return Data, Reverse Charge
- [ ] Tax (KSA): Zakat Calculation
- [ ] Tax (USA): Sales Tax Setup, 1099, Multi-State
- [ ] Tax (Global): Withholding Tax
- [ ] Invoice Features: Delivery Challan
- [ ] Invoice Features: Multi-Template Support
- [ ] HR: Payroll Processing
- [ ] HR: Recruitment
- [ ] HR: Employee Portal
- [ ] HR: Performance & Training
- [ ] Projects: Milestones, Gantt, Billing
- [ ] Rentals: Scheduling, Returns & Damage
- [ ] Manufacturing: BOM, Work Orders, QC, MRP
- [ ] Reports: Custom Report Builder
- [ ] Admin: Workflow Automation
- [ ] Admin: API & Webhooks
- [ ] Admin: White Labeling
- [ ] SaaS: Usage-Based Billing
- [ ] Integrations: Twilio, Tally/QuickBooks, Google/M365, Zapier/Make, Shopify/WooCommerce
