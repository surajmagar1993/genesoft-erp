# 📐 ERP & CRM — System Design Document

**Project:** Multi-Platform SaaS ERP & CRM
**Company:** Genesoft Infotech Private Limited
**Date:** 2026-04-01 | **Status:** In Development (P1 MVP — CRM/Sales Standardization Complete)

---

## 1. Executive Summary

A **general-purpose, multi-tenant SaaS ERP & CRM** platform accessible on 6 platforms — Web, Windows, macOS, Android, iOS, and iPadOS. Built with a **web-first architecture** using a single TypeScript codebase, wrapped natively for desktop and mobile distribution. Designed for small-to-medium businesses across industries, starting with India, UAE, and Saudi Arabia as target markets.

---

## 2. Understanding Summary

| Aspect | Detail |
|---|---|
| **What** | General-purpose multi-tenant SaaS ERP & CRM |
| **Why** | Offer businesses a cloud-based ERP/CRM as a subscription service |
| **Who** | SMBs across industries (5-50 tenants at launch, <500 users) |
| **Platforms** | Web, Windows (.exe), macOS (.dmg), Android (.apk), iOS/iPadOS (.ipa) |
| **Approach** | Web-first + Tauri (desktop) + Capacitor (mobile) |
| **Cost Target** | $0/month hosting at launch |
| **Markets** | India (primary), UAE, Saudi Arabia, USA (future) |

---

## 3. Tech Stack

### 3.1 Core Application

| Layer | Technology | Version |
|---|---|---|
| **Language** | TypeScript | 5.x |
| **Frontend Framework** | Next.js | 15.x |
| **UI Library** | React | 19.x |
| **CSS Framework** | Tailwind CSS | 4.x |
| **Component Library** | shadcn/ui | Latest |
| **Type-Safe API** | tRPC | 11.x |
| **ORM** | Prisma | 6.x |

### 3.2 Backend & Infrastructure

| Service | Provider | Tier |
|---|---|---|
| **Database** | Supabase (PostgreSQL) | Free → Pro |
| **Authentication** | Supabase Auth | Free (50K MAUs) |
| **File Storage** | Supabase Storage | Free (1 GB) |
| **Realtime** | Supabase Realtime | Free |
| **Edge Functions** | Supabase Functions | Free |
| **App Hosting** | Vercel | Free → Pro |
| **CDN + DNS** | Cloudflare | Free |
| **Email** | Resend | Free (3K/mo) |
| **Payments** | Razorpay | Pay-as-you-go |
| **CI/CD** | GitHub Actions | Free (2K min/mo) |

### 3.3 Cross-Platform Distribution

| Platform | Technology | Output |
|---|---|---|
| **Web** | Next.js (direct) | URL access |
| **Windows** | Tauri v2 | `.exe` / `.msi` |
| **macOS** | Tauri v2 | `.dmg` / `.app` |
| **Android** | Capacitor | `.apk` / `.aab` |
| **iOS** | Capacitor | `.ipa` |
| **iPadOS** | Capacitor | `.ipa` (universal) |

### 3.4 Development Tools

| Tool | Purpose |
|---|---|
| **Git + GitHub** | Version control & collaboration |
| **ESLint + Prettier** | Code quality & formatting |
| **Vitest** | Unit & integration testing |
| **Playwright** | E2E browser testing |
| **Turborepo** | Monorepo management (if needed) |

---

## 4. Architecture

### 4.1 High-Level Architecture

```
┌──────────────────────────────────────────────────────────┐
│                      CLIENTS                              │
├──────────┬──────────┬──────────┬──────────┬──────────────┤
│  Browser │ Windows  │  macOS   │ Android  │  iOS/iPadOS  │
│  (Web)   │ (Tauri)  │ (Tauri)  │(Capacitor│ (Capacitor)  │
└────┬─────┴────┬─────┴────┬─────┴────┬─────┴──────┬───────┘
     │          │          │          │             │
     └──────────┴──────────┼──────────┴─────────────┘
                           │
                    ┌──────▼───────┐
                    │   Cloudflare  │  CDN + DNS + SSL
                    │   (Free)      │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │   Vercel      │  Next.js App
                    │   (Free)      │  Server Components
                    │               │  API Routes + tRPC
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
       ┌──────▼──────┐ ┌──▼──────┐ ┌──▼──────────┐
       │  Supabase   │ │Supabase │ │  Supabase    │
       │  PostgreSQL │ │  Auth   │ │  Storage     │
       │  (Database) │ │         │ │  (Files)     │
       └─────────────┘ └─────────┘ └──────────────┘
```

