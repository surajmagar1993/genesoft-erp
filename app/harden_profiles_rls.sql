-- Harden public.profiles (2026-10-13)
--
-- The app reads and writes profiles through Prisma, which bypasses RLS. Browser
-- clients (anon key + user session) only ever need to READ their own row.
-- Without this, a policy like "FOR ALL USING (id = auth.uid())" would let any
-- user change their own role (e.g. to SUPER_ADMIN) or tenant_id from the browser.
--
-- Live state when written: only "Users can view own profile" (SELECT) exists,
-- so this script changes no behaviour today; it removes the ability to regress.
-- Safe to run more than once. Review before applying to the shared database.

BEGIN;

-- Policies that allowed writes from the browser
DROP POLICY IF EXISTS "Profiles: own row" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: tenant-scoped access" ON public.profiles;

-- Read own row only
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT TO authenticated
    USING (id = (SELECT auth.uid()));

-- Even if a write policy is added later, role and tenant_id stay server-only
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.profiles FROM anon, authenticated;

COMMIT;
