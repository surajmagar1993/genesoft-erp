-- Indexes found missing in the 2026-11-13 project review.
-- Only ADDS indexes: no table, column or row is changed. Safe to run on the live database while
-- it is in use (CONCURRENTLY: no table locks). Re-running is harmless (IF NOT EXISTS).
-- Run each statement on its own (CREATE INDEX CONCURRENTLY can't run inside a transaction).
-- Names follow Prisma's convention, matching the @@index lines added to schema.prisma.
-- To undo: DROP INDEX CONCURRENTLY IF EXISTS <name>;

-- Invoice lines: every invoice list, detail page, edit and stock sync looks them up by invoice
-- duplicate of an existing idx_* index; dropped by drop_duplicate_indexes_migration.sql
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS invoice_line_items_invoice_id_idx ON public.invoice_line_items (invoice_id);
-- duplicate of an existing idx_* index; dropped by drop_duplicate_indexes_migration.sql
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS invoice_line_items_product_id_idx ON public.invoice_line_items (product_id);

-- Invoices: P&L / dashboard by date, list order and monthly plan limit by creation, customer statements
CREATE INDEX CONCURRENTLY IF NOT EXISTS invoices_tenant_id_invoice_date_idx ON public.invoices (tenant_id, invoice_date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS invoices_tenant_id_created_at_idx ON public.invoices (tenant_id, created_at);
-- duplicate of an existing idx_* index; dropped by drop_duplicate_indexes_migration.sql
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS invoices_contact_id_idx ON public.invoices (contact_id);

-- Journals: every ledger posting looks up the document's journal; reports filter posted lines by date
CREATE INDEX CONCURRENTLY IF NOT EXISTS journal_entries_tenant_id_source_type_source_id_status_idx ON public.journal_entries (tenant_id, source_type, source_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS journal_entries_tenant_id_status_date_idx ON public.journal_entries (tenant_id, status, date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS journal_entry_lines_tenant_id_account_id_idx ON public.journal_entry_lines (tenant_id, account_id);

-- Customer statement entries looked up by the document they belong to
CREATE INDEX CONCURRENTLY IF NOT EXISTS ledger_entries_tenant_id_reference_id_idx ON public.ledger_entries (tenant_id, reference_id);

-- Payments: reports by type and date, balance due per invoice
CREATE INDEX CONCURRENTLY IF NOT EXISTS payments_tenant_id_type_payment_date_idx ON public.payments (tenant_id, type, payment_date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS payments_tenant_id_invoice_id_idx ON public.payments (tenant_id, invoice_id);

-- Stock movements: invoice stock sync by document number, latest movements list
CREATE INDEX CONCURRENTLY IF NOT EXISTS stock_movements_tenant_id_reference_no_idx ON public.stock_movements (tenant_id, reference_no);
CREATE INDEX CONCURRENTLY IF NOT EXISTS stock_movements_tenant_id_created_at_idx ON public.stock_movements (tenant_id, created_at);

-- Bills and expenses by date (P&L, payables)
CREATE INDEX CONCURRENTLY IF NOT EXISTS bills_tenant_id_bill_date_idx ON public.bills (tenant_id, bill_date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS expenses_tenant_id_expense_date_idx ON public.expenses (tenant_id, expense_date);

-- Notifications per person, newest first (polled every minute)
CREATE INDEX CONCURRENTLY IF NOT EXISTS notifications_tenant_id_user_id_created_at_idx ON public.notifications (tenant_id, user_id, created_at);

-- System logs: 24-hour duplicate check and daily pruning by time
CREATE INDEX CONCURRENTLY IF NOT EXISTS system_logs_timestamp_idx ON public.system_logs (timestamp);
