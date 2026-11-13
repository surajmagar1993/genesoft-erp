# 🚀 Remaining Tasks Tracker
*(Auto-updated — pending modules only)*

> **Last Updated:** 2026-11-13 | Testing on genesoftdev.vercel.app, not live yet. **Start with "Open items" at the bottom.**
>
> The ✅ entries below were written in September 2026 when each module was first built. Several overstate what shipped: the government-filing modules (GST returns, e-way bills, TDS, UAE VAT 201, KSA ZATCA phase 2, UK MTD, Australia BAS) only prepare figures and files, aren't connected to any government system, and are hidden behind `NEXT_PUBLIC_ENABLE_COMPLIANCE_MODULES`; "official/NIC-compliant/statutory" means "follows the published format", not certified. Stripe/PayPal invoice checkout and portal online payment aren't live. See "Known Gaps" and "Open items".

---

## ✅ P1 — MVP Launch (ALL COMPLETE)

All P1 tasks have been completed as of 2026-04-08. Key completions this session:
- [x] ERP-Wide UI Cleanup — removed all hardcoded example data from form placeholders ✅
- [x] Production Build Fix — `export const dynamic = "force-dynamic"` on invoice PDF route ✅
- [x] SaaS Super Admin Command Center — KPI cards, Charts, Health Monitor, Incident Feed ✅
- [x] `recharts` installed and integrated ✅

---

## 🟡 P2 — Growth (ALL COMPLETE ✅)

### 🔴 Immediate Next Steps (SaaS Admin)
- [x] **Tenant Management CRUD Page** (`/admin/tenants`, `/admin/tenants/[id]`, `/admin/tenants/new`) ✅
- [x] **Support Ticket Orchestration** (`/admin/support`, `/admin/support/[id]`) ✅
- [x] **AdminAuditLog Expansion** — Track granular platform-level governance actions ✅
- [x] **Platform Security Page** (`/admin/security`) — Rate limits, blocked IPs, 2FA enforcement ✅

### 🟡 Completed P2 Core Operations (Inventory, Purchase, HR, Projects, Rental, Sales, Finance & CRM)
- [x] **Inventory: Stock Management & Multi-Warehouse Control** (`/inventory`) — Multi-depots, SKU tracking, atomic stock adjustments, transfers, reorder alerts, transaction audit ledger ✅ **(2026-09-10)**
- [x] **Purchase: Vendor Management & Purchase Orders** (`/purchase`) — Supplier directory, PO lifecycle, multi-facility goods intake, AP bill conversion ✅ **(2026-09-10)**
- [x] **HR: Employee Directory, Attendance & Leaves** (`/hr`) — Employee directory, departmental structuring, daily attendance tracking, leave workflows ✅ **(2026-09-10)**
- [x] **Projects: Agile Delivery, Kanban Boards, Milestones & Timesheets** (`/projects`) — 5-stage Kanban board, milestone deliverable checklists, HR resource allocation, billable timesheets ✅ **(2026-09-10)**
- [x] **Rental: Rental Management & Asset Leasing** (`/sales/rental`) — Multi-asset catalog, lease agreements, checkouts, returns & damage inspections, and sales invoicing ✅ **(2026-09-12)**
- [x] **Sales: Credit Notes & Refunds** (`/sales/credit-notes`) — Customer refunds, returns against invoices, credit memo ledger, inventory restock ✅ **(2026-09-12)**
- [x] **Finance: Expense Management & General Ledger** (`/finance/expenses`) — Operational business expenses, employee reimbursement claims, double-entry journal vouchers (`JE-YYYY-XXXX`), and Account T-Ledgers ✅ **(2026-09-12)**
- [x] **Sales: Price Lists & Customer Tier Pricing** (`/sales/price-lists`) — Wholesale/retail rate cards, volume discount breaks, and interactive price resolution simulator ✅ **(2026-09-12)**
- [x] **Finance: Bank Reconciliation** (`/finance/bank-reconciliation`) — Multi-bank accounts, statement batch imports, rule-based auto-matching engine, split-screen match desk, and discrepancy diagnostics ✅ **(2026-09-12)** **Switched off for businesses 2026-11-12 (hidden, code and data kept).**
- [x] **Invoice Features: Recurring Invoices** (`/sales/invoices/recurring`) — Automated subscription retainers, cyclical schedules, next run countdowns, and instant invoice generation ✅ **(2026-09-12)**
- [x] **CRM: Email Integration** (`/crm/emails`) — Connect corporate IMAP/SMTP mailboxes, email thread synchronization, CRM entity linking, and merge-tag templates ✅ **(2026-09-12)** **Switched off for businesses 2026-11-12 (hidden, code and data kept).**
- [x] **CRM: Web Forms & Lead Capture** (`/crm/forms`) — Embeddable lead intake forms, public CORS intake API route (`/api/forms/[id]/submit`), honeypot spam protection, standalone public view (`/forms/[code]`), and Form Studio visual builder ✅ **(2026-09-12)** **Switched off for businesses 2026-11-12 (hidden, code and data kept).**
- [x] **Retail: Customer Portal** (`/portal/[token]`) — Token-authenticated self-service account center with 5-tab UI (Overview, Invoices, Payments, Statement, Support), PortalTicket system, invoice PDF download API, and admin portal management ✅ **(2026-09-12)**
- [x] ~~**Retail: Walk-in / POS Sales** (`/sales/pos`)~~ **Removed 2026-11-12.** — Full-screen POS terminal with product grid, cart, session management, quick walk-in customer creation, multi-payment (Cash/Card/UPI), auto-invoice generation ✅ **(2026-09-12)**
- [x] **Invoice Features: Terms & Conditions, Authorized Signature, Statutory Declaration & Proforma Invoices** (`/sales/invoices`) — Configurable legal clauses with presets, digital signatory stamp & designation, statutory Indian GST declaration, proforma numbering (`PI-YYYY-YY-XXXX`), 1-click Convert to Tax Invoice, and dual-mode PDF rendering ✅ **(2026-09-12)**

