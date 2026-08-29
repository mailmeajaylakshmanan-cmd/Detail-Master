const express = require('express');
const router = express.Router();
const db = require('../db');
const { pool } = require('../db');
const { recalculateInvoiceTotals } = require('../utils/finance');
const { sendScheduleEmail } = require('../utils/mailer');
const { sendBookingWhatsAppNotification } = require('../utils/whatsapp');

// Helper to build invoice number
function buildInvoiceNumber() {
  return `INV-DM-${Date.now()}`;
}

// GET all web bookings (aggregating multiple services from web_booking_services)
router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT wb.*,
             COALESCE(
               (SELECT string_agg(s.service_name, ', ')
                FROM web_booking_services wbs
                JOIN services s ON wbs.service_id = s.id
                WHERE wbs.booking_id = wb.booking_id),
               s_single.service_name
             ) AS service_name,
             COALESCE(
               (SELECT json_agg(json_build_object('id', s.id, 'service_name', s.service_name, 'category', s.category))
                FROM web_booking_services wbs
                JOIN services s ON wbs.service_id = s.id
                WHERE wbs.booking_id = wb.booking_id),
               CASE WHEN s_single.id IS NOT NULL THEN json_build_array(json_build_object('id', s_single.id, 'service_name', s_single.service_name, 'category', s_single.category)) ELSE '[]'::json END
             ) AS services
      FROM web_bookings wb
      LEFT JOIN services s_single ON wb.service_id = s_single.id
      ORDER BY wb.created_at DESC
    `;
    const { rows } = await db.query(query);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching web bookings:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// List existing active bookings for a service on a given day
router.get('/busy-slots', async (req, res) => {
  try {
    const { service_id, date } = req.query;
    if (!service_id || !date) return res.json({ slots: [] });
    const { rows } = await db.query(
      `SELECT DISTINCT v.make_model, v.license_vin, iv.checkin_time, iv.checkout_time,
              COALESCE(c.full_name, o.org_name) AS customer_name
       FROM invoice_services isv
       JOIN invoice_vehicles iv ON iv.invoice_order_id = isv.invoice_order_id AND iv.vehicle_id = isv.vehicle_id
       JOIN invoices i ON i.id = iv.invoice_order_id
       JOIN vehicles v ON v.id = iv.vehicle_id
       LEFT JOIN clients c ON i.client_id = c.id
       LEFT JOIN organizations o ON i.organization_id = o.id
       WHERE isv.service_id = $1
         AND iv.checkin_time < ($2::date + interval '1 day')
         AND iv.checkout_time > $2::date
         AND i.status NOT IN ('completed', 'cancelled')
       ORDER BY iv.checkin_time`,
      [service_id, date]
    );
    res.json({ slots: rows });
  } catch (err) {
    console.error('Error fetching busy slots:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Check for schedule conflicts before confirming a pending booking
router.post('/check-conflicts', async (req, res) => {
  try {
    const { service_id, preferred_date, allocated_time } = req.body;
    if (!service_id || !preferred_date || !allocated_time) return res.json({ conflicts: [] });
    const checkin = `${preferred_date} ${allocated_time}`;
    const { rows } = await db.query(
      `SELECT DISTINCT s.service_name, v.make_model, v.license_vin,
              iv.checkin_time, iv.checkout_time,
              COALESCE(c.full_name, o.org_name) AS customer_name
       FROM invoice_services isv
       JOIN services s ON isv.service_id = s.id
       JOIN invoice_vehicles iv ON iv.invoice_order_id = isv.invoice_order_id AND iv.vehicle_id = isv.vehicle_id
       JOIN invoices i ON i.id = iv.invoice_order_id
       JOIN vehicles v ON v.id = iv.vehicle_id
       LEFT JOIN clients c ON i.client_id = c.id
       LEFT JOIN organizations o ON i.organization_id = o.id
       WHERE isv.service_id = $1
         AND iv.checkin_time < ($2::timestamp + interval '2 hours')
         AND iv.checkout_time > $2::timestamp
         AND i.status NOT IN ('completed', 'cancelled')`,
      [service_id, checkin]
    );
    res.json({ conflicts: rows });
  } catch (err) {
    console.error('Error checking booking conflicts:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET a single web booking
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT wb.*,
             COALESCE(
               (SELECT string_agg(s.service_name, ', ')
                FROM web_booking_services wbs
                JOIN services s ON wbs.service_id = s.id
                WHERE wbs.booking_id = wb.booking_id),
               s_single.service_name
             ) AS service_name,
             COALESCE(
               (SELECT json_agg(json_build_object('id', s.id, 'service_name', s.service_name, 'category', s.category))
                FROM web_booking_services wbs
                JOIN services s ON wbs.service_id = s.id
                WHERE wbs.booking_id = wb.booking_id),
               CASE WHEN s_single.id IS NOT NULL THEN json_build_array(json_build_object('id', s_single.id, 'service_name', s_single.service_name, 'category', s_single.category)) ELSE '[]'::json END
             ) AS services
      FROM web_bookings wb
      LEFT JOIN services s_single ON wb.service_id = s_single.id
      WHERE wb.booking_id = $1
    `;
    const { rows } = await db.query(query, [id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Booking not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Error fetching web booking:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// CREATE a web booking
router.post('/', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const {
      full_name,
      phone,
      email,
      vehicle_brand,
      vehicle_model,
      vehicle_type,
      vehicle_type_id,
      service_id,
      service_ids,
      services,
      preferred_date,
      preferred_time_period,
      additional_notes
    } = req.body;

    // 1. Resolve vehicle_type_id
    let resolvedVehicleTypeId = vehicle_type_id ? Number(vehicle_type_id) : null;
    if (!resolvedVehicleTypeId && vehicle_type) {
      const vtRes = await client.query(
        'SELECT id FROM vehicle_types WHERE LOWER(name) = LOWER($1) LIMIT 1',
        [String(vehicle_type).trim()]
      );
      if (vtRes.rows.length > 0) {
        resolvedVehicleTypeId = vtRes.rows[0].id;
      }
    }

    // 2. Determine primary service ID (single integer for web_bookings table)
    const primaryServiceId = Number(
      service_id ||
      (Array.isArray(service_ids) && service_ids[0]) ||
      (Array.isArray(services) && (services[0]?.id || services[0]?.service_id || services[0])) ||
      1
    );

    // 3. Insert into web_bookings
    const insertBookingQuery = `
      INSERT INTO web_bookings (
        full_name,
        phone,
        email,
        vehicle_brand,
        vehicle_model,
        vehicle_type,
        vehicle_type_id,
        service_id,
        preferred_date,
        preferred_time_period,
        additional_notes,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending')
      RETURNING *
    `;
    const bookingRes = await client.query(insertBookingQuery, [
      full_name,
      phone,
      email || null,
      vehicle_brand || null,
      vehicle_model || null,
      vehicle_type || null,
      resolvedVehicleTypeId,
      primaryServiceId,
      preferred_date || null,
      preferred_time_period || null,
      additional_notes || null
    ]);
    const newBooking = bookingRes.rows[0];
    const newBookingId = newBooking.booking_id;

    // 4. Insert all selected services into web_booking_services junction table
    const allServices = service_ids || services || (service_id ? [service_id] : [primaryServiceId]);
    const serviceArray = Array.isArray(allServices) ? allServices : [allServices];
    for (const item of serviceArray) {
      const sId = typeof item === 'object' ? Number(item.service_id || item.id) : Number(item);
      if (!isNaN(sId) && sId > 0) {
        await client.query(
          `INSERT INTO web_booking_services (booking_id, service_id)
           VALUES ($1, $2)
           ON CONFLICT (booking_id, service_id) DO NOTHING`,
          [newBookingId, sId]
        );
      }
    }
    await client.query('COMMIT');

    // 5. Fetch full service names and send notifications safely (timeout-bounded for serverless & fast delivery)
    const { rows: svcRows } = await client.query(
      `SELECT string_agg(s.service_name, ', ') AS service_name
       FROM web_booking_services wbs
       JOIN services s ON wbs.service_id = s.id
       WHERE wbs.booking_id = $1`,
      [newBookingId]
    );
    newBooking.service_name = svcRows[0]?.service_name || 'General Detailing';

    try {
      const notifyPromise = Promise.allSettled([
        sendScheduleEmail(newBooking, 'created'),
        sendBookingWhatsAppNotification(newBooking, serviceArray, 'created')
      ]);
      // Give notifications up to 5s to dispatch before returning response
      await Promise.race([
        notifyPromise,
        new Promise(resolve => setTimeout(resolve, 5000))
      ]);
    } catch (err) {
      console.error('[web_bookings] Notification dispatch error:', err);
    }

    return res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      booking: newBooking,
      service_ids: serviceArray
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating web booking:', error);
    return res.status(500).json({ message: 'Failed to create booking', error: error.message });
  } finally {
    client.release();
  }
});

