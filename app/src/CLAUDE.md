> **Last Updated:** 2026-04-01 | **Active Block:** Notifications & Cross-Module Triggers Completed

## 📦 Scope
Application source code including components, hooks, actions, and utilities.

## 🏗 Structure
- `actions/`: Server actions for CRUD (Supabase enabled).
  - `notifications.ts`: Global notification system (scoping, read/unread).
  - `sales/quotes.ts`: CRUD for Quotations (Tenant-scoped).
- `components/`: UI components using shadcn/ui.
  - `notifications-dropdown.tsx`: Interactive notification UI.
- `hooks/`: React hooks for shared logic.
- `utils/`: Utility functions (Supabase clients, etc.).
- `lib/gst-engine.ts`: Indian GST engine (shared).
- `lib/get-tenant-id.ts`: Multi-tenant boundary helper.

## 📐 Module Patterns (Standard)

### List Pages (Standardized)
All CRM/Sales listing pages (Leads, Deals, Quotes, Orders, Invoices) follow a two-tier pattern:
1.  **Server Component (`page.tsx`)**: 
    - Extracts `searchParams` (page, search, status).
    - Calls Server Action with these parameters.
    - Passes data to the Client Component.
2.  **Client Component (`*Client.tsx`)**:
    - Manages UI state (e.g., search input).
    - Synchronizes state with the URL via `useRouter`.
    - Implements debounced search (500ms) to prevent excessive DB calls.

### Server Action Signature
Listing actions MUST support the following interface:
```typescript
async function getEntity(
  page: number = 1,
  limit: number = 20,
  filters?: { status?: EntityStatus; search?: string }
): Promise<{ data: Entity[]; total: number }>
```

## 🔥 Next Active Block
P2 Roadmap: Dashboard Waterfall & Finance Report Parallelization.

---

[Previous context archived]