- [x] **Inventory: Barcode / QR Code Support** (`/inventory`) — Vector SVG Code-128 & QR engine, printable A4/thermal sticker sheet studio with `@media print`, interactive camera & wedge scanner desk with sound and instant stock adjustment ✅ **(2026-09-12)**
- [x] **Tax (India): TDS (Tax Deducted at Source)** (`/finance/tds`) — Pure TS calculation engine (194C, 194J, 194I, 194H, 194Q, 194A), Section 206AA 20% penalty enforcement, PAN & TAN validation, Challan 281 deposit recording, Form 26Q quarterly export, Form 16A certificate preview, and Vendor Bill withholding integration ✅ **(2026-09-12)**
- [x] **Tax (India): E-Way Bill Integration** (`/sales/eway-bills`) — Statutory Rule 138 CGST engine, 12-digit EWB generation, Part-A & Part-B generation, distance-to-validity calculator (CBIC Notif 94/2020), 24h statutory cancellation enforcement, in-transit vehicle updater, Form EWB-01 printable slip with QR code, and NIC-compliant bulk upload JSON schema ✅ **(2026-09-12)**
- [x] **Tax (India): GST Returns Data (GSTR-1, GSTR-3B)** (`/finance/gst-returns` & `/finance/reports`) — Pure TS statutory GST returns engine, Table 4 (B2B), Table 5 (B2CL), Table 7 (B2CS), Table 6 (EXP), Table 9B (CDNR), Table 12 (HSN Summary), Table 13 (Docs Issued), GSTR-3B Table 3.1, Table 4 Eligible ITC from vendor bills, Rule 88A tax set-off matrix, Form GSTR-3B printable slip, and official GST portal offline tool JSON & CSV exports ✅ **(2026-09-12)**
- [x] **Tax (UAE): VAT (5%), TRN Validation, Form VAT201 & Reverse Charge Mechanism (RCM)** (`/finance/vat-uae`) — Pure TS statutory UAE VAT engine (Federal Decree-Law No. (8) of 2017), 15-digit TRN validation (`^100\d{12}$`), The 7 Emirates supply apportionment (Abu Dhabi 1a, Dubai 1b, Sharjah 1c, Ajman 1d, UAQ 1e, RAK 1f, Fujairah 1g), Article 48 RCM output/input balancing, zero-rated exports (0%), exempt supplies, quarterly filing calendar (28th day deadline), Form VAT201 printable declaration slip, and official FTA EmaraTax JSON & CSV exporters ✅ **(2026-09-12)**
- [x] **Tax (Saudi Arabia / KSA): VAT (15%), ZATCA E-Invoicing (Fatoora Phase 1 & 2), QR Code & Zakat** (`/finance/vat-ksa`) — Pure TS statutory KSA VAT engine (Royal Order A/638, ZATCA Res. 19804 & Res. 2216), 15-digit ZATCA VAT number validation (`^3\d{13}3$`), UTF-8 TLV Base64 QR code encoding & decoding (Tags 1–5), official ZATCA UBL 2.1 e-invoicing XML generation (Standard B2B vs Simplified B2C), quarterly KSA VAT return compiler (15% Sales, Exports 0%, Purchases 15%, Imports), bilingual printable Tax Invoice slip, and statutory Zakat Base & liability calculation engine (2.5% Hijri / 2.5775% Gregorian) ✅ **(2026-09-12)**
- [x] **Tax (Australia): GST (10%), ABN Validation & Business Activity Statement (BAS)** (`/finance/tax-australia`) — Pure TS statutory ATO GST engine, 11-digit ABN validation with official ATO Modulus 89 algorithm (`[10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19]`), Australian FY (1 July – 30 June) with quarterly deadlines (Q2 extended to 28 Feb), official BAS Form calculation (G1, G2, G3, G4, G10, G11, 1A, 1B, 9), PAYG Option 4 withholding (W1, W2, 8A), ATO JSON & CSV exporters, and printable Australian Tax Invoice ✅ **(2026-09-12)**
- [x] **Tax (United Kingdom): VAT (20%), VRN Validation & Making Tax Digital (MTD) 9-Box Return** (`/finance/vat-uk`) — Pure TS statutory HMRC VAT engine (VATA 1994), Standard 20%, Reduced 5%, and Zero-rate 0%, 9-digit VRN validation with official HMRC Modulus 97 algorithm, HMRC MTD 9-Box Return compiler (Box 1 to Box 9), EU dispatch & acquisition reverse charge, HMRC MTD API JSON and CSV exporters, and printable HMRC Return Certificate ✅ **(2026-09-12)**
- [x] **Admin: System Email Templates & Audit Logging** (`/admin/email-templates`) — Pure TS transactional template engine (6 core presets: Invoice Sent, Payment Receipt, Welcome Onboarding, Payment Overdue Dunning, Support Ticket Update, Credit Note Issued), dynamic merge tag interpolation (`{{tag}}`), responsive HTML boilerplate with mobile/desktop live preview, test email dispatch (Resend API + simulated fallback), factory default reset, and expanded `AdminAuditLog` governance tracking ✅ **(2026-09-12)**
- [x] **SaaS: Plan Upgrade/Downgrade, Subscription Lifecycle & Platform Invoicing** (`/settings` & `/admin/tenants/[id]`) — 4-tier matrix (`FREE`, `BASIC`, `PRO`, `ENTERPRISE`), multi-region pricing (INR, USD, GBP, AED, SAR, AUD), Monthly vs Annual switcher (20% discount), real-time proration mathematics (used days, unused credit, target plan charge, net payable today), downgrade scheduling at cycle end, automated platform B2B invoices (`SAAS-INV-YYYY-XXXX`) with regional tax splits (IN 18%, GB 20%, AE 5%, SA 15%, AU 10%, US 0%), printable receipt slip modal, and Super Admin manual invoice generator ✅ **(2026-09-12)**
- [x] **Integrations: WhatsApp Business API** (`/crm/whatsapp`) — Meta Graph API v20.0 client, E.164 phone normalizer (IN, US, UK, AE, SA, AU), 7 statutory templates (Invoice, Receipt, Dunning, Order, Support, Welcome, Custom), 1-click wa.me direct links, webhook event verification and receiver (`/api/webhooks/whatsapp`), WhatsApp Studio 4-KPI dashboard & live conversational bubble chat, and 1-click Invoice modal dispatch (`/sales/invoices/[id]`) ✅ **(2026-09-12)** **Switched off for businesses 2026-11-12 (hidden, code and data kept).**
- [x] **Integrations: Stripe & PayPal Multi-Currency Payment Gateway Suite** (`/settings`, `/portal/[token]`, `/api/webhooks/stripe`, `/api/webhooks/paypal`, `/sales/invoices/[id]`) — Multi-currency subunit normalization (cents, fils, paise, zero-decimal currencies), Stripe Checkout Session compiler, PayPal Orders v2 API compiler, tenant payment gateway settings & credentials management, test connection verification, customer portal "Pay Online" modal dialog with instant balance settlement, invoice view payment link generator, and real-time webhook receivers (`/api/webhooks/stripe`, `/api/webhooks/paypal`) with automated ledger and invoice status transitions ✅ **(2026-09-13)**
- [x] **Tax: Tax Exemptions Suite** (`/sales/invoices`, `/crm/contacts`, `/lib/gst-engine.ts`, `/lib/pdf/TaxInvoice.tsx`) — Pure TS statutory tax exemption engine supporting 8 official categories (SEZ unit/developer, LUT export, government bodies, charitable trusts, reseller certificates, diplomatic missions, basic agricultural produce, and general statutory notifications), customer & invoice certificate tracking, auto-zeroing GST/VAT with exempt subtotal tracking, line-item level selective exemption, and dynamic statutory notice injection on web views and printable PDF invoices ✅ **(2026-09-14)**
- [x] **Inventory: Inventory Reports Studio** (`/inventory?tab=reports`, `/app/actions/inventory.ts`) — Dedicated 6th studio tab in Inventory featuring real-time financial asset accounting: Total Asset Cost Value, Retail Market Value, Potential Gross Profit & Margin Yield, Deficit/Reorder SKUs, Stock Valuation Matrix with category and status filtering, Stock Turnover & Movement Velocity classification (Fast Moving, Moderate, Slow Moving, Dead Stock), Multi-Depot Distribution cross-tabulation matrix, time-range analysis (30d, 90d, 365d, all-time), and 1-click PapaParse CSV & Print exports ✅ **(2026-09-14)**

