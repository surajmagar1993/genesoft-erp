> **Last Updated:** 2026-04-08 | **Active Block:** SaaS Super Admin Command Center ✅

## 🎯 Project Overview
Multi-tenant SaaS ERP & CRM built with Next.js 15, TypeScript, Tailwind CSS, Prisma, and Supabase.

## 🗄 Core Documentation (Memory)
- **`AI_CONTRIBUTOR_CONTEXT.md`**: Main architecture and design rules.
- **`DESIGN_DOCUMENT.md`**: UI/UX standards and design tokens.
- **`MODULE_CHECKLIST.md`**: Roadmap of 120+ ERP modules.
- **`TASK_TRACKER.md`**: Active development progress.
- **`REMAINING_TASKS.md`**: Pending-only task list.
- **`.memory/`**: Architectural decisions and patterns history.

## 🛠 Tech Stack
- **Next.js 15** (App Router)
- **TypeScript** (strict)
- **Tailwind CSS + shadcn/ui**
- **Prisma 7** (with `@prisma/adapter-pg`)
- **Supabase** (Auth, Storage, Realtime)
- **Recharts** (Platform analytics charts)
- **Resend** (Transactional Email)
- **@react-pdf/renderer** (Invoice PDF)
- **papaparse** (CSV import/export)

## 🚦 Project Navigation
- `app/`: Main Next.js application directory.
- `app/src/`: Source code for components, hooks, and actions.
- `app/prisma/`: Database schema and migrations.
- `app/src/app/admin/`: SaaS Super Admin Command Center.
- `app/src/app/actions/saas/`: Platform-level server actions (stats, charts, health).

## 📝 Design Patterns
- **Forms**: Dedicated full pages, not modals.
- **Tenancy**: Every table MUST have `tenantId`.
- **Icons**: `lucide-react`.
- **Placeholders**: Professional instructional text only — NO hardcoded examples.
- **Dynamic Routes**: All API routes accessing the DB use `export const dynamic = "force-dynamic"`.

## ✅ Last Session Summary (2026-09-10)
- Implemented full SaaS Super Admin Tenant Management CRUD:
  - Created `/admin/tenants/new` manual onboarding & provisioning with automatic Chart of Accounts (39 accounts) seed.
  - Created `/admin/tenants/[id]` 360° Tenant Profile (KPI cards, Organization details, Team Members roster, Business records breakdown, and Super Admin audit trail).
  - Built interactive inline tenant profile editing with plan adjustment, trial extension (+7d), and suspension toggles.
  - Wired `TenantActionsDropdown` to link directly to tenant profiles.
  - Removed orphaned root `src/` directory.
  - Removed deprecated `driverAdapters` preview feature from Prisma schema.
- Implemented Platform Security & Governance (`/admin/security`):
  - Built security command center with 4-column KPI cards (2FA, Rate Limit, Blocked IPs, Session Guard).
  - 4 tabs: Access Control & 2FA, IP Firewall & Blocklist, Rate Limiting & Quotas, and Security Audit Trail.
  - Added server actions in `app/actions/saas/admin.ts`: `getSecurityOverview`, `updateSecurityPolicy`, `addBlockedIp`, `removeBlockedIp`.
  - Added "Platform Security" to admin navigation in `app/admin/layout.tsx`.
- Implemented P2 Core Operations: Inventory & Multi-Warehouse Management (`/inventory`):
  - Added Prisma models & Supabase PostgreSQL tables: `warehouses`, `warehouse_stocks`, and `stock_movements` with multi-tenant RLS.
  - Built tenant-scoped server actions in `app/actions/inventory.ts`: `getInventoryOverview`, `createWarehouse`, `updateWarehouse`, `adjustStock`, `transferStock`.
  - Replaced placeholder with interactive `InventoryClient` featuring 4-column KPI telemetry (Valuation, Units, Depots, Reorder alerts), Low Stock warning banner, 4 tabbed views (Stock Levels, Warehouses, Movement Ledger, Reorder Alerts), and modal dialogues for adjustments, transfers, and warehouse management.
  - Configured root monorepo `package.json` with workspace delegation (`workspaces: ["app"]`), updated `.gitignore`, and generated `DEPLOYMENT_AUDIT.md`.
  - Verified `tsc --noEmit` (0 errors), app build (exit code 0), and root workspace build (exit code 0).
