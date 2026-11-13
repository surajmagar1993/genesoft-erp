-- 2026-11-13: document number counters (src/lib/sequence.ts) and the exchange rate fixed on
-- foreign-currency documents (src/lib/ledger.ts lockedRate). Additive only.

-- CreateTable
CREATE TABLE IF NOT EXISTS "document_counters" (
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "last_value" INTEGER NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "document_counters_pkey" PRIMARY KEY ("tenant_id","name","prefix"),
    CONSTRAINT "document_counters_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
-- Same as every table: RLS on, no policies (only the server, through Prisma, reads it)
ALTER TABLE "document_counters" ENABLE ROW LEVEL SECURITY;

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "exchange_rate" DECIMAL(20,10);
ALTER TABLE "credit_notes" ADD COLUMN IF NOT EXISTS "exchange_rate" DECIMAL(20,10);
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "exchange_rate" DECIMAL(20,10);
ALTER TABLE "bills" ADD COLUMN IF NOT EXISTS "exchange_rate" DECIMAL(20,10);
