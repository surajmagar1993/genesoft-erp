-- ============================
-- Communication Logs Migration
-- ============================

-- 1. Create the communication_type enum
CREATE TYPE "CommunicationType" AS ENUM ('NOTE', 'CALL', 'EMAIL', 'MEETING', 'SMS', 'OTHER');

-- 2. Create communication_logs table
CREATE TABLE IF NOT EXISTS communication_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    type "CommunicationType" NOT NULL DEFAULT 'NOTE',
    subject TEXT,
    content TEXT NOT NULL,
    logged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    logged_by TEXT,

    -- Polymorphic entity links
    contact_id UUID REFERENCES contacts(id),
    lead_id UUID REFERENCES leads(id),
    deal_id UUID REFERENCES deals(id),

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Indexes
CREATE INDEX idx_communication_logs_tenant ON communication_logs(tenant_id);
CREATE INDEX idx_communication_logs_contact ON communication_logs(contact_id);
CREATE INDEX idx_communication_logs_lead ON communication_logs(lead_id);
CREATE INDEX idx_communication_logs_deal ON communication_logs(deal_id);

-- 4. Auto-update updated_at trigger
CREATE TRIGGER update_communication_logs_updated_at
    BEFORE UPDATE ON communication_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 5. Row-Level Security
ALTER TABLE communication_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for communication_logs"
    ON communication_logs
    FOR ALL
    USING (tenant_id = my_tenant_id())
    WITH CHECK (tenant_id = my_tenant_id());
