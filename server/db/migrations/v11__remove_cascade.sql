-- 1. Remove cascade from assigned_offer_usages
ALTER TABLE assigned_offer_usages 
  DROP CONSTRAINT IF EXISTS assigned_offer_usages_invoice_order_id_fkey;

ALTER TABLE assigned_offer_usages
  ADD CONSTRAINT assigned_offer_usages_invoice_order_id_fkey 
  FOREIGN KEY (invoice_order_id) REFERENCES invoices(id);

-- 2. Remove cascade from invoice_vehicles
ALTER TABLE invoice_vehicles 
  DROP CONSTRAINT IF EXISTS invoice_vehicles_invoice_order_id_fkey;

ALTER TABLE invoice_vehicles
  ADD CONSTRAINT invoice_vehicles_invoice_order_id_fkey 
  FOREIGN KEY (invoice_order_id) REFERENCES invoices(id);
