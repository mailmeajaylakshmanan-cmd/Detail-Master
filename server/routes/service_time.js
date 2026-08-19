const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { protect } = require('../middleware/auth');

// Helper to calculate time difference
function calculateDuration(checkin, checkout) {
  if (!checkin || !checkout) return null;
  const ms = new Date(checkout) - new Date(checkin);
  if (ms < 0) return null;
  const hrs = Math.floor(ms / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  return `${hrs}h ${mins}m`;
}

router.get('/search', protect, async (req, res) => {
  try {
    const { search, startDate, endDate } = req.query;

    let query = `
      SELECT 
        iv.id as invoice_vehicle_id,
        iv.invoice_order_id,
        iv.vehicle_id,
        iv.checkin_time,
        iv.checkout_time,
        i.invoice_number,
        i.status as invoice_status,
        i.created_at as invoice_date,
        v.make_model as vehicle_name,
        v.license_vin,
        c.full_name as client_name,
        c.phone as client_phone
      FROM public.invoice_vehicles iv
      JOIN public.invoices i ON iv.invoice_order_id = i.id
      JOIN public.vehicles v ON iv.vehicle_id = v.id
      LEFT JOIN public.clients c ON i.client_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (i.invoice_number ILIKE $${params.length}
         OR v.license_vin ILIKE $${params.length}
         OR c.full_name ILIKE $${params.length}
         OR c.phone ILIKE $${params.length})`;
    }

    if (startDate && endDate) {
      params.push(startDate, endDate);
      query += ` AND DATE(i.created_at) BETWEEN $${params.length - 1} AND $${params.length}`;
    }

    query += ` ORDER BY i.created_at DESC LIMIT 50`;
    
    const result = await pool.query(query, params);
    const vehicles = result.rows;

    for (let v of vehicles) {
      // Get services
      const srvQuery = `
        SELECT js.id, js.quantity, js.unit_price, js.grand_total, s.service_name, s.category,
               js.completion_status, js.delay_reason, js.completed_at, COALESCE(NULLIF(u.full_name, ''), u.username) AS completed_by_name
        FROM public.invoice_services js
        JOIN public.services s ON js.service_id = s.id
        LEFT JOIN public.admin_users u ON js.completed_by = u.id
        WHERE js.invoice_order_id = $1 AND js.vehicle_id = $2
      `;
      const srvResult = await pool.query(srvQuery, [v.invoice_order_id, v.vehicle_id]);
      v.services = srvResult.rows;

      // Get 3rd party services
      const tpQuery = `
        SELECT tps.id, tps.service_name, tps.vendor_name, tps.selling_price,
               tps.completion_status, tps.delay_reason, tps.completed_at, COALESCE(NULLIF(u.full_name, ''), u.username) AS completed_by_name
        FROM public.invoice_third_party_services tps
        LEFT JOIN public.admin_users u ON tps.completed_by = u.id
        WHERE tps.invoice_order_id = $1 AND tps.vehicle_id = $2
      `;
      const tpResult = await pool.query(tpQuery, [v.invoice_order_id, v.vehicle_id]);
      v.third_party_services = tpResult.rows;
    }

    res.json(vehicles);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

router.get('/today', protect, async (req, res) => {
  try {
    const query = `
      SELECT 
        iv.id as invoice_vehicle_id,
        iv.invoice_order_id,
        iv.vehicle_id,
        iv.checkin_time,
        iv.checkout_time,
        i.invoice_number,
        i.status as invoice_status,
        i.created_at as invoice_date,
        v.make_model as vehicle_name,
        v.license_vin,
        c.full_name as client_name,
        c.phone as client_phone
      FROM public.invoice_vehicles iv
      JOIN public.invoices i ON iv.invoice_order_id = i.id
      JOIN public.vehicles v ON iv.vehicle_id = v.id
      LEFT JOIN public.clients c ON i.client_id = c.id
      WHERE 
        DATE(i.created_at) = CURRENT_DATE 
        OR DATE(iv.checkin_time) = CURRENT_DATE
        OR (iv.checkin_time IS NOT NULL AND iv.checkout_time IS NULL)
      ORDER BY i.created_at DESC
    `;
    const result = await pool.query(query);
    const vehicles = result.rows;

    for (let v of vehicles) {
      // Get services
      const srvQuery = `
        SELECT js.id, js.quantity, js.unit_price, js.grand_total, s.service_name, s.category,
               js.completion_status, js.delay_reason, js.completed_at, COALESCE(NULLIF(u.full_name, ''), u.username) AS completed_by_name
        FROM public.invoice_services js
        JOIN public.services s ON js.service_id = s.id
        LEFT JOIN public.admin_users u ON js.completed_by = u.id
        WHERE js.invoice_order_id = $1 AND js.vehicle_id = $2
      `;
      const srvResult = await pool.query(srvQuery, [v.invoice_order_id, v.vehicle_id]);
      v.services = srvResult.rows;

      // Get 3rd party services
      const tpQuery = `
        SELECT tps.id, tps.service_name, tps.vendor_name, tps.selling_price,
               tps.completion_status, tps.delay_reason, tps.completed_at, COALESCE(NULLIF(u.full_name, ''), u.username) AS completed_by_name
        FROM public.invoice_third_party_services tps
        LEFT JOIN public.admin_users u ON tps.completed_by = u.id
        WHERE tps.invoice_order_id = $1 AND tps.vehicle_id = $2
      `;
      const tpResult = await pool.query(tpQuery, [v.invoice_order_id, v.vehicle_id]);
      v.third_party_services = tpResult.rows;
    }

    res.json(vehicles);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

router.post('/checkin', protect, async (req, res) => {
  try {
    const { invoice_vehicle_id } = req.body;
    if (!invoice_vehicle_id) return res.status(400).json({ message: 'Missing invoice_vehicle_id' });

    const now = new Date();
    const result = await pool.query(
      `UPDATE public.invoice_vehicles 
       SET checkin_time = $1 
       WHERE id = $2 RETURNING *`,
      [now, invoice_vehicle_id]
    );

    if (result.rows.length === 0) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Checked in successfully', data: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

router.post('/checkout', protect, async (req, res) => {
  try {
    const { invoice_vehicle_id } = req.body;
    if (!invoice_vehicle_id) return res.status(400).json({ message: 'Missing invoice_vehicle_id' });

    const now = new Date();
    const result = await pool.query(
      `UPDATE public.invoice_vehicles 
       SET checkout_time = $1 
       WHERE id = $2 RETURNING *`,
      [now, invoice_vehicle_id]
    );

    if (result.rows.length === 0) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Checked out successfully', data: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
