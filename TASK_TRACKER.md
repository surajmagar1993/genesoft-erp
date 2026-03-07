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
- [x] **Contacts Management**
- [x] **Company/Organization Management**
- [x] **Lead Management**
- [x] **Deals / Opportunities**
- [ ] Tasks & Activities
- [ ] Notes & Communication Log

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
- [/] **Invoicing** (Scaffolding layout)
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
