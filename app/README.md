# Genesoft ERP & CRM

Genesoft is a modern, multi-tenant SaaS ERP and CRM platform built with Next.js 16, Supabase, and Prisma. It provides a comprehensive suite for managing business operations with native multi-currency support, integrated GST handling, multi-warehouse inventory control, and a full **SaaS Super Admin Command Center** for platform-level governance.

---

## 🚀 Features

### 🏢 SaaS Super Admin Command Center
- **Tenant Management Lifecycle**: Complete CRUD for platform tenants (`/admin/tenants`), 360° tenant profile dashboards (`/admin/tenants/[id]`), manual business onboarding (`/admin/tenants/new`), trial extension (+7d), plan switching, and automatic Chart of Accounts (39 accounts) provisioning.
- **Platform Security & Governance (`/admin/security`)**: Super Admin security hub with 2FA enforcement policy toggles, configurable session inactivity timeout, global rate limiting, real-time IP firewall blocklist management, and security audit log feed.
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

### 💬 WhatsApp Business API Hub (`/crm/whatsapp`)
- **Meta Cloud API v20.0**: Native WhatsApp messaging engine with webhook handshake and event ingestion (`/api/webhooks/whatsapp`).
- **Triple Dispatch Modes**: Cloud API (official Meta gateway), Direct Link (`wa.me` deep links for WhatsApp Web/App), and Simulation.
- **7 Statutory Templates**: Tax Invoices, Payment Receipts, Overdue Dunning, Sales Orders, Support Tickets, Welcome Onboarding, and Custom Messages with dynamic merge tags.
- **1-Click Invoice Dispatch**: Direct WhatsApp modal dispatch from the invoice action toolbar (`/sales/invoices/[id]`).

### 🛒 Retail POS & Customer Portal
- **Walk-in / POS Terminal (`/sales/pos`)**: Fast-checkout register with product search, category filters, barcode wedge scanning, customer creation, split tender (Cash/Card/UPI), and instant thermal receipt printing.
- **Customer Self-Service Portal (`/portal/[token]`)**: Client portal for viewing invoices, checking transaction history, making payments, and submitting support tickets without consuming user seats.

### 🌍 Multi-Country Statutory Tax Engines
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
| **Database** | Supabase (PostgreSQL) with Row Level Security |
| **ORM** | Prisma 7 (with `@prisma/adapter-pg`) |
| **Auth** | Supabase Auth (`@supabase/ssr`) |
| **Styling** | Tailwind CSS & shadcn/ui |
| **Charts** | Recharts (v3) |
| **PDF** | Custom server-side PDF rendering |
| **Types** | TypeScript Strict |

---

## 🏁 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Setup
Create `.env.local` in `app/` with your Supabase credentials:
```env
DATABASE_URL="postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres"
NEXT_PUBLIC_SUPABASE_URL="https://[project].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="[anon-key]"
SUPABASE_SERVICE_ROLE_KEY="[service-role-key]"
```

> [!IMPORTANT]
> Always use the **direct connection string** (port 5432) for `DATABASE_URL`, not the connection pooler, to avoid Prisma schema and migration compatibility issues.

### 3. Generate Prisma Client
```bash
npx prisma generate
```

### 4. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to access the application.

---

## 🏗️ Project Structure

```
CRM/
├── package.json         # Root workspace delegation
├── DEPLOYMENT_AUDIT.md  # Production compliance audit report
├── app/
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/          # Login, Register, Password Reset
│   │   │   ├── (dashboard)/
│   │   │   │   ├── crm/         # CRM module (leads, contacts, deals)
│   │   │   │   ├── sales/       # Sales module (quotes, invoices, orders, products)
│   │   │   │   ├── inventory/   # Inventory & warehouse management
│   │   │   │   └── finance/     # Finance module (bills, accounts, reports)
│   │   │   ├── admin/           # SaaS Super Admin Command Center
│   │   │   │   ├── dashboard/   # Intelligence telemetry hub
│   │   │   │   ├── tenants/     # Tenant lifecycle CRUD & 360 profiles
│   │   │   │   ├── security/    # Security policy & firewall control
│   │   │   │   └── support/     # Support ticket orchestration
│   │   │   ├── actions/         # Server Actions (tenant-scoped)
│   │   │   └── api/             # Force-dynamic API routes (webhooks, PDF export)
│   │   ├── components/          # Shared UI components (shadcn/ui)
│   │   └── lib/                 # Prisma singleton, Supabase SSR, GST engine
│   └── prisma/
│       └── schema.prisma        # Multi-tenant datamodel definition
```

---

## 🔒 Multi-Tenant Architecture

- All data is isolated by `tenant_id` at the database level using Supabase Row Level Security (RLS).
- The Supabase middleware injects `tenant_id` into every authenticated session.
- Super Admin routes (`/admin/*`) are protected and require the `SUPER_ADMIN` role via server-side guard `ensureSuperAdmin()`.

---

## 📋 Production Deployment Verification

The application supports both root workspace delegation and direct `/app` deployments:
```bash
# Build from project root
npm run build

# Start production server on specified port
PORT=3000 npm start
```
See [DEPLOYMENT_AUDIT.md](file:///home/genesoft/Downloads/ERP/Archive/CRM/DEPLOYMENT_AUDIT.md) for the full compliance checklist.
