-- Enforce financial data integrity constraints on invoices and payments
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_invoices_balance_due_non_negative'
  ) THEN
    ALTER TABLE invoices ADD CONSTRAINT chk_invoices_balance_due_non_negative CHECK (balance_due >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_invoices_grand_total_non_negative'
  ) THEN
    ALTER TABLE invoices ADD CONSTRAINT chk_invoices_grand_total_non_negative CHECK (grand_total >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_invoices_discount_non_negative'
  ) THEN
    ALTER TABLE invoices ADD CONSTRAINT chk_invoices_discount_non_negative CHECK (discount >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_payments_amount_positive'
  ) THEN
    ALTER TABLE payments ADD CONSTRAINT chk_payments_amount_positive CHECK (amount > 0);
  END IF;
END $$;
