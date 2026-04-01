-- SQL Migration: Add Bills and Update Payments for AP
-- Project: Genesoft ERP
-- Date: 2026-04-01

-- 1. Create bills table
CREATE TABLE IF NOT EXISTS public.bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id),
    contact_id UUID NOT NULL REFERENCES public.contacts(id),
    bill_number TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'DRAFT',
    
    bill_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    due_date TIMESTAMP WITH TIME ZONE,
    
    subtotal NUMERIC(15, 2) DEFAULT 0,
    tax_amount NUMERIC(15, 2) DEFAULT 0,
    discount NUMERIC(15, 2) DEFAULT 0,
    total NUMERIC(15, 2) DEFAULT 0,
    currency_code TEXT DEFAULT 'INR',
    
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE (tenant_id, bill_number)
);

-- 2. Create bill_items table
CREATE TABLE IF NOT EXISTS public.bill_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id),
    description TEXT NOT NULL,
    hsn_sac_code TEXT,
    quantity NUMERIC(15, 2) NOT NULL,
    unit_price NUMERIC(15, 2) NOT NULL,
    tax_percent NUMERIC(5, 2) DEFAULT 0,
    tax_amount NUMERIC(15, 2) DEFAULT 0,
    line_total NUMERIC(15, 2) NOT NULL
);

-- 3. Update payments table
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payments' AND column_name='bill_id') THEN
        ALTER TABLE public.payments ADD COLUMN bill_id UUID REFERENCES public.bills(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payments' AND column_name='type') THEN
        ALTER TABLE public.payments ADD COLUMN type TEXT DEFAULT 'INBOUND';
    END IF;
    
    ALTER TABLE public.payments ALTER COLUMN invoice_id DROP NOT NULL;
END $$;

-- 4. Enable RLS and set policies
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_items ENABLE ROW LEVEL SECURITY;

-- Bills Policies
CREATE POLICY "Tenants can view their own bills" ON public.bills
    FOR SELECT USING (tenant_id = my_tenant_id());

CREATE POLICY "Tenants can insert their own bills" ON public.bills
    FOR INSERT WITH CHECK (tenant_id = my_tenant_id());

CREATE POLICY "Tenants can update their own bills" ON public.bills
    FOR UPDATE USING (tenant_id = my_tenant_id());

CREATE POLICY "Tenants can delete their own bills" ON public.bills
    FOR DELETE USING (tenant_id = my_tenant_id());

-- Bill Items Policies
CREATE POLICY "Tenants can view their own bill items" ON public.bill_items
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM bills WHERE bills.id = bill_items.bill_id AND bills.tenant_id = my_tenant_id())
    );

CREATE POLICY "Tenants can insert their own bill items" ON public.bill_items
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM bills WHERE bills.id = bill_items.bill_id AND bills.tenant_id = my_tenant_id())
    );

CREATE POLICY "Tenants can update their own bill items" ON public.bill_items
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM bills WHERE bills.id = bill_items.bill_id AND bills.tenant_id = my_tenant_id())
    );

CREATE POLICY "Tenants can delete their own bill items" ON public.bill_items
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM bills WHERE bills.id = bill_items.bill_id AND bills.tenant_id = my_tenant_id())
    );

-- 5. Auto-update Trigger for bills
CREATE OR REPLACE TRIGGER update_bills_updated_at
    BEFORE UPDATE ON public.bills
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
