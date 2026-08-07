-- 1. Master Offers Table
CREATE TABLE IF NOT EXISTS master_offers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  default_price NUMERIC(12,2) NOT NULL,
  default_validity_days INTEGER NOT NULL DEFAULT 365,
  total_washes INTEGER NOT NULL DEFAULT 0,
  free_washes INTEGER NOT NULL DEFAULT 0,
  terms TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Assigned Offers (Customer Packages)
CREATE TABLE IF NOT EXISTS assigned_offers (
  id SERIAL PRIMARY KEY,
  offer_no VARCHAR(100) NOT NULL UNIQUE,
  
  -- Foreign Keys linking to core tables
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE SET NULL,
  master_offer_id INTEGER REFERENCES master_offers(id) ON DELETE SET NULL,
  
  -- Reference to the purchase invoice
  purchase_invoice_order_id INTEGER REFERENCES invoices(id) ON DELETE SET NULL, 
  
  package_name VARCHAR(255) NOT NULL,
  price NUMERIC(12,2) NOT NULL,
  validity_date DATE,
  
  -- Tracking counters
  total_washes INTEGER NOT NULL DEFAULT 0,
  free_washes INTEGER NOT NULL DEFAULT 0,
  completed_washes INTEGER NOT NULL DEFAULT 0,
  free_washes_used INTEGER NOT NULL DEFAULT 0,
  
  terms TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, expired, completed
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Offer Usages (Tracking individual washes)
CREATE TABLE IF NOT EXISTS assigned_offer_usages (
  id SERIAL PRIMARY KEY,
  assigned_offer_id INTEGER NOT NULL REFERENCES assigned_offers(id) ON DELETE CASCADE,
  
  -- Reference to the wash redemption invoice
  invoice_order_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE, 
  
  usage_type VARCHAR(50) NOT NULL DEFAULT 'regular', -- 'regular', 'free'
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_assigned_offers_client_id ON assigned_offers(client_id);
CREATE INDEX IF NOT EXISTS idx_assigned_offers_purchase_invoice_order_id ON assigned_offers(purchase_invoice_order_id);
CREATE INDEX IF NOT EXISTS idx_assigned_offer_usages_invoice_order_id ON assigned_offer_usages(invoice_order_id);