- Implemented P2 Core Operations: Purchase & Vendor Management (`/purchase`):
  - Added Prisma models & Supabase PostgreSQL tables: `purchase_orders` and `purchase_order_items` with multi-tenant RLS and `PurchaseOrderStatus` lifecycle enums.
  - Built tenant-scoped server actions in `app/actions/purchase.ts`: `getPurchaseOverview`, `createVendor`, `createPurchaseOrder`, `updatePurchaseOrderStatus`, `receiveGoods`, `convertPOToBill`.
  - Added full multi-tab interface in `/purchase`: 4-column KPI telemetry (Procurement Spend, Open POs, Pending Receipts, Active Suppliers), Order table with lifecycle action triggers, Pending Receipts queue with delivery progress indicators, Supplier directory with balance tracking, and modal workflows for PO authoring, warehouse receipt intake, and AP bill conversion.
  - Added "Purchase" navigation link under Operations in `app/(dashboard)/layout.tsx`.
  - Verified type check (`tsc --noEmit`), Prisma validation (`prisma validate`), app build (`npm run build`), and root monorepo build (exit code 0).
- Implemented P2 Core Operations: HR & Workforce Management (`/hr`):
  - Added Prisma models & Supabase PostgreSQL tables: `departments`, `designations`, `employees`, `attendances`, and `leaves` with multi-tenant RLS.
  - Built tenant-scoped server actions in `app/actions/hr.ts`: `getHROverview` (with automated starter departments seeding), `createEmployee`, `updateEmployee`, `createDepartment`, `createDesignation`, `recordAttendance`, `submitLeaveRequest`, `updateLeaveStatus`.
  - Built interactive multi-tab interface in `/hr`: 4-column KPI telemetry (Headcount, Present Today, Pending Leaves, Departments), Employee directory with search/filters and 360° profile inspection, daily attendance register with working hours calculation, leave approval queue, and organizational department/designation management.
  - Verified type check (`tsc --noEmit`), Prisma validation (`prisma validate`), app build (`npm run build`), root monorepo build (exit code 0), and AST knowledge graph update (`graphify update .`).

- Implemented P2 Core Operations: Projects & Task Delivery (`/projects`):
  - Added Prisma models & Supabase PostgreSQL tables: `projects`, `project_members`, `project_milestones`, `project_tasks`, `project_time_entries` with multi-tenant RLS, composite unique constraints, and enums (`ProjectStatus`, `ProjectPriority`, `ProjectBillingType`, `MilestoneStatus`, `ProjectTaskStatus`).
  - Built tenant-scoped server actions in `app/actions/projects.ts`: `getProjectsOverview` (with automated starter projects & deliverables seeding), `createProject`, `updateProject`, `deleteProject`, `createProjectTask`, `updateProjectTaskStatus`, `updateProjectTask`, `deleteProjectTask`, `createMilestone`, `updateMilestone`, `deleteMilestone`, `addProjectMember`, `removeProjectMember`, `logProjectTime`, `deleteProjectTime`.
  - Replaced placeholder with interactive `ProjectsClient` in `/projects`: 4-column KPI telemetry (Active Projects, Task Velocity % progress bar, Tracked Effort total/billable, Portfolio Budget), 5-column Agile Kanban sprint board (`BACKLOG`, `TODO`, `IN_PROGRESS`, `IN_REVIEW`, `DONE`) with inline stage transitions, Projects Directory table with budget and progress indicators, Milestones deliverable checklist with completion markers, Team resource allocation linked to `/hr` employees, and Timesheet ledger with billable tracking and task actual-hours rollup.
  - Added reusable accessible `Progress` UI component (`app/src/components/ui/progress.tsx`).
  - Verified type check (`tsc --noEmit` with 0 errors), Prisma validation (`prisma validate`), app build (`npm run build`), root monorepo build (exit code 0), and AST knowledge graph update (`graphify update .`).

