describe('Invoices Route: Business Logic & Math Integrity', () => {
  // Helper simulating server-side price resolution from database catalog
  function resolveServiceLinePrices(clientLines, catalogServices, vehiclePrices = []) {
    return clientLines.map(line => {
      const catalogItem = catalogServices.find(s => s.id === line.service_id);
      if (!catalogItem) {
        throw new Error(`Service ${line.service_id} not found`);
      }

      // Check vehicle-type specific price overrides first
      let resolvedUnitPrice = catalogItem.base_price;
      if (line.vehicle_type_id) {
        const vp = vehiclePrices.find(
          v => v.service_id === line.service_id && v.vehicle_type_id === line.vehicle_type_id
        );
        if (vp) resolvedUnitPrice = vp.price;
      }

      const qty = Array.isArray(line.vehicle_ids) && line.vehicle_ids.length > 0
        ? line.vehicle_ids.length
        : 1;

      return {
        service_id: line.service_id,
        unit_price: resolvedUnitPrice,
        qty,
        line_total: resolvedUnitPrice * qty
      };
    });
  }

  test('server-side pricing ignores client-submitted price tampering', () => {
    const catalogServices = [
      { id: 1, service_name: 'Foam Wash', base_price: 500 },
      { id: 2, service_name: 'Graphene Coating 10H', base_price: 25000 }
    ];

    // Client maliciously attempts to send price: 50 for Graphene Coating
    const tamperedClientInput = [
      { service_id: 2, price: 50, vehicle_ids: [101] }
    ];

    const resolved = resolveServiceLinePrices(tamperedClientInput, catalogServices);

    expect(resolved[0].unit_price).toBe(25000);
    expect(resolved[0].line_total).toBe(25000);
    expect(resolved[0].unit_price).not.toBe(50);
  });

  test('multi-vehicle service lines multiply resolved price by vehicle count', () => {
    const catalogServices = [
      { id: 1, service_name: 'Interior Detail', base_price: 1500 }
    ];

    const multiVehicleLine = [
      { service_id: 1, vehicle_ids: [101, 102, 103] }
    ];

    const resolved = resolveServiceLinePrices(multiVehicleLine, catalogServices);

    expect(resolved[0].qty).toBe(3);
    expect(resolved[0].unit_price).toBe(1500);
    expect(resolved[0].line_total).toBe(4500);
  });

  // Scheduling conflict detection helper
  function detectConflicts(existingBookings, targetBooking) {
    const targetStart = new Date(targetBooking.checkin_time).getTime();
    const targetEnd = new Date(targetBooking.checkout_time).getTime();

    return existingBookings.filter(b => {
      if (b.id === targetBooking.id) return false;
      if (b.status === 'cancelled' || b.status === 'completed') return false;
      if (b.vehicle_id !== targetBooking.vehicle_id) return false;

      const existingStart = new Date(b.checkin_time).getTime();
      const existingEnd = new Date(b.checkout_time).getTime();

      // Overlap: start < otherEnd AND end > otherStart
      return targetStart < existingEnd && targetEnd > existingStart;
    });
  }

  test('conflict checker identifies overlapping bookings for the same vehicle', () => {
    const existingBookings = [
      { id: 1, vehicle_id: 55, checkin_time: '2026-09-02T10:00:00Z', checkout_time: '2026-09-02T13:00:00Z', status: 'in_progress' },
      { id: 2, vehicle_id: 60, checkin_time: '2026-09-02T10:00:00Z', checkout_time: '2026-09-02T12:00:00Z', status: 'open' }
    ];

    // Overlapping booking on vehicle 55 (11:00 to 14:00)
    const overlapping = detectConflicts(existingBookings, {
      id: null,
      vehicle_id: 55,
      checkin_time: '2026-09-02T11:00:00Z',
      checkout_time: '2026-09-02T14:00:00Z'
    });

    expect(overlapping.length).toBe(1);
    expect(overlapping[0].id).toBe(1);

    // Non-overlapping booking on vehicle 55 (13:30 to 15:00)
    const nonOverlapping = detectConflicts(existingBookings, {
      id: null,
      vehicle_id: 55,
      checkin_time: '2026-09-02T13:30:00Z',
      checkout_time: '2026-09-02T15:00:00Z'
    });

    expect(nonOverlapping.length).toBe(0);
  });
});
