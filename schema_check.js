const db = require('./server/db');

async function check() {
  const q = `SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_name IN ('web_bookings', 'invoice_items', 'services', 'invoices', 'clients');`;
  try {
    const res = await db.query(q);
    console.log(res.rows);
  } catch (e) {
    console.error(e);
  } finally {
    process.exit();
  }
}

check();
