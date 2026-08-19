-- Tracks whether each service line item on an invoice was actually finished
-- by its vehicle's checkout time (or why not), independent of invoices.status
-- which reflects payment state, not job-completion state.

ALTER TABLE invoice_services
  ADD COLUMN IF NOT EXISTS completion_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS delay_reason TEXT,
  ADD COLUMN IF NOT EXISTS completed_by INTEGER REFERENCES admin_users(id),
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;

ALTER TABLE invoice_services
  DROP CONSTRAINT IF EXISTS invoice_services_completion_status_check;
ALTER TABLE invoice_services
  ADD CONSTRAINT invoice_services_completion_status_check
  CHECK (completion_status IN ('pending', 'completed', 'delayed'));

ALTER TABLE invoice_third_party_services
  ADD COLUMN IF NOT EXISTS completion_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS delay_reason TEXT,
  ADD COLUMN IF NOT EXISTS completed_by INTEGER REFERENCES admin_users(id),
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;

ALTER TABLE invoice_third_party_services
  DROP CONSTRAINT IF EXISTS invoice_third_party_services_completion_status_check;
ALTER TABLE invoice_third_party_services
  ADD CONSTRAINT invoice_third_party_services_completion_status_check
  CHECK (completion_status IN ('pending', 'completed', 'delayed'));

-- Set once every service line item on the invoice is 'completed' (not just
-- resolved — 'delayed' does not count), so the ready-for-pickup email fires
-- exactly once and this stays independent of invoices.status (payment state).
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS service_completed_at TIMESTAMP;