### CRM (ALL P2 MODULES COMPLETE ✅)
- [x] CRM: Email Integration (`/crm/emails`) ✅ **(2026-09-12)** **Switched off for businesses 2026-11-12 (hidden, code and data kept).**
- [x] CRM: Web Forms / Lead Capture (`/crm/forms`) ✅ **(2026-09-12)** **Switched off for businesses 2026-11-12 (hidden, code and data kept).**

### Retail (ALL P2 MODULES COMPLETE ✅)
- [x] Retail: Customer Portal (`/portal/[token]`) ✅ **(2026-09-12)**
- [x] Retail: Walk-in / POS Sales (`/sales/pos`) — built 2026-09-12, **removed 2026-11-12**

### Sales
- [x] Sales: Credit Notes / Refunds (`/sales/credit-notes`) ✅ **(2026-09-12)**
- [x] Sales: Price Lists (`/sales/price-lists`) ✅ **(2026-09-12)**

### Purchase
- [x] Purchase: Vendor / Supplier Management (`/purchase`) ✅ **(2026-09-10)**
- [x] Purchase: Purchase Orders (`/purchase`) ✅ **(2026-09-10)**
- [x] Purchase: Bills / Vendor Invoices (AP Integration `/finance/bills`) ✅ **(2026-09-10)**
- [x] Purchase: Purchase Receipts (Warehouse Intake `/inventory`) ✅ **(2026-09-10)**

