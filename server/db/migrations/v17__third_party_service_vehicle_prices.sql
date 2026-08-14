-- Migration: Create third_party_service_vehicle_prices table

CREATE TABLE IF NOT EXISTS third_party_service_vehicle_prices (
  id SERIAL PRIMARY KEY,
  third_party_service_id INTEGER NOT NULL REFERENCES third_party_services(id) ON DELETE CASCADE,
  vehicle_type_id INTEGER NOT NULL REFERENCES vehicle_types(id) ON DELETE CASCADE,
  selling_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT third_party_service_vp_key UNIQUE (third_party_service_id, vehicle_type_id)
);
