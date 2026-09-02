describe('Catalog Dependencies & Referential Safety', () => {
  function checkServiceDependencies(serviceId, dbRecords) {
    const activeInvoices = dbRecords.invoiceServices.filter(isv => isv.service_id === serviceId);
    const activeJobOrders = dbRecords.jobOrderServices.filter(jos => jos.service_id === serviceId);
    const activeOffers = dbRecords.masterOfferServices.filter(mos => mos.service_id === serviceId);

    const hasDependencies = activeInvoices.length > 0 || activeJobOrders.length > 0 || activeOffers.length > 0;

    return {
      canDelete: !hasDependencies,
      dependencies: {
        invoices_count: activeInvoices.length,
        job_orders_count: activeJobOrders.length,
        offers_count: activeOffers.length
      }
    };
  }

  test('blocks service deletion if referenced by historical invoices or job orders', () => {
    const dbRecords = {
      invoiceServices: [{ id: 1, invoice_id: 10, service_id: 5 }],
      jobOrderServices: [],
      masterOfferServices: []
    };

    const result = checkServiceDependencies(5, dbRecords);
    expect(result.canDelete).toBe(false);
    expect(result.dependencies.invoices_count).toBe(1);
  });

  test('allows service deletion when no active or historical references exist', () => {
    const dbRecords = {
      invoiceServices: [],
      jobOrderServices: [],
      masterOfferServices: []
    };

    const result = checkServiceDependencies(99, dbRecords);
    expect(result.canDelete).toBe(true);
    expect(result.dependencies.invoices_count).toBe(0);
  });
});