- Implemented P2 Core Operations: Rental Management & Asset Leasing (`/sales/rental`):
  - Added Prisma models & Supabase PostgreSQL tables: `rental_assets`, `rental_agreements`, `rental_agreement_items`, `rental_returns` with multi-tenant RLS, and enums (`AssetCondition`, `RentalAssetStatus`, `RentalBillingCycle`, `RentalStatus`, `DepositStatus`).
  - Built tenant-scoped server actions in `app/actions/rental.ts`: `getRentalOverview` (with automated starter equipment & lease agreements seeding), `createRentalAsset`, `updateRentalAsset`, `deleteRentalAsset`, `createRentalAgreement`, `updateRentalAgreementStatus`, `processRentalReturn`, `convertAgreementToInvoice`.
  - Replaced `ModulePlaceholder` with interactive `RentalClient` in `/sales/rental`: 4-column KPI telemetry (Fleet Availability, Active Leases, Security Deposits Held, Damages & Penalties), Overdue Alert banner, 4 tabbed views (Agreements & Leases, Asset Fleet Directory, Schedule & Timeline, Returns & Damage Inspection Ledger), and interactive modal dialogs for drafting agreements, registering assets, inspecting returns, and converting contracts directly into official GST Sales Invoices.
  - Verified type check (`tsc --noEmit` with 0 errors), Prisma validation (`prisma validate`), app build (`npm run build`), root monorepo build (exit code 0), and AST knowledge graph update (`graphify update .`).

- Implemented P2 Sales & Commerce: Credit Notes & Customer Refunds (`/sales/credit-notes`):
  - Added Prisma models & Supabase PostgreSQL tables: `credit_notes`, `credit_note_items`, and `credit_note_refunds` with multi-tenant RLS, and enums (`CreditNoteStatus`, `CreditNoteReason`).
  - Built tenant-scoped server actions in `app/actions/sales/credit-notes.ts`: `getCreditNotesOverview` (with automated seeding if empty), `createCreditNote`, `applyCreditToInvoice`, `recordCreditNoteRefund`, `voidCreditNote`.
  - Replaced placeholder with interactive `CreditNotesClient` in `/sales/credit-notes`: 4-column KPI telemetry (Total Credit Issued, Unallocated Credit, Cash/Bank Disbursed, Voided Credits), 3 tabbed views (Credit Notes Register, Applied Invoices Ledger, Cash & Bank Refunds History), and 3 interactive modal dialogs (Issue Credit Note with optional Inventory Restock & Customer Ledger write, Allocate Credit to unpaid Invoices, Disburse Cash/Bank Refund with Ledger balance debit).
  - Added navigation item with `FileMinus` icon under Sales in `app/(dashboard)/layout.tsx`.
  - Verified type check (`tsc --noEmit` with 0 errors), Prisma validation (`prisma validate`), app build (`npm run build`), root monorepo build (exit code 0), and AST knowledge graph update (`graphify update .`).

- Implemented P2 Finance: Expense Management & General Ledger (`/finance/expenses`):
  - Added Prisma models & Supabase PostgreSQL tables: `expenses`, `journal_entries`, `journal_entry_lines` with multi-tenant RLS, and enums (`ExpenseStatus`, `JournalSourceType`, `JournalStatus`).
  - Built tenant-scoped server actions in `app/actions/finance/expenses.ts`: `getExpensesOverview` (with automated Chart of Accounts and starter operational expenses auto-seeding), `createExpense` (with atomic double-entry journal creation and account balance sync), `updateExpenseStatus`, `createJournalEntry` (strict mathematical debit/credit balancing verification), `voidExpense` (reversing GL lines and account balances).
  - Built interactive `ExpensesClient` in `/finance/expenses`: 4-column KPI telemetry (Operational Expenses, Pending Approvals/Claims, Top Expense Driver, Input Tax Credit), 4 tabbed views (Expenses Register, General Ledger & Journal Vouchers, Account T-Ledger Statement, Spending Breakdown & Analytics), and interactive modal dialogs (Record Operational Expense with CoA mapping, Post Double-Entry Journal Voucher with live balancing check, View/Approve Expense Claim Voucher, Inspect Balanced Journal Lines).
  - Added navigation item with `ReceiptText` icon under Finance in `app/(dashboard)/layout.tsx`.
  - Verified type check (`tsc --noEmit` with 0 errors), Prisma validation (`prisma validate`), app build (`npm run build`), root monorepo build (exit code 0), and AST knowledge graph update (`graphify update .`).

