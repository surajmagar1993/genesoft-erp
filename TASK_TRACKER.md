# ERP & CRM Multi-Platform SaaS — Master Task Tracker

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

---

## 🔴 P1 — MVP Launch (Month 1-3)

### CRM — Customer Relationship Management
- [x] **Contacts Management** — page live, Supabase-connected
- [x] **Company/Organization Management** — page live, migration fix applied
- [x] **Lead Management** — page live, Supabase-connected
- [x] **Deals / Opportunities** — page live, Supabase-connected
- [ ] Tasks & Activities
- [ ] Notes & Communication Log
- [x] **CRUD forms (create/edit/delete)** — Contacts, Leads, Deals, Companies all have NEW + EDIT pages with Supabase server actions
- [x] **Company interface type-safety fix** — added optional `gstin`, `country_code` fields
- [x] **Git commit & push** — all CRM changes pushed to `main` on GitHub (commit `bc3ce3c`)
- [x] **Vercel env prep** — `.env.local` exported as `env_vercel.txt` on Desktop for deployment
- [x] **Dashboard KPI cards** — connected to live Supabase counts (commit `c509ff8`); recent leads/deals feed + pipeline summary added
- [x] **Tenant-scoped RLS** — `get-tenant-id.ts` helper; all 4 CRM actions scope reads/writes by `tenant_id`; `rls_tenant_migration.sql` generated with `my_tenant_id()` function, auto-provision signup trigger, and backfill block (commit `e71517b`) — ⚠️ SQL must be run in Supabase dashboard
- [x] **`getById` helpers** — `getLeadById`, `getDealById`, `getContactById`, `getCompanyById` added (tenant-guarded)

### Retail / Individual Customer Management
- [x] **Customer Types (B2B / B2C)**
- [x] **Quick Contact Creation**
- [x] **Customer Groups / Segments**
- [x] **Customer Credit Limit**
- [ ] Customer Ledger / Statement

### Sales & Commerce
- [x] **Products Catalog**
- [x] **Services Catalog** 
- [x] **Quotations / Estimates**
- [ ] Sales Orders
- [x] **Invoicing** — Full CRUD live, tenant-scoped, Supabase-connected
  - `invoices` + `invoice_line_items` tables with RLS (tenant-scoped via `my_tenant_id()`)
  - `updated_at` auto-trigger applied and verified
  - Server actions: `getInvoices`, `getInvoiceById`, `createInvoice`, `updateInvoice`, `deleteInvoice`
  - List page: stats cards, search, status filter, table with actions
  - New invoice page wired to `createInvoice` action
  - Edit invoice page: server shell fetches by ID, client adapter maps DB ↔ form
  - All mock data removed — 100% live Supabase data
  - DB migration verified via Supabase MCP (all columns, policies, triggers confirmed)
- [ ] Payment Tracking

### Finance & Accounting (Core)
- [ ] Chart of Accounts
- [ ] Accounts Receivable (AR)
- [ ] Accounts Payable (AP)
- [ ] Multi-Currency Support (Started in UI)
- [ ] Financial Reports (Basic)

### Multi-Country Tax & Compliance (India)
- [ ] GST (CGST + SGST + IGST) Logic & Engine
- [x] **HSN / SAC Codes** (Added to Schema/UI)
- [ ] GSTIN Validation
- [ ] Place of Supply Rules
- [ ] MSME / Udyam Display

### Invoice Design & Features
- [ ] Tax Invoice PDF Template
- [ ] Company Header
- [ ] Bill To / Ship To Formatting
- [ ] HSN/SAC Column
- [ ] Split Tax Columns
- [ ] HSN/SAC Summary Table
- [ ] Total In Words
- [ ] Payment Bank Details
- [ ] Invoice Numbering Sequence
- [ ] PDF Generation
- [ ] Email Invoice

### Administration & Settings
- [x] **Multi-Tenant Management** (Schema complete)
- [x] **User Roles & Permissions** (Schema complete)
- [ ] Company Settings (UI)
- [ ] Notification System (Base UI)
- [ ] Import / Export Data

### Subscription & Billing (SaaS Platform)
- [ ] Subscription Plans Definition
- [ ] Razorpay Integration
- [ ] Trial Management

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
- [ ] Admin: Audit Logs
- [ ] Admin: Email Templates
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
