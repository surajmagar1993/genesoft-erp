# 🤖 AI System Context — Genesoft ERP & CRM

> **Last Updated:** 2026-04-07

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
*   **Language**: TypeScript
*   **Styling**: Tailwind CSS + shadcn/ui
*   **Icons**: lucide-react
*   **Backend & API**: tRPC + React Query
*   **Database**: PostgreSQL
*   **ORM**: Prisma (schema at `app/prisma/schema.prisma`)
*   **Auth & Storage**: Supabase (@supabase/ssr)
*   **Email**: Resend
*   **PDF**: @react-pdf/renderer (planned for Invoice PDF block)

## 🗄 Database Design Schema (Prisma)
The database uses a strict multi-tenant architecture with Row-Level Security implicitly handled via code constraints. 
*   **Tenant Mapping**: Every major table (`User`, `Contact`, `Product`, `Invoice`, etc.) **MUST** contain a `tenantId` mapping to the `Tenant` schema.
*   **Users**: Linked to Supabase Auth via `authId` mapped against the `Tenant`.
*   **Models built so far**: Accounts (CoA), Contacts, Companies, Leads, Deals, Products, TaxGroups, TaxRates, Invoices, InvoiceItems (mapped to `invoice_line_items`), Payments, Tasks, CommunicationLog.

## 🧾 GST Engine & PDF Generation (Completed — 2026-03-31)
A full Indian GST engine and PDF generation pipeline has been built:
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
- **`components/crm/EntityCommunications.tsx`** — Reusable timeline component with type-based icons, relative timestamps, and add/delete actions.
- **`app/actions/crm/communications.ts`** — Server actions: `getCommunicationLogs`, `createCommunicationLog`, `deleteCommunicationLog`.
- **Prisma**: `CommunicationLog` model with `CommunicationType` enum (NOTE, CALL, EMAIL, MEETING, SMS, OTHER).
- **DB Migration**: `communication_logs_migration.sql` with RLS tenant isolation.
- **Integration**: Lead detail page now has 4 tabs (Overview, Notes, Tasks & Activity, History).

## 💰 Customer Ledger / Statement (Completed — 2026-04-01)
Full contact detail page with real-time synchronized accounting ledger:
- **`app/(dashboard)/crm/contacts/[id]/page.tsx`** — Server page fetching contact, ledger, tasks, and logs in parallel.
- **`app/(dashboard)/crm/contacts/[id]/ContactDetailClient.tsx`** — 4-tab detail view (Ledger, Details, Notes, Tasks) with sidebar summary.
- **`app/actions/crm/ledger.ts`** — Centralized `recordTransaction` utility that updates the `LedgerEntry` table and `Contact.balance` atomically. Includes `getCustomerLedger` to fetch sorted history.
- **Automated Triggers**: `createInvoice`, `deleteInvoice`, `createPayment`, and `deletePayment` (in their respective action files) now invoke the ledger system to ensure consistent financial states.
- **Prisma**: `LedgerEntry` model with `LedgerEntryType` (INVOICE, PAYMENT, etc.), storing amount and running balance per contact.
- **DB Migration**: Added `ledger_entries` table with RLS tenant isolation and a performance index on `[tenantId, contactId]`.
- **Next active block**: Subscription & Billing (SaaS Platform).

## 📊 Chart of Accounts (Completed — 2026-04-01)
Full Chart of Accounts module for the Finance block:
- **`app/actions/finance/accounts.ts`** — CRUD server actions + `seedDefaultAccounts()` for Indian CoA template (39 accounts: Assets, Liabilities, Equity, Revenue, Expenses).
- **`app/(dashboard)/finance/accounts/page.tsx`** — List view with hierarchical tree, expand/collapse, type filters, summary stats.
- **`app/(dashboard)/finance/accounts/new/`** — New account form with type-aware parent dropdown.
- **`app/(dashboard)/finance/accounts/[id]/edit/`** — Edit form with system-account protections.
- **Prisma**: `Account` model with `AccountType` enum, self-referencing parent/child hierarchy.
- **DB Migration**: `create_chart_of_accounts` — `accounts` table with RLS, `AccountType` enum, indexes, auto-update trigger.
- **Sidebar**: Added dedicated "Finance" nav group with Chart of Accounts and Payments.
## 🏛 Accounts Payable (AP) (Completed — 2026-04-01)
Full Accounts Payable module for the Finance block:
- **`app/actions/finance/bills.ts`** — CRUD server actions for vendor bills, payments, and AP dashboard.
- **`app/(dashboard)/finance/ap/page.tsx`** — Dashboard with aging buckets for vendor liabilities.
- **Prisma**: `Bill` and `BillItem` models. Note: `invoice_line_items` mapping in schema.

## 📊 Financial Reports (Completed — 2026-04-05)
Real-time financial analytics engine:
- **`app/actions/finance/reports.ts`** — Aggregations for P&L, Monthly Revenue, Cash Flow, and Top Revenue Contacts.
- **`app/(dashboard)/finance/reports/`** — Visual dashboards with period filtering.
- **Logic**: Invoices (AR) vs Bills (AP) aggregation with payment-based cash flow tracking.

## 🎫 Support & Ticketing (Completed — 2026-04-07)
Multi-tenant helpdesk system:
- **`app/actions/support/tickets.ts`** — Server actions for ticket lifecycle and threaded messaging.
- **Prisma**: `SupportTicket` (Status/Priority) and `SupportMessage` (Admin/User flags).
- **RBAC**: Integrated with user roles for Admin vs Tenant response views.

## 💱 Multi-Currency Support (Completed — 2026-04-07)
System-wide support for dynamic currency and exchange rates:
- **`lib/utils.ts`** — `formatCurrency(amount, code)` helper using `Intl.NumberFormat`.
- **`app/actions/finance/exchange-rates.ts`** — Central service for `getExchangeRate` with built-in reference rates.
- **`app/actions/crm/ledger.ts`** — Enhanced to automatically convert transaction amounts to contact's base currency using exchange rates.
- **Models**: `currency_code` added to `Quote`, `SalesOrder`, `Bill`, and `Contact`.
- **UI**: Generic `Banknote` icons and dynamic symbols across all financial pages and PDF templates.

## 🚦 Contribution Workflow (For AI Agents)
1. **Never** deviate from `lucide-react` or `shadcn/ui` components for base UI.
2. Always write mocked UI *first* in standard TSX, then wire it up.
3. Once a module feature is complete, update `TASK_TRACKER.md` and remove it from `REMAINING_TASKS.md`.
4. Ensure components that interact with the database utilize the `tenantId` parameter inherently passed through the active session context.
5. **Next active block**: Phase 2 Modules (Inventory & Purchase).
