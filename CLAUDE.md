> **Last Updated:** 2026-10-14 | **Status:** testing on genesoftdev.vercel.app, not live yet | Open work: `REMAINING_TASKS.md` → "Open items"

## 🎯 Project Overview
Multi-tenant SaaS ERP & CRM built with Next.js 16, TypeScript, Tailwind CSS, Prisma, and Supabase.

## 🗄 Core Documentation (Memory)
- **`AI_CONTRIBUTOR_CONTEXT.md`**: Main architecture and design rules.
- **`DESIGN_DOCUMENT.md`**: UI/UX standards and design tokens.
- **`MODULE_CHECKLIST.md`**: Roadmap of 120+ ERP modules.
- **`TASK_TRACKER.md`**: Active development progress.
- **`REMAINING_TASKS.md`**: Pending-only task list.
- **`.memory/`**: Architectural decisions and patterns history.

## 🛠 Tech Stack
- **Next.js 16** (App Router)
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

## 🔐 Security Rules (current, 2026-10-14)
- **Tenant isolation is in code, not RLS.** Prisma bypasses Supabase RLS. Every query that takes an id from the client must include the caller's `tenantId` (`findFirst({ where: { id, tenantId } })`, `updateMany`/`deleteMany` with `{ id, tenantId }` and a `count` check). Also verify any *referenced* ids (contact, account, product, warehouse, price list…) belong to the tenant before using them.
- **Pick the tenant helper by role** (`src/lib/get-tenant-id.ts`): `getTenantId()` for reads and self-service (any role), `getTenantWriterId()` for creating/editing records (USER+, blocks VIEWER), `getTenantManagerId()` for deletes, voids, approvals, finance controls, pricing, credit notes, HR and payroll (MANAGER+), `getTenantAdminId()` for workspace settings and credentials (ADMIN+). Deactivated users (`profiles.is_active = false`) are signed out.
- **Module access (per member):** admins have everything; other members get NONE / VIEW / EDIT / FULL per module (`src/lib/access.ts`), set by the business admin in Settings → Team & Access and stored in `tenants.settings.team.access[userId]` (invites in `settings.team.invites`, changed only via `updateTeam()` in `src/lib/team-settings.ts`). Every action file of a module declares `const MODULE = "<module>"` and passes it to `getTenantId(MODULE)` / `getTenantWriterId(MODULE)` / `getTenantManagerId(MODULE)` (VIEW / EDIT / FULL); lookups used by other modules accept a list (e.g. contacts: crm, sales, finance, purchase). A new module needs an entry in `MODULES`, `moduleForPath`, and a `<ModuleGate>` layout. Employee self-service (`hr/portal`, own leave) stays module-free. Team invites are signed links (`src/lib/invite-token.ts`) emailed with the TEAM_INVITE system template; `/join` creates the account in the inviting business. The Super Admin sees every business's users and access (Admin → Users) but only suspends accounts.
- **Stored credentials are encrypted.** Use `sealSecret()` when saving and `openSecret()` when using tenant secrets (`src/lib/secret-box.ts`, key from `ENCRYPTION_KEY`). Show them with `maskSecret()`; never return them to the client.
- **Webhooks fail closed.** Verify the gateway signature on the raw body before trusting any field.
- **No demo data in real tenants.** Sample seeders run only when `ENABLE_DEMO_SEED=true`.
- **Next.js 16:** request interception lives in `src/proxy.ts` (export `proxy`); `params`/`searchParams` are Promises and must be awaited.
- **One data path: Prisma.** The Supabase client is only for Auth (sign-in, `supabase.auth.*`). Never query tables with `supabase.from(...)`: it bypasses the tenant checks below and its column names drift. Screens written for snake_case rows get them from `toRow`/`toRows` (and forms go back through `fromRow`, which drops unknown keys) in `src/lib/pg-row.ts`. Current user: `getCurrentUser()` (`src/lib/current-user.ts`). Only exception: the request proxy reads the user's own role from `profiles` (guarded by `data-path.test.ts`).
- **Ids from the URL:** check with `isUuid()` before querying, or `isRecordId()` for tables with cuid ids (invoices, payments, support tickets, notifications…; see `schema.prisma`).
- **Reference ids from the client:** call `assertTenantRefs(tenantId, { contact, product, warehouse, ... })` (`src/lib/tenant-refs.ts`) before writing them. Employee self-service goes through `assertCanActForEmployee` (`src/lib/employee-access.ts`): staff act only for themselves, managers for anyone.
- **Workflows:** after a business event, call `fireWorkflowEvent(tenantId, "EVENT", payload, entityId)` (`src/lib/workflow-engine.ts`); it runs after the response and never throws. Time-based events, recurring invoices and IMAP sync run in the daily cron `/api/cron/workflows` (`CRON_SECRET`).
- **Plan billing:** prices come from Admin → Pricing via `getEffectivePricing()` (`src/lib/plan-pricing.ts`, catalog fallback; annual = monthly × 12 × 0.8). Paid plan changes go through `createPlanCheckout` (Razorpay order or Stripe Checkout) and are applied only by `applyPlanChange` after the gateway confirms (`src/lib/plan-change.ts`, idempotent per payment). Saving a price syncs Stripe automatically. Never export payment-applying code from a `"use server"` file.
- **Plan limits & modules:** what each plan includes is edited in Admin → Pricing & Plans → Limits & modules and read with `getPlanConfig()` (`src/lib/plan-config.ts`; defaults and types in `plan-config-shared.ts`; stored as the newest `PLAN_CONFIG_UPDATE` admin audit entry, so changes keep their history). Before creating a user, contact, invoice or warehouse call `assertWithinLimit(tenantId, kind)` (or `planLimitError` in actions that return `{ error }`) from `src/lib/plan-limits.ts`. A module the plan leaves out is set to NONE in the tenant context (`get-tenant-id.ts`), so the module checks, menus and `<ModuleGate>` follow it for everyone, admins included; POS and Rentals (inside Sales) use `assertPlanFeature` and `<PlanGate>`. An active trial counts as Pro. Limits only stop new records. Prices: `savePricingRegion` per region (`src/lib/pricing-regions.ts`); a switched-off plan is in `getEffectivePricing().hidden` and isn't shown or sold.
- **Action errors:** Next.js hides thrown error messages in production. Mutations that the UI must explain return `ActionResult` via `toActionResult()` and the client calls `unwrap()` (`src/lib/action-result.ts`); all super admin mutations in `actions/saas/admin.ts` work this way.
- **Platform emails:** send system templates with `sendSystemEmail()` (`src/lib/system-email.ts`), which applies the super admin's saved template and never throws. Only SUPPORT_TICKET_UPDATE is sent today; sign-up/welcome emails come from Supabase Auth (edit them in Supabase → Authentication → Email Templates).
- **Marketing emails:** only to users who opted in (`marketing_opt_in` in Supabase auth user metadata, set at sign-up or in Settings → Account → Email preferences). Send them from Admin → Marketing Emails (`src/lib/marketing-email.ts`), never via `sendSystemEmail`. Every email carries a signed unsubscribe link (`/unsubscribe`, confirm button, so link scanners can't unsubscribe people), RFC 8058 one-click headers (`/api/unsubscribe`) and the company address. Tokens: `src/lib/unsubscribe-token.ts` (`MARKETING_UNSUBSCRIBE_SECRET`, else `ENCRYPTION_KEY`).
- **Auth emails:** Supabase sends sign-up, reset, invite and email-change emails using `app/email-templates/supabase/*.html` (pushed with `supabase config push`; edit there, not in the dashboard). Their links go to `/auth/confirm` (token_hash → session), and password resets land on `/reset-password`.
- **No invented data:** never fall back to made-up values (GSTINs, VAT/TRN/ABN/EIN, addresses, phones, states, tax rates, domains). Missing tenant details stay empty and exports call `requireTaxId()` (`src/lib/tax-identity.ts`). A 0% rate is real: use `??`, not `||`, for rates. Platform company details live in `src/lib/constants/platform.ts`; URLs come from `appUrl()` / `window.location.origin`.
- **Countries & tax:** every document follows the business's country (`resolveTaxRegime` in `src/lib/tax-jurisdiction.ts`, server side via `getTenantTaxContext` in `src/lib/tenant-tax.ts`; client via `useTaxRegime`). India = CGST+SGST/IGST, others = one VAT/GST/sales-tax line (`supplyType "single"`, InvoiceItem `vatRate/vatAmount`), KSA adds the ZATCA phase-1 QR. Never assume India, INR, `en-IN`, 18% or Maharashtra. Recompute tax on the server; never trust browser totals.
- **Filing modules hidden:** GST returns, TDS, e-way, VAT 201, ZATCA returns, MTD, BAS, 1099 are behind `NEXT_PUBLIC_ENABLE_COMPLIANCE_MODULES` (`src/lib/features.ts`). Basic tax + Tax Summary are always on.
- **Go-live / mobile:** see `GO_LIVE_CHECKLIST.md`. Put reusable business logic in `src/lib` so a future REST API for the mobile app can share it.
- **Tests:** `npm test` = unit tests (`src/**/*.test.ts`); `npm run test:integration` = whole flows (`src/**/*.int.test.ts`: sign-up, invoice → payment → ledger, plan checkout, export/close/purge) against a throwaway in-memory Postgres (PGlite, `src/test/integration/`), never the shared database. `npm run test:all` runs both. Add an integration test when you change a money or data flow.
- **General ledger:** invoices, credit notes, refunds, payments, bills and payroll runs post double-entry journals via `postToLedger(tenantId, { kind, id })` (`src/lib/ledger.ts`) right after the document changes. It rebuilds that document's journal from its current state (old one voided, kept for audit), never throws (failures go to System Logs), and is idempotent, so Finance → General Ledger → "Rebuild ledger" (`rebuildLedger`) can re-post everything. **Any new code that creates, edits, deletes or changes the status of one of these documents must call `postToLedger`.** Accounts are found by role (AR 1200, Sales 4100, CGST/SGST/IGST 2210-2230 or one tax account, AP 2100, …) and created if missing. Expenses post their own journals. Reports (trial balance, balance sheet, account ledger, opening balances) read POSTED journal lines (`src/lib/accounting-reports.ts`); `accounts.balance` is only a cache. P&L: `src/lib/profit-and-loss.ts` (documents, before tax) — the ledger test checks they agree.
- **Error monitoring (built in, no Sentry):** `src/instrumentation.ts` (`onRequestError`) sends every uncaught server error to `reportError()` (`src/lib/error-reporting.ts`): saved to System Logs with path and stack (secrets scrubbed), and the first occurrence of each error per 24 h is emailed to `ERROR_ALERT_EMAIL` (default hello@), max 10 alerts/hour. Error pages report browser crashes to `/api/client-error` (logged as WARN, never emailed). Background jobs should call `reportError()` themselves when they catch a failure that matters. Logs are pruned after `SYSTEM_LOG_RETENTION_DAYS` (30) by the daily cron.
- **Workspace data:** Settings → Data & Account lets a workspace admin export everything (`/api/settings/export`, `src/lib/tenant-data.ts`) and close the workspace (`closeWorkspace`, 30-day grace in `src/lib/workspace-closure.ts`). The super admin reopens it with Activate, or deletes it permanently on the tenant page (`purgeTenant` → `purgeTenantData`, one transaction; keeps the tenant row's Genesoft receipts). Both find the tenant's tables from the live Postgres catalog, so a new table with `tenant_id` (or a foreign key to one) is included automatically.
- **Simulated features** (label them as such in the UI until real): e-way bill numbers are drafts (real ones come from the NIC portal), live Stripe/PayPal invoice checkout isn't wired, portal online payment is off (`PORTAL_ONLINE_PAYMENTS_ENABLED`), workflow "update status" actions only run in the simulator, platform 2FA / session timeout / rate limits are saved but not enforced, web forms have no CAPTCHA.

## 📝 Design Patterns
- **Forms**: Dedicated full pages, not modals.
- **Tenancy**: Every table MUST have `tenantId`.
- **Icons**: `lucide-react`.
- **Placeholders**: Professional instructional text only — NO hardcoded examples.
- **Dynamic Routes**: All API routes accessing the DB use `export const dynamic = "force-dynamic"`.

## 🗂 Build history (September 2026, as written then)
> Kept for reference. These notes were written when the modules were first built and several overstate them: the government-filing modules (GST returns, e-way bills, TDS, VAT 201, ZATCA phase 2, MTD, BAS) are hidden and not connected to any government system; starter/demo seeders no longer run in real workspaces; Stripe/PayPal invoice checkout isn't live; "Resend fallback"/simulated sends were removed. The Security Rules above describe the code as it is now.
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

- Implemented P2 CRM: Web Forms & Lead Capture (`/crm/forms`):
  - Added Prisma models & Supabase PostgreSQL tables: `web_forms` and `form_submissions` with multi-tenant RLS, composite unique constraints (`code`), and enums (`WebFormType`, `WebFormStatus`, `FormSubmissionStatus`).
  - Added reciprocal relations to `Tenant`, `Lead`, and `Contact` (with automated inbound lead synthesis upon submission).
  - Built tenant-scoped server actions in `app/actions/crm/forms.ts`: `getWebFormsOverview` (with automated starter forms & submissions seeding), `createWebForm`, `updateWebForm`, `deleteWebForm`, `toggleWebFormStatus`, and `submitPublicForm` (with honeypot anti-spam protection, Contact lookup/creation, and CRM Lead generation).
  - Created public CORS-enabled API intake route (`/api/forms/[id]/submit`) supporting cross-origin `POST` and `OPTIONS` requests from external client websites and webhooks.
  - Created standalone public landing page & iframe host (`/forms/[code]`) with `PublicFormClient` featuring real-time client verification, honeypot spam protection, responsive inputs, and celebration screens.
  - Built interactive `FormsClient` in `/crm/forms`: 4-column KPI telemetry (Active Web Forms, Total Submissions, Inbound Leads Captured with direct CRM link, Avg Conversion Rate), 4 tabbed workspaces (Forms Directory, Form Studio & Visual Builder with live split preview, Submissions Feed table, and Embed & Integration Hub with one-click iFrame, JS widget, Direct URL, and cURL snippets), plus interactive modal dialogs (Blueprint Template Picker, Live Submission Simulator, Embed Generator, and Raw JSON Payload Inspector).
  - Added navigation item with `Globe` icon under CRM in `app/(dashboard)/layout.tsx`.
  - Verified type check (`tsc --noEmit` with 0 errors), Prisma validation (`prisma validate`), app build (`npm run build`), root monorepo build (exit code 0), and AST knowledge graph update (`graphify update .` -> 1437 nodes, 4781 edges, 93 communities).

- Implemented P2 Retail & Self-Service: Customer Portal (`/portal/[token]`) & POS Terminal (`/sales/pos`):
  - Token-authenticated client portal for invoices, payments, statements, and support tickets.
  - Retail POS checkout register with product catalog grid, barcode wedge scanner, walk-in customer creation, multi-tender payments, and thermal receipt printing.

- Implemented P2 Multi-Country Statutory Tax Engines (`app/src/lib/`):
  - Pure TypeScript statutory computation for India (GST Returns GSTR-1/3B, E-Way Bill Rule 138, TDS & TCS Form 26Q), UAE (VAT 201, 7 Emirates split, FAF file), KSA (ZATCA Fatoora Phase 1 & 2 UBL 2.1 XML, TLV QR code, Zakat), UK (HMRC MTD VAT 9-Box return, Modulus 97 VRN), and Australia (ATO BAS Form, Modulus 89 ABN).

- Implemented P2 SaaS Lifecycle & Administration:
  - System Email Templates Studio (`/admin/email-templates`) with 6 transactional presets, dynamic merge tags, and Resend API fallback.
  - SaaS Plan Upgrade/Downgrade Engine (`/settings`) with real-time proration mathematics and automated platform B2B invoicing (`SAAS-INV-YYYY-XXXX`).

- Implemented P2 Integrations: WhatsApp Business API (`/crm/whatsapp`):
  - Pure TS WhatsApp Engine (`app/src/lib/whatsapp-engine.ts`) with Meta Graph API v20.0 client, international E.164 phone normalizer (IN, US, UK, AE, SA, AU), 1-click `wa.me` links, and 7 statutory templates.
  - WhatsApp Studio Hub (`/crm/whatsapp`) with 4 KPI cards, conversational WhatsApp bubble chat, invoice dispatcher, and Meta gateway configuration desk.
  - Public webhook challenge verification and event receiver at `/api/webhooks/whatsapp`.
  - In-place WhatsApp modal dispatch from the invoice action toolbar (`/sales/invoices/[id]`).
  - Verified with 12 standalone test suites, `tsc --noEmit` (0 errors), `npm run build` (clean build), and `graphify update .` (1943 nodes, 6395 edges).

## 🔜 Next
See "Open items" in `REMAINING_TASKS.md` and `GO_LIVE_CHECKLIST.md`.

---
*This file follows the Hierarchical Agent Memory pattern.*

