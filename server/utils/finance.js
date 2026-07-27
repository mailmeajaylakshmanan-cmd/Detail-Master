const db = require('../db');

async function recalculateJobOrderTotals(jobOrderId) {
  // Get sum of services
  const sumRes = await db.query('SELECT COALESCE(SUM(line_total), 0) as sub_total FROM job_order_services WHERE job_order_id = $1', [jobOrderId]);
  const sub_total = parseFloat(sumRes.rows[0].sub_total) || 0;
  
  // Get sum of payments
  const payRes = await db.query('SELECT COALESCE(SUM(amount), 0) as amount_paid FROM payments WHERE job_order_id = $1', [jobOrderId]);
  const amount_paid = parseFloat(payRes.rows[0].amount_paid) || 0;
  
  // Get current discount
  const joRes = await db.query('SELECT discount FROM job_orders WHERE id = $1', [jobOrderId]);
  const discount = parseFloat(joRes.rows[0]?.discount) || 0;
  
  const grand_total = sub_total - discount;
  const balance_due = grand_total - amount_paid;
  
  await db.query(
    'UPDATE job_orders SET sub_total = $1, grand_total = $2, amount_paid = $3, balance_due = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5',
    [sub_total, grand_total, amount_paid, balance_due, jobOrderId]
  );
}

module.exports = {
  recalculateJobOrderTotals
};
