-- ========================================================
-- GST Engine Migration (India)
-- Run this in the Supabase SQL Editor
-- Non-destructive: only ADDs columns, never drops existing ones
-- ========================================================

-- 1. Add GST fields to invoices header
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS supplier_gstin    TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS customer_gstin    TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS supplier_state    TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS place_of_supply   TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS supply_type       TEXT DEFAULT 'intra'
    CHECK (supply_type IN ('intra', 'inter'));

-- 2. Add GST fields to invoice_line_items
ALTER TABLE public.invoice_line_items
  ADD COLUMN IF NOT EXISTS hsn_sac       TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS cgst_percent  NUMERIC(5, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sgst_percent  NUMERIC(5, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS igst_percent  NUMERIC(5, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cgst_amount   NUMERIC(15, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sgst_amount   NUMERIC(15, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS igst_amount   NUMERIC(15, 2) DEFAULT 0;

-- Done. No RLS changes needed — existing policies already cover these columns.
