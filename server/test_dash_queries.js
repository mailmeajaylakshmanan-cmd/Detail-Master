require('dotenv').config();
const { pool } = require('./db');

async function test() {
  try {
    // 1. Active Services
    const active = await pool.query(`
      SELECT 
        i.id, i.status, 
        COALESCE(c.full_name, o.org_name) AS customer_name,
        v.make_model AS vehicle_name,
        (SELECT s.service_name FROM invoice_services iso JOIN services s ON iso.service_id = s.id WHERE iso.invoice_order_id = i.id LIMIT 1) AS service_name
      FROM invoices i
      LEFT JOIN clients c ON i.client_id = c.id
      LEFT JOIN organizations o ON i.organization_id = o.id
      LEFT JOIN vehicles v ON i.vehicle_id = v.id
      WHERE i.status NOT IN ('completed', 'cancelled')
      ORDER BY i.created_at DESC
      LIMIT 10
    `);
    console.log('Active:', active.rows);

    // 2. Service Mix
    const mix = await pool.query(`
      SELECT 
        s.service_name, 
        COUNT(*)::int as count 
      FROM invoice_services iso 
      JOIN services s ON iso.service_id = s.id 
      GROUP BY s.service_name 
      ORDER BY count DESC 
      LIMIT 5
    `);
    console.log('Mix:', mix.rows);

    // 3. Schedule
    const sched = await pool.query(`
      SELECT 
        w.booking_id, w.full_name, w.vehicle_brand, w.vehicle_model, w.preferred_date, w.allocated_time,
        s.service_name
      FROM web_bookings w
      LEFT JOIN services s ON w.service_id = s.id
      WHERE w.status NOT IN ('cancelled', 'completed')
      ORDER BY w.preferred_date ASC, w.allocated_time ASC
      LIMIT 10
    `);
    console.log('Sched:', sched.rows);

  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}
test();
