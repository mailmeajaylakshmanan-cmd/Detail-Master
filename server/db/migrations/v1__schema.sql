-- Detailing Masters Billing — reconstructed schema
-- Reverse-engineered from server/routes/*.js and server/middleware/auth.js
-- (no migration files existed in the repo; the live Neon DB was created by hand)

-- ── Auth / RBAC ─────────────────────────────────────────────

CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  role_name VARCHAR(100) NOT NULL UNIQUE,
  permissions JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE admin_users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  email VARCHAR(255) UNIQUE,
  password_hash TEXT NOT NULL,
  role_id INTEGER NOT NULL REFERENCES roles(id),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE menus (
  id SERIAL PRIMARY KEY,
  parent_id INTEGER REFERENCES menus(id) ON DELETE CASCADE,
  menu_name VARCHAR(100) NOT NULL,
  route_path VARCHAR(255),
  icon VARCHAR(100),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE role_menus (
  id SERIAL PRIMARY KEY,
  role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  menu_id INTEGER NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
  can_view BOOLEAN NOT NULL DEFAULT FALSE,
  can_add BOOLEAN NOT NULL DEFAULT FALSE,
  can_edit BOOLEAN NOT NULL DEFAULT FALSE,
  can_delete BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (role_id, menu_id)
);

CREATE TABLE user_menus (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  menu_id INTEGER NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
  can_view BOOLEAN NOT NULL DEFAULT FALSE,
  can_add BOOLEAN NOT NULL DEFAULT FALSE,
  can_edit BOOLEAN NOT NULL DEFAULT FALSE,
  can_delete BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (user_id, menu_id)
);

CREATE TABLE login_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  ip_address VARCHAR(45),
  user_agent VARCHAR(255),
  login_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  logout_at TIMESTAMP
);

-- ── Business data ───────────────────────────────────────────

CREATE TABLE clients (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  email VARCHAR(255),
  address TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE vehicles (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  make_model VARCHAR(255) NOT NULL,
  license_vin VARCHAR(100),
  induction_date DATE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE services (
  id SERIAL PRIMARY KEY,
  service_name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  base_price NUMERIC(12,2) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE job_orders (
  id SERIAL PRIMARY KEY,
  job_number VARCHAR(100) NOT NULL UNIQUE,
  client_id INTEGER NOT NULL REFERENCES clients(id),
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id),
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  discount NUMERIC(12,2) NOT NULL DEFAULT 0,
  special_notes TEXT DEFAULT '',
  terms_conditions TEXT DEFAULT '',
  include_terms BOOLEAN NOT NULL DEFAULT FALSE,
  sub_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  grand_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
  balance_due NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE job_order_services (
  id SERIAL PRIMARY KEY,
  job_order_id INTEGER NOT NULL REFERENCES job_orders(id) ON DELETE CASCADE,
  service_id INTEGER NOT NULL REFERENCES services(id),
  quantity NUMERIC(12,2) NOT NULL,
  unit_price NUMERIC(12,2) NOT NULL,
  line_total NUMERIC(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payments (
  id SERIAL PRIMARY KEY,
  job_order_id INTEGER NOT NULL REFERENCES job_orders(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  payment_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reference_no VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE invoices (
  id SERIAL PRIMARY KEY,
  job_order_id INTEGER NOT NULL REFERENCES job_orders(id) ON DELETE CASCADE,
  invoice_number VARCHAR(100) NOT NULL UNIQUE,
  invoice_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  pdf_path TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ── Indexes for the FK/lookup columns the routes filter on ──

CREATE INDEX idx_vehicles_client_id ON vehicles(client_id);
CREATE INDEX idx_job_orders_client_id ON job_orders(client_id);
CREATE INDEX idx_job_orders_vehicle_id ON job_orders(vehicle_id);
CREATE INDEX idx_job_order_services_job_order_id ON job_order_services(job_order_id);
CREATE INDEX idx_payments_job_order_id ON payments(job_order_id);
CREATE INDEX idx_invoices_job_order_id ON invoices(job_order_id);
CREATE INDEX idx_login_sessions_token ON login_sessions(token);
CREATE INDEX idx_login_sessions_user_id ON login_sessions(user_id);