### 4.2 Multi-Tenancy Strategy

**Approach: Row-Level Security (RLS) in PostgreSQL**

```
┌─────────────────────────────────────────┐
│          Single Database                 │
│  ┌─────────────────────────────────┐    │
│  │  Every table has: tenant_id     │    │
│  │                                  │    │
│  │  RLS Policy:                     │    │
│  │  tenant_id = current_tenant()    │    │
│  │                                  │    │
│  │  Tenant A sees ONLY their data   │    │
│  │  Tenant B sees ONLY their data   │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

**Why RLS over schema-per-tenant:**
- Simpler to manage at small scale (5-50 tenants)
- No schema migration headaches
- Supabase has built-in RLS support
- Can migrate to schema-per-tenant later if needed

### 4.3 Authentication Flow

**Package:** `@supabase/ssr` (current best practice — cookie-based sessions)

```
User Login (email/password, Google, magic link)
         │
    Supabase Auth Server
         │
    Issues JWT + sets secure HTTP-only cookie
         │
    Next.js Middleware (middleware.ts)
         │
    ├── Reads cookie via @supabase/ssr
    ├── Calls supabase.auth.getUser() to validate
    ├── Extracts user_id + tenant_id
    ├── Refreshes token if expired (automatic)
    │
    ├── Unauthenticated? → Redirect to /login
    └── Authenticated? → Continue to page
                              │
                         API Routes / tRPC
                              │
                         PostgreSQL (RLS enforced)
                         auth.uid() = user's ID
                         tenant_id checked via RLS policy
```

**Key points:**
- Sessions stored in **secure HTTP-only cookies** (not localStorage)
- `@supabase/ssr` handles token refresh automatically
- RLS policies use `auth.uid()` to enforce row-level access
- Works across Server Components, Client Components, and Middleware

**3-Layer Security Model:**

| Layer | Protects | Technology |
|---|---|---|
| **Layer 1** | Pages (redirect to /login) | Next.js Middleware |
| **Layer 2** | API calls (return 401) | tRPC Context |
| **Layer 3** | Data (tenant isolation) | Supabase RLS |

**Last Updated:** 2026-03-31 | **Active Block:** SaaS Platform Layer & Super Admin

### 4.4 Invoice PDF Generation Flow

```
User clicks "Generate Invoice"
         │
    Next.js API Route
         │
    Fetch invoice data (RLS-filtered)
         │
    Apply tax rules (GST/VAT engine)
         │
    Render PDF template (React-PDF or Puppeteer)
         │
    Upload to Supabase Storage
         │
    Return download URL + optional email via Resend
```

### 4.5 Pagination & Performance Standards
To ensure the platform handles growing datasets, all core listing pages follow a standardized pattern:
- **Server-Side Pagination**: Uses `limit` and `offset` logic, controlled by URL `page` parameters.
- **Server-Side Filtering**: Search and status filters are applied at the database level (Prisma/Supabase) to minimize payload sizes.
- **Debounced Interaction**: Client-side search inputs use a 500ms debounce before triggering a server-side re-fetch.
- **Architectural Split**: Data fetching is isolated in Server Components, while UI state is managed in Client Components (`*Client.tsx`).

---

## 5. Database Design (Core Entities)

### 5.1 Multi-Tenant Core

```
tenants
├── id (UUID, PK)
├── name
├── domain (custom subdomain)
├── country_code (IN, US, AE, SA)
├── currency_code (INR, USD, AED, SAR)
├── tax_config (JSONB)
├── settings (JSONB)
├── plan (free/basic/pro/enterprise)
├── created_at
└── updated_at

users
├── id (UUID, PK, FK → Supabase Auth)
├── tenant_id (FK → tenants)
├── role (admin/manager/user/viewer)
├── first_name, last_name, email
├── avatar_url
├── is_active
└── created_at

