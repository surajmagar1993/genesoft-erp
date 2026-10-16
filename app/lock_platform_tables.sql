-- Lock six platform tables to the server only (16 Oct 2026, from the bug scan).
-- Each had a policy "ALL ... to authenticated using (true)", so any signed-in
-- user (staff of any client business) could read and change them through the
-- public Supabase API: the Super Admin audit log, platform settings
-- (maintenance mode, sign-ups, banner), pricing, companies, processed Stripe
-- events and the exchange-rate cache.
-- The app reads and writes these tables only on the server through Prisma,
-- which isn't limited by these policies, so removing them changes nothing for
-- the app. Row-level security stays ON with no policies = no browser access.
-- Safe to run more than once.

begin;

drop policy if exists "admin_audit_logs_policy" on public.admin_audit_logs;
drop policy if exists "global_settings_policy" on public.global_settings;
drop policy if exists "pricing_plans_policy" on public.pricing_plans;
drop policy if exists "Allow authenticated users to manage companies" on public.companies;
drop policy if exists "processed_stripe_events_policy" on public.processed_stripe_events;
drop policy if exists "exchange_rate_cache_policy" on public.exchange_rate_cache;

alter table public.admin_audit_logs enable row level security;
alter table public.global_settings enable row level security;
alter table public.pricing_plans enable row level security;
alter table public.companies enable row level security;
alter table public.processed_stripe_events enable row level security;
alter table public.exchange_rate_cache enable row level security;

commit;
