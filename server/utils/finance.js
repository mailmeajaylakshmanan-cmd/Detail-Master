const db = require('../db');

/**
 * Recalculate invoice money fields from invoice_services + invoice_third_party_services + payments.
 * sub_total = sum(unit_price) + sum(third-party selling_price)
 * grand_total = sub_total - discount
 * amount_paid = sum(payments.amount)
 * balance_due = grand_total - amount_paid
 *
 * @param {number|string} invoiceId
 * @param {object} [executor] optional pg client (for transactions); defaults to pool
 */
async function recalculateInvoiceTotals(invoiceId, executor = db) {
  const { rows } = await executor.query(
    `SELECT
       (SELECT COALESCE(SUM(unit_price), 0) FROM invoice_services WHERE invoice_order_id = $1) AS services_total,
       (SELECT COALESCE(SUM(selling_price + (COALESCE(labour_count, 1) * COALESCE(labour_charge, 0))), 0) FROM invoice_third_party_services WHERE invoice_order_id = $1) AS third_party_total,
       (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE invoice_order_id = $1) AS amount_paid,
       (SELECT COALESCE(discount, 0) FROM invoices WHERE id = $1) AS discount,
       (SELECT sub_total FROM invoices WHERE id = $1) AS original_sub_total,
       EXISTS(SELECT 1 FROM assigned_offers WHERE purchase_invoice_order_id = $1) AS is_offer_purchase`,
    [invoiceId]
  );

  const services_total = parseFloat(rows[0]?.services_total) || 0;
  const third_party_total = parseFloat(rows[0]?.third_party_total) || 0;
  
  let sub_total;
  if (rows[0]?.is_offer_purchase) {
    sub_total = parseFloat(rows[0]?.original_sub_total) || 0;
  } else {
    sub_total = services_total + third_party_total;
  }
  const amount_paid = parseFloat(rows[0]?.amount_paid) || 0;
  const discount = parseFloat(rows[0]?.discount) || 0;
  const grand_total = Math.max(0, Math.round((sub_total - discount) * 100) / 100);
  const balance_due = Math.max(0, Math.round((grand_total - amount_paid) * 100) / 100);

  await executor.query(
    `UPDATE invoices
     SET sub_total = $1,
         grand_total = $2,
         amount_paid = $3,
         balance_due = $4,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $5`,
    [sub_total, grand_total, amount_paid, balance_due, invoiceId]
  );

  return { sub_total, discount, grand_total, amount_paid, balance_due };
}

// Back-compat alias used by older routes
async function recalculateJobOrderTotals(invoiceId, executor) {
  return recalculateInvoiceTotals(invoiceId, executor);
}

module.exports = {
  recalculateInvoiceTotals,
  recalculateJobOrderTotals,
};
