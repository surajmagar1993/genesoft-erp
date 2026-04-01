-- ============================================
-- Sync Database with Prisma Schema
-- Adds missing columns to invoices, creates payments table
-- ============================================

-- 1. Add missing columns to invoices table
-- Note: The live table uses old column structure. We need to add the new columns.

-- Contact reference
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES contacts(id);

-- Invoice type enum
DO $$ BEGIN
    CREATE TYPE "InvoiceType" AS ENUM ('TAX_INVOICE', 'PROFORMA', 'CREDIT_NOTE', 'DEBIT_NOTE');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS type "InvoiceType" DEFAULT 'TAX_INVOICE';

-- Due date
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ;

-- Address fields (JSON)
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS bill_to JSONB;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS ship_to JSONB;

-- Amount fields
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS subtotal DECIMAL(15,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS total DECIMAL(15,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS total_in_words TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS currency_code TEXT DEFAULT 'INR';

-- Tax summary (HSN breakup)
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tax_summary JSONB;

-- Payment & Terms
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_terms TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS bank_details JSONB;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS terms TEXT;

-- Signature
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS signature_url TEXT;

-- Add missing status values
DO $$ BEGIN
    ALTER TYPE "InvoiceStatus" ADD VALUE IF NOT EXISTS 'PAID';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    ALTER TYPE "InvoiceStatus" ADD VALUE IF NOT EXISTS 'PARTIALLY_PAID';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    ALTER TYPE "InvoiceStatus" ADD VALUE IF NOT EXISTS 'OVERDUE';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    ALTER TYPE "InvoiceStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Index on contact_id
CREATE INDEX IF NOT EXISTS idx_invoices_contact ON invoices(contact_id);

-- ============================================
-- 2. Create PaymentMethod enum
-- ============================================
DO $$ BEGIN
    CREATE TYPE "PaymentMethod" AS ENUM (
        'CASH', 'BANK_TRANSFER', 'CREDIT_CARD', 'DEBIT_CARD',
        'UPI', 'CHEQUE', 'STRIPE', 'PAYPAL', 'OTHER'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 3. Create payments table
-- ============================================
CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    invoice_id TEXT NOT NULL,
    contact_id UUID NOT NULL REFERENCES contacts(id),
    
    amount DECIMAL(15,2) NOT NULL,
    payment_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    payment_method "PaymentMethod" NOT NULL DEFAULT 'BANK_TRANSFER',
    reference TEXT,
    notes TEXT,
    currency_code TEXT NOT NULL DEFAULT 'INR',
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payments_tenant ON payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_contact ON payments(contact_id);

-- Auto-update trigger
DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation for payments" ON payments;
CREATE POLICY "Tenant isolation for payments"
    ON payments
    FOR ALL
    USING (tenant_id = my_tenant_id())
    WITH CHECK (tenant_id = my_tenant_id());

-- ============================================
-- 4. Add InvoiceType enum to check
-- ============================================
-- Also ensure sales_orders table exists (from schema)
-- We'll handle that in a separate migration if needed.
