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

## 🔜 Next Active Block
P2 Growth: Sales & Finance Enhancements — Credit Notes & Customer Refunds (`/sales/credit-notes`), Price Lists, and General Ledger / Expense Management (`/finance/expenses`).

---
*This file follows the Hierarchical Agent Memory pattern.*
