const { Pool } = require('pg');

// Use the connection string from environment variables, or a hardcoded one for local development
const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_deOw6I4UjgAx@ep-square-hill-axmcdms4.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
