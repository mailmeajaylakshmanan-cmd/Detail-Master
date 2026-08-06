-- 1. Update vehicles to belong to EITHER a client OR an organization
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id);
ALTER TABLE vehicles ALTER COLUMN client_id DROP NOT NULL;

-- 2. Update invoices to belong to EITHER a client OR an organization
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id);
ALTER TABLE invoices ALTER COLUMN client_id DROP NOT NULL;

-- 3. Handle Monthly Billing (Multiple Vehicles per Invoice)
-- Since an organization's monthly invoice covers many vehicles, the invoice itself shouldn't be locked to one vehicle.
ALTER TABLE invoices ALTER COLUMN vehicle_id DROP NOT NULL;

-- Move vehicle tracking to the line-item level so we know which car got which service
ALTER TABLE invoice_services ADD COLUMN IF NOT EXISTS vehicle_id INTEGER REFERENCES vehicles(id);
