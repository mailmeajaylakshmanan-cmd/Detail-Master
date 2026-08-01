-- Run once in Neon SQL editor if these indexes do not already exist.

CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices (status);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices (client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_vehicle_id ON invoices (vehicle_id);
CREATE INDEX IF NOT EXISTS idx_invoice_services_invoice_order_id ON invoice_services (invoice_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_order_id ON payments (invoice_order_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_client_id ON vehicles (client_id);
CREATE INDEX IF NOT EXISTS idx_login_sessions_token ON login_sessions (token) WHERE logout_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_clients_created_at ON clients (created_at DESC);
