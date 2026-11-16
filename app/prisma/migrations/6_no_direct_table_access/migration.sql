-- Signed-in users must not read or write tables directly through Supabase's REST/GraphQL API
-- with their own login token: that skips the app's role and module checks, plan limits, ledger
-- and audit log (a pentest on 2026-11-16 inserted a contact and was allowed to update invoices and
-- delete payments that way). The app reads and writes only through Prisma (the table owner), so
-- it is unaffected. Two reads stay, both still limited by the row-level security policies:
--   profiles          the request proxy reads the signed-in user's own role
--   support_messages  live support chat (Supabase Realtime)
-- Guarded so it also runs where Supabase's roles don't exist (the migration test database).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
    REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
    REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;
    GRANT SELECT ON public.profiles TO authenticated;
    GRANT SELECT ON public.support_messages TO authenticated;
    -- Tables created later by migrations get no automatic grants either
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated;
  END IF;
END $$;
