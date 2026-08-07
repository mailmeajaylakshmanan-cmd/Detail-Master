-- 1. Add vehicle_id to invoice_third_party_services to support multi-vehicle organization invoices
ALTER TABLE invoice_third_party_services ADD COLUMN IF NOT EXISTS vehicle_id INTEGER REFERENCES vehicles(id);
