-- Create Enum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'CREDIT_CARD', 'DEBIT_CARD', 'UPI', 'CHEQUE', 'STRIPE', 'PAYPAL', 'OTHER');

-- Create payments table
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "tenant_id" UUID NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "contact_id" UUID NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "payment_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payment_method" "PaymentMethod" NOT NULL DEFAULT 'BANK_TRANSFER',
    "reference" TEXT,
    "notes" TEXT,
    "currency_code" TEXT NOT NULL DEFAULT 'INR',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "payments_tenant_id_idx" ON "payments"("tenant_id");
CREATE INDEX "payments_invoice_id_idx" ON "payments"("invoice_id");
CREATE INDEX "payments_contact_id_idx" ON "payments"("contact_id");

-- Foreign Keys
ALTER TABLE "payments" ADD CONSTRAINT "payments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Trigger for updated_at
-- Assuming trigger function handle_updated_at exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_updated_at') THEN
    CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();
  END IF;
END $$;

-- Row Level Security
ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view payments in their tenant" ON "payments"
    FOR SELECT USING ("tenant_id" = my_tenant_id());

CREATE POLICY "Users can insert payments in their tenant" ON "payments"
    FOR INSERT WITH CHECK ("tenant_id" = my_tenant_id());

CREATE POLICY "Users can update payments in their tenant" ON "payments"
    FOR UPDATE USING ("tenant_id" = my_tenant_id());

CREATE POLICY "Users can delete payments in their tenant" ON "payments"
    FOR DELETE USING ("tenant_id" = my_tenant_id());
