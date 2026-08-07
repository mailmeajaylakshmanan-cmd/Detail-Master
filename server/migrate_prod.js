require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    console.log('Running migrations on prod DB...');
    await pool.query('ALTER TABLE invoice_services ADD COLUMN IF NOT EXISTS vehicle_id INTEGER REFERENCES vehicles(id);');
    console.log('Added vehicle_id to invoice_services');
    await pool.query('ALTER TABLE invoice_third_party_services ADD COLUMN IF NOT EXISTS vehicle_id INTEGER REFERENCES vehicles(id);');
    console.log('Added vehicle_id to invoice_third_party_services');
  } catch (err) {
    console.error('Error running migration:', err);
  } finally {
    pool.end();
  }
}
run();
