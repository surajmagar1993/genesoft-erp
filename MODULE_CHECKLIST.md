# 📋 ERP & CRM Module Checklist (MVP Status)

### 🔴 P1: Core Business Operations — ✅ COMPLETE

#### 🤝 CRM (High Priority)
- [x] **Contacts**: Individual & Company contacts with search ✅
- [x] **Companies**: Organization-level record management ✅
- [x] **Leads**: (Standardized: Pagination & Filtering) ✅
- [x] **Deals**: (Standardized: Pagination & Filtering) ✅
- [x] **Tasks & Activities**: TODOs for team (Prisma Model + CRUD + UI) ✅
- [x] **Notes & Communication Log**: Dedicated DB model + Timeline UI implemented ✅

#### 🏪 Retail / B2C
- [x] **Customer Types**: Individual vs Company split ✅
- [x] **Quick Contact Creation**: Optimized for retail checkout ✅
- [x] **Customer Groups**: Categorization (VIP, Wholesale, etc) ✅
- [x] **Customer Credit Limit**: Basic enforcement support ✅
- [x] **Customer Ledger**: Balance history and adjustment logs ✅

#### 🛒 Sales & Invoicing
- [x] **Products Catalog**: DB exists, UI exists, CRUD Actions live ✅
- [x] **Services Catalog**: Supported via ProductType ✅
- [x] **Quotations**: Full CRUD live, (Standardized: Pagination & Filtering) ✅
- [x] **Sales Orders**: Full CRUD live, (Standardized: Pagination & Filtering) ✅
- [x] **Invoicing**: FULL Indian Tax Invoice support ✅
- [x] **Payment Tracking**: Record partial/full payments (UI + Actions) ✅
- [x] **Invoice PDF Export**: Force-dynamic route — build-time error resolved ✅ **(2026-04-08)**

#### ⚖️ Tax & Compliance (Indian Focus)
- [x] **GST Split**: Automatic CGST, SGST, IGST logic ✅
- [x] **HSN/SAC**: Support for Item-level HSN codes & summary tables ✅
- [x] **GSTIN Validator**: Format check implemented ✅
- [x] **Tax Engine**: Centralized GST computation with multi-slab support ✅
- [x] **MSME / Udyam**: DB field exists and handled in PDF ✅

#### 🏦 Finance (Basic)
- [x] **Chart of Accounts**: Hierarchical ledger categorization ✅
- [x] **Accounts Receivable (AR)**: Track customer aging and outstanding debt ✅
- [x] **Accounts Payable (AP)**: Track bills and vendor payments (Full CRUD live) ✅
- [x] **Multi-Currency Support**: Exchange rates, conversions & global formatting ✅
- [x] **Financial Reports**: P&L, Revenue Trend, Cash Flow Summary live ✅

#### ⚙️ Admin & SaaS
- [x] **Multi-Tenant**: Supabase Auth + Prisma multi-tenancy ✅
- [x] **RBAC**: Admin/Staff/Viewer roles in auth layer ✅
- [x] **Company Settings**: Logo, Address, Bank details, Tax Groups live in `/settings` ✅
- [x] **Notification System**: In-app unread tracking, cross-module triggers, Dashboard UI ✅
- [x] **Import/Export**: Bulk CSV import for contacts/products ✅
- [x] **Super Admin Command Center**: Premium platform intelligence hub with `recharts` charts ✅ **(2026-04-08)**
- [x] **ERP-Wide UI Cleanup**: All hardcoded example placeholders removed ✅ **(2026-04-08)**
- [x] **Live Support**: Infrastructure live and functional ✅
- [x] **ERP-Wide Build Stability**: Resolved Prisma connection errors and React 19 purity issues ✅ **(2026-04-09)**

---

## 🎯 Priority Strategy (My Recommendation)

| Phase | Focus | Timeline | Goal |
|---|---|---|---|
| 🔴 **P1 — MVP Launch** | CRM + Sales + Invoicing + Tax (India) + Admin | Month 1-3 | Get first paying customers |
| 🟡 **P2 — Growth** | Inventory + Purchase + HR + More Tax + Rental | Month 4-6 | Full ERP capability |
| 🟢 **P3 — Scale** | Manufacturing + Advanced Features + Integrations | Month 7+ | Compete with Zoho/Odoo |

