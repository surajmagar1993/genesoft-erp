# Project Patterns & Conventions

## UI Patterns
- **Full-page Forms**: Forms are standard pages at `[base]/[module]/new/page.tsx` or `[base]/[module]/[id]/edit/page.tsx`.
- **Layout Wrapper**: `flex flex-col min-w-0 overflow-y-auto overflow-x-hidden p-6 w-full`.
- **Stats Grid**: 4-column responsive grid for module dashboards.
- **Client Components**: Data-fetching list pages use a `*Client.tsx` component (e.g., `CompaniesClient.tsx`) to keep the page server-rendered.
- **Currency Formatting**: Always use the global `formatCurrency(amount, code)` helper from `@/lib/utils` for consistent display across the app (replaces hardcoded "INR" or "₹").
- **Currency Selection**: Currency is determined by the entity (Invoice, Bill, etc.), falling back to the Contact's preferred currency, then "INR" as system default.

## Form Placeholder Rules (Enforced — 2026-04-08)
- **NEVER** put hardcoded example values in form field placeholders.
- ❌ Wrong: `placeholder="QT-2024-001"` or `placeholder="John Doe"`
- ✅ Right: `placeholder="Enter quotation number"` or `placeholder="Contact full name"`
- This applies to ALL modules: CRM, Sales, Finance, Auth, Settings.

## Admin Dashboard Patterns (New — 2026-04-08)
- **Server Component**: `admin/dashboard/page.tsx` fetches all 4 data sources in parallel using `Promise.all`.
- **Client Charts**: `DashboardCharts.tsx` is a `"use client"` component using `recharts`.
- **Null Safety**: All admin health metrics MUST use null-coalescing: `health.metrics?.tenants ?? 0`.
- **KPI Trend Source**: Trend percentages are currently static; wire to `getDashboardCharts()` when historical data grows.

## Data Patterns
- **Multi-tenancy**: Use `tenantId` in all queries (RLS enforced via Supabase policies).
- **Server Actions**: All CRUD operations use Next.js Server Actions.
  - Pattern: `getAll()`, `getById(id)`, `create(data)`, `update(id, data)`, `deleteById(id)`
- **Supabase Client**: Use `createClient()` from `src/lib/supabase/server.ts` in server actions.
- **Prisma Client**: Use the singleton from `src/lib/prisma.ts` (uses `@prisma/adapter-pg`).
- **TypeScript Interfaces**: Defined at the top of each actions file.
  - Optional fields use `?` — keep strict only for required DB `NOT NULL` fields.

## API Route Patterns (Critical — 2026-04-08)
- All API routes that touch the database MUST include at the top of the file:
  ```typescript
  export const dynamic = "force-dynamic";
  ```
- Without this, `npm run build` fails with `DATABASE_URL is missing` during static analysis.
- Applied to: `/api/invoices/[id]/pdf/route.ts`.
- Apply to ALL future dynamic DB-touching routes.

## Bulk Data Patterns
- **CSV Processing**: Use `papaparse` for client-side parsing/generation.
- **Batch Operations**: Server actions for `import` should use `supabase.from().insert([])` with arrays for single-trip batching.
- **UI Integration**: `Import` (file input) and `Export` (generate & download) buttons standardized in module list headers.

## Git & Deployment Patterns
- **Branch**: Single `main` branch (MVP stage).
- **Remote**: `https://github.com/surajmagar1993/genesoft-erp.git`
- **Secrets**: Never committed — `.env` and `.env.*` excluded via `.gitignore`.
- **DATABASE_URL**: Must point to Supabase cloud endpoint (port 5432), NOT localhost. Use `.env.local`.
- **Vercel Env**: Use `env_vercel.txt` (Desktop) to import vars into Vercel dashboard.
- **Commit Style**: `feat:`, `fix:`, `chore:` prefixes with descriptive body.

---