### Inventory (ALL P2 MODULES COMPLETE ✅)
- [x] Inventory: Stock Management ✅ **(2026-09-10)**
- [x] Inventory: Barcode / QR Code Support ✅ **(2026-09-12)**
- [x] Inventory: Stock Adjustments & Transfers ✅ **(2026-09-10)**

### Finance
- [x] Finance: General Ledger (`/finance/expenses`) ✅ **(2026-09-12)**
- [x] Finance: Bank Reconciliation (`/finance/bank-reconciliation`) ✅ **(2026-09-12)** **Switched off for businesses 2026-11-12 (hidden, code and data kept).**
- [x] Finance: Expense Management (`/finance/expenses`) ✅ **(2026-09-12)**

### Tax (ALL P1/P2 REGIONAL TAX MODULES COMPLETE ✅)
- [x] Tax (India): TDS (`/finance/tds`) ✅ **(2026-09-12)**
- [x] Tax (India): E-Way Bill Integration (`/sales/eway-bills`) ✅ **(2026-09-12)**
- [x] Tax (India): GST Returns Data (`/finance/gst-returns`) ✅ **(2026-09-12)** (ALL INDIA TAX P1/P2 COMPLETE 🇮🇳)
- [x] Tax (UAE): VAT (5%), TRN Validation, Form VAT201, Reverse Charge (`/finance/vat-uae`) ✅ **(2026-09-12)** (ALL UAE TAX COMPLETE 🇦🇪)
- [x] Tax (KSA): VAT (15%), ZATCA Fatoora E-Invoicing, TLV QR Code, Zakat (`/finance/vat-ksa`) ✅ **(2026-09-12)** (ALL KSA TAX COMPLETE 🇸🇦)
- [x] Tax (Australia): GST (10%), ABN Modulus 89, BAS Form, PAYG (`/finance/tax-australia`) ✅ **(2026-09-12)** (ALL AUSTRALIA TAX COMPLETE 🇦🇺)
- [x] Tax (UK): VAT (20%), VRN Modulus 97, MTD 9-Box Return (`/finance/vat-uk`) ✅ **(2026-09-12)** (ALL UK TAX COMPLETE 🇬🇧)

### Invoice Features (ALL P2 MODULES COMPLETE ✅)
- [x] Invoice Features: Terms & Conditions ✅ **(2026-09-12)**
- [x] Invoice Features: Authorized Signature ✅ **(2026-09-12)**
- [x] Invoice Features: Declaration / Notes ✅ **(2026-09-12)**
- [x] Invoice Features: Proforma Invoice (`/sales/invoices`) ✅ **(2026-09-12)**
- [x] Invoice Features: Credit/Debit Note (`/sales/credit-notes`) ✅ **(2026-09-12)**
- [x] Invoice Features: Recurring Invoices (`/sales/invoices/recurring`) ✅ **(2026-09-12)**

### HR (ALL P2 MODULES COMPLETE ✅)
- [x] HR: Employee Directory (`/hr`) ✅ **(2026-09-10)**
- [x] HR: Attendance Tracking (`/hr`) ✅ **(2026-09-10)**
- [x] HR: Leave Management (`/hr`) ✅ **(2026-09-10)**

### Projects (ALL P2 MODULES COMPLETE ✅)
- [x] Projects: Projects & Teams (`/projects`) ✅ **(2026-09-10)**
- [x] Projects: Tasks & Subtasks (`/projects`) ✅ **(2026-09-10)**
- [x] Projects: Time Tracking (`/projects`) ✅ **(2026-09-10)**

### Rentals
- [x] Rentals: Asset Management (`/sales/rental`) ✅ **(2026-09-12)**
- [x] Rentals: Agreements, Returns & Invoicing (`/sales/rental`) ✅ **(2026-09-12)**

### Admin / SaaS (ALL P2 MODULES COMPLETE ✅)
- [x] Admin: Audit Logs (expand `AdminAuditLog` with `EMAIL_TEMPLATE_UPDATE`, `EMAIL_TEMPLATE_RESET`, `EMAIL_TEMPLATE_TEST_DISPATCH`) ✅ **(2026-09-12)**
- [x] Admin: Email Templates (`/admin/email-templates`) ✅ **(2026-09-12)**
- [x] SaaS: Plan Upgrade/Downgrade (`/settings` Billing Tab & Actions) ✅ **(2026-09-12)**
- [x] SaaS: Platform Subscription Invoice Generation (`/admin/tenants/[id]` & `/settings`) ✅ **(2026-09-12)**