> **Why this order?** CRM + Sales + Invoicing is where businesses see *immediate value*. You can start selling with just P1 modules. Everything else adds depth.

---

## 🤝 CRM — Customer Relationship Management

- [x] **Contacts Management** 🔴 — People, phone, email, addresses, tags, customer ledger, communications & tasks ✅
- [x] **Company/Organization Management** 🔴 — 360-degree company hub (`/crm/companies/[id]`), linked contacts, linked deals, pipeline analytics, interactive tabs & direct creation links ✅ **(2026-09-14)**
- [x] **Lead Management** 🔴 — Capture, score, assign, convert leads to deals (`/crm/leads/[id]`) ✅
- [x] **Deals / Opportunities** 🔴 — Sales pipeline, interactive stage progression stepper, auto-calibrated probabilities, weighted forecast, linked tasks & communications, quote generator (`/crm/deals/[id]`) ✅ **(2026-09-14)**
- [x] **Tasks & Activities** 🔴 — Follow-ups, calls, meetings, reminders ✅
- [x] **Notes & Communication Log** 🔴 — Track all interactions per contact, lead & deal ✅
- [x] **Email Integration** 🟡 — Send/receive emails within CRM, templates ✅
- [x] **Web Forms / Lead Capture** 🟡 — Embeddable forms for website ✅ (2026-09-12)

---

## 🛒 Retail / Individual Customer Management

- [x] **Customer Types (B2B / B2C)** 🔴
- [x] **Quick Contact Creation** 🔴
- [x] **Customer Groups / Segments** 🔴
- [x] **Customer Credit Limit** 🔴
- [x] **Customer Ledger / Statement** 🔴 ✅
- [x] **Customer Portal** 🟡 ✅ (`/portal/[token]`) **(2026-09-12)**
- [x] **Walk-in / POS Sales** 🟡 ✅ (`/sales/pos`) **(2026-09-12)**
- [ ] **Customer Loyalty / Points** 🟢

---

## 💰 Sales & Commerce

- [x] **Products Catalog** 🔴
- [x] **Services Catalog** 🔴
- [x] **Quotations / Estimates** 🔴
- [x] **Sales Orders** 🔴
- [x] **Invoicing** 🔴
- [x] **Payment Tracking** 🔴 ✅
- [x] **Credit Notes / Refunds** 🟡 ✅ **(2026-09-12)**
- [x] **Price Lists** 🟡 ✅ (`/sales/price-lists`) **(2026-09-12)**
- [ ] **Discount & Coupon Management** 🟢

---

## 📦 Purchase & Procurement

- [x] **Vendor / Supplier Management** 🟡 ✅ **(2026-09-10)**
- [x] **Purchase Orders** 🟡 ✅ **(2026-09-10)**
- [x] **Bills / Vendor Invoices** 🟡 ✅ **(2026-09-10)**
- [x] **Purchase Receipts** 🟡 ✅ **(2026-09-10)**
- [ ] **Request for Quotation (RFQ)** 🟢

---

## 🏭 Inventory & Warehouse

- [x] **Stock Management** 🟡 ✅ **(2026-09-10)**
- [x] **Barcode / QR Code Support** 🟡 ✅ **(2026-09-12)**
- [x] **Stock Adjustments** 🟡 ✅ **(2026-09-10)**
- [x] **Warehouse Management** 🟢 ✅ **(2026-09-10)**
- [x] **Stock Transfers** 🟢 ✅ **(2026-09-10)**
- [ ] **Batch & Serial Number Tracking** 🟢

---

## 📊 Finance & Accounting

- [x] **Chart of Accounts** 🔴 ✅
- [x] **Accounts Receivable (AR)** 🔴 ✅
- [x] **Accounts Payable (AP)** 🔴 ✅
- [x] **Multi-Currency Support** 🔴 ✅
- [x] **Financial Reports** 🔴 ✅
- [x] **General Ledger** 🟡 ✅ (`/finance/expenses`)
- [x] **Bank Reconciliation** 🟡 ✅ (`/finance/bank-reconciliation`)
- [x] **Expense Management** 🟡 ✅ (`/finance/expenses`)
- [ ] **Budgeting** 🟢

