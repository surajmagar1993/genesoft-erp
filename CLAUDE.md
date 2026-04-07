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

## ✅ Last Session Summary (2026-04-08)
- Fixed `P1001` registration error (wrong `DATABASE_URL` pointing to localhost).
- Removed all hardcoded example data from form placeholders across every ERP module.
- Fixed `npm run build` failure — added `force-dynamic` to `/api/invoices/[id]/pdf`.
- Built SaaS Super Admin Command Center: KPI cards, Tenant Growth chart, Global Presence chart, Quick Actions, DB Health monitor, Incident feed.
- Installed `recharts` for all dashboard visualizations.

## 🔜 Next Active Block
Tenant Management CRUD page (`/admin/tenants`) — Full create/read/update/delete for platform tenants.

---
*This file follows the Hierarchical Agent Memory pattern.*
