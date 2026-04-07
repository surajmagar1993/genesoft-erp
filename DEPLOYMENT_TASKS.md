# 🚀 Deployment Compliance Checklist

This task list adapts the Genesoft ERP project for standard Node.js hosting platforms.

> [!NOTE]
> **Status**: Partially Addressed — Key build blockers resolved as of 2026-04-08.

## ✅ Resolved This Session

- [x] **Invoice PDF Route Build Fix**: Added `export const dynamic = "force-dynamic"` to `/api/invoices/[id]/pdf/route.ts` — `npm run build` now exits with code 0.
- [x] **`recharts` installed**: `npm install recharts` — all chart components operational.
- [x] **Prisma Client Regenerated**: `npx prisma generate` run after schema changes.

---

## 📋 Remaining Deployment Actions

### 1. Root Configuration
- [ ] **Create `package.json`** at the project root with:
    - `"name": "genesoft-erp"`
    - `"version": "1.0.0"`
    - `"workspaces": ["app"]`
    - `"scripts": { "build": "npm run build --workspace=app", "start": "npm run start --workspace=app" }`

### 2. File Safety & Compliance
- [ ] **Create `.gitignore`** at the project root to exclude:
    - `node_modules/`
    - `.next/`
    - `.env.*` (sensitive files)
- [ ] **Create `DEPLOYMENT_AUDIT.md`** to serve as the final compliance report.

### 3. Environment Variables
- [ ] Confirm all required env vars are set on Vercel:
    - `DATABASE_URL` — Supabase direct connection (port 5432, NOT PgBouncer)
    - `NEXT_PUBLIC_SUPABASE_URL`
    - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
    - `RESEND_API_KEY`

### 4. Verification Steps
- [ ] Run `npm install` at the root.
- [x] Run `npm run build` at the `/app` level — ✅ Passing.
- [ ] Run `npm run build` at the root (workspace delegation).
- [ ] Run `PORT=3001 npm start` and check port binding.

---

## ⚠️ Known Build Gotchas

| Issue | Root Cause | Fix Applied |
|---|---|---|
| `DATABASE_URL is missing` at build time | Next.js static analysis triggers Prisma init | `export const dynamic = "force-dynamic"` on API routes |
| `P1001 Can't reach database` at runtime | `DATABASE_URL` points to `127.0.0.1` instead of Supabase cloud | Use Supabase direct URL in `.env.local` |
| TypeScript error on admin metrics | `health.metrics.tenants` possibly `undefined` | Use `health.metrics?.tenants ?? 0` |

---
*Created on: 2026-04-07 | Updated: 2026-04-08*
