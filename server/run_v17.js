require('dotenv').config();
const { pool } = require('./db');
const fs = require('fs');
const path = require('path');

const sql = fs.readFileSync(path.join(__dirname, 'db', 'migrations', 'v17__third_party_service_vehicle_prices.sql'), 'utf8');

pool.query(sql)
  .then(() => {
    console.log('v17 migration applied successfully!');
    pool.end();
  })
  .catch(err => {
    console.error('Error applying v17 migration:', err);
    pool.end();
  });
