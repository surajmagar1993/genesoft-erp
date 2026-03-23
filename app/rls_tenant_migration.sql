-- ============================================================
-- RLS TENANT SCOPING MIGRATION
-- Run this in Supabase SQL editor to replace the dev-only
-- "Allow Everything" policies with proper tenant-scoped ones.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- STEP 1: Helper function – get the tenant_id of the current user
-- Used inside RLS USING/WITH CHECK expressions
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.my_tenant_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;
$$;


-- ─────────────────────────────────────────────────────────────
-- STEP 2: Profiles – own row access
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Profiles: own row" ON public.profiles;
CREATE POLICY "Profiles: own row" ON public.profiles
    FOR ALL TO authenticated
    USING  (id = auth.uid())
    WITH CHECK (id = auth.uid());


-- ─────────────────────────────────────────────────────────────
-- STEP 3: Contacts – tenant-scoped
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow authenticated users to manage contacts" ON public.contacts;
DROP POLICY IF EXISTS "Contacts: tenant-scoped" ON public.contacts;

CREATE POLICY "Contacts: tenant-scoped" ON public.contacts
    FOR ALL TO authenticated
    USING  (tenant_id = public.my_tenant_id())
    WITH CHECK (tenant_id = public.my_tenant_id());


-- ─────────────────────────────────────────────────────────────
-- STEP 4: Leads – tenant-scoped
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow authenticated users to manage leads" ON public.leads;
DROP POLICY IF EXISTS "Leads: tenant-scoped" ON public.leads;

CREATE POLICY "Leads: tenant-scoped" ON public.leads
    FOR ALL TO authenticated
    USING  (tenant_id = public.my_tenant_id())
    WITH CHECK (tenant_id = public.my_tenant_id());


-- ─────────────────────────────────────────────────────────────
-- STEP 5: Deals – tenant-scoped
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow authenticated users to manage deals" ON public.deals;
DROP POLICY IF EXISTS "Deals: tenant-scoped" ON public.deals;

CREATE POLICY "Deals: tenant-scoped" ON public.deals
    FOR ALL TO authenticated
    USING  (tenant_id = public.my_tenant_id())
    WITH CHECK (tenant_id = public.my_tenant_id());


-- ─────────────────────────────────────────────────────────────
-- STEP 6: Companies – tenant-scoped
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow authenticated users to manage companies" ON public.companies;
DROP POLICY IF EXISTS "Companies: tenant-scoped" ON public.companies;

CREATE POLICY "Companies: tenant-scoped" ON public.companies
    FOR ALL TO authenticated
    USING  (tenant_id = public.my_tenant_id())
    WITH CHECK (tenant_id = public.my_tenant_id());


-- ─────────────────────────────────────────────────────────────
-- STEP 7: Tenants table – only members can view their own tenant
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Tenants: member access" ON public.tenants;
CREATE POLICY "Tenants: member access" ON public.tenants
    FOR SELECT TO authenticated
    USING (id = public.my_tenant_id());


-- ─────────────────────────────────────────────────────────────
-- STEP 8: Auto-provision tenant + profile on new user signup
-- Trigger on auth.users INSERT → creates tenant + profile
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_tenant_id UUID;
BEGIN
  -- Create a new tenant for this user
  INSERT INTO public.tenants (name)
  VALUES (COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)) || '''s Workspace')
  RETURNING id INTO new_tenant_id;

  -- Create the user's profile linked to the new tenant
  INSERT INTO public.profiles (id, email, full_name, tenant_id, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    new_tenant_id,
    'TENANT_ADMIN'
  )
  ON CONFLICT (id) DO UPDATE
    SET tenant_id = EXCLUDED.tenant_id,
        email = EXCLUDED.email,
        updated_at = now();

  RETURN NEW;
END;
$$;

-- Attach the trigger to auth.users (Supabase's built-in table)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ─────────────────────────────────────────────────────────────
-- STEP 9: Backfill – for existing users who have no profile/tenant yet
-- (only needed if users exist from before this migration)
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE
  u RECORD;
  new_tenant_id UUID;
BEGIN
  FOR u IN
    SELECT au.id, au.email, au.raw_user_meta_data
    FROM auth.users au
    LEFT JOIN public.profiles p ON p.id = au.id
    WHERE p.id IS NULL OR p.tenant_id IS NULL
  LOOP
    -- Create tenant if needed
    INSERT INTO public.tenants (name)
    VALUES (COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)) || '''s Workspace')
    RETURNING id INTO new_tenant_id;

    -- Upsert profile
    INSERT INTO public.profiles (id, email, full_name, tenant_id, role)
    VALUES (
      u.id,
      u.email,
      COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
      new_tenant_id,
      'TENANT_ADMIN'
    )
    ON CONFLICT (id) DO UPDATE
      SET tenant_id = new_tenant_id,
          updated_at = now();
  END LOOP;
END $$;
