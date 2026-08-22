const express = require('express');
const router = express.Router();
const db = require('../db');
const { recalculateInvoiceTotals } = require('../utils/finance');
const { requirePermission } = require('../middleware/permissions');

router.use(requirePermission('Billing & Records'));

function mapPaymentMethod(method) {
  const m = String(method || 'cash').toLowerCase().replace(/\s+/g, '_');
  if (m === 'bank_transfer' || m === 'bank-transfer') return 'bank_transfer';
  if (m === 'upi') return 'upi';
  if (m === 'card') return 'card';
  if (m === 'cash') return 'cash';
  return 'other';
}

// CREATE a payment against an invoice
// Body: invoice_order_id, amount, payment_method|method, payment_date?, reference_no?
router.post('/', async (req, res) => {
  try {
    const {
      invoice_order_id,
      amount,
      payment_method,
      method,
      payment_date,
      reference_no,
      notes,
    } = req.body;

    if (!invoice_order_id || amount === undefined || amount === null || amount === '') {
      return res.status(400).json({ message: 'invoice_order_id and amount are required' });
    }

    const rawMethod = payment_method || method;
    if (!rawMethod) {
      return res.status(400).json({ message: 'payment_method is required' });
    }

    const invCheck = await db.query('SELECT id FROM invoices WHERE id = $1', [invoice_order_id]);
    if (invCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    const finalMethod = mapPaymentMethod(rawMethod);

    // Prevent duplicate payments (same invoice, amount, method within 15 seconds)
    const duplicateCheck = await db.query(
      `SELECT id FROM payments 
       WHERE invoice_order_id = $1 
         AND amount = $2 
         AND payment_method = $3 
         AND payment_date > NOW() - INTERVAL '15 seconds'`,
      [invoice_order_id, amount, finalMethod]
    );

    if (duplicateCheck.rows.length > 0) {
      return res.status(409).json({ message: 'Duplicate payment detected. Please wait a moment before trying again.' });
    }

    const mappedMethod = finalMethod;
    // Cash: never store reference_no. UPI / bank_transfer: optional.
    const ref =
      mappedMethod === 'cash' || mappedMethod === 'card' || mappedMethod === 'other'
        ? null
        : (reference_no || null);

    const { rows } = await db.query(
      `INSERT INTO payments (invoice_order_id, amount, payment_method, payment_date, reference_no, notes)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        invoice_order_id,
        Number(amount),
        mappedMethod,
        payment_date || new Date(),
        ref,
        notes || null,
      ]
    );

    // Updates invoices.amount_paid + balance_due for this same invoice id
    const totals = await recalculateInvoiceTotals(invoice_order_id);
    res.status(201).json({ payment: rows[0], invoice_totals: totals });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE a payment
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rows: current } = await db.query(
      'SELECT invoice_order_id FROM payments WHERE id = $1',
      [id]
    );
    if (current.length === 0) return res.status(404).json({ message: 'Payment not found' });

    await db.query('UPDATE payments SET is_active = FALSE WHERE id = $1', [id]);
    await recalculateInvoiceTotals(current[0].invoice_order_id);

    res.json({ message: 'Payment deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