---

## 🌍 Multi-Country Tax & Compliance

### 🇮🇳 India (P1 — Your Home Market)
- [x] **GST (CGST + SGST + IGST)** 🔴
- [x] **HSN / SAC Codes** 🔴
- [x] **GSTIN Validation** 🔴
- [x] **Place of Supply Rules** 🔴
- [x] **MSME / Udyam Display** 🔴
- [x] **TDS (Tax Deducted at Source)** 🟡 ✅
- [x] **E-Way Bill Integration** 🟡 ✅
- [x] **GST Returns Data (GSTR-1, GSTR-3B)** 🟡 ✅ (ALL INDIA TAX P1/P2 COMPLETE 🇮🇳)

### 🇦🇪 UAE (P2)
- [x] **VAT (5%)** 🟡 ✅
- [x] **TRN (Tax Registration Number)** 🟡 ✅
- [x] **VAT Return Data** 🟢 ✅
- [x] **Reverse Charge Mechanism** 🟢 ✅ (ALL UAE TAX P2 COMPLETE 🇦🇪)

### 🇸🇦 Saudi Arabia (P2)
- [x] **VAT (15%)** 🟡 ✅
- [x] **ZATCA E-Invoicing (Fatoora)** 🟡 ✅
- [x] **QR Code on Invoices** 🟡 ✅
- [x] **Zakat Calculation** 🟢 ✅ (ALL KSA TAX & ZATCA P2 COMPLETE 🇸🇦)

### 🇦🇺 Australia (P2)
- [x] **GST (10%)** 🟡 ✅
- [x] **ABN (Australian Business Number) Validation** 🟡 ✅
- [x] **BAS (Business Activity Statement) Engine** 🟡 ✅
- [x] **PAYG Withholding & Tax Invoices** 🟢 ✅ (ALL AUSTRALIA TAX P2 COMPLETE 🇦🇺)

### 🇬🇧 United Kingdom (P2)
- [x] **VAT (20% Standard, 5% Reduced, 0% Zero)** 🟡 ✅
- [x] **VRN (VAT Registration Number) Validation** 🟡 ✅
- [x] **Making Tax Digital (MTD) 9-Box Return** 🟡 ✅
- [x] **HMRC MTD JSON & CSV Export** 🟢 ✅ (ALL UK TAX P2 COMPLETE 🇬🇧)

### 🇺🇸 United States (P3)
- [ ] **Sales Tax (State-wise)** 🟢
- [ ] **Tax Exemption Certificates** 🟢
- [ ] **1099 Reporting** 🟢
- [ ] **Multi-State Tax Rules** 🟢

### 🌐 General Tax Features
- [x] **Configurable Tax Engine** 🔴
- [x] **Tax Groups** 🔴
- [x] **Tax Exemptions** 🟡 — Statutory zero-rated supply (SEZ, Export, Govt, NGO, Reseller), certificate tracking on Contacts & Invoices, line-level exemption, dynamic statutory notice injection on PDF & web ✅ **(2026-09-14)**
- [x] **Tax Reports** 🟡 ✅ (`/finance/reports`, regional tax return data) **(2026-09-12)**
- [ ] **Withholding Tax** 🟢

---

## 🧾 Invoice Design & Features

- [x] **Tax Invoice** 🔴
- [x] **Company Header** 🔴
- [x] **Bill To / Ship To** 🔴
- [x] **HSN/SAC Column** 🔴
- [x] **Split Tax Columns** 🔴
- [x] **HSN/SAC Summary Table** 🔴
- [x] **Total In Words** 🔴
- [x] **Payment Bank Details** 🔴
- [x] **Invoice Numbering** 🔴
- [x] **PDF Generation** 🔴
- [x] **Email Invoice** 🔴
- [x] **Terms & Conditions** 🟡 ✅ **(2026-09-12)**
- [x] **Authorized Signature** 🟡 ✅ **(2026-09-12)**
- [x] **Declaration / Notes** 🟡 ✅ **(2026-09-12)**
- [x] **Proforma Invoice** 🟡 ✅ **(2026-09-12)**
- [x] **Credit Note / Debit Note** 🟡 ✅ **(2026-09-12)**
- [x] **Recurring Invoices** 🟡 ✅ (`/sales/invoices/recurring`)
- [x] **Delivery Challan** 🟢 — Rule 55 CGST Rules compliance, multi-purpose dispatch tracking, multi-copy printable slips (Consignee/Transporter/Consignor), and 1-click Tax Invoice conversion (`/sales/delivery-challans`) ✅ **(2026-09-14)**
- [ ] **Multi-Template Support** 🟢