notifications
├── id (UUID, PK)
├── tenant_id (FK → tenants)
├── user_id (FK → users)
├── type (INFO, SUCCESS, WARNING, ERROR, LEAD, DEAL, INVOICE, BILL, PAYMENT, TASK)
├── title
├── message
├── link (optional URL)
├── is_read (Default: false)
└── created_at
```

### 5.2 CRM & Customers

```
contacts
├── id, tenant_id
├── type (individual/company)
├── customer_group (retail/wholesale/vip)
├── first_name, last_name, company_name
├── email, phone, address (JSONB)
├── credit_limit, balance
├── tags (JSONB)
│
├── ## India Identifiers
├── gstin                  # GST Number (27AAICG9629C1ZF)
├── pan                    # PAN Card (AAICG9629C)
├── cin                    # Corporate ID (U72200MH2020PTC123456)
├── tan                    # TDS Account (PNEG12345F)
├── msme_udyam             # MSME Number (UDYAM-MH-26-0161820)
│
├── ## UAE Identifiers
├── trn                    # Tax Registration Number
├── trade_license          # Trade License Number
│
├── ## Saudi Arabia Identifiers
├── vat_number_ksa         # KSA VAT Number
├── cr_number              # Commercial Registration
│
├── ## USA Identifiers
├── ein                    # Employer ID Number
├── ssn                    # Social Security (encrypted, individuals)
│
├── ## Generic
├── tax_number             # Fallback for other countries
└── country_code           # Determines which fields to show

leads
├── id, tenant_id
├── contact_id (FK)
├── source (web_form/referral/cold_call)
├── status (new/contacted/qualified/converted/lost)
├── score, assigned_to
└── converted_to (deal_id)

deals
├── id, tenant_id
├── contact_id (FK)
├── title, value, currency
├── stage (prospecting/proposal/negotiation/won/lost)
├── expected_close_date
├── assigned_to
└── expected_close_date

tasks
├── id, tenant_id
├── title, description
├── status (todo/in_progress/completed/cancelled)
├── priority (low/medium/high)
├── due_date
├── contact_id, lead_id, deal_id (optional FKs)
├── assigned_to
├── created_at
└── updated_at

ledger_entries
├── id, tenant_id
├── contact_id (FK → contacts)
├── type (INVOICE, PAYMENT, CREDIT_NOTE, REFUND)
├── amount (Decimal) # Positive = Debit, Negative = Credit
├── balance (Decimal) # Running balance for the contact
├── reference_id (String, optional) # ID of Invoice or Payment
├── description (String, optional)
└── date (DateTime)
```

### 5.3 Products & Invoicing

```
products
├── id, tenant_id
├── type (product/service)
├── name, sku, hsn_sac_code
├── unit_price, currency
├── tax_group_id (FK)
├── stock_quantity
└── is_active

invoices
├── id, tenant_id
├── invoice_number (INV-001)
├── contact_id (FK)
├── type (tax_invoice/proforma/credit_note/debit_note)
├── bill_to, ship_to (JSONB)
├── subtotal, tax_amount, total
├── total_in_words
├── currency_code
├── status (draft/sent/paid/overdue/cancelled)
├── payment_terms, due_date
├── bank_details (JSONB)
├── notes, terms_conditions
├── signature_url
├── pdf_url
└── tax_summary (JSONB — HSN/SAC breakup)

invoice_items
├── id, invoice_id
├── product_id (FK)
├── description, hsn_sac_code
├── quantity, unit_price
├── tax_group_id
├── cgst_rate, cgst_amount
├── sgst_rate, sgst_amount
├── igst_rate, igst_amount
├── vat_rate, vat_amount
└── line_total
```

### 5.4 Tax Engine

```
tax_groups
├── id, tenant_id
├── name (e.g., "GST 18%", "UAE VAT 5%")
├── country_code
└── is_default

tax_rates
├── id, tax_group_id
├── name (e.g., "CGST", "SGST", "IGST", "VAT")
├── rate (percentage)
├── type (percentage/fixed)
└── is_active

place_of_supply_rules
├── id, tenant_id
├── from_state, to_state
├── tax_type (intra_state → CGST+SGST / inter_state → IGST)
└── country_code
```

### 5.5 SaaS Platform & Support

```
pricing_plans
├── id (CUID, PK)
├── region_code (IN, US, AE, SA, UK, AU)
├── tier (FREE, BASIC, PRO, ENTERPRISE)
├── amount (Decimal)
├── currency (INR, USD, AED, SAR)
├── gateway (RAZORPAY, STRIPE)
└── is_active

system_logs
├── id (CUID, PK)
├── tenant_id (FK → tenants, optional)
├── level (INFO, WARN, ERROR, FATAL)
├── message
├── path
├── stack (Error trace)
└── timestamp

support_tickets
├── id (CUID, PK)
├── tenant_id (FK → tenants)
├── subject
├── status (OPEN, IN_PROGRESS, RESOLVED, CLOSED)
└── priority

