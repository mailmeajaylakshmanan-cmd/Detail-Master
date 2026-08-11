const db = require('../db');

// Idempotent, safe-to-run-on-every-boot performance indexes. All statements
// use CREATE INDEX IF NOT EXISTS / CREATE EXTENSION IF NOT EXISTS, so they
// are no-ops once applied and can run against the production Neon database.
const STATEMENTS = [
  // Enable trigram search for ILIKE '%...%' on invoice/client columns.
  `CREATE EXTENSION IF NOT EXISTS pg_trgm`,

  // invoices list + filters
  `CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices (created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices (status)`,
  `CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices (client_id)`,
  `CREATE INDEX IF NOT EXISTS idx_invoices_organization_id ON invoices (organization_id)`,
  `CREATE INDEX IF NOT EXISTS idx_invoices_vehicle_id ON invoices (vehicle_id)`,
  `CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number_trgm ON invoices USING gin (invoice_number gin_trgm_ops)`,
  `CREATE INDEX IF NOT EXISTS idx_invoices_created_at_client ON invoices (client_id, created_at DESC)`,

  // children of invoices
  `CREATE INDEX IF NOT EXISTS idx_invoice_services_invoice_order_id ON invoice_services (invoice_order_id)`,
  `CREATE INDEX IF NOT EXISTS idx_invoice_services_service_id ON invoice_services (service_id)`,
  `CREATE INDEX IF NOT EXISTS idx_invoice_third_party_invoice_order_id ON invoice_third_party_services (invoice_order_id)`,
  `CREATE INDEX IF NOT EXISTS idx_payments_invoice_order_id ON payments (invoice_order_id)`,
  `CREATE INDEX IF NOT EXISTS idx_invoice_vehicles_invoice_id ON invoice_vehicles (invoice_order_id)`,
  `CREATE INDEX IF NOT EXISTS idx_invoice_vehicles_vehicle_id ON invoice_vehicles (vehicle_id)`,

  // clients + vehicles aggregation
  `CREATE INDEX IF NOT EXISTS idx_clients_created_at ON clients (created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients (phone)`,
  `CREATE INDEX IF NOT EXISTS idx_clients_name_trgm ON clients USING gin (full_name gin_trgm_ops)`,
  `CREATE INDEX IF NOT EXISTS idx_vehicles_client_id ON vehicles (client_id)`,
  `CREATE INDEX IF NOT EXISTS idx_vehicles_organization_id ON vehicles (organization_id)`,

  // organizations
  `CREATE INDEX IF NOT EXISTS idx_organizations_org_name ON organizations (org_name)`,
  `CREATE INDEX IF NOT EXISTS idx_organizations_org_name_trgm ON organizations USING gin (org_name gin_trgm_ops)`,

  // services / third party
  `CREATE INDEX IF NOT EXISTS idx_services_created_at ON services (created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_third_party_created_at ON third_party_services (created_at DESC)`,

  // job orders
  `CREATE INDEX IF NOT EXISTS idx_job_orders_created_at ON job_orders (created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_job_orders_client_id ON job_orders (client_id)`,

  // auth
  `CREATE INDEX IF NOT EXISTS idx_login_sessions_token ON login_sessions (token) WHERE logout_at IS NULL`,
];

async function ensureIndexes() {
  for (const sql of STATEMENTS) {
    try {
      await db.query(sql);
    } catch (err) {
      // Table may not exist in fresh/local DBs — never block boot.
      console.warn(`[indexes] skipped (${err.message.split('\n')[0]}): ${sql.slice(0, 80)}...`);
    }
  }
}

module.exports = { ensureIndexes };
