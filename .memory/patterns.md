# Project Patterns & Conventions

## UI Patterns
- **Full-page Forms**: Forms are standard pages at `[base]/[module]/new/page.tsx` or `[base]/[module]/[id]/edit/page.tsx`.
- **Layout Wrapper**: `flex flex-col min-w-0 overflow-y-auto overflow-x-hidden p-6 w-full`.
- **Stats Grid**: 4-column responsive grid for module dashboards.

## Data Patterns
- **Multi-tenancy**: Use `tenantId` in all queries.
- **Server Actions**: Preferred for CRUD operations.
- **tRPC**: Main API communication layer.

---
