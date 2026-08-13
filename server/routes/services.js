const express = require('express');
const router = express.Router();
const db = require('../db');

// GET all services
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM services ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET a single service
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await db.query('SELECT * FROM services WHERE id = $1', [id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Service not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// CREATE a service
router.post('/', async (req, res) => {
  try {
    const { service_name, category, base_price, is_active } = req.body;
    if (!service_name || base_price === undefined) return res.status(400).json({ message: 'service_name and base_price are required' });
    
    const { rows } = await db.query(
      'INSERT INTO services (service_name, category, base_price, is_active) VALUES ($1, $2, $3, $4) RETURNING *',
      [service_name, category, base_price, is_active !== undefined ? is_active : true]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// UPDATE a service
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { service_name, category, base_price, is_active } = req.body;
    if (!service_name || base_price === undefined) return res.status(400).json({ message: 'service_name and base_price are required' });
    
    const { rows } = await db.query(
      'UPDATE services SET service_name = $1, category = $2, base_price = $3, is_active = $4 WHERE id = $5 RETURNING *',
      [service_name, category, base_price, is_active !== undefined ? is_active : true, id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Service not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET dependencies for a service before deletion
router.get('/:id/dependencies', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check invoices
    const invoicesResult = await db.query(
      'SELECT COUNT(DISTINCT invoice_id) as count FROM invoice_services WHERE service_id = $1',
      [id]
    );
    
    // Check job orders
    const jobsResult = await db.query(
      'SELECT COUNT(DISTINCT job_order_id) as count FROM job_order_services WHERE service_id = $1',
      [id]
    );

    res.json({
      invoices: parseInt(invoicesResult.rows[0].count, 10),
      jobOrders: parseInt(jobsResult.rows[0].count, 10),
      total: parseInt(invoicesResult.rows[0].count, 10) + parseInt(jobsResult.rows[0].count, 10)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error checking dependencies' });
  }
});

// DELETE a service (Soft Delete)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // We perform a soft delete by setting is_active = false
    const { rowCount } = await db.query('UPDATE services SET is_active = false WHERE id = $1', [id]);
    if (rowCount === 0) return res.status(404).json({ message: 'Service not found' });
    res.json({ message: 'Service deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
