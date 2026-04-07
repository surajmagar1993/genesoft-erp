> **Last Updated:** 2026-04-08 | **Active Block:** SaaS Super Admin Command Center — Done ✅

## 📦 Scope
Application source code including components, hooks, actions, and utilities.

## 🏗 Structure
- `actions/`: Server actions for CRUD (Supabase/Prisma enabled).
  - `notifications.ts`: Global notification system (scoping, read/unread).
  - `sales/quotes.ts`: CRUD for Quotations (Tenant-scoped).
  - `saas/admin.ts`: Platform-level server actions — `getPlatformStats`, `getDashboardCharts`, `getDatabaseHealth`, `getRecentSystemLogs`.
- `components/`: UI components using shadcn/ui.
  - `notifications-dropdown.tsx`: Interactive notification UI.
  - `admin/dashboard/DashboardCharts.tsx`: Recharts visualizations (Tenant Growth, Global Presence).
- `hooks/`: React hooks for shared logic.
- `lib/`: Utility functions, Prisma singletons, PDF engine.
  - `gst-engine.ts`: Indian GST engine (shared).
  - `get-tenant-id.ts`: Multi-tenant boundary helper.
  - `utils.ts`: `formatCurrency(amount, code)` global formatter.
  - `prisma.ts`: Prisma client singleton with `@prisma/adapter-pg`.

## 📐 Module Patterns (Standard)

### List Pages (Standardized)
All CRM/Sales listing pages (Leads, Deals, Quotes, Orders, Invoices) follow a two-tier pattern:
1. **Server Component (`page.tsx`)**: Extracts `searchParams` and calls Server Action with parameters.
2. **Client Component (`*Client.tsx`)**: Manages UI state; syncs with URL via `useRouter`; implements 500ms debounced search.

### Server Action Signature
Listing actions MUST support the following interface:
```typescript
async function getEntity(
  page: number = 1,
  limit: number = 20,
  filters?: { status?: EntityStatus; search?: string }
): Promise<{ data: Entity[]; total: number }>
```

### Form Placeholder Rule
> ⚠️ **NEVER** hardcode example values like `"QT-2024-001"` or `"John Doe"` in form placeholders.
> Always use instructional text: `"Enter quotation number"`, `"Contact full name"`.

### Dynamic API Routes
All API routes that access the database MUST include:
```typescript
export const dynamic = "force-dynamic";
```
This prevents build-time `DATABASE_URL` errors during `npm run build`.

## 🔥 Next Active Block
Tenant Management CRUD page at `/admin/tenants`.

---

[Previous context archived]
