const express = require('express');
const router = express.Router();
const db = require('../db');
const { recalculateJobOrderTotals } = require('../utils/finance');
const { requirePermission } = require('../middleware/permissions');

router.use(requirePermission('Invoicing & Records'));

// CREATE a line item
router.post('/', async (req, res) => {
  try {
    const { job_order_id, service_id, quantity, unit_price } = req.body;
    if (!job_order_id || !service_id || !quantity || unit_price === undefined) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // Note: line_total is auto-computed by Postgres, so we don't insert it.
    const { rows } = await db.query(
      'INSERT INTO job_order_services (job_order_id, service_id, quantity, unit_price) VALUES ($1, $2, $3, $4) RETURNING *',
      [job_order_id, service_id, quantity, unit_price]
    );
    
    await recalculateJobOrderTotals(job_order_id);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// UPDATE a line item (rare, but useful)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, unit_price } = req.body;
    
    const { rows: current } = await db.query('SELECT job_order_id FROM job_order_services WHERE id = $1', [id]);
    if (current.length === 0) return res.status(404).json({ message: 'Line item not found' });
    
    const { rows } = await db.query(
      'UPDATE job_order_services SET quantity = COALESCE($1, quantity), unit_price = COALESCE($2, unit_price) WHERE id = $3 RETURNING *',
      [quantity, unit_price, id]
    );
    
    await recalculateJobOrderTotals(current[0].job_order_id);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE a line item
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rows: current } = await db.query('SELECT job_order_id FROM job_order_services WHERE id = $1', [id]);
    if (current.length === 0) return res.status(404).json({ message: 'Line item not found' });
    
    await db.query('DELETE FROM job_order_services WHERE id = $1', [id]);
    await recalculateJobOrderTotals(current[0].job_order_id);
    
    res.json({ message: 'Line item deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