---

## 👥 HR & People

- [x] **Employee Directory** 🟡 ✅ **(2026-09-10)**
- [x] **Attendance Tracking** 🟡 ✅ **(2026-09-10)**
- [x] **Payroll Processing** 🟢 — Salary structures, allowances, statutory deductions (PF, ESI, PT, TDS), attendance sync, monthly pay runs, and printable payslip slips (`/hr?tab=payroll` & `/hr/payroll`) ✅ **(2026-09-14)**
- [x] **Recruitment / Hiring** 🟢 — Applicant Tracking System (ATS), job requisition publishing (`JOB-YYYY-XXX`), visual candidate pipeline (Kanban & Table), multi-round interview scheduling with video links & scorecards, and 1-click hire conversion to Employee Directory (`/hr?tab=recruitment` & `/hr/recruitment`) ✅ **(2026-09-14)**
- [ ] **Employee Self-Service Portal** 🟢
- [ ] **Performance Reviews** 🟢
- [ ] **Training & Development** 🟢

---

## 📁 Project Management

- [x] **Projects** 🟡 ✅ **(2026-09-10)**
- [x] **Tasks & Subtasks** 🟡 ✅ **(2026-09-10)**
- [x] **Time Tracking** 🟡 ✅ **(2026-09-10)**
- [x] **Milestones & Deadlines** 🟢 ✅ **(2026-09-10)**
- [ ] **Gantt Charts** 🟢
- [x] **Project Billing** 🟢 ✅ **(2026-09-10)**

---

## 🏠 Rental Management

- [x] **Asset Management** 🟡 ✅ **(2026-09-12)**
- [x] **Rental Agreements** 🟡 ✅ **(2026-09-12)**
- [x] **Rental Invoicing** 🟡 ✅ **(2026-09-12)**
- [x] **Rental Scheduling** 🟢 ✅ **(2026-09-12)**
- [x] **Returns & Damage Tracking** 🟢 ✅ **(2026-09-12)**

---

## 🔧 Manufacturing (Optional)

- [x] **Bill of Materials (BOM)** 🟢 — Multi-level component formulas, scrap allowance %, labor & machine overhead computation, batch unit costs (`/manufacturing?tab=boms`) ✅ **(2026-09-14)**
- [x] **Work Orders** 🟢 — Shop floor production execution (`PLANNED` ➔ `CONFIRMED` ➔ `IN_PROGRESS` ➔ `QUALITY_CHECK` ➔ `COMPLETED`), priority scheduling, automated source warehouse component deduction & target warehouse finished good addition (`/manufacturing?tab=work-orders`) ✅ **(2026-09-14)**
- [x] **Quality Control** 🟢 — Inspection checkpoints, criteria parameters, pass/fail/conditional verdicts with lot tracing (`/manufacturing?tab=qc`) ✅ **(2026-09-14)**
- [x] **Raw Material Planning** 🟢 — Stock shortage evaluation, warehouse-aware component availability checking prior to production dispatch ✅ **(2026-09-14)**

---

## 📈 Reports & Analytics

- [x] **Dashboard** 🔴 — KPI metrics, charts, KPIs including SaaS Command Center ✅
- [x] **Sales Reports** 🔴 ✅
- [x] **Financial Reports** 🔴 ✅
- [x] **Export (PDF/Excel/CSV)** 🔴 ✅
- [x] **Inventory Reports** 🟡 — Stock Valuation (Cost basis vs Retail value, Gross margin yields), Turnover & Movement Velocity analysis, Multi-Depot Distribution matrix, CSV & print exports (`/inventory?tab=reports`) ✅ **(2026-09-14)**
- [ ] **HR Reports** 🟢
- [ ] **Custom Report Builder** 🟢

---

## ⚙️ Administration & Settings

