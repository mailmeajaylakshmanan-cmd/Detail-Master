-- Create quotations table
CREATE TABLE IF NOT EXISTS quotations (
  id SERIAL PRIMARY KEY,
  quotation_number VARCHAR(50) UNIQUE NOT NULL,
  client_id INT REFERENCES clients(id) ON DELETE SET NULL,
  organization_id INT REFERENCES organizations(id) ON DELETE SET NULL,
  client_name VARCHAR(255),
  client_phone VARCHAR(50),
  client_address TEXT,
  vehicle_id INT REFERENCES vehicles(id) ON DELETE SET NULL,
  vehicle_name VARCHAR(255),
  license_plate VARCHAR(50),
  vehicle_type VARCHAR(100),
  sub_total NUMERIC(12, 2) DEFAULT 0,
  discount NUMERIC(12, 2) DEFAULT 0,
  discount_type VARCHAR(20) DEFAULT 'fixed',
  discount_value NUMERIC(12, 2) DEFAULT 0,
  grand_total NUMERIC(12, 2) DEFAULT 0,
  notes TEXT,
  valid_until DATE,
  status VARCHAR(50) DEFAULT 'draft',
  services JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quotations_client_id ON quotations(client_id);
CREATE INDEX IF NOT EXISTS idx_quotations_created_at ON quotations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quotations_number ON quotations(quotation_number);

-- Add Quotation to menus if it doesn't already exist
DO $$
DECLARE
  v_menu_id INT;
  r RECORD;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM menus WHERE route_path = '/quotations' OR menu_name = 'Quotation') THEN
    INSERT INTO menus (parent_id, menu_name, route_path, icon, sort_order, is_active)
    VALUES (NULL, 'Quotation', '/quotations', 'file-text', 3, TRUE)
    RETURNING id INTO v_menu_id;

    -- Grant permissions to existing roles
    FOR r IN SELECT id FROM roles LOOP
      INSERT INTO role_menus (role_id, menu_id, can_view, can_add, can_edit, can_delete)
      VALUES (r.id, v_menu_id, TRUE, TRUE, TRUE, TRUE)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;
END $$;
