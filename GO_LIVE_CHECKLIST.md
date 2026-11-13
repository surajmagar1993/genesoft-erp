# Go-live & migration checklist

Owner: **Genesoft Infotech** · Domain: **genesoftinfotech.com**
Testing today runs on Vercel (`genesoftdev.vercel.app`) + Supabase + Resend. When moving to the final
domain or a single hosting platform, update every place below. Nothing in the code hardcodes the testing
domain: links come from `NEXT_PUBLIC_SITE_URL` (`src/lib/app-url.ts`).

## 1. Domain switch to genesoftinfotech.com
- [ ] DNS: point the app host (e.g. `app.genesoftinfotech.com`) at the hosting platform.
- [ ] `NEXT_PUBLIC_SITE_URL` = the new https URL (all environments).
- [ ] Supabase → Auth: `site_url` and redirect URLs (templates in `app/email-templates/supabase/`, see `_README.md`; push with `supabase config push`).
- [ ] Razorpay webhook URL → `<site>/api/webhooks/razorpay` (event `order.paid`).
- [ ] WhatsApp (Meta) webhook URL → `<site>/api/webhooks/whatsapp` (only if WhatsApp is switched back on).
- [ ] Cloudflare Turnstile: widget created, site key set on Vercel (2026-11-13). Still to do: `TURNSTILE_SECRET_KEY` on Vercel (Sensitive, Production + Preview); the widget's hostnames must include the final domain(s) (and `TURNSTILE_HOSTNAMES` if the domain differs from the defaults).
- [ ] Indexing: only genesoftinfotech.com is indexed (`src/lib/indexing.ts`); check robots/sitemap on the final domain.
- [ ] Resend: sender domain is already `genesoftinfotech.com` (`RESEND_DOMAIN`). Keep it verified.

## 2. Leaving Vercel (single platform)
- [ ] Functions run in `bom1` (Mumbai, next to the database); pick a nearby region elsewhere.
- [ ] Rate limits are kept in memory per instance (`src/lib/rate-limit.ts`); fine on one server, per-instance on many.
- [ ] Daily job: `app/vercel.json` cron is Vercel-only. Elsewhere, call `GET <site>/api/cron/workflows`
      once a day with header `Authorization: Bearer $CRON_SECRET`.
- [ ] Copy every env var (see `app/README.md`). Keep `ENCRYPTION_KEY` **identical** or stored secrets become unreadable.
- [ ] Database: Supabase Postgres + Auth stay unless you also migrate them (then: auth users, RLS policies,
      `app/*.sql` hardening scripts, storage).

## 3. Before real customers
- [ ] Rotate the credentials that were committed in old git history (`temp.env*`): Supabase DB password,
      Resend key, Razorpay keys/webhook secret.
- [ ] Switch Razorpay from test to live keys (Razorpay is the only gateway; turn on international cards in the Razorpay account).
- [ ] `PLATFORM_GSTIN` set so subscription receipts show Genesoft's GSTIN.
- [ ] Domain renewal for genesoftinfotech.com (auto-renew was off; expiry 2026-12-05).
- [ ] Supabase backups / a separate production database (free plan: no backups, PITR off).
- [ ] Legal review of the website legal pages; fill the `[OWNER: …]` notes in IT Rental Terms. Terms/Privacy/DPA still mention WhatsApp and customers' own email servers (switched off).
- [ ] Welcome email: one live test from hello@genesoftinfotech.com.
- [ ] Admin → Security: decide whether to enforce 2FA for admins (`enforce2FA`); the 30-minute idle timeout is already on for everyone.
- [ ] Decide on the thin modules (Manufacturing, Batch & serial, Performance & training, Recruitment, RFQ, Budgets, Report builder): beta label, switch off, or keep.
- [ ] Existing test workspaces: Finance → General Ledger → "Rebuild ledger" once.
- [ ] Optional: drop the unused `pos_sessions` table.

## 4. Countries & tax (what's live)
- Signup countries: India, UAE, Saudi Arabia, UK, US, Australia, plus **Other** (business sets its tax name/rates in Settings).
- Documents use basic tax only: India GST (CGST+SGST / IGST), VAT/GST/sales tax elsewhere, ZATCA phase 1 QR in Saudi Arabia.
- **Tax Summary** (Finance) gives the period figures to file manually.
- Government-filing modules (GST returns, TDS, e-way bills, VAT 201, ZATCA phase 2, MTD, BAS, 1099) are hidden.
  Turn on with `NEXT_PUBLIC_ENABLE_COMPLIANCE_MODULES=true` only once they're connected to the official APIs.

## 5. Mobile app (planned)
Server actions can't be called from a mobile app. Plan:
1. Add a versioned REST API (`app/src/app/api/v1/...`) with route handlers that authenticate the Supabase
   JWT (`Authorization: Bearer`), then call the same server logic in `src/lib` (tenant-tax, plan-change,
   workflow-engine, …) so web and mobile share rules.
2. Build the app with React Native / Expo + `@supabase/supabase-js` for sign-in.
3. Start with read + simple create flows (contacts, invoices, attendance), then expand.
Keep new business logic in `src/lib` (not inside page components or actions) so it stays reusable.
