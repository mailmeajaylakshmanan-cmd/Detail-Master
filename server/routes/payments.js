const express = require('express');
const router = express.Router();
const db = require('../db');
const queryCache = require('../utils/queryCache');
const { recalculateInvoiceTotals } = require('../utils/finance');
const { requirePermission } = require('../middleware/permissions');

router.use(requirePermission('Invoicing & Records'));

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

    const paymentAmount = Number(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({ message: 'Payment amount must be a valid positive number' });
    }

    const rawMethod = payment_method || method;
    if (!rawMethod) {
      return res.status(400).json({ message: 'payment_method is required' });
    }

    const finalMethod = mapPaymentMethod(rawMethod);
    const mappedMethod = finalMethod;
    // Cash: never store reference_no. UPI / bank_transfer: optional.
    const ref =
      mappedMethod === 'cash' || mappedMethod === 'card' || mappedMethod === 'other'
        ? null
        : (reference_no || null);

    // Everything from here runs inside one transaction, holding a row lock on
    // the invoice for its duration. Without this, the balance check, the
    // duplicate check, and the insert are three separate round-trips a
    // concurrent request can slip between — two requests can both pass the
    // duplicate check before either has inserted, creating two payment rows
    // for what should've been one payment (a classic check-then-act race).
    // FOR UPDATE makes a second concurrent request for the SAME invoice wait
    // here until this transaction commits, so by the time it runs its own
    // checks, this payment is already visible to it.
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const invCheck = await client.query('SELECT id, grand_total, amount_paid, balance_due FROM invoices WHERE id = $1 FOR UPDATE', [invoice_order_id]);
      if (invCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'Invoice not found' });
      }

      const invoice = invCheck.rows[0];
      const currentBalanceDue = parseFloat(invoice.balance_due) || 0;
      if (paymentAmount > currentBalanceDue + 0.01) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          message: `Payment amount of ₹${paymentAmount.toLocaleString('en-IN')} exceeds the remaining balance due of ₹${currentBalanceDue.toLocaleString('en-IN')}`
        });
      }

      // Prevent duplicate payments (same invoice, amount, method within 15 seconds)
      const duplicateCheck = await client.query(
        `SELECT id FROM payments
         WHERE invoice_order_id = $1
           AND amount = $2
           AND payment_method = $3
           AND payment_date > NOW() - INTERVAL '15 seconds'`,
        [invoice_order_id, amount, finalMethod]
      );

      if (duplicateCheck.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({ message: 'Duplicate payment detected. Please wait a moment before trying again.' });
      }

      const { rows } = await client.query(
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
      const totals = await recalculateInvoiceTotals(invoice_order_id, client);
      await client.query('COMMIT');

      queryCache.del('dashboard_stats');
      res.status(201).json({ payment: rows[0], invoice_totals: totals });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
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
    queryCache.del('dashboard_stats');

    res.json({ message: 'Payment deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
