const express = require('express');
const router = express.Router();
const db = require('../db');

// GET all invoices
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT i.*, jo.job_number, jo.grand_total, jo.balance_due, c.full_name as client_name
      FROM invoices i
      JOIN job_orders jo ON i.job_order_id = jo.id
      JOIN clients c ON jo.client_id = c.id
      ORDER BY i.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// CREATE an invoice
router.post('/', async (req, res) => {
  try {
    const { job_order_id, invoice_number, invoice_date, status, pdf_path } = req.body;
    if (!job_order_id || !invoice_number) return res.status(400).json({ message: 'job_order_id and invoice_number are required' });
    
    const { rows } = await db.query(
      'INSERT INTO invoices (job_order_id, invoice_number, invoice_date, status, pdf_path) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [job_order_id, invoice_number, invoice_date || new Date(), status || 'pending', pdf_path]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
