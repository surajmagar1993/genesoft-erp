-- Supabase advisor (2026-11-13): three indexes added by review_indexes_migration.sql
-- duplicate indexes that already existed. Keep the older idx_* ones, drop ours.
-- Run each statement on its own (CONCURRENTLY can't run inside a transaction).
DROP INDEX CONCURRENTLY IF EXISTS public.invoice_line_items_invoice_id_idx;
DROP INDEX CONCURRENTLY IF EXISTS public.invoice_line_items_product_id_idx;
DROP INDEX CONCURRENTLY IF EXISTS public.invoices_contact_id_idx;