### Integrations (ALL P2 MODULES COMPLETE ✅)
- [x] Integrations: WhatsApp Business API (`/crm/whatsapp`) ✅ **(2026-09-12)** **Switched off for businesses 2026-11-12 (hidden, code and data kept).**
- [x] Integrations: Stripe & PayPal Multi-Currency Payment Gateway Suite (`/settings`, `/portal/[token]`, `/api/webhooks/stripe`, `/api/webhooks/paypal`, `/sales/invoices/[id]`) ✅ **(2026-09-13)**

---

## ⚠️ Known Gaps in "Complete" Modules (review 2026-10-13)
These are marked done above but are simulated or not enforced. The UI now says so where users would be misled.
- [ ] **E-Way Bills**: numbers are local draft references; integrate the NIC E-Way Bill API (or rely on the JSON bulk upload) to issue real ones.
- [x] **Workflow Automation**: rules fire on real events and a daily cron (2026-10-13). Left: "update status" actions only run in the simulator.
- [x] **CRM Email**: IMAP inbox sync works (manual + daily cron); sending without an SMTP mailbox now errors instead of logging a fake send (2026-10-13). Left: open tracking.
- [ ] **Stripe / PayPal invoice checkout**: live mode isn't wired to the gateway APIs; portal online payment is switched off.
- [x] **Stripe SaaS billing**: plan comes from the price; a failed renewal keeps the plan; prices sync from Admin → Pricing automatically (2026-10-13).
- [x] **Plan upgrades**: tenants used to upgrade for free (fake `MANUAL-` payment reference). Upgrades now pay the prorated amount through Razorpay or Stripe Checkout first (2026-10-13).
- [x] **Platform Security (`/admin/security`)**: IP blocklist, maintenance mode and the signup switch are enforced (2026-10-13); 2FA, session timeout, login lockout and rate limits are enforced (2026-11-13). Left: the rate limit counts per server instance (add a Vercel Firewall rule for a hard cap); the lockout covers the app's sign-in form, not direct calls to Supabase Auth (its own limits apply).
- [x] **Web Forms**: 5 submissions / 10 min per IP, alert emails escaped and actually sent (2026-10-13). Left: CAPTCHA (the fake settings card was removed).
- [x] **Recurring invoices**: due profiles run in the daily cron (2026-10-13).
- [x] **Tests**: unit tests (`npm test`) plus integration tests of whole flows against a throwaway PGlite database (`npm run test:integration`: sign-up, invoice → payment → ledger, Razorpay plan checkout, export/close/purge) (2026-10-14). Left: browser (UI) tests.
- [x] **Password reset**: the reset email linked to a page that didn't exist; added `/auth/confirm` + `/reset-password` and branded Supabase emails (2026-10-13).
- [ ] **Lint**: 1021 errors, 983 of them `no-explicit-any`; the rest are React Compiler advisories (`set-state-in-effect`, `purity`).
- [ ] **Dependencies**: non-breaking `npm audit fix` applied in `app/` (48 → 22). The rest are inside the Prisma 7.4 CLI and dev-only shadcn / eslint-config-next and need major upgrades.

---

