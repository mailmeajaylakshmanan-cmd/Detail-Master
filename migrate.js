require('dotenv').config({path: './server/.env'});
const { pool } = require('./server/db');
pool.query(`
  ALTER TABLE master_offers ADD COLUMN IF NOT EXISTS service_ids JSONB DEFAULT '[]'::jsonb;
  ALTER TABLE master_offers ADD COLUMN IF NOT EXISTS third_party_service_ids JSONB DEFAULT '[]'::jsonb;
`)
  .then(() => { console.log('Migration successful'); process.exit(0); })
  .catch(err => { console.error(err); process.exit(1); });
