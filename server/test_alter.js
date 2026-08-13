require('dotenv').config();
const { pool } = require('./db');

async function run() {
  try {
    await pool.query(`
      ALTER TABLE public.user_menus
      ADD COLUMN IF NOT EXISTS can_add BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS can_edit BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS can_delete BOOLEAN NOT NULL DEFAULT FALSE;
    `);
    console.log('Successfully added columns to user_menus');
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}
run();