// UPDATE a web booking (status, reschedule, allocated_time, cancel_reason, or invoice_order_id)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, invoice_order_id, preferred_date, allocated_time, cancel_reason } = req.body;

    const { rows: current } = await db.query('SELECT * FROM web_bookings WHERE booking_id = $1', [id]);
    if (current.length === 0) return res.status(404).json({ message: 'Booking not found' });
    const existing = current[0];

    const isReschedule = preferred_date !== undefined
      && new Date(preferred_date).toDateString() !== new Date(existing.preferred_date).toDateString();
    const isStatusChange = status !== undefined && status !== existing.status;

    const updateQuery = `
      UPDATE web_bookings
      SET
        status = COALESCE($1, status),
        invoice_order_id = COALESCE($2, invoice_order_id),
        preferred_date = COALESCE($3, preferred_date),
        allocated_time = COALESCE($4, allocated_time),
        cancel_reason = COALESCE($5, cancel_reason),
        previous_preferred_date = CASE WHEN $6 THEN preferred_date ELSE previous_preferred_date END
      WHERE booking_id = $7
      RETURNING *
    `;

    const { rows } = await db.query(updateQuery, [
      status, invoice_order_id, preferred_date, allocated_time, cancel_reason, isReschedule, id
    ]);
    const updatedBooking = rows[0];

    // Fetch full aggregated service names for email and WhatsApp
    const { rows: svcRows } = await db.query(
      `SELECT string_agg(s.service_name, ', ') AS service_name
       FROM web_booking_services wbs
       JOIN services s ON wbs.service_id = s.id
       WHERE wbs.booking_id = $1`,
      [id]
    );
    if (svcRows[0]?.service_name) {
      updatedBooking.service_name = svcRows[0].service_name;
    } else if (updatedBooking.service_id) {
      const sRes = await db.query('SELECT service_name FROM services WHERE id = $1', [updatedBooking.service_id]);
      if (sRes.rows.length > 0) updatedBooking.service_name = sRes.rows[0].service_name;
    }

    if (isReschedule || isStatusChange) {
      const eventType = isReschedule ? 'rescheduled' : updatedBooking.status;
      try {
        const notifyPromise = Promise.allSettled([
          sendScheduleEmail(updatedBooking, eventType),
          sendBookingWhatsAppNotification(updatedBooking, [], eventType)
        ]);
        await Promise.race([
          notifyPromise,
          new Promise(resolve => setTimeout(resolve, 5000))
        ]);
      } catch (err) {
        console.error('[web_bookings] Update notification dispatch error:', err);
      }
    }

    res.json(updatedBooking);
  } catch (err) {
    console.error('Error updating web booking:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE a web booking
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rowCount } = await db.query('DELETE FROM web_bookings WHERE booking_id = $1', [id]);
    if (rowCount === 0) return res.status(404).json({ message: 'Booking not found' });
    res.json({ message: 'Booking deleted successfully' });
  } catch (err) {
    console.error('Error deleting web booking:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// CONVERT a web booking into an invoice
router.post('/:id/convert', async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { id } = req.params;
    const { amount_paid, payment_method, discount, special_notes } = req.body;

    await client.query('BEGIN');

    // 1. Fetch the web_booking
    const bookingRes = await client.query('SELECT * FROM web_bookings WHERE booking_id = $1', [id]);
    if (bookingRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Booking not found' });
    }
    const booking = bookingRes.rows[0];
    if (booking.status === 'converted' || booking.invoice_order_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Booking is already converted' });
    }

    // 2. Resolve Vehicle Type ID
    let vehicleTypeId = booking.vehicle_type_id || null;
    if (!vehicleTypeId && booking.vehicle_type) {
      const vtRes = await client.query(
        'SELECT id FROM vehicle_types WHERE LOWER(name) = LOWER($1) LIMIT 1',
        [booking.vehicle_type.trim()]
      );
      if (vtRes.rows.length > 0) {
        vehicleTypeId = vtRes.rows[0].id;
      }
    }

    // 3. Find or Create Client by Phone
    let clientId;
    const clientRes = await client.query('SELECT id FROM clients WHERE phone = $1', [booking.phone]);
    if (clientRes.rows.length > 0) {
      clientId = clientRes.rows[0].id;
      if (booking.email || booking.full_name) {
        await client.query(
          `UPDATE clients
           SET full_name = COALESCE(NULLIF(full_name, ''), $1),
               email = COALESCE(NULLIF(email, ''), $2)
           WHERE id = $3`,
          [booking.full_name, booking.email || null, clientId]
        );
      }
    } else {
      const newClientRes = await client.query(
        'INSERT INTO clients (full_name, phone, email) VALUES ($1, $2, $3) RETURNING id',
        [booking.full_name, booking.phone, booking.email || null]
      );
      clientId = newClientRes.rows[0].id;
    }

    // 4. Find or Create Vehicle for this Client
    let vehicleId;
    const makeModel = `${booking.vehicle_brand || ''} ${booking.vehicle_model || ''}`.trim() || 'Unknown Vehicle';
    const vehicleRes = await client.query(
      'SELECT id, vehicle_type_id FROM vehicles WHERE client_id = $1 AND LOWER(make_model) = LOWER($2)',
      [clientId, makeModel]
    );
    if (vehicleRes.rows.length > 0) {
      vehicleId = vehicleRes.rows[0].id;
      if (!vehicleRes.rows[0].vehicle_type_id && vehicleTypeId) {
        await client.query(
          'UPDATE vehicles SET vehicle_type_id = $1, vehicle_type = COALESCE(vehicle_type, $2) WHERE id = $3',
          [vehicleTypeId, booking.vehicle_type || null, vehicleId]
        );
      }
    } else {
      const newVehicleRes = await client.query(
        'INSERT INTO vehicles (client_id, make_model, license_vin, vehicle_type_id, vehicle_type) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [clientId, makeModel, 'TBD', vehicleTypeId, booking.vehicle_type || null]
      );
      vehicleId = newVehicleRes.rows[0].id;
    }

    // 5. Create Invoice
    const invoiceNumber = buildInvoiceNumber();
    const discountAmt = Number(discount) || 0;

    const invRes = await client.query(
      `INSERT INTO invoices (
         invoice_number, client_id, vehicle_id, status,
         discount, special_notes, include_terms
       ) VALUES (
         $1, $2, $3, 'open',
         $4, $5, true
       ) RETURNING id`,
      [
        invoiceNumber, clientId, vehicleId,
        discountAmt, special_notes || booking.additional_notes || null
      ]
    );
    const invoiceId = invRes.rows[0].id;

    // 6. Record Vehicle Visit in invoice_vehicles
    const checkinTime = booking.preferred_date
      ? (booking.allocated_time ? `${new Date(booking.preferred_date).toISOString().split('T')[0]} ${booking.allocated_time}` : booking.preferred_date)
      : null;

    await client.query(
      `INSERT INTO invoice_vehicles (invoice_order_id, vehicle_id, visitor_name, visitor_phone, checkin_time)
       VALUES ($1, $2, $3, $4, $5)`,
      [invoiceId, vehicleId, booking.full_name, booking.phone, checkinTime]
    );

    // 7. Get all service IDs from web_booking_services (fallback to booking.service_id)
    const bookingServicesRes = await client.query(
      'SELECT service_id FROM web_booking_services WHERE booking_id = $1',
      [id]
    );

    let serviceIds = bookingServicesRes.rows.map(r => Number(r.service_id)).filter(Boolean);
    if (serviceIds.length === 0 && booking.service_id) {
      serviceIds = [Number(booking.service_id)];
    }

    // 8. Insert each service into invoice_services with price for this vehicle type
    for (const sId of serviceIds) {
      let unitPrice = 0;
      if (vehicleTypeId) {
        const priceRes = await client.query(
          'SELECT price FROM service_vehicle_prices WHERE service_id = $1 AND vehicle_type_id = $2',
          [sId, vehicleTypeId]
        );
        if (priceRes.rows.length > 0) {
          unitPrice = Number(priceRes.rows[0].price) || 0;
        }
      }

      if (unitPrice === 0) {
        const fallbackRes = await client.query(
          'SELECT price FROM service_vehicle_prices WHERE service_id = $1 ORDER BY price ASC LIMIT 1',
          [sId]
        );
        if (fallbackRes.rows.length > 0) {
          unitPrice = Number(fallbackRes.rows[0].price) || 0;
        }
      }

      await client.query(
        `INSERT INTO invoice_services (invoice_order_id, service_id, unit_price, quantity, vehicle_id)
         VALUES ($1, $2, $3, 1, $4)`,
        [invoiceId, sId, unitPrice, vehicleId]
      );
    }

    // 9. Insert Payment if amount_paid > 0
    const paidAmt = Number(amount_paid) || 0;
    if (paidAmt > 0) {
      const pm = String(payment_method || 'cash').toLowerCase().replace(/\s+/g, '_');
      await client.query(
        'INSERT INTO payments (invoice_order_id, amount, payment_method, payment_date) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)',
        [invoiceId, paidAmt, pm]
      );
    }

    // 10. Recalculate invoice totals
    await recalculateInvoiceTotals(invoiceId, client);

    // 11. Update Web Booking status to converted
    const { rows: updatedBookingRows } = await client.query(
      'UPDATE web_bookings SET status = $1, invoice_order_id = $2 WHERE booking_id = $3 RETURNING *',
      ['converted', invoiceId, id]
    );
    const convertedBooking = updatedBookingRows[0];
    
    // Fetch full aggregated service names
    const { rows: svcRows } = await client.query(
      `SELECT string_agg(s.service_name, ', ') AS service_name
       FROM web_booking_services wbs
       JOIN services s ON wbs.service_id = s.id
       WHERE wbs.booking_id = $1`,
      [id]
    );
    convertedBooking.service_name = svcRows[0]?.service_name || convertedBooking.service_name || 'General Detailing';

    // Commit Transaction
    await client.query('COMMIT');

    try {
      const notifyPromise = Promise.allSettled([
        sendScheduleEmail(convertedBooking, 'converted'),
        sendBookingWhatsAppNotification(convertedBooking, [], 'converted')
      ]);
      await Promise.race([
        notifyPromise,
        new Promise(resolve => setTimeout(resolve, 5000))
      ]);
    } catch (err) {
      console.error('[web_bookings] Convert notification error:', err);
    }

    res.json({ message: 'Booking converted successfully', invoice_id: invoiceId });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error converting booking to invoice:', err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
});

module.exports = router;
