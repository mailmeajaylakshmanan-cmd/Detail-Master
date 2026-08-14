require('dotenv').config();
const { pool } = require('./db');

async function run() {
  try {
    const res = await pool.query(`
      SELECT id, username, email, full_name, role_id, is_active, password_hash 
      FROM admin_users 
      WHERE username = 'vishnu'
    `);
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}
run();
