-- Add collected_amount and delivery_status to inv_invoices
ALTER TABLE inv_invoices
  ADD COLUMN IF NOT EXISTS collected_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_status  TEXT DEFAULT 'pending';

-- Widen status check to allow 'partial'
ALTER TABLE inv_invoices DROP CONSTRAINT IF EXISTS inv_invoices_status_check;
ALTER TABLE inv_invoices
  ADD CONSTRAINT inv_invoices_status_check
  CHECK(status IN ('paid','unpaid','partial'));

-- Backfill delivery_status
UPDATE inv_invoices SET delivery_status = 'pending' WHERE delivery_status IS NULL;

-- Add company and contact fields to inv_customers
ALTER TABLE inv_customers
  ADD COLUMN IF NOT EXISTS company_name     TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS company_address  TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS company_phone    TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS contact_name     TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS delivery_address TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS contact_phone    TEXT DEFAULT '';
