describe('Payments Route: Validation & Overpayment Prevention', () => {
  function processPayment(invoice, amount) {
    const paymentAmount = Number(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      return { success: false, status: 400, message: 'Payment amount must be a valid positive number' };
    }

    const currentBalanceDue = parseFloat(invoice.balance_due) || 0;
    if (paymentAmount > currentBalanceDue + 0.01) {
      return {
        success: false,
        status: 400,
        message: `Payment amount of ₹${paymentAmount} exceeds the remaining balance due of ₹${currentBalanceDue}`
      };
    }

    const newAmountPaid = invoice.amount_paid + paymentAmount;
    const newBalanceDue = Math.max(0, invoice.grand_total - newAmountPaid);
    const newStatus = newBalanceDue <= 0 ? 'completed' : 'partial';

    return {
      success: true,
      status: 201,
      invoice_totals: {
        grand_total: invoice.grand_total,
        amount_paid: newAmountPaid,
        balance_due: newBalanceDue,
        status: newStatus
      }
    };
  }

  test('rejects negative or zero payment amounts with 400', () => {
    const invoice = { grand_total: 5000, amount_paid: 0, balance_due: 5000 };

    expect(processPayment(invoice, 0).success).toBe(false);
    expect(processPayment(invoice, -500).success).toBe(false);
    expect(processPayment(invoice, 'abc').success).toBe(false);
  });

  test('rejects overpayments exceeding invoice balance due', () => {
    const invoice = { grand_total: 5000, amount_paid: 3000, balance_due: 2000 };

    const result = processPayment(invoice, 2500);
    expect(result.success).toBe(false);
    expect(result.status).toBe(400);
    expect(result.message).toContain('exceeds the remaining balance due');
  });

  test('processes partial payments and updates status to partial', () => {
    const invoice = { grand_total: 5000, amount_paid: 0, balance_due: 5000 };

    const result = processPayment(invoice, 2000);
    expect(result.success).toBe(true);
    expect(result.invoice_totals.amount_paid).toBe(2000);
    expect(result.invoice_totals.balance_due).toBe(3000);
    expect(result.invoice_totals.status).toBe('partial');
  });

  test('processes full payment and transitions status to completed', () => {
    const invoice = { grand_total: 5000, amount_paid: 2000, balance_due: 3000 };

    const result = processPayment(invoice, 3000);
    expect(result.success).toBe(true);
    expect(result.invoice_totals.amount_paid).toBe(5000);
    expect(result.invoice_totals.balance_due).toBe(0);
    expect(result.invoice_totals.status).toBe('completed');
  });

  // Duplicate payment detection helper
  function checkDuplicatePayment(existingPayments, targetPayment) {
    const now = new Date(targetPayment.date || Date.now()).getTime();
    const thresholdMs = 15 * 1000; // 15 seconds

    return existingPayments.some(p => {
      const pTime = new Date(p.payment_date).getTime();
      return (
        p.invoice_order_id === targetPayment.invoice_order_id &&
        Number(p.amount) === Number(targetPayment.amount) &&
        p.payment_method === targetPayment.payment_method &&
        Math.abs(now - pTime) < thresholdMs
      );
    });
  }

  test('identifies duplicate payment attempts within 15 seconds', () => {
    const recentTime = new Date().toISOString();
    const existing = [
      { invoice_order_id: 10, amount: 1500, payment_method: 'upi', payment_date: recentTime }
    ];

    const isDuplicate = checkDuplicatePayment(existing, {
      invoice_order_id: 10,
      amount: 1500,
      payment_method: 'upi',
      date: new Date().toISOString()
    });

    expect(isDuplicate).toBe(true);
  });
});
