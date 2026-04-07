# Genesoft ERP & CRM

Genesoft is a modern, multi-tenant SaaS ERP and CRM platform built with Next.js 15, Supabase, and Prisma. It provides a comprehensive suite for managing business operations with native multi-currency support, integrated GST handling, and a full **SaaS Super Admin Command Center** for platform-level governance.

---

## 🚀 Features

### 🏢 SaaS Super Admin Command Center
- **Platform Intelligence Hub**: Real-time KPI cards (tenants, users, MRR, tickets) with trend indicators and glassmorphism styling.
- **Interactive Charts**: Tenant Growth (line chart) and Global Presence (pie chart) powered by `recharts`.
- **Database Health Monitor**: Real-time latency and total platform record counts.
- **Incident Monitor**: Color-coded system event log feed with tenant attribution.
- **Quick Actions Panel**: Direct navigation to Tenant Management, Support Tickets, Security, and Settings.

### 🤝 CRM (Customer Relationship Management)
- **Leads & Deals**: Track sales pipeline from prospect to conversion.
- **Contacts & Companies**: Centralized repository for all business partners.
- **Tasks**: Activity management and follow-ups.
- **Customer Ledger**: Real-time account history with debit/credit tracking and automatic balance sync.

### 💰 Finance & Accounting
- **Accounts Payable**: Manage vendor bills, payments, and aging.
- **Accounts Receivable**: Track customer invoices and incoming payments.
- **GST Engine**: Integrated Indian GST calculations for all financial documents.
- **Chart of Accounts**: Comprehensive financial structure management.
- **Multi-Currency Support**: Dynamic currency formatting ($, €, ₹, AED) and exchange rate-aware ledger balances.
- **Invoice PDF Export**: Server-rendered PDF generation for Tax Invoices.

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
| **Framework** | Next.js 15 (App Router) |
| **Database** | Supabase (PostgreSQL) with Row Level Security |
| **ORM** | Prisma 7 (with `@prisma/adapter-pg`) |
| **Auth** | Supabase Auth |
| **Styling** | Tailwind CSS & Shadcn UI |
| **Charts** | Recharts |
| **PDF** | Custom server-side PDF rendering |
| **Types** | TypeScript (strict) |

---

## 🏁 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Setup
Create `.env.local` with your Supabase credentials:
```env
DATABASE_URL="postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres"
NEXT_PUBLIC_SUPABASE_URL="https://[project].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="[anon-key]"
```

> [!IMPORTANT]
> Always use the **direct connection string** (port 5432) for `DATABASE_URL`, not the connection pooler, to avoid Prisma compatibility issues.

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
src/
├── app/
│   ├── (auth)/          # Login, Register, Password Reset
│   ├── admin/           # Super Admin Command Center
│   │   └── dashboard/   # Platform intelligence hub
│   ├── actions/
│   │   └── saas/        # getPlatformStats, getDashboardCharts, getDatabaseHealth
│   ├── crm/             # CRM module (leads, contacts, deals)
│   ├── sales/           # Sales module (quotes, invoices, orders)
│   ├── finance/         # Finance module (bills, payments, accounts)
│   └── api/             # API routes (all marked force-dynamic)
├── components/          # Shared UI components
└── lib/                 # Prisma client, Supabase client, utilities
```

---

## 🔒 Multi-Tenant Architecture

- All data is isolated by `tenant_id` at the database level using Supabase Row Level Security (RLS).
- The Supabase middleware injects `tenant_id` into every authenticated session.
- Super Admin routes (`/admin/*`) are protected and require the `SUPER_ADMIN` role.

---

## 📋 Known Notes

- **Dynamic API Routes**: All API routes that access the database are marked `export const dynamic = "force-dynamic"` to prevent build-time initialization errors.
- **Prisma Adapter**: Uses `@prisma/adapter-pg` with a `pg.Pool` for connection pooling. Avoid the PgBouncer transaction-mode URL for Prisma ORM.