## 🟢 P3 — Scale (Pending)
- [x] Purchase: Request for Quotation (RFQ) (`/purchase/rfq`, `/app/actions/rfq.ts`) ✅ **(2026-09-17)**
- [x] Inventory: Warehouse Management (`/inventory?tab=warehouses`) ✅ **(2026-09-10)**
- [x] Inventory: Stock Transfers (`/inventory?tab=movements`) ✅ **(2026-09-10)**
- [x] Inventory: Batch & Serial Tracking (`/inventory?tab=batch-serial`, `/app/actions/batch-serial.ts`) ✅ **(2026-09-17)** (ALL INVENTORY & WAREHOUSE MODULES COMPLETE 🏭)
- [x] Finance: Budgeting & Variance Analysis (`/finance/budgets`, `/app/actions/finance/budgets.ts`) ✅ **(2026-09-17)** (ALL FINANCE & ACCOUNTING MODULES COMPLETE 📊)
- [x] Tax (UAE): VAT Return Data, Reverse Charge (`/finance/vat-uae`) ✅ **(2026-09-12)**
- [x] Tax (KSA): Zakat Calculation (`/finance/vat-ksa`) ✅ **(2026-09-12)**
- [x] Tax (USA): Sales Tax Setup, 1099, Multi-State (`/finance/tax-us`, `/app/actions/finance/us-tax.ts`, `/lib/us-tax-engine.ts`) — 50-state + DC sales tax rules, destination vs origin sourcing, South Dakota v. Wayfair economic nexus thresholds ($100k/$500k), Form 1099-NEC & 1099-MISC contractor reporting (>= $600 threshold, W-9 tracking, 24% backup withholding), multi-state resale/exemption certificate vault, interactive tax calculator, IRS FIRE Pub 1220 CSV, and printable Form 1099-NEC recipient slip ✅ **(2026-09-18)** (ALL USA TAX MODULES COMPLETE 🇺🇸)
- [ ] Tax (Global): Withholding Tax
- [x] Invoice Features: Delivery Challan (`/sales/delivery-challans`, `/app/actions/sales/delivery-challan.ts`) ✅ **(2026-09-14)**
- [x] Invoice Features: Multi-Template Support (`/sales/invoices/templates`, `/sales/invoices/[id]`) ✅ **(2026-09-17)** (ALL INVOICE FEATURES COMPLETE 📄)
- [x] HR: Payroll Processing (`/hr?tab=payroll`, `/hr/payroll`, `/app/actions/payroll.ts`) ✅ **(2026-09-14)**
- [x] HR: Employee Portal (`/hr/portal`, `/app/actions/hr/portal.ts`) — Personal profile hub, manager perspective switcher, live IST clock-in/out desk, leave quota trackers (Casual, Sick, Annual) with leave application modal, payslip breakdown with printable view, and deliverables task management ✅ **(2026-09-17)**
- [x] HR: Performance & Training (`/hr/performance`, `/app/actions/hr/performance.ts`) — 360 appraisal cycles, employee self-reviews, manager evaluation scorecards, competency scoring radar, OKRs/goals matrix, training course catalog, and employee certifications ✅ **(2026-09-17)** (ALL HR & PEOPLE MODULES COMPLETE 👥)
- [x] Projects: Milestones, Gantt, Billing (`/projects?tab=gantt`) ✅ **(2026-09-17)** (ALL PROJECT MANAGEMENT MODULES COMPLETE 📁)
- [x] Rentals: Scheduling, Returns & Damage (`/sales/rental`) ✅ **(2026-09-12)** (ALL RENTAL MANAGEMENT MODULES COMPLETE 🏠)
- [x] Manufacturing: BOM, Work Orders, QC, MRP (`/manufacturing`, `/app/actions/manufacturing.ts`) ✅ **(2026-09-14)**
- [x] Reports: Custom Report Builder (`/reports/builder`, `/app/actions/reports/builder.ts`) — Cross-module ad-hoc reporting studio with dynamic field selectors, filters, group-by aggregations, dynamic charts, CSV/print exports, and report template persistence ✅ **(2026-09-17)** (ALL REPORTS & ANALYTICS COMPLETE 📈)
- [x] Admin: Workflow Automation (`/settings/workflows`, `/app/actions/settings/workflows.ts`) — Trigger-condition-action workflow automation engine with 6-domain triggers, recipe gallery, execution audit log, active switch, and simulator sandbox ✅ **(2026-09-18)**
- [ ] Admin: API & Webhooks
- [ ] Admin: White Labeling
- [ ] SaaS: Usage-Based Billing
- [ ] Integrations: Twilio, Tally/QuickBooks, Google/M365, Zapier/Make, Shopify/WooCommerce

---

