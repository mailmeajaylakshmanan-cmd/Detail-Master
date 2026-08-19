-- Backs the staff notification bell. One row per (invoice, vehicle, type) so
-- the reminder scheduler can dedupe instead of re-inserting on every tick.

CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  type VARCHAR(30) NOT NULL CHECK (type IN ('checkout_reminder', 'checkout_overdue')),
  invoice_order_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id),
  message TEXT NOT NULL,
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP,
  CONSTRAINT notifications_invoice_vehicle_type_key UNIQUE (invoice_order_id, vehicle_id, type)
);

CREATE INDEX IF NOT EXISTS idx_notifications_unresolved ON notifications (is_resolved) WHERE is_resolved = false;