- Implemented P2 Sales: Price Lists & Customer Tier Pricing (`/sales/price-lists`):
  - Added Prisma models & Supabase PostgreSQL tables: `price_lists` and `price_list_items` with multi-tenant RLS, composite unique constraints (`[priceListId, productId, minQuantity]`), and enums (`PriceListType`, `PricingScheme`).
  - Added reverse relations to `Tenant`, `Product`, and `Contact` (with `priceListId` customer tier mapping).
  - Built tenant-scoped server actions in `app/actions/sales/price-lists.ts`: `getPriceListsOverview` (with automated starter products & rate cards seeding), `createPriceList`, `updatePriceList`, `deletePriceList`, `upsertPriceListItem`, `deletePriceListItem`, `assignContactPriceList`, `calculateEffectivePrice`.
  - Built interactive `PriceListsClient` in `/sales/price-lists`: 4-column KPI telemetry (Active Rate Cards, Product Price Rules, Avg Tier Discount, Assigned Accounts), 4 tabbed views (Rate Cards Directory, Item Pricing Matrix, Volume Break Tiers, Interactive Price Simulator), and interactive modal dialogs (Create/Edit Rate Card, Add Product Override with volume breaks, Map Customer to Rate Card).
  - Added navigation item with `Tag` icon under Sales in `app/(dashboard)/layout.tsx`.
  - Verified type check (`tsc --noEmit` with 0 errors), Prisma validation (`prisma validate`), app build (`npm run build`), root monorepo build (exit code 0), and AST knowledge graph update (`graphify update .`).

- Implemented P2 Finance: Bank Reconciliation (`/finance/bank-reconciliation`):
  - Added Prisma models & Supabase PostgreSQL tables: `bank_accounts`, `bank_statements`, `bank_transactions` with multi-tenant RLS, and enums (`BankAccountType`, `BankStatementStatus`, `BankTransactionType`, `BankReconcileStatus`, `BankMatchedType`).
  - Added reverse relations to `Tenant`, `Account` (Chart of Accounts), `Payment`, `Expense`, and `JournalEntry`.
  - Built tenant-scoped server actions in `app/actions/finance/bank-reconciliation.ts`: `getBankReconciliationOverview` (with automated starter corporate bank accounts & statement batch seeding), `createBankAccount`, `updateBankAccount`, `deleteBankAccount`, `importBankStatement` (CSV feed parser), `autoMatchTransactions` (algorithmic rule engine), `matchTransactionManual`, `unmatchTransaction`, `createQuickExpenseAndReconcile` (auto-posts balanced General Ledger entries and links in 1 atomic step), and `finalizeReconciliation` (locks statement once discrepancy is zero).
  - Built interactive `BankReconciliationClient` in `/finance/bank-reconciliation`: 4-column KPI telemetry (Statement Balance, ERP Book Balance, Cleared Balance, Reconciliation Variance with balance status badge), 4 tabbed views (Reconciliation Match Desk split-screen, Bank Accounts Directory, Statement Batches & Periods, Discrepancy & In-Transit Diagnostics), and interactive modal dialogs (Add/Edit Corporate Bank Account, Import Statement / CSV parser, Manual Record Match Picker, Quick Record Expense & Reconcile).
  - Added navigation item with `Scale` icon under Finance in `app/(dashboard)/layout.tsx`.
  - Verified type check (`tsc --noEmit` with 0 errors), Prisma validation (`prisma validate`), app build (`npm run build`), and root monorepo build (exit code 0).

