-- 2026-11-13: tables left from removed features, unused by the code.
-- pos_sessions: the POS terminal was removed on 2026-11-12 (its sales are ordinary invoices).
-- processed_stripe_events: Stripe was removed on 2026-11-13 (Razorpay only).
ALTER TABLE IF EXISTS "pos_sessions" DROP CONSTRAINT IF EXISTS "pos_sessions_tenant_id_fkey";
DROP TABLE IF EXISTS "pos_sessions";
DROP TABLE IF EXISTS "processed_stripe_events";
