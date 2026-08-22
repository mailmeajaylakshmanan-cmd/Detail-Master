const express = require('express');
const router = express.Router();
const db = require('../db');

const { recalculateJobOrderTotals } = require('../utils/finance');
const { requirePermission } = require('../middleware/permissions');

router.use(requirePermission('Billing & Records'));

// GET all job orders (enriched), optional pagination + search
// ?page=&limit=&search= → { jobOrders, pagination }   (no page) → array
router.get('/', async (req, res) => {
  try {
    const hasPagination = req.query.page !== undefined || req.query.limit !== undefined;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const offset = (page - 1) * limit;
    const search = (req.query.search || '').trim();

    const params = [];
    let whereSql = '';
    if (search) {
      params.push(`%${search}%`);
      whereSql = `WHERE (jo.job_number ILIKE $${params.length} OR c.full_name ILIKE $${params.length} OR v.license_vin ILIKE $${params.length})`;
    }

    const listSql = `
      SELECT jo.*, c.full_name as client_name, v.make_model as vehicle_name
      FROM job_orders jo
      JOIN clients c ON jo.client_id = c.id
      JOIN vehicles v ON jo.vehicle_id = v.id
      ${whereSql ? whereSql + ' AND ' : 'WHERE '}jo.is_active = TRUE
      ORDER BY jo.created_at DESC
    `;

    if (hasPagination) {
      const [countRes, listRes] = await Promise.all([
        db.query(`SELECT COUNT(*)::int AS total FROM job_orders jo JOIN clients c ON jo.client_id = c.id JOIN vehicles v ON jo.vehicle_id = v.id ${whereSql}`, params),
        db.query(`${listSql} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, [...params, limit, offset]),
      ]);
      const total = countRes.rows[0]?.total || 0;
      return res.json({
        jobOrders: listRes.rows,
        pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
      });
    }

    const { rows } = await db.query(listSql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET a single job order with its services and payments
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const joRes = await db.query(`
      SELECT jo.*, c.full_name as client_name, c.phone, v.make_model as vehicle_name, v.license_vin
      FROM job_orders jo
      JOIN clients c ON jo.client_id = c.id
      JOIN vehicles v ON jo.vehicle_id = v.id
      WHERE jo.id = $1
    `, [id]);
    
    if (joRes.rows.length === 0) return res.status(404).json({ message: 'Job order not found' });
    const jobOrder = joRes.rows[0];
    
    const servicesRes = await db.query(`
      SELECT jos.*, s.service_name 
      FROM job_order_services jos 
      JOIN services s ON jos.service_id = s.id 
      WHERE jos.job_order_id = $1
    `, [id]);
    jobOrder.services = servicesRes.rows;
    
    const paymentsRes = await db.query('SELECT * FROM payments WHERE job_order_id = $1 ORDER BY payment_date DESC', [id]);
    jobOrder.payments = paymentsRes.rows;
    
    res.json(jobOrder);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// CREATE a job order
router.post('/', async (req, res) => {
  try {
    const { job_number, client_id, vehicle_id, status, discount, special_notes, terms_conditions, include_terms } = req.body;
    if (!client_id || !vehicle_id) return res.status(400).json({ message: 'client_id and vehicle_id are required' });
    
    const { rows } = await db.query(
      `INSERT INTO job_orders 
      (job_number, client_id, vehicle_id, status, discount, special_notes, terms_conditions, include_terms) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [job_number || `JO-${Date.now()}`, client_id, vehicle_id, status || 'draft', discount || 0, special_notes || '', terms_conditions || '', include_terms || false]
    );
    
    await recalculateJobOrderTotals(rows[0].id);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// UPDATE a job order (only top-level fields, line items have their own route)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, discount, special_notes, terms_conditions, include_terms } = req.body;
    
    const { rows } = await db.query(
      `UPDATE job_orders 
      SET status = COALESCE($1, status), 
          discount = COALESCE($2, discount), 
          special_notes = COALESCE($3, special_notes),
          terms_conditions = COALESCE($4, terms_conditions),
          include_terms = COALESCE($5, include_terms),
          updated_at = CURRENT_TIMESTAMP 
      WHERE id = $6 RETURNING *`,
      [status, discount, special_notes, terms_conditions, include_terms, id]
    );
    
    if (rows.length === 0) return res.status(404).json({ message: 'Job order not found' });
    
    if (discount !== undefined) {
      await recalculateJobOrderTotals(id);
    }
    
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE a job order
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rowCount } = await db.query('UPDATE job_orders SET is_active = FALSE WHERE id = $1', [id]);
    if (rowCount === 0) return res.status(404).json({ message: 'Job order not found' });
    res.json({ message: 'Job order deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
