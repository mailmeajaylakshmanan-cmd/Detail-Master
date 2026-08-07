-- Third-party services: vendor-provided work (e.g. outsourced painting) with
-- its own labour-based cost structure, kept separate from the internal
-- `services`/`invoice_services` tables since the cost shape is different
-- (labour count x labour charge + vendor cost, vs. a flat unit price).

CREATE TABLE third_party_services (
  id SERIAL PRIMARY KEY,
  service_name VARCHAR(255) NOT NULL,
  vendor_name VARCHAR(255),
  labour_count INTEGER NOT NULL DEFAULT 1,
  labour_charge NUMERIC(12,2) NOT NULL DEFAULT 0,
  service_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  selling_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Line items on an invoice, snapshotted at invoice time so a later catalog
-- price change doesn't retroactively alter historical invoices — same
-- pattern as invoice_services.unit_price being snapshotted from base_price.
CREATE TABLE invoice_third_party_services (
  id SERIAL PRIMARY KEY,
  invoice_order_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  third_party_service_id INTEGER REFERENCES third_party_services(id) ON DELETE SET NULL,
  service_name VARCHAR(255) NOT NULL,
  vendor_name VARCHAR(255),
  labour_count INTEGER NOT NULL DEFAULT 1,
  labour_charge NUMERIC(12,2) NOT NULL DEFAULT 0,
  service_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  selling_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_invoice_third_party_services_invoice_order_id ON invoice_third_party_services(invoice_order_id);
CREATE INDEX idx_third_party_services_is_active ON third_party_services(is_active);
