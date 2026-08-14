const express = require('express');
const router = express.Router();
const db = require('../db');

// Aggregate stats for the dashboard — everything computed in Postgres so the
// browser never downloads whole tables just to show a few numbers.
router.get('/stats', async (req, res) => {
  try {
    const [revRes, cntRes, todayRes, clientRes, orgRes, recentRes, mixRes, scheduleRes] = await Promise.all([
      db.query(`
        SELECT
          COALESCE(SUM(amount_paid), 0)::numeric AS revenue,
          COALESCE(SUM(CASE WHEN status NOT IN ('completed', 'cancelled') THEN balance_due ELSE 0 END), 0)::numeric AS pending,
          COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0)::int AS completed_jobs
        FROM invoices
      `),
      db.query(`
        SELECT
          COUNT(*)::int AS total_invoices,
          COUNT(*) FILTER (WHERE status NOT IN ('completed', 'cancelled'))::int AS open_invoices
        FROM invoices
      `),
      db.query(`
        SELECT COUNT(*)::int AS today_invoices
        FROM invoices
        WHERE created_at >= date_trunc('day', CURRENT_TIMESTAMP)
      `),
      db.query('SELECT COUNT(*)::int AS total FROM clients'),
      db.query('SELECT COUNT(*)::int AS total FROM organizations'),
      db.query(`
        SELECT 
          i.id, i.status, i.grand_total, i.balance_due, i.created_at,
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
      `),
      db.query(`
        SELECT 
          s.service_name, 
          COUNT(*)::int as count 
        FROM invoice_services iso 
        JOIN services s ON iso.service_id = s.id 
        GROUP BY s.service_name 
        ORDER BY count DESC 
        LIMIT 5
      `),
      db.query(`
        SELECT 
          w.booking_id, w.full_name, w.vehicle_brand, w.vehicle_model, w.preferred_date, w.allocated_time,
          s.service_name
        FROM web_bookings w
        LEFT JOIN services s ON w.service_id = s.id
        WHERE w.status NOT IN ('cancelled', 'completed')
        ORDER BY w.preferred_date ASC, w.allocated_time ASC
        LIMIT 10
      `),
    ]);

    res.json({
      revenue: Number(revRes.rows[0]?.revenue) || 0,
      pending: Number(revRes.rows[0]?.pending) || 0,
      completedJobs: revRes.rows[0]?.completed_jobs || 0,
      totalInvoices: cntRes.rows[0]?.total_invoices || 0,
      openInvoices: cntRes.rows[0]?.open_invoices || 0,
      todayInvoices: todayRes.rows[0]?.today_invoices || 0,
      totalCustomers: clientRes.rows[0]?.total || 0,
      totalOrganizations: orgRes.rows[0]?.total || 0,
      activeServices: recentRes.rows,
      serviceMix: mixRes.rows,
      schedule: scheduleRes.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
