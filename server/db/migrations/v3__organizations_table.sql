-- Missing CREATE TABLE for organizations — v3__organizations.sql (from main)
-- only contains ALTER statements referencing organizations(id), but never
-- creates the table itself. Reconstructed from server/routes/organizations.js.
-- Must run BEFORE v3__organizations.sql.

CREATE TABLE organizations (
  id SERIAL PRIMARY KEY,
  org_name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255),
  phone VARCHAR(50),
  email VARCHAR(255),
  address TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