support_messages
├── id (CUID, PK)
├── ticket_id (FK → support_tickets)
├── sender_id (user_id or admin_id)
├── content
├── is_from_admin
└── created_at
```

---

## 6. Module Roadmap

### 🔴 P1 — MVP Launch (Month 1-3) — ~48 modules

**Goal:** Get first paying customers

| Category | Key Modules |
|---|---|
| **CRM** | Contacts, Companies, Leads, Deals, Tasks (Completed), Notes |
| **Retail/B2C** | Customer Types, Groups, Credit Limits, Ledger (Completed) |
| **Sales** | Products, Services, Quotes, Orders, Invoices, Payments |
| **Finance** | Chart of Accounts (Complete), AR (Complete), AP (Next), Multi-Currency, Reports |
| **Tax (India)** | GST, HSN/SAC, GSTIN, Place of Supply, MSME |
| **Tax (General)** | Tax Engine, Tax Groups, Auto-Detection |
| **Invoice** | Tax Invoice, PDF, Email, Numbering, Bank Details, HSN Summary |
| **Reports** | Dashboard, Sales Reports, Financial Reports, Export |
| **Admin** | Multi-Tenant, RBAC, Company Settings, Notifications (Completed), Import/Export |
| **SaaS Billing** | Subscription Plans, Razorpay, Trial Management |

### 🟡 P2 — Growth (Month 4-6) — ~42 modules

**Goal:** Full ERP capability

| Category | Key Modules |
|---|---|
| **CRM Extended** | Email Integration, Web Forms |
| **Retail Extended** | Customer Portal, Walk-in/POS |
| **Sales Extended** | Credit Notes, Price Lists |
| **Purchase** | Vendors, POs, Bills, Purchase Receipts |
| **Inventory** | Stock Management, Barcodes, Adjustments |
| **Finance Extended** | General Ledger, Bank Reconciliation, Expenses |
| **Tax (UAE)** | VAT 5%, TRN |
| **Tax (KSA)** | VAT 15%, ZATCA E-Invoicing, QR Code |
| **Tax (India)** | TDS, E-Way Bill, GSTR Data |
| **Invoice Extended** | Proforma, Credit/Debit Notes, Recurring, Signatures |
| **HR** | Employee Directory, Attendance, Leave |
| **Projects** | Projects, Tasks, Time Tracking |
| **Rental** | Assets, Agreements, Rental Invoicing |
| **Integrations** | WhatsApp, Stripe/PayPal |

### 🟢 P3 — Scale (Month 7+) — ~38 modules

**Goal:** Compete with Zoho/Odoo

| Category | Key Modules |
|---|---|
| **Sales** | Discounts & Coupons |
| **Inventory** | Warehouse, Transfers, Batch/Serial Tracking |
| **Finance** | Budgeting |
| **Tax (USA)** | State Sales Tax, Exemptions, 1099 |
| **Tax (KSA)** | Zakat |
| **Tax (General)** | Withholding Tax |
| **Invoice** | Delivery Challan, Multi-Templates |
| **HR** | Payroll, Recruitment, Self-Service, Reviews, Training |
| **Projects** | Milestones, Gantt, Project Billing |
| **Rental** | Scheduling, Returns/Damage |
| **Manufacturing** | BOM, Work Orders, QC, MRP |
| **Reports** | HR Reports, Custom Report Builder |
| **Admin** | Workflow Automation, API, Webhooks, White Labeling |
| **Integrations** | Tally, Google, Microsoft, Zapier, Shopify |
| **Retail** | Loyalty/Points Program |
| **SaaS** | Usage-Based Billing |

---

## 7. Decision Log

| # | Decision | Alternatives Considered | Rationale |
|---|---|---|---|
| 1 | **SaaS multi-tenant model** | On-premise, hybrid | Lower ops overhead, recurring revenue, faster updates |
| 2 | **Web-first + wrappers** | Flutter, React Native, .NET MAUI | ERP is data-heavy (tables/forms); web excels. One codebase for 6 platforms |
| 3 | **Next.js + TypeScript** | React+Laravel, React+FastAPI | Single language everywhere. Type-safety with tRPC+Prisma. Fastest to market |
| 4 | **Supabase** | Firebase, custom backend | Built-in RLS (perfect for multi-tenancy), Auth+DB+Storage+Realtime all free |
| 5 | **Vercel hosting** | AWS, OCI, self-hosted | Zero-config Next.js deployment, free tier, instant previews |
| 6 | **Tauri v2 for desktop** | Electron, Flutter Desktop | 5-15 MB app size vs 200 MB Electron. Native OS WebView |
| 7 | **Capacitor for mobile** | React Native, Flutter | Wraps existing web app. Same UI. Full native API access |
| 8 | **Row-Level Security** | Schema-per-tenant, DB-per-tenant | Simplest at small scale. Supabase native support. Migrate later if needed |
| 9 | **Cloudflare for DNS/CDN** | Route53, custom DNS | Free tier includes CDN, DDoS protection, SSL |
| 10 | **India-first tax** | All countries simultaneously | Home market. Fastest revenue. Expand to UAE/KSA in P2 |
| 11 | **Free hosting stack** | Paid from day one | $0 until paying customers. Scale costs with revenue |
| 12 | **B2B + B2C customer types** | B2B only | General-purpose ERP must serve retail + enterprise |
| 13 | **Unified Super Admin Route** | Separate App | Fastest MVP for 50–500 tenants; easy to migrate later. |
| 14 | **Metadata-Only Admin View** | Full Data Access | Prioritizes tenant privacy and data security. |
| 15 | **Database-Backed Pricing** | Hardcoded Constants | Allows instant price changes via dashboard for 6+ regions. |

---

## 8. Project Structure (Proposed)

```
genesoft-erp/
├── apps/
│   ├── web/                    # Next.js web application
│   │   ├── app/                # App Router pages
│   │   │   ├── (auth)/         # Login, Register, Forgot Password
│   │   │   ├── (dashboard)/    # Main ERP dashboard
│   │   │   │   ├── crm/        # CRM pages
│   │   │   │   ├── sales/      # Sales & invoicing
│   │   │   │   ├── inventory/  # Stock management
│   │   │   │   ├── finance/    # Accounting
│   │   │   │   ├── hr/         # Human resources
│   │   │   │   ├── projects/   # Project management
│   │   │   │   ├── rental/     # Rental management
│   │   │   │   ├── reports/    # Reports & dashboards
│   │   │   │   └── settings/   # Admin settings
│   │   │   └── (marketing)/    # Public website / landing page
│   │   ├── components/         # Shared UI components
│   │   ├── lib/                # Utilities, helpers
│   │   ├── server/             # tRPC routers, server logic
│   │   └── styles/             # Global styles
│   ├── desktop/                # Tauri v2 desktop wrapper
│   └── mobile/                 # Capacitor mobile wrapper
├── packages/
│   ├── db/                     # Prisma schema & migrations
│   ├── ui/                     # Shared component library
│   ├── tax-engine/             # Multi-country tax calculations
│   ├── invoice-generator/      # PDF invoice generation
│   └── shared/                 # Types, constants, validators
├── supabase/
│   ├── migrations/             # Database migrations
│   └── functions/              # Edge functions
├── .github/
│   └── workflows/              # CI/CD pipelines
├── package.json
├── turbo.json                  # Monorepo config
└── README.md
```

---

## 9. Non-Functional Requirements

| Requirement | Target |
|---|---|
| **Page Load** | < 2 seconds |
| **API Response** | < 500ms |
| **Availability** | 99.5% (Vercel + Supabase SLA) |
| **Data Isolation** | RLS-enforced tenant separation |
| **Encryption** | HTTPS everywhere, passwords hashed (bcrypt) |
| **Backups** | Supabase auto-backups (7 days free, 30 days pro) |
| **Offline** | Basic offline via Capacitor (mobile) |
| **i18n** | English first, framework-ready for Hindi, Arabic, etc. |
| **Multi-Currency** | INR, USD, AED, SAR from day one |
| **PDF Export** | All reports & invoices exportable as PDF |
| **Responsive** | Desktop-first, mobile-optimized |

---

## 10. Assumptions

1. Small team (1-3 developers) building and maintaining
2. Tenants isolated via Row-Level Security (single database)
3. Shared URL login (app.yourdomain.com) — no per-tenant subdomains initially
4. Mobile apps are secondary to desktop/web usage
5. Pure SaaS — no on-premise deployment option
6. Razorpay for payment processing (Stripe/PayPal added in P2)
7. India is the first target market, UAE/KSA in P2
8. Invoice format based on existing Genesoft INV-262 template

---

## 11. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Supabase free tier limits hit | Service degradation | Monitor usage, upgrade to Pro ($25/mo) when needed |
| Vercel serverless cold starts | Slow first request | Edge runtime for critical routes |
| Complex tax rules across countries | Incorrect tax calc | Isolated tax-engine package with unit tests |
| Multi-tenant data leak | Security breach | RLS + middleware double-check + audit logs |
| Scope creep (128 modules) | Delayed launch | Strict P1-first approach, launch with MVP |

---

*Document Version: 1.5 | Last Updated: 2026-04-01*
