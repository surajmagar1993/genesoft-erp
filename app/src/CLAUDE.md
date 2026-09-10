> **Last Updated:** 2026-09-10 | **Active Block:** P2 Core Operations — Inventory Live ✅ | Next: Purchase & Vendors 🔜

## 📦 Scope
Application source code including components, hooks, actions, and utilities.

## 🏗 Structure
- `actions/`: Server actions for CRUD (Supabase/Prisma enabled).
  - `inventory.ts`: Multi-warehouse stock tracking, adjustments, transfers, and reorder alerts.
  - `saas/admin.ts`: Platform-level server actions — `getPlatformStats`, `getDashboardCharts`, `getDatabaseHealth`, `getRecentSystemLogs`, `getSecurityOverview`, `updateSecurityPolicy`, `addBlockedIp`, `removeBlockedIp`, `getTenantById`, `createTenant`, `updateTenantDetails`.
  - `notifications.ts`: Global notification system (scoping, read/unread).
  - `sales/quotes.ts`: CRUD for Quotations (Tenant-scoped).
  - `sales/products.ts`: CRUD for Products & Services catalog.
  - `sales/invoices.ts`: CRUD for Tax Invoices with GST split and PDF export.
- `components/`: UI components using shadcn/ui.
  - `notifications-dropdown.tsx`: Interactive notification UI.
  - `admin/dashboard/DashboardCharts.tsx`: Recharts visualizations (Tenant Growth, Global Presence).
  - `admin/tenant-actions-dropdown.tsx`: Tenant management quick actions.
- `hooks/`: React hooks for shared logic.
- `lib/`: Utility functions, Prisma singletons, PDF engine.
  - `gst-engine.ts`: Indian GST engine (shared).
  - `get-tenant-id.ts`: Multi-tenant boundary helper.
  - `utils.ts`: `formatCurrency(amount, code)` global formatter.
  - `prisma.ts`: Prisma client singleton with `@prisma/adapter-pg`.

## 📐 Module Patterns (Standard)

### List Pages (Standardized)
All CRM/Sales/Inventory listing pages follow a two-tier pattern:
1. **Server Component (`page.tsx`)**: Extracts `searchParams` and calls Server Action with parameters (`export const dynamic = "force-dynamic"`).
2. **Client Component (`*Client.tsx`)**: Manages UI state, client filters, search debounce, and dialog triggers.

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
P2 Core Operations: Purchase & Vendor Management (`/purchase`) — Supplier directory, Purchase Orders (PO) workflow, vendor bill linking, and receipt tracking.
