const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.warn('DATABASE_URL is not set — API cannot reach Postgres');
}

// Optimized connection pool for Railway + Neon PostgreSQL
const pool = new Pool({
  connectionString,
  ssl: connectionString?.includes('localhost')
    ? false
    : { rejectUnauthorized: false },
  max: Number(process.env.PG_POOL_MAX || 20),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  statement_timeout: Number(process.env.PG_STATEMENT_TIMEOUT_MS || 30_000),
  query_timeout: Number(process.env.PG_QUERY_TIMEOUT_MS || 30_000),
  application_name: 'detail-master',
  allowExitOnIdle: true,
});

pool.on('error', (err) => {
  console.error('Unexpected Postgres pool error', err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
