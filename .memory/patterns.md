# Project Patterns & Conventions

## UI Patterns
- **Full-page Forms**: Forms are standard pages at `[base]/[module]/new/page.tsx` or `[base]/[module]/[id]/edit/page.tsx`.
- **Layout Wrapper**: `flex flex-col min-w-0 overflow-y-auto overflow-x-hidden p-6 w-full`.
- **Stats Grid**: 4-column responsive grid for module dashboards.
- **Client Components**: Data-fetching list pages use a `*Client.tsx` component (e.g., `CompaniesClient.tsx`) to keep the page server-rendered.

## Data Patterns
- **Multi-tenancy**: Use `tenantId` in all queries (RLS to be enforced later).
- **Server Actions**: All CRUD operations use Next.js Server Actions at `src/app/actions/crm/`.
  - Pattern: `getAll()`, `getById(id)`, `create(data)`, `update(id, data)`, `deleteById(id)`
- **Supabase Client**: Use `createClient()` from `src/lib/supabase/server.ts` in server actions.
- **TypeScript Interfaces**: Defined at the top of each actions file (e.g., `Company`, `Lead`).
  - Optional fields use `?` — keep strict only for required DB `NOT NULL` fields.

## Git & Deployment Patterns
- **Branch**: Single `main` branch (MVP stage).
- **Remote**: `https://github.com/surajmagar1993/genesoft-erp.git`
- **Secrets**: Never committed — `.env` and `.env.*` excluded via `.gitignore`.
- **Vercel Env**: Use `env_vercel.txt` (Desktop) to import vars into Vercel dashboard.
- **Commit Style**: `feat:`, `fix:`, `chore:` prefixes with descriptive body.

---
