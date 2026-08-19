const express = require('express');
const router = express.Router();
const db = require('../db');
const { protect } = require('../middleware/auth');
const { sendReadyForPickupEmail } = require('../utils/mailer');

router.use(protect);

// Unresolved checkout reminders, grouped by vehicle with each pending
// service/third-party line item listed so the UI can render a checklist.
router.get('/', async (req, res) => {
  try {
    const { rows: notifs } = await db.query(
      `SELECT n.*, v.make_model, v.license_vin,
              COALESCE(c.full_name, o.org_name) AS customer_name
       FROM notifications n
       JOIN vehicles v ON v.id = n.vehicle_id
       JOIN invoices i ON i.id = n.invoice_order_id
       LEFT JOIN clients c ON i.client_id = c.id
       LEFT JOIN organizations o ON i.organization_id = o.id
       WHERE n.is_resolved = false
       ORDER BY n.type DESC, n.created_at ASC`
    );

    for (const n of notifs) {
      const { rows: items } = await db.query(
        `SELECT id, service_id AS ref_id, 'service' AS kind, unit_price,
                (SELECT service_name FROM services WHERE id = invoice_services.service_id) AS service_name
         FROM invoice_services
         WHERE invoice_order_id = $1 AND vehicle_id = $2 AND completion_status = 'pending'
         UNION ALL
         SELECT id, third_party_service_id AS ref_id, 'third_party' AS kind, selling_price AS unit_price,
                service_name
         FROM invoice_third_party_services
         WHERE invoice_order_id = $1 AND vehicle_id = $2 AND completion_status = 'pending'`,
        [n.invoice_order_id, n.vehicle_id]
      );
      n.items = items;
    }

    res.json(notifs);
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// After marking one line item, check whether the whole vehicle-visit and/or
// the whole invoice are now fully resolved, and cascade the follow-on effects.
async function afterItemResolved(invoiceOrderId, vehicleId) {
  const { rows: openForVehicle } = await db.query(
    `SELECT 1 FROM invoice_services WHERE invoice_order_id = $1 AND vehicle_id = $2 AND completion_status = 'pending'
     UNION ALL
     SELECT 1 FROM invoice_third_party_services WHERE invoice_order_id = $1 AND vehicle_id = $2 AND completion_status = 'pending'`,
    [invoiceOrderId, vehicleId]
  );
  if (openForVehicle.length === 0) {
    await db.query(
      `UPDATE notifications SET is_resolved = true, resolved_at = CURRENT_TIMESTAMP
       WHERE invoice_order_id = $1 AND vehicle_id = $2 AND is_resolved = false`,
      [invoiceOrderId, vehicleId]
    );
  }

  // Ready-for-pickup: every line item on the WHOLE invoice must be
  // 'completed' (not just resolved — a 'delayed' item blocks this).
  const { rows: notCompleted } = await db.query(
    `SELECT 1 FROM invoice_services WHERE invoice_order_id = $1 AND completion_status != 'completed'
     UNION ALL
     SELECT 1 FROM invoice_third_party_services WHERE invoice_order_id = $1 AND completion_status != 'completed'`,
    [invoiceOrderId]
  );
  if (notCompleted.length > 0) return;

  const { rows: invRows } = await db.query(
    `SELECT i.id, i.invoice_number, i.service_completed_at,
            c.email AS client_email, c.full_name AS client_name,
            o.email AS org_email, o.org_name,
            v.make_model, v.license_vin
     FROM invoices i
     LEFT JOIN clients c ON i.client_id = c.id
     LEFT JOIN organizations o ON i.organization_id = o.id
     LEFT JOIN vehicles v ON v.id = $2
     WHERE i.id = $1`,
    [invoiceOrderId, vehicleId]
  );
  const inv = invRows[0];
  if (!inv || inv.service_completed_at) return;

  await db.query('UPDATE invoices SET service_completed_at = CURRENT_TIMESTAMP WHERE id = $1', [invoiceOrderId]);

  const vehicleLabel = `${inv.make_model || 'Vehicle'}${inv.license_vin ? ` (${inv.license_vin})` : ''}`;
  sendReadyForPickupEmail({
    toEmail: inv.client_email || inv.org_email,
    customerName: inv.client_name || inv.org_name,
    vehicleLabel,
    invoiceNumber: inv.invoice_number,
  }).catch(err => console.error('sendReadyForPickupEmail failed:', err));
}

router.post('/service-items/:id/complete', async (req, res) => {
  try {
    const { rows } = await db.query(
      `UPDATE invoice_services
       SET completion_status = 'completed', delay_reason = NULL, completed_by = $1, completed_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING invoice_order_id, vehicle_id`,
      [req.user.id, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Item not found' });
    await afterItemResolved(rows[0].invoice_order_id, rows[0].vehicle_id);
    res.json({ message: 'Marked complete' });
  } catch (err) {
    console.error('Error completing service item:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/service-items/:id/delay', async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason || !reason.trim()) return res.status(400).json({ message: 'A delay reason is required' });

    const { rows } = await db.query(
      `UPDATE invoice_services
       SET completion_status = 'delayed', delay_reason = $1, completed_by = $2, completed_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING invoice_order_id, vehicle_id`,
      [reason.trim(), req.user.id, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Item not found' });
    await afterItemResolved(rows[0].invoice_order_id, rows[0].vehicle_id);
    res.json({ message: 'Delay reason saved' });
  } catch (err) {
    console.error('Error delaying service item:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/third-party-items/:id/complete', async (req, res) => {
  try {
    const { rows } = await db.query(
      `UPDATE invoice_third_party_services
       SET completion_status = 'completed', delay_reason = NULL, completed_by = $1, completed_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING invoice_order_id, vehicle_id`,
      [req.user.id, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Item not found' });
    await afterItemResolved(rows[0].invoice_order_id, rows[0].vehicle_id);
    res.json({ message: 'Marked complete' });
  } catch (err) {
    console.error('Error completing third-party item:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/third-party-items/:id/delay', async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason || !reason.trim()) return res.status(400).json({ message: 'A delay reason is required' });

    const { rows } = await db.query(
      `UPDATE invoice_third_party_services
       SET completion_status = 'delayed', delay_reason = $1, completed_by = $2, completed_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING invoice_order_id, vehicle_id`,
      [reason.trim(), req.user.id, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Item not found' });
    await afterItemResolved(rows[0].invoice_order_id, rows[0].vehicle_id);
    res.json({ message: 'Delay reason saved' });
  } catch (err) {
    console.error('Error delaying third-party item:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
