require('dotenv').config();
const { pool } = require('./db');
const fs = require('fs');
const path = require('path');

const sql = fs.readFileSync(path.join(__dirname, 'db', 'migrations', 'v16__vehicle_types_and_service_prices.sql'), 'utf8');

pool.query(sql)
  .then(() => {
    console.log('v16 migration applied successfully!');
    pool.end();
  })
  .catch(err => {
    console.error('Error applying v16 migration:', err);
    pool.end();
  });
