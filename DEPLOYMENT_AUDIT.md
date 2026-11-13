# 🛡️ Deployment Compliance Audit Report — Genesoft ERP & CRM

**Audit Date**: 2026-09-10 (refreshed 2026-11-13)  
**Repository Branch**: `main`  
**Framework**: Next.js 16 (App Router) + TypeScript Strict + Tailwind CSS + Prisma 7  
**Database**: Supabase PostgreSQL (Port 5432 Direct Connection)  
**Monorepo Structure**: Root Workspace Delegation (`workspaces: ["app"]`)  

---

## 1. Executive Summary

This compliance audit certifies that the **Genesoft ERP & CRM** project conforms to production hosting standards for Node.js platform deployments (e.g., Vercel, Railway, Render, AWS ECS, or bare-metal VPS).

All critical build blockers, dynamic route database leaks during static analysis, and legacy preview features have been remediated and verified.

---

## 2. Monorepo & Root Configuration Audit

| Verification Item | Requirement | Status | Notes |
|---|---|---|---|
| **Root `package.json`** | Workspace delegation to `app` | ✅ Compliant | Defines `"workspaces": ["app"]` and root scripts `build` and `start` |
| **Root `.gitignore`** | Exclude dependencies, builds, `.env*` | ✅ Compliant | Excludes `node_modules/`, `.next/`, `.env*.local`, diagnostic scripts |
| **Legacy Root Code** | No orphaned `src/` at repo root | ✅ Compliant | Empty legacy `src/` directory eradicated |
| **Prisma Engine Config** | Validated against Prisma 7.4+ | ✅ Compliant | Removed deprecated `driverAdapters` preview feature flag |

---

## 3. Build & Static Analysis Verification

### 3.1 Build Output Analysis
- **Build Command**: `npm run build` (executed via root workspace delegation)
- **Compile Engine**: Turbopack
- **Prisma Client**: v7.4.2 generated to `app/node_modules/@prisma/client`
- **Result**: Exit code `0`, zero TypeScript errors. ESLint is not part of the build. As of 2026-11-13 the app source has 0 lint errors (warnings remain); old files in `app/scripts/` still fail. GitHub Actions CI (`.github/workflows/ci.yml`) runs type check, lint, tests and build on every push to `main`.

### 3.2 Dynamic Route Packaging
All API endpoints and server-rendered pages accessing the database or request cookies enforce `export const dynamic = "force-dynamic"` to guarantee zero compile-time database dependency:
- `/api/invoices/[id]/pdf` — ✅ PDF generator force-dynamic
- `/api/webhooks/razorpay` — ✅ Webhook handler force-dynamic
- `/api/cron/workflows` — ✅ Daily job (`CRON_SECRET`), force-dynamic
- Stripe and PayPal webhooks were removed on 2026-11-13 (Razorpay only).
- `/admin/*` — ✅ Super Admin Command Center and sub-routes dynamic

---

## 4. Production Environment Variables Checklist

Ensure the following environment variables are securely configured in your deployment platform's secret manager:

| Variable Name | Environment | Required | Purpose / Notes |
|---|---|---|---|
| `DATABASE_URL` | Server | **Yes** | Runtime connection. On Vercel this is the Supabase pooler (port 6543, pgbouncer). |
| `DIRECT_URL` | Server | For tooling | Direct connection (port 5432) for Prisma introspection. Never run `db push` / `migrate dev` against the shared DB. |
| `NEXT_PUBLIC_SUPABASE_URL` | Client/Server | **Yes** | Supabase project URL (`https://<project-ref>.supabase.co`). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client/Server | **Yes** | Supabase public anonymous API key for client-side Auth and RLS. |
| `NEXT_PUBLIC_APP_URL` / `NEXT_PUBLIC_SITE_URL` | Client/Server | **Yes** | Public base URL for signup, checkout return and password-reset links. |
| `RESEND_API_KEY` / `RESEND_DOMAIN` | Server | For email | Transactional email; the domain must be verified in Resend. |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Server | For billing | Razorpay order creation and payment signature checks. |
| `RAZORPAY_WEBHOOK_SECRET` | Server | For billing | Verifies `/api/webhooks/razorpay`; the webhook fails closed without it. |
| `ENCRYPTION_KEY` | Server | Recommended | Encrypts tenant-stored credentials at rest. Keep it stable; rotating it makes stored secrets unreadable. |

| `SUPABASE_SERVICE_ROLE_KEY` | Server | For uploads/admin | Storage uploads (logos, website media, CVs), Super Admin create-tenant login and 2FA reset. Server only. |
| `CRON_SECRET` | Server | Recommended | Protects the daily job; without it the job refuses to run. |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | Client/Server | Optional | Spam check on website forms and sign-up. |

The full list is in `app/README.md` → Environment Setup.

---

## 5. Security & Governance Audit

- **Row-Level Security (RLS)**: Enabled on all 100 public tables (checked 2026-10-13). It only protects direct Supabase-client access; the app's Prisma queries bypass RLS, so every server action must scope queries by `tenantId`. `profiles` is read-only from the browser (see `app/harden_profiles_rls.sql`).
- **Super Admin Protection**: `ensureSuperAdmin()` server-side guard blocks unauthorized access to `/admin/*` routes.
- **Audit Logging**: `AdminAuditLog` model tracks platform actions (`TENANT_CREATED`, `TENANT_SUSPENDED`, `SECURITY_POLICY_UPDATE`, `SECURITY_IP_BLOCK`).
- **Secret Isolation**: `.env*` files are gitignored. `app/temp.env` and `app/temp.env.local` were committed earlier with real credentials and are being removed; the credentials in them should be rotated because they remain in git history.
- **Security headers**: `next.config.ts` sets HSTS, `nosniff`, a referrer policy, a permissions policy and `X-Frame-Options: SAMEORIGIN` (except `/forms/*`, which is embeddable), plus a Content-Security-Policy (2026-11-13).
- **Sign-in security (enforced 2026-11-13)**: two-factor (TOTP, `/two-factor`), idle timeout, login lockout and per-user/per-IP rate limits in the request proxy; policy in Admin → Security.
- **Region**: functions run in `bom1` (Mumbai), next to the database.

---

## 6. Deployment Instructions

### Option A: Vercel Deployment
1. Import repository on Vercel.
2. Set **Root Directory** to `app` (or leave default with root workspace delegation).
3. Under **Environment Variables**, provide the variables in section 4.
4. Deploy.

### Option B: Docker / Node.js Server Deployment
```bash
# 1. Clone repository
git clone <repo-url>
cd CRM

# 2. Install dependencies (from app/, using app/package-lock.json)
cd app && npm install && cd ..

# 3. Build application
npm run build

# 4. Start production server on specified port
PORT=3000 npm start
```

---

*Audit conducted on 2026-09-10; refreshed 2026-11-13. Go-live steps: `GO_LIVE_CHECKLIST.md`.*
