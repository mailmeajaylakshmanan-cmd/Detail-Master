require('dotenv').config();
const { pool } = require('./db');
pool.query(`
  ALTER TABLE master_offers ADD COLUMN IF NOT EXISTS service_ids JSONB DEFAULT '[]'::jsonb;
  ALTER TABLE master_offers ADD COLUMN IF NOT EXISTS third_party_service_ids JSONB DEFAULT '[]'::jsonb;
  ALTER TABLE clients ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
`)
  .then(() => { console.log('Migration successful'); process.exit(0); })
  .catch(err => { console.error(err); process.exit(1); });
