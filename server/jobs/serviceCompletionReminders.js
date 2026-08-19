const cron = require('node-cron');
const db = require('../db');

const HEADS_UP_MINUTES = 10;

// One row of service names + a formatted checkout time, used for both the
// heads-up and overdue notification text.
async function buildMessage(invoiceOrderId, vehicleId, checkoutTime) {
  const { rows: vRows } = await db.query(
    `SELECT v.make_model, v.license_vin, COALESCE(c.full_name, o.org_name) AS customer_name
     FROM invoice_vehicles iv
     JOIN vehicles v ON v.id = iv.vehicle_id
     JOIN invoices i ON i.id = iv.invoice_order_id
     LEFT JOIN clients c ON i.client_id = c.id
     LEFT JOIN organizations o ON i.organization_id = o.id
     WHERE iv.invoice_order_id = $1 AND iv.vehicle_id = $2`,
    [invoiceOrderId, vehicleId]
  );
  const vehicle = vRows[0] || {};

  const { rows: svcRows } = await db.query(
    `SELECT s.service_name FROM invoice_services isv
     JOIN services s ON s.id = isv.service_id
     WHERE isv.invoice_order_id = $1 AND isv.vehicle_id = $2 AND isv.completion_status = 'pending'
     UNION ALL
     SELECT itp.service_name FROM invoice_third_party_services itp
     WHERE itp.invoice_order_id = $1 AND itp.vehicle_id = $2 AND itp.completion_status = 'pending'`,
    [invoiceOrderId, vehicleId]
  );
  const serviceNames = svcRows.map(r => r.service_name).join(', ') || 'Service';

  const vehicleLabel = `${vehicle.make_model || 'Vehicle'}${vehicle.license_vin ? ` (${vehicle.license_vin})` : ''}`;
  const timeLabel = new Date(checkoutTime).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

  return `${serviceNames} for ${vehicleLabel}${vehicle.customer_name ? ` — ${vehicle.customer_name}` : ''}, checkout due ${timeLabel}`;
}

async function insertNotification(type, invoiceOrderId, vehicleId, message) {
  await db.query(
    `INSERT INTO notifications (type, invoice_order_id, vehicle_id, message)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (invoice_order_id, vehicle_id, type) DO NOTHING`,
    [type, invoiceOrderId, vehicleId, message]
  );
}

// A vehicle-visit is "still open" if at least one of its regular or
// third-party services hasn't been marked completed/delayed yet.
const OPEN_VISIT_FILTER = `
  EXISTS (
    SELECT 1 FROM invoice_services s
    WHERE s.invoice_order_id = iv.invoice_order_id AND s.vehicle_id = iv.vehicle_id AND s.completion_status = 'pending'
  )
  OR EXISTS (
    SELECT 1 FROM invoice_third_party_services t
    WHERE t.invoice_order_id = iv.invoice_order_id AND t.vehicle_id = iv.vehicle_id AND t.completion_status = 'pending'
  )
`;

async function scanHeadsUp() {
  const { rows } = await db.query(
    `SELECT iv.invoice_order_id, iv.vehicle_id, iv.checkout_time
     FROM invoice_vehicles iv
     JOIN invoices i ON i.id = iv.invoice_order_id
     WHERE iv.checkout_time IS NOT NULL
       AND i.status != 'cancelled'
       AND iv.checkout_time > (NOW() AT TIME ZONE 'Asia/Kolkata')
       AND iv.checkout_time <= (NOW() AT TIME ZONE 'Asia/Kolkata') + ($1 || ' minutes')::interval
       AND (${OPEN_VISIT_FILTER})
       AND NOT EXISTS (
         SELECT 1 FROM notifications n
         WHERE n.invoice_order_id = iv.invoice_order_id AND n.vehicle_id = iv.vehicle_id AND n.type = 'checkout_reminder'
       )`,
    [HEADS_UP_MINUTES]
  );

  for (const row of rows) {
    const message = await buildMessage(row.invoice_order_id, row.vehicle_id, row.checkout_time);
    await insertNotification('checkout_reminder', row.invoice_order_id, row.vehicle_id, message);
  }
}

async function scanOverdue() {
  const { rows } = await db.query(
    `SELECT iv.invoice_order_id, iv.vehicle_id, iv.checkout_time
     FROM invoice_vehicles iv
     JOIN invoices i ON i.id = iv.invoice_order_id
     WHERE iv.checkout_time IS NOT NULL
       AND i.status != 'cancelled'
       AND iv.checkout_time <= (NOW() AT TIME ZONE 'Asia/Kolkata')
       AND (${OPEN_VISIT_FILTER})
       AND NOT EXISTS (
         SELECT 1 FROM notifications n
         WHERE n.invoice_order_id = iv.invoice_order_id AND n.vehicle_id = iv.vehicle_id AND n.type = 'checkout_overdue'
       )`
  );

  for (const row of rows) {
    const message = await buildMessage(row.invoice_order_id, row.vehicle_id, row.checkout_time);
    await insertNotification('checkout_overdue', row.invoice_order_id, row.vehicle_id, `OVERDUE — ${message}`);
  }
}

async function runReminderScan() {
  try {
    await scanHeadsUp();
    await scanOverdue();
  } catch (err) {
    console.error('[serviceCompletionReminders] scan failed:', err);
  }
}

function start() {
  cron.schedule('* * * * *', runReminderScan);
  console.log('[serviceCompletionReminders] scheduler started (every 1 minute)');
}

module.exports = { start, runReminderScan };
