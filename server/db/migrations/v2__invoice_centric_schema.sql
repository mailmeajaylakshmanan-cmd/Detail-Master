-- Replaces the old job_order-based invoices/payments with the
-- invoice-centric schema actually running on main as of commit 80836ea
-- ("Online Web-booking Backend Integration"), and creates the real
-- web_bookings table matching server/routes/web_bookings.js.
--
-- job_orders / job_order_services are left untouched — their routes are
-- still mounted on main, even though invoices.js no longer references them.

DROP TABLE IF EXISTS website_bookings;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS invoices;

CREATE TABLE invoices (
  id SERIAL PRIMARY KEY,
  invoice_number VARCHAR(100) NOT NULL UNIQUE,
  client_id INTEGER NOT NULL REFERENCES clients(id),
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id),
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  sub_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount NUMERIC(12,2) NOT NULL DEFAULT 0,
  grand_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
  balance_due NUMERIC(12,2) NOT NULL DEFAULT 0,
  special_notes TEXT,
  include_terms BOOLEAN NOT NULL DEFAULT FALSE,
  terms_conditions TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE invoice_services (
  id SERIAL PRIMARY KEY,
  invoice_order_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  service_id INTEGER NOT NULL REFERENCES services(id),
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0
);

CREATE TABLE payments (
  id SERIAL PRIMARY KEY,
  invoice_order_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  payment_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reference_no VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_invoices_client_id ON invoices(client_id);
CREATE INDEX idx_invoices_vehicle_id ON invoices(vehicle_id);
CREATE INDEX idx_invoice_services_invoice_order_id ON invoice_services(invoice_order_id);
CREATE INDEX idx_payments_invoice_order_id ON payments(invoice_order_id);

-- web_bookings: point its conversion FK at invoices instead of job_orders
ALTER TABLE web_bookings DROP CONSTRAINT IF EXISTS web_bookings_job_order_id_fkey;
ALTER TABLE web_bookings RENAME COLUMN job_order_id TO invoice_order_id;
ALTER TABLE web_bookings ADD CONSTRAINT web_bookings_invoice_order_id_fkey
  FOREIGN KEY (invoice_order_id) REFERENCES invoices(id) ON DELETE SET NULL;