- Implemented P2 Invoice Features: Recurring Invoices & Subscriptions (`/sales/invoices/recurring`):
  - Added Prisma models & Supabase PostgreSQL tables: `recurring_profiles`, `recurring_profile_items`, and `recurring_executions` with multi-tenant RLS, and enums (`RecurringFrequency`, `RecurringStatus`, `RecurringExecutionStatus`).
  - Added reciprocal relations to `Tenant`, `Contact`, `Product`, and `Invoice` (with `recurringProfileId` mapping on `Invoice`).
  - Built tenant-scoped server actions in `app/actions/sales/recurring-invoices.ts`: `getRecurringInvoicesOverview` (with automated starter subscription retainers seeding & MRR calculation), `createRecurringProfile`, `updateRecurringProfile`, `deleteRecurringProfile`, `toggleRecurringProfileStatus`, `triggerGenerateInvoice` (instant 1-click live invoice generation with automatic next run date advancement and execution logging), and `batchRunDueRecurringProfiles`.
  - Built interactive `RecurringInvoicesClient` in `/sales/invoices/recurring`: 4-column KPI telemetry (Active Retainers, MRR with ARR calculation, Soonest Scheduled Run with days countdown, Lifetime Invoices Generated), 4 tabbed views (Subscription Profiles Directory, 90-Day Billing Schedule Forecast, Generation History & Audit Log, MRR & Subscription Breakdown), and interactive modal dialogs (Create/Edit Recurring Schedule with dynamic multi-item line editor, Run Now instant generation trigger confirmation, 360° Profile Inspector).
  - Added navigation item with `Repeat` icon under Sales in `app/(dashboard)/layout.tsx`.
  - Verified type check (`tsc --noEmit` with 0 errors), Prisma validation (`prisma validate`), app build (`npm run build`), and root monorepo build (exit code 0).

- Implemented P2 CRM: Email Integration & Corporate Inboxes (`/crm/emails`):
  - Added Prisma models & Supabase PostgreSQL tables: `email_accounts`, `email_messages`, and `email_templates` with multi-tenant RLS, and enums (`EmailProvider`, `EmailTemplateCategory`, `EmailStatus`, `EmailDirection`).
  - Added reciprocal relations to `Tenant`, `Contact`, `Lead`, and `Deal` (with automatic `CommunicationLog` parity synchronization so that customer 360° activity feeds reflect emails without redundant queries).
  - Built tenant-scoped server actions in `app/actions/crm/emails.ts`: `getEmailsOverview` (with automated starter corporate mailboxes, templates, and thread seeding), `sendEmail` (with automatic contact email resolution, thread tracking, and unified communication log recording), `saveEmailDraft`, `toggleStarEmail`, `markEmailAsRead`, `deleteEmailMessage`, `syncMailbox`, `createEmailAccount`, `deleteEmailAccount`, `createEmailTemplate`, `deleteEmailTemplate`.
  - Built interactive `EmailsClient` in `/crm/emails`: 4-column KPI telemetry (Active Conversations, Unread Inbound, Sent Outreach, Email Open Rate), modern 3-pane email client layout (Folders & Connected Mailboxes pane, Search & Thread Feed pane, Conversation Reader & CRM 360° Inspector pane with inline reply composer), and interactive modal dialogs (Compose Corporate Email with Contact/Lead/Deal linking and dynamic merge-tag substitution, Corporate Mailboxes Manager, Email Template Builder).
  - Added navigation item with `Mail` icon under CRM in `app/(dashboard)/layout.tsx`.
  - Verified type check (`tsc --noEmit` with 0 errors), Prisma validation (`prisma validate`), app build (`npm run build`), root monorepo build (exit code 0), and AST knowledge graph update (`graphify update .` -> 1392 nodes, 4632 edges, 78 communities).

## 🔜 Next Active Block
P2 Growth: CRM Web Forms & Lead Capture (`/crm/forms` or `/crm/leads/forms`) — Embeddable lead generation forms, public submission endpoints, and webhook intake.

---
*This file follows the Hierarchical Agent Memory pattern.*
