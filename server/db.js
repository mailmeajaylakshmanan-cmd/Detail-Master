const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.warn('DATABASE_URL is not set — API cannot reach Postgres');
}

// Pool sized for Railway + Neon. Batching (utils/db.js) keeps round-trips low,
// so a slightly larger pool absorbs burst traffic without exhausting Neon limits.
const pool = new Pool({
  connectionString,
  ssl: connectionString?.includes('localhost')
    ? false
    : { rejectUnauthorized: false },
  max: Number(process.env.PG_POOL_MAX || 10),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  statement_timeout: Number(process.env.PG_STATEMENT_TIMEOUT_MS || 15_000),
  query_timeout: Number(process.env.PG_QUERY_TIMEOUT_MS || 15_000),
  application_name: 'detailing-masters-api',
  allowExitOnIdle: true,
});

pool.on('error', (err) => {
  console.error('Unexpected Postgres pool error', err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
