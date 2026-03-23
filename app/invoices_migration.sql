-- ========================================================
-- Invoicing Module Migration
-- Run this in the Supabase SQL Editor
-- ========================================================

-- 1. invoices (header)
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_email TEXT DEFAULT '',
    invoice_date DATE NOT NULL,
    valid_until DATE,
    reference TEXT DEFAULT '',
    status TEXT DEFAULT 'DRAFT'
        CHECK (status IN ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED')),
    discount NUMERIC(10, 2) DEFAULT 0,
    discount_type TEXT DEFAULT 'PERCENT'
        CHECK (discount_type IN ('PERCENT', 'FIXED')),
    notes TEXT DEFAULT '',
    terms_and_conditions TEXT DEFAULT '',
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. invoice_line_items (detail rows — cascade delete with parent)
CREATE TABLE IF NOT EXISTS public.invoice_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL DEFAULT '',
    description TEXT DEFAULT '',
    qty NUMERIC(10, 2) DEFAULT 1,
    unit_price NUMERIC(15, 2) DEFAULT 0,
    tax_percent NUMERIC(5, 2) DEFAULT 18,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE
);

-- 3. Enable RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies (tenant-scoped via helper function)
-- Assumes my_tenant_id() function already exists from previous migration.
-- If not, fall back to authenticated-user-wide access.

DO $$
BEGIN
    -- Try to create tenant-scoped policies
    IF EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'my_tenant_id'
    ) THEN
        EXECUTE $policy$
            CREATE POLICY "Tenant: manage invoices"
            ON public.invoices FOR ALL TO authenticated
            USING (tenant_id = my_tenant_id())
            WITH CHECK (tenant_id = my_tenant_id());
        $policy$;

        EXECUTE $policy$
            CREATE POLICY "Tenant: manage invoice_line_items"
            ON public.invoice_line_items FOR ALL TO authenticated
            USING (tenant_id = my_tenant_id())
            WITH CHECK (tenant_id = my_tenant_id());
        $policy$;
    ELSE
        -- Fallback: allow all authenticated users (dev mode)
        EXECUTE $policy$
            CREATE POLICY "Allow authenticated users to manage invoices"
            ON public.invoices FOR ALL TO authenticated
            USING (true) WITH CHECK (true);
        $policy$;

        EXECUTE $policy$
            CREATE POLICY "Allow authenticated users to manage invoice_line_items"
            ON public.invoice_line_items FOR ALL TO authenticated
            USING (true) WITH CHECK (true);
        $policy$;
    END IF;
END;
$$;

-- 5. updated_at auto-trigger on invoices
CREATE TRIGGER on_invoices_updated
    BEFORE UPDATE ON public.invoices
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
