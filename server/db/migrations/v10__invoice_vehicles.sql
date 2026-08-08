-- Vehicles are a persistent, reusable asset per organization (selected at
-- invoice time from the org's registered fleet), so visitor identity and
-- check-in/check-out can't live on the vehicle row itself — the same car can
-- be dropped off by a different person on a different visit.
--
-- invoice_vehicles is the per-visit join: one row per (invoice, vehicle) pair,
-- holding who brought that specific vehicle in on that specific invoice and
-- when it checked in/out.

CREATE TABLE IF NOT EXISTS invoice_vehicles (
  id SERIAL PRIMARY KEY,
  invoice_order_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id),
  visitor_name VARCHAR(255),
  visitor_phone VARCHAR(50),
  checkin_time TIMESTAMP,
  checkout_time TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(invoice_order_id, vehicle_id)
);

CREATE INDEX IF NOT EXISTS idx_invoice_vehicles_invoice_id ON invoice_vehicles(invoice_order_id);
CREATE INDEX IF NOT EXISTS idx_invoice_vehicles_vehicle_id ON invoice_vehicles(vehicle_id);
