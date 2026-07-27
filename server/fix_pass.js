require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('./db');

async function fixPassword() {
  try {
    const rawPassword = 'password123';
    console.log('Hashing:', rawPassword);
    const hash = await bcrypt.hash(rawPassword, 10);
    console.log('Hash generated:', hash);
    const res = await pool.query('UPDATE public.admin_users SET password_hash = $1 WHERE id = 1', [hash]);
    console.log('Rows updated:', res.rowCount);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    pool.end();
  }
}
fixPassword();