## 📋 Open items (review 2026-11-13)
Done on 2026-11-13 (owner's request; local commits, see git log): **Razorpay is the only payment gateway** (Stripe and PayPal removed, with the simulated invoice pay links, portal payment and Settings → Payment Gateways); **team invites are links the admin shares** (no invite email); broadcast message fixed (Super Admin only settings, 500 characters, dismissal remembered, refreshed every 5 minutes); and the fixes from the full project review: discount before tax, server checks on invoice input, payments/credit notes can't exceed what is due (row locks), credit notes in the right currency and capped at the invoice, plan credit only from real payments, unpaid plans end after a 3-day grace, payroll status guards, goods receipt checks, email header escaping, workflow webhook secrets sealed, contact balance owned by the ledger, failures reported to System Logs, noindex on test copies and real 404s, cached public website and Mumbai functions, a dashboard built on invoices and payments, a working page finder (Ctrl K), skip link and stronger focus/field contrast, and a phone layout for the invoice list.

**Also done 2026-11-13 (second pass):** all browser `confirm()` pop-ups replaced by one in-app confirm dialog; all example placeholders replaced by instructions (lint now blocks both); app text below 12 px raised; Content-Security-Policy; GitHub Actions CI (type check, lint, tests, build); form pop-ups no longer close on a stray click and scroll when tall; keyboard access for clickable rows, filter chips and wide tables; every icon button named; chart summaries; notifications open what they're about; fixed "(INR)" removed from labels; deleting a paid invoice now restores the customer's balance (one transaction); the customer invoice PDF and the plan file with personal emails are no longer published (kept locally, ignored; still in old git history).

**Sign-in security (2026-11-13, live):** verified on a local build (setup by QR key, sign-in asks for the code, app and session APIs blocked until verified). Not yet re-checked on genesoftdev itself.

**Security audit 2026-11-13 (Supabase advisors + code review):** fixed in code: open redirect through a tab character in `next` (`/two-factor`, `/auth/confirm`), workspace settings saved without the row lock in 15 places (company settings, invoice template, PF ceiling, closing/reopening a workspace, SaaS invoices, TDS, e-way bills, WhatsApp), raw database errors shown to users in 31 actions (now reported to System Logs), and server-side 2FA check (`awaitingSecondFactor`) behind the proxy.
- [x] `app/drop_duplicate_indexes_migration.sql` run on the live database 2026-11-13 (3 duplicate indexes dropped; the originals kept).
- [ ] Supabase Auth settings (owner, dashboard): minimum password length 8 (the app asks for 8, but Supabase's own sign-up API accepts its default of 6), Auth CAPTCHA with the Turnstile secret once keys exist, and Leaked Password Protection (needs the Supabase Pro plan). The app's login lockout only covers the app form; Supabase's built-in auth rate limits cover direct API calls.
- [ ] Left as is: `script-src 'unsafe-inline'` in the CSP (Next.js inline scripts; nonces would make every page dynamic); the WhatsApp webhook's own settings writes (module off); 21 tables with RLS on and no policies is intended (only Prisma reads them).

**Country tax check 2026-11-13** (`countries-tax.int.test.ts`: IN intra/inter, AE, SA, GB, US, AU, Other): fixed — Tax Summary showed taxable sales before the discount; quotes and orders took the discount off after tax (an invoice made from them came to a different total); half-cent tax rounded down (`toFixed`), e.g. US 8.875%; a business with no country was treated as India; an invalid credit note reason gave a database error.

**Project-wide bug hunt 2026-11-13** (production-audit, click-path-audit, code-review on src/lib, browser QA of every app page, silent-failure and currency scans). Fixed: recurring invoices (always CGST+SGST, line discounts dropped, made-up HSN 998313, INR profiles); order → invoice taxed before the discount; ~25 creates fell back to IN/INR; six screens kept stale data after saving (invoice payments, projects, recurring, rentals, credit notes, accounts/products); thrown messages hidden in production (plan checkout, rental/PO conversions, QC); ledger side failures only in the console; workflow simulator claimed to send; dates a day early in US time; large-amount rounding. Browser QA: 62 pages, no server errors, no client crashes.
- [x] Quotes/orders now round Indian tax per CGST/SGST half like invoices (supply type from the customer's state).

**Still open from the review:**
- [x] `app/review_indexes_migration.sql` run on the live database 2026-11-13 (17 indexes, all valid).
- [x] Creating, editing, converting (proforma) and deleting an invoice is one transaction (2026-11-13): document, customer statement, journal (`syncLedgerIn`) and stock (`syncInvoiceStock(…, tx)`) are saved together or not at all (`invoice-atomic.int.test.ts`). Other documents (payments, bills, credit notes…) still post their journal after saving via `postToLedger`.
- [x] Large create/edit forms are full pages (2026-11-13): /hr/employees/new and /[id]/edit, /purchase/orders/new, /purchase/vendors/new, /purchase/rfq/new, /projects/new, /inventory/warehouses/new and /[id]/edit, /sales/invoices/recurring/new and /[id]/edit. Quick actions (attendance, leave, receive goods, bids, tasks, time, stock moves…) stay as pop-ups.
- [x] Number series use a counter table (`document_counters`, `app/document_counters_migration.sql`, 2026-11-13): `nextSequence` locks and moves a per-business counter (never below the highest existing number); form previews use `peekSequence`. Invoices keep max+1 with a retry on a clash, since the number can be edited.
- [x] Exchange rate is stored on invoices, credit notes, payments and bills (`exchange_rate`, `app/document_exchange_rates_migration.sql`, 2026-11-13): fixed when the document is first posted (`lockedRate` in ledger.ts); ledger rebuilds and the P&L reuse it. Rate lookups take the caller's transaction.
- [x] /join and the customer portal reviewed (2026-11-13): portal links are 256-bit random tokens and invite links are signed with an expiry, so guessing isn't feasible; signed-out posts already have the per-address limit. Open product decision only: whether portal links should expire.
- [ ] A separate production database with backups (needs the owner's Supabase account). Migration history: done (`prisma/migrations`).
- [ ] Thin modules to mark beta or switch off before launch: Manufacturing, Batch & serial, Performance & training, Recruitment, RFQ, Budgets, Report builder (owner's decision).

**Modules taken out on 2026-11-12 (owner's decision, pushed and live):**
- CRM Emails, WhatsApp and Web Forms and Finance → Bank Reconciliation are switched off for every business: out of the menu, their pages redirect, public form links (`/forms/…`, `/api/forms/*/submit`) answer "not found", the invoice WhatsApp button is hidden and the daily inbox sync is skipped. Code and saved data are kept; `NEXT_PUBLIC_ENABLE_PARKED_MODULES=true` brings them back (`src/lib/features.ts`). Sending an invoice by email still works.
- The POS Terminal (`/sales/pos`) is removed completely: pages, server actions, the POS session model and the "Point of Sale" plan switch. Past POS sales remain as ordinary invoices.
- Plan features and the ERP page no longer mention any of these.
- [ ] Left over: the unused `pos_sessions` table is still in the live database; Terms, Privacy and DPA still say customers may connect WhatsApp or their own email server (owner / legal review); the WhatsApp webhook address still answers; web form CAPTCHA and CRM email open tracking (under "Product gaps") only matter if the modules come back.
- [x] Checked in a browser, signed in on genesoftdev (2026-11-12): the menu, Super Admin → Pricing & Plans → Limits & modules, and the invoice page.

**Check next:** sign in on genesoftdev (Fixo test business) and look at Settings → Billing, Finance → Bills and Super Admin → Subscriptions; these were changed on 2026-11-12 and verified by tests and build only.

Done on 2026-10-14: general ledger (all documents post double-entry journals; trial balance, balance sheet, account ledger, opening balances, rebuild); P&L fixed (expenses, payroll, credit notes were missing); built-in error monitoring (System Logs + email alerts, no Sentry); marketing emails with unsubscribe links; workspace data export + close workspace + super admin permanent delete; customer ledger no longer assumes INR (UAE/UK/… balances were converted from INR by mistake); payments moved to Prisma with tenant checks; integration test suite.

**Deferred until go-live (decided by the owner):**
- [ ] Rotate the credentials in old git history (repo is public): Supabase DB password, Resend key, Razorpay secrets, super admin password. See `GO_LIVE_CHECKLIST.md`.
- [ ] Database backups: Supabase free plan has none and pauses idle projects (upgrade to Pro, or a nightly dump).
- [ ] Renew genesoftinfotech.com (expires 2026-12-05, auto-renew off).

**Needs a key or account from the owner:**
- [ ] Live payments (deferred until go-live by the owner): Razorpay live keys, with international cards switched on in the Razorpay account (every region now pays through Razorpay).
- [x] `SUPABASE_SERVICE_ROLE_KEY` is set on Vercel (Production + Preview, since 2026-10-15): uploads, super admin "create tenant" login and 2FA reset.
- [ ] `PLATFORM_GSTIN` for Genesoft's own subscription receipts.
- [ ] Legal review of Privacy, Terms and Refund pages.

**Product gaps:**
- [x] Enforce platform 2FA, session timeout, login lockout and rate limits (done 2026-11-13, pushed and live; CI passed). Default policy: 30-minute idle timeout for everyone, 2FA not required. Decide before go-live whether to turn on "require 2FA for admins".
- [ ] Customer portal online payment of invoices (would be through Razorpay).
- [ ] Workflow "update status" actions; CRM email open tracking; web form CAPTCHA.
- [ ] REST API (`/api/v1`) for the planned mobile app; then integrations (Tally/QuickBooks, Shopify/WooCommerce, Zapier, Google Workspace, Microsoft 365, Twilio SMS), white-labelling, withholding tax.
- [ ] Government filing APIs (GSP/NIC/FTA/ZATCA/HMRC/ATO) before turning the filing modules on.

**Accounting (left):**
- [ ] Existing businesses: run Finance → General Ledger → "Rebuild ledger" once to post documents created before 2026-10-14.
- [ ] Period lock / year-end close; fixed assets & depreciation; accruals; stock as an inventory asset (purchases of stock go straight to COGS today); customer/supplier opening balances per contact; TDS on bills in the ledger; employer PF/ESI cost in payroll; bank feeds; Tally/QuickBooks/Xero export.

**Engineering:**
- [ ] Prisma 8: still a release candidate on 2026-11-13 (npm `latest` = 8.0.0-rc.33), so not upgraded; Dependabot will offer it when final. Dev-tool audit warnings: 21 packages updated (hono, body-parser, qs, typescript-eslint…), 16 → 12 left, all in the shadcn command-line generator's own dependencies (not used by the app or the build). Production: 0.
- [x] Migrations (2026-11-13): `schema.prisma` reconciled with the live database (indexes, enum names, foreign-key rules, column types/defaults copied from it); `prisma/migrations` = `0_baseline` (live as it was) + `1_document_counters_exchange_rates` + `2_drop_legacy_tables` (pos_sessions, processed_stripe_events). `migrations.int.test.ts` keeps them in step. The old hand-written `app/*.sql` files stay as history.
- [x] Lint errors: 0 (was ~1,000; done 2026-11-12). 25 warnings left (hook dependencies, `<img>`).
- [x] Browser tests (Playwright, 2026-11-13): `e2e/public.spec.ts` (19 public pages on desktop + phone: status, error screens, console errors, sideways scroll; redirects, 404, sign-in gate) runs in CI against the build with a throwaway database (`e2e/ci-db.mjs`). `e2e/app.spec.ts` opens every app page signed in, with `E2E_EMAIL`/`E2E_PASSWORD` (and `E2E_BASE_URL`) set; run by hand. First signed-in run found the rate limit tripping on quick navigation (fixed: 5× for signed-in users).
- [x] `npm run lint` passes (old scripts are excluded; 0 errors).
- [x] Assumed India defaults removed (2026-11-12): new contacts, bank accounts and imported contacts/products take the business's own country and currency (`src/lib/tenant-defaults.ts`; forms prefill from `useTaxRegime`); a product row without a name is rejected; the fixed "+12%" on the Super Admin dashboard is gone.
- [ ] Still assumed: demo bank seeds use INR (only with `ENABLE_DEMO_SEED`). (Done 2026-11-12: a contact import row with no name and no email is refused instead of being saved as "Imported Contact".)
- [ ] Fixo test business (hydration error #418 on `/settings` no longer appears on genesoftdev, checked 2026-11-12): billing shows a renewal date in the past (old free-upgrade data) and it has no bills, so the bills list fix is verified by tests only.
- [x] `npm audit` from `app/` is correct again: the root workspace and its stale lockfile were removed (2026-11-13).
- [x] Root `package-lock.json` removed; the root `package.json` only forwards `build`/`start` to `app/` (2026-11-13).

