-- ============================================================
-- P1 SECURITY AUDIT MIGRATION: ADVANCED RLS
-- Run this in Supabase SQL editor to ensure 100% isolation
-- for newer P1 modules (Finance, Tax, Support, Notifications).
-- ============================================================

-- 1. Enable RLS on Missing Tables
ALTER TABLE IF EXISTS public.tax_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tax_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.system_logs ENABLE ROW LEVEL SECURITY;

-- 2. Helper: Check if user is Admin of their tenant
CREATE OR REPLACE FUNCTION public.is_tenant_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('ADMIN', 'TENANT_ADMIN')
  );
$$;

-- 3. Profiles: Enhanced RLS (Tenant Admins can see/manage their team)
DROP POLICY IF EXISTS "Profiles: own row" ON public.profiles;
CREATE POLICY "Profiles: tenant-scoped access" ON public.profiles
    FOR ALL TO authenticated
    USING (
      id = auth.uid() OR 
      (tenant_id = public.my_tenant_id() AND public.is_tenant_admin())
    );

-- 4. Tax Groups & Rates
DROP POLICY IF EXISTS "TaxGroups: tenant-scoped" ON public.tax_groups;
CREATE POLICY "TaxGroups: tenant-scoped" ON public.tax_groups
    FOR ALL TO authenticated
    USING (tenant_id = public.my_tenant_id())
    WITH CHECK (tenant_id = public.my_tenant_id());

DROP POLICY IF EXISTS "TaxRates: tenant-scoped" ON public.tax_rates;
CREATE POLICY "TaxRates: tenant-scoped" ON public.tax_rates
    FOR ALL TO authenticated
    USING (
      EXISTS (SELECT 1 FROM public.tax_groups WHERE id = public.tax_rates.tax_group_id AND tenant_id = public.my_tenant_id())
    );

-- 5. Finance: Accounts & Ledger
DROP POLICY IF EXISTS "Accounts: tenant-scoped" ON public.accounts;
CREATE POLICY "Accounts: tenant-scoped" ON public.accounts
    FOR ALL TO authenticated
    USING (tenant_id = public.my_tenant_id())
    WITH CHECK (tenant_id = public.my_tenant_id());

DROP POLICY IF EXISTS "Ledger: tenant-scoped" ON public.ledger_entries;
CREATE POLICY "Ledger: tenant-scoped" ON public.ledger_entries
    FOR ALL TO authenticated
    USING (tenant_id = public.my_tenant_id())
    WITH CHECK (tenant_id = public.my_tenant_id());

-- 6. Notifications: User + Tenant scoped
DROP POLICY IF EXISTS "Notifications: user-tenant scoped" ON public.notifications;
CREATE POLICY "Notifications: user-tenant scoped" ON public.notifications
    FOR ALL TO authenticated
    USING (tenant_id = public.my_tenant_id() AND user_id = auth.uid())
    WITH CHECK (tenant_id = public.my_tenant_id() AND user_id = auth.uid());

-- 7. Support Tickets & Messages
DROP POLICY IF EXISTS "Tickets: tenant-scoped" ON public.support_tickets;
CREATE POLICY "Tickets: tenant-scoped" ON public.support_tickets
    FOR ALL TO authenticated
    USING (tenant_id = public.my_tenant_id())
    WITH CHECK (tenant_id = public.my_tenant_id());

DROP POLICY IF EXISTS "SupportMessages: ticket-scoped" ON public.support_messages;
CREATE POLICY "SupportMessages: ticket-scoped" ON public.support_messages
    FOR ALL TO authenticated
    USING (
      EXISTS (SELECT 1 FROM public.support_tickets WHERE id = public.support_messages.ticket_id AND tenant_id = public.my_tenant_id())
    );

-- 8. System Logs (Admin only)
DROP POLICY IF EXISTS "SystemLogs: admin-tenant scoped" ON public.system_logs;
CREATE POLICY "SystemLogs: admin-tenant scoped" ON public.system_logs
    FOR SELECT TO authenticated
    USING (tenant_id = public.my_tenant_id() AND public.is_tenant_admin());

-- 9. Correcting Dangerous CRM Policies (Cleanup of Dev true policies)
DROP POLICY IF EXISTS "Allow authenticated users to manage contacts" ON public.contacts;
DROP POLICY IF EXISTS "Allow authenticated users to manage leads" ON public.leads;
DROP POLICY IF EXISTS "Allow authenticated users to manage deals" ON public.deals;
DROP POLICY IF EXISTS "Allow authenticated users to manage companies" ON public.companies;

-- Ensuring they are covered by standard tenant policies (re-asserting just in case)
CREATE POLICY "Contacts: tenant-scoped" ON public.contacts
    FOR ALL TO authenticated
    USING (tenant_id = public.my_tenant_id())
    WITH CHECK (tenant_id = public.my_tenant_id());

CREATE POLICY "Leads: tenant-scoped" ON public.leads
    FOR ALL TO authenticated
    USING (tenant_id = public.my_tenant_id())
    WITH CHECK (tenant_id = public.my_tenant_id());

CREATE POLICY "Deals: tenant-scoped" ON public.deals
    FOR ALL TO authenticated
    USING (tenant_id = public.my_tenant_id())
    WITH CHECK (tenant_id = public.my_tenant_id());

CREATE POLICY "Companies: tenant-scoped" ON public.companies
    FOR ALL TO authenticated
    USING (tenant_id = public.my_tenant_id())
    WITH CHECK (tenant_id = public.my_tenant_id());

-- Done. All P1 tables are now protected by strong RLS.
