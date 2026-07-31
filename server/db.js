const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.warn('DATABASE_URL is not set — API cannot reach Postgres');
}

// Small pool fits Railway + Neon well (avoid exhausting Neon connection limits)
const pool = new Pool({
  connectionString,
  ssl: connectionString?.includes('localhost')
    ? false
    : { rejectUnauthorized: false },
  max: Number(process.env.PG_POOL_MAX || 5),
  idleTimeoutMillis: 20_000,
  connectionTimeoutMillis: 10_000,
  allowExitOnIdle: true,
});

pool.on('error', (err) => {
  console.error('Unexpected Postgres pool error', err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
