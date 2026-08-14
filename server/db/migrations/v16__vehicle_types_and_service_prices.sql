-- Migration: Create vehicle_types, service_vehicle_prices, add vehicle_type_id FKs, and seed menus

CREATE TABLE IF NOT EXISTS vehicle_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Case-insensitive unique index for vehicle type names
CREATE UNIQUE INDEX IF NOT EXISTS vehicle_types_name_ci_idx ON vehicle_types (LOWER(name));

-- Drop restrictive legacy CHECK constraints allowing dynamic vehicle types
ALTER TABLE vehicles DROP CONSTRAINT IF EXISTS vehicles_vehicle_type_check;
ALTER TABLE web_bookings DROP CONSTRAINT IF EXISTS web_bookings_vehicle_type_check;

-- Seed default vehicle types
INSERT INTO vehicle_types (name) VALUES
  ('Hatchback'),
  ('Sedan'),
  ('SUV'),
  ('Luxury'),
  ('Bike')
ON CONFLICT DO NOTHING;

-- Add vehicle_type_id to vehicles & web_bookings
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS vehicle_type_id INTEGER REFERENCES vehicle_types(id);
ALTER TABLE web_bookings ADD COLUMN IF NOT EXISTS vehicle_type_id INTEGER REFERENCES vehicle_types(id);

-- Backfill vehicle_type_id from text values
UPDATE vehicles v
SET vehicle_type_id = vt.id
FROM vehicle_types vt
WHERE v.vehicle_type_id IS NULL
  AND LOWER(TRIM(v.vehicle_type)) = LOWER(vt.name);

UPDATE web_bookings wb
SET vehicle_type_id = vt.id
FROM vehicle_types vt
WHERE wb.vehicle_type_id IS NULL
  AND LOWER(TRIM(wb.vehicle_type)) = LOWER(vt.name);

-- Create service_vehicle_prices table
CREATE TABLE IF NOT EXISTS service_vehicle_prices (
  id SERIAL PRIMARY KEY,
  service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  vehicle_type_id INTEGER NOT NULL REFERENCES vehicle_types(id) ON DELETE CASCADE,
  price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT service_vehicle_prices_service_vehicle_type_key UNIQUE (service_id, vehicle_type_id)
);

-- Add Menu entry under Masters and seed role-gated permissions in role_menus
DO $$
DECLARE
  masters_id INT;
  vtype_menu_id INT;
BEGIN
  SELECT id INTO masters_id FROM menus WHERE menu_name = 'Masters' LIMIT 1;
  IF masters_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM menus WHERE route_path = '/master-vehicle-type') THEN
      INSERT INTO menus (parent_id, menu_name, route_path, icon, sort_order, is_active)
      VALUES (masters_id, 'Vehicle Types', '/master-vehicle-type', 'car', 5, true)
      RETURNING id INTO vtype_menu_id;

      -- Grant Full CRUD to Super Admin & Administrator, View-Only to other roles
      INSERT INTO role_menus (role_id, menu_id, can_view, can_add, can_edit, can_delete)
      SELECT id, vtype_menu_id, true, 
             (role_name = 'Super Admin' OR role_name = 'Administrator'),
             (role_name = 'Super Admin' OR role_name = 'Administrator'),
             (role_name = 'Super Admin' OR role_name = 'Administrator')
      FROM roles;
    END IF;
  END IF;
END $$;
