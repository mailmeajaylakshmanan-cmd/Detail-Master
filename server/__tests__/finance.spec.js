const { recalculateInvoiceTotals } = require('../utils/finance');

describe('Financial Engine: recalculateInvoiceTotals', () => {
  test('accurately calculates subtotal from standard services and third-party lines', async () => {
    const mockExecutor = {
      query: jest.fn()
        .mockResolvedValueOnce({
          rows: [{
            services_total: '3500.00',
            third_party_total: '1200.50',
            amount_paid: '2000.00',
            discount: '500.00',
            original_sub_total: '4700.50',
            is_offer_purchase: false,
          }]
        })
        .mockResolvedValueOnce({ rows: [] })
    };

    const result = await recalculateInvoiceTotals(101, mockExecutor);

    expect(result.sub_total).toBe(4700.50);
    expect(result.discount).toBe(500.00);
    expect(result.grand_total).toBe(4200.50);
    expect(result.amount_paid).toBe(2000.00);
    expect(result.balance_due).toBe(2200.50);

    expect(mockExecutor.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE invoices'),
      [4700.50, 4200.50, 2000.00, 2200.50, 101]
    );
  });

  test('clamps grand_total to 0 if discount is greater than sub_total', async () => {
    const mockExecutor = {
      query: jest.fn()
        .mockResolvedValueOnce({
          rows: [{
            services_total: '1000.00',
            third_party_total: '0.00',
            amount_paid: '0.00',
            discount: '2500.00', // Exceeds subtotal
            original_sub_total: '1000.00',
            is_offer_purchase: false,
          }]
        })
        .mockResolvedValueOnce({ rows: [] })
    };

    const result = await recalculateInvoiceTotals(102, mockExecutor);

    expect(result.sub_total).toBe(1000.00);
    expect(result.discount).toBe(2500.00);
    expect(result.grand_total).toBe(0);
    expect(result.balance_due).toBe(0);
  });

  test('clamps balance_due to 0 if payments exceed grand_total (never negative)', async () => {
    const mockExecutor = {
      query: jest.fn()
        .mockResolvedValueOnce({
          rows: [{
            services_total: '2000.00',
            third_party_total: '0.00',
            amount_paid: '3000.00', // Overpaid
            discount: '0.00',
            original_sub_total: '2000.00',
            is_offer_purchase: false,
          }]
        })
        .mockResolvedValueOnce({ rows: [] })
    };

    const result = await recalculateInvoiceTotals(103, mockExecutor);

    expect(result.grand_total).toBe(2000.00);
    expect(result.amount_paid).toBe(3000.00);
    expect(result.balance_due).toBe(0); // Clamped to non-negative
  });

  test('preserves original subtotal when is_offer_purchase is true', async () => {
    const mockExecutor = {
      query: jest.fn()
        .mockResolvedValueOnce({
          rows: [{
            services_total: '0.00',
            third_party_total: '0.00',
            amount_paid: '1500.00',
            discount: '0.00',
            original_sub_total: '1500.00',
            is_offer_purchase: true,
          }]
        })
        .mockResolvedValueOnce({ rows: [] })
    };

    const result = await recalculateInvoiceTotals(104, mockExecutor);

    expect(result.sub_total).toBe(1500.00);
    expect(result.grand_total).toBe(1500.00);
    expect(result.balance_due).toBe(0);
  });
});
