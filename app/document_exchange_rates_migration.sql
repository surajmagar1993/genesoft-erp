-- Exchange rate fixed on each document when it is first posted (src/lib/ledger.ts lockedRate), 2026-11-13.
-- Rebuilding the ledger and the P&L then use the same rate instead of today's.
-- Additive (nullable columns): documents in the business's own currency keep NULL.
-- Run BEFORE deploying the code that uses it. Rollback: drop the four columns.
alter table public.invoices     add column if not exists exchange_rate numeric(20, 10);
alter table public.credit_notes add column if not exists exchange_rate numeric(20, 10);
alter table public.payments     add column if not exists exchange_rate numeric(20, 10);
alter table public.bills        add column if not exists exchange_rate numeric(20, 10);