- [x] **Multi-Tenant Management** 🔴
- [x] **User Roles & Permissions** 🔴
- [x] **Company Settings** 🔴 ✅
- [x] **Notification System** 🔴 ✅
- [x] **Audit Logs** 🟡 (expand `AdminAuditLog` with `EMAIL_TEMPLATE_UPDATE`, `EMAIL_TEMPLATE_RESET`, `EMAIL_TEMPLATE_TEST_DISPATCH`) ✅ **(2026-09-12)**
- [x] **Email Templates** 🟡 (`/admin/email-templates`) ✅ **(2026-09-12)**
- [ ] **Workflow Automation** 🟢
- [ ] **API Access** 🟢
- [x] **Webhooks** 🟢 ✅ (WhatsApp `/api/webhooks/whatsapp`, Stripe, Razorpay) **(2026-09-12)**
- [ ] **White Labeling** 🟢

---

## 💳 SaaS Subscription & Billing (SaaS Platform) ✅

- [x] **Subscription Plans**: Free, Basic, Pro, Enterprise tiers ✅
- [x] **Razorpay Integration**: Payment processing ✅
- [x] **Trial Management**: 15-day PRO trial infrastructure ✅
- [x] **Super Admin Command Center**: Platform intelligence hub with recharts ✅ **(2026-04-08)**
- [x] **Live Support Chat**: Real-time tenant support ✅
- [x] **Tenant Management CRUD** (`/admin/tenants`, `/admin/tenants/[id]`, `/admin/tenants/new`) ✅ **(2026-09-10)**
- [x] **Support Ticket Orchestration** from Command Center (`/admin/support`, `/admin/support/[id]`) ✅
- [x] **Platform Security & Governance** (`/admin/security`) — Rate limiting, IP firewall, 2FA enforcement, audit feed ✅ **(2026-09-10)**
- [x] **Plan Upgrade & Downgrade Engine**: Real-time proration math (used days, unused credit, net payable), scheduled downgrades at cycle end, and audit logging ✅ **(2026-09-12)**
- [x] **Platform Subscription Invoicing & Printable Slips**: Automated B2B tax receipts (`SAAS-INV-YYYY-XXXX`), regional tax splits (IN 18%, GB 20%, AE 5%, SA 15%, AU 10%, US 0%), and instant printable HTML receipt modal ✅ **(2026-09-12)**
- [x] **Tenant Billing Studio**: Monthly vs Annual frequency switcher (20% discount badge), 4-tier cards with current status, proration quote modal, and receipts ledger ✅ **(2026-09-12)**

---

## 🧩 Integrations (Future)

- [x] **Stripe / PayPal Payment Gateway Suite**: Multi-currency checkout (Stripe Checkout Session, PayPal Orders v2 API), subunit normalization (cents, fils, paise, zero-decimal currencies), multi-tenant credentials settings (`/settings` Payment Gateways tab), test connection ping, customer portal 1-click Pay Online modal (`/portal/[token]`), invoice action toolbar payment link generator (`/sales/invoices/[id]`), and webhook receivers (`/api/webhooks/stripe`, `/api/webhooks/paypal`) with automated ledger settlement ✅ **(2026-09-13)**
- [ ] **Twilio (SMS)** 🟢
- [ ] **Tally / QuickBooks** 🟢
- [ ] **Google Workspace** 🟢
- [ ] **Microsoft 365** 🟢
- [ ] **Zapier / Make** 🟢
- [ ] **Shopify / WooCommerce** 🟢

---

## 📊 Summary Count

| Priority | Modules | What's Included |
|---|---|---|
| 🔴 **P1 — MVP** | ~47 modules | CRM, Sales, Invoicing, India GST, Dashboard, Admin, SaaS Command Center, Multi-Currency |
| 🟡 **P2 — Growth** | ~40 modules | Purchase, Inventory, HR basics, UAE/KSA Tax, Rental, Projects |
| 🟢 **P3 — Scale** | ~35 modules | Manufacturing, USA Tax, Advanced Features, Integrations |
| **TOTAL** | **~122 modules** | **Full ERP/CRM Suite** |

---

> ✏️ **Review these priorities and let me know if you want to move any modules between phases!**
