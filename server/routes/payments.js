const express = require('express');
const router = express.Router();
const db = require('../db');
const { recalculateJobOrderTotals } = require('../utils/finance');

// CREATE a payment
router.post('/', async (req, res) => {
  try {
    const { job_order_id, amount, payment_method, payment_date, reference_no, notes } = req.body;
    if (!job_order_id || amount === undefined || !payment_method) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    const { rows } = await db.query(
      'INSERT INTO payments (job_order_id, amount, payment_method, payment_date, reference_no, notes) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [job_order_id, amount, payment_method, payment_date || new Date(), reference_no, notes]
    );
    
    await recalculateJobOrderTotals(job_order_id);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE a payment
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rows: current } = await db.query('SELECT job_order_id FROM payments WHERE id = $1', [id]);
    if (current.length === 0) return res.status(404).json({ message: 'Payment not found' });
    
    await db.query('DELETE FROM payments WHERE id = $1', [id]);
    await recalculateJobOrderTotals(current[0].job_order_id);
    
    res.json({ message: 'Payment deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
