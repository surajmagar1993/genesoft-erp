# Architectural Decisions Log

## [2026-03-20] Supabase Integration
- **Context**: Transitioning from static/mock data to real Supabase auth and storage.
- **Decision**: Use `@supabase/ssr` for Next.js App Router integration.
- **Rationale**: Preferred way to handle cookies and server-side sessions in Next.js 15.
- **Status**: ✅ Complete — client/server utilities live at `src/lib/supabase/`.

---

## [2026-03-21] Server Actions for CRM CRUD
- **Context**: Needed CRUD operations for Contacts, Leads, Deals, Companies.
- **Decision**: Use Next.js Server Actions (`src/app/actions/crm/*.ts`) instead of API routes.
- **Rationale**: Reduces boilerplate, colocates data logic, works natively with App Router.
- **Status**: ✅ Complete — all 4 modules have full create/read/update/delete actions.

---

## [2026-03-23] Git Branching Strategy
- **Context**: First major feature push after CRM CRUD completion.
- **Decision**: Push directly to `main` branch on GitHub (`surajmagar1993/genesoft-erp`).
- **Rationale**: Single-developer project at MVP stage; branching strategy to be added pre-team.
- **Status**: ✅ Pushed — commit `bc3ce3c` (36 files, 1902 insertions).

---

## [2026-03-23] Environment Variable Management
- **Context**: Preparing for Vercel deployment.
- **Decision**: Keep secrets in `.env.local` (gitignored). Export to `env_vercel.txt` on Desktop only.
- **Rationale**: `.env` files are in `.gitignore`. No secrets committed to GitHub.
- **Variables**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- **Status**: ✅ Done — `env_vercel.txt` saved on Desktop for manual Vercel import.


---

## [2026-04-01] Import / Export Data (Bulk Data Management)
- **Context**: Users need to migrate existing data in/out of the ERP without manual entry.
- **Decision**: Use `papaparse` for client-side CSV processing and Supabase `insert()` batching.
- **Rationale**: Keeps CSV logic in the browser to avoid server timeouts/huge payloads; handles large inserts in one DB trip.
- **Status**: ✅ Complete — integrated into Contacts and Products clients.

---

## [2026-04-07] Multi-Currency Support (Cross-Currency Ledger)
- **Context**: Businesses need to invoice in USD/AED/SAR while maintaining a primary INR balance for contacts.
- **Decision**: Implement a central `formatCurrency` utility and an exchange-rate-aware `recordTransaction` ledger logic.
- **Rationale**: Decouples presentation from data. Ledger conversion ensures that mixed-currency transactions result in accurate base-currency balances without manual math.
- **Status**: ✅ Complete — implemented in `ledger.ts`, `exchange-rates.ts`, and all sales/finance modules.
