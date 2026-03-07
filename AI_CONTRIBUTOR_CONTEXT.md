# 🤖 AI System Context — Genesoft ERP & CRM

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

## 🗄 Database Design Schema (Prisma)
The database uses a strict multi-tenant architecture with Row-Level Security implicitly handled via code constraints. 
*   **Tenant Mapping**: Every major table (`User`, `Contact`, `Product`, `Invoice`, etc.) **MUST** contain a `tenantId` mapping to the `Tenant` schema.
*   **Users**: Linked to Supabase Auth via `authId` mapped against the `Tenant`.
*   **Models built so far**: Accounts, Contacts, Companies, Leads, Deals, Products, TaxGroups, Invoices.

## 🎨 UI/UX Design Rules
Please refer to `DESIGN_DOCUMENT.md` for specific Tailwind color classes, but at a high level:
1. **Forms**: Should be rendered on dedicated full pages (e.g., `/crm/contacts/new/page.tsx`), not in modals or dialogs.
2. **Layout Wrapper**: Use `flex flex-col min-w-0 overflow-y-auto overflow-x-hidden p-6 w-full` for all main module views.
3. **Typography**: Main page headers should be `h1` with `className="text-3xl font-bold tracking-tight"`.
4. **Stats Grids**: Key landing pages should use a 4-column responsive stats grid `grid gap-4 md:grid-cols-2 lg:grid-cols-4`.
5. **Search**: Embedded search bounds should be standardized: `className="relative max-w-sm w-full flex-1"`.

## 🚦 Contribution Workflow (For AI Agents)
1. **Never** deviate from `lucide-react` or `shadcn/ui` components for base UI.
2. Always write mocked UI *first* in standard TSX, then wire it to tRPC.
3. Once a module feature is complete, update `TASK_TRACKER.md` and remove it from `REMAINING_TASKS.md`.
4. Ensure components that interact with the database utilize the `tenantId` parameter inherently passed through the active session context.
