const express = require('express');
const router = express.Router();
const db = require('../db');
const { recalculateInvoiceTotals } = require('../utils/finance');
const { sendScheduleEmail } = require('../utils/mailer');

// Helper to build invoice number
function buildInvoiceNumber() {
  return `INV-DM-${Date.now()}`;
}

// GET all web bookings
router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT wb.*, s.service_name
      FROM web_bookings wb
      LEFT JOIN services s ON wb.service_id = s.id
      ORDER BY wb.created_at DESC
    `;
    const { rows } = await db.query(query);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching web bookings:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// List existing active bookings for a service on a given day, so staff can see
// what's already taken before picking an allocated time (not just after).
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

// Check for schedule conflicts before confirming a pending booking.
// Bookings have no vehicle_id yet and no checkout time, so the window is
// treated as a fixed 2-hour block from allocated_time, and any other active
// booking/invoice for the same service overlapping that block is a conflict
// (vehicle isn't known yet, so it can't be excluded like the invoice-form check does).
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
      SELECT wb.*, s.service_name
      FROM web_bookings wb
      LEFT JOIN services s ON wb.service_id = s.id
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
  try {
    const {
      full_name, phone, email, vehicle_brand, vehicle_model,
      vehicle_type, service_id, preferred_date, preferred_time_period, additional_notes, status
    } = req.body;

    if (!full_name || !phone) {
      return res.status(400).json({ message: 'full_name and phone are required' });
    }

    const insertQuery = `
      INSERT INTO web_bookings (
        full_name, phone, email, vehicle_brand, vehicle_model,
        vehicle_type, service_id, preferred_date, preferred_time_period, additional_notes, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, COALESCE($11, 'pending'))
      RETURNING *
    `;
    const values = [
      full_name, phone, email, vehicle_brand, vehicle_model,
      vehicle_type, service_id || null, preferred_date || null, preferred_time_period || null, additional_notes, status
    ];

    const { rows } = await db.query(insertQuery, values);
    const booking = rows[0];

    if (booking.service_id) {
      const sRes = await db.query('SELECT service_name FROM services WHERE id = $1', [booking.service_id]);
      if (sRes.rows.length > 0) booking.service_name = sRes.rows[0].service_name;
    }

    sendScheduleEmail(booking, 'created').catch(err => console.error('sendScheduleEmail (create) failed:', err));

    res.status(201).json(booking);
  } catch (err) {
    console.error('Error creating web booking:', err);
    res.status(500).json({ message: 'Server error' });
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

    if (updatedBooking.service_id) {
      const sRes = await db.query('SELECT service_name FROM services WHERE id = $1', [updatedBooking.service_id]);
      if (sRes.rows.length > 0) updatedBooking.service_name = sRes.rows[0].service_name;
    }

    if (isReschedule) {
      sendScheduleEmail(updatedBooking, 'rescheduled').catch(err => console.error('sendScheduleEmail (reschedule) failed:', err));
    } else if (isStatusChange) {
      sendScheduleEmail(updatedBooking, updatedBooking.status).catch(err => console.error('sendScheduleEmail (status) failed:', err));
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

    // 2. Find or Create Client by Phone
    let clientId;
    const clientRes = await client.query('SELECT id FROM clients WHERE phone = $1', [booking.phone]);
    if (clientRes.rows.length > 0) {
      clientId = clientRes.rows[0].id;
    } else {
      const newClientRes = await client.query(
        'INSERT INTO clients (full_name, phone, email) VALUES ($1, $2, $3) RETURNING id',
        [booking.full_name, booking.phone, booking.email]
      );
      clientId = newClientRes.rows[0].id;
    }

    // 3. Find or Create Vehicle for this Client
    let vehicleId;
    const makeModel = `${booking.vehicle_brand || ''} ${booking.vehicle_model || ''}`.trim();
    if (makeModel) {
      const vehicleRes = await client.query(
        'SELECT id FROM vehicles WHERE client_id = $1 AND LOWER(make_model) = LOWER($2)',
        [clientId, makeModel]
      );
      if (vehicleRes.rows.length > 0) {
        vehicleId = vehicleRes.rows[0].id;
      } else {
        const newVehicleRes = await client.query(
          'INSERT INTO vehicles (client_id, make_model, license_vin) VALUES ($1, $2, $3) RETURNING id',
          [clientId, makeModel, 'TBD']
        );
        vehicleId = newVehicleRes.rows[0].id;
      }
    } else {
      // Create an "Unknown Vehicle" if nothing is provided so that FK constraints are satisfied if necessary
      const newVehicleRes = await client.query(
        'INSERT INTO vehicles (client_id, make_model, license_vin) VALUES ($1, $2, $3) RETURNING id',
        [clientId, 'Unknown Vehicle', 'TBD']
      );
      vehicleId = newVehicleRes.rows[0].id;
    }

    // 4. Create Invoice
    const invoiceNumber = buildInvoiceNumber();
    const discountAmt = Number(discount) || 0;

    // Status is 'open' initially, will be recalculated if fully paid
    const invRes = await client.query(
      `INSERT INTO invoices (
         invoice_number, client_id, vehicle_id, status,
         discount, special_notes, include_terms
       ) VALUES (
         $1, $2, $3, $4,
         $5, $6, $7
       ) RETURNING id`,
      [
        invoiceNumber, clientId, vehicleId, 'open',
        discountAmt, special_notes || booking.additional_notes || null, true
      ]
    );
    const invoiceId = invRes.rows[0].id;

    // 5. Insert Invoice Service if applicable
    if (booking.service_id) {
      // Base price is no longer available; use 0 or fetch from vehicle_prices if needed
      // Default to 0 for now
      const basePrice = 0;

      await client.query(
        'INSERT INTO invoice_services (invoice_order_id, service_id, unit_price) VALUES ($1, $2, $3)',
        [invoiceId, booking.service_id, basePrice]
      );
    }

    // 6. Insert Payment if amount_paid > 0
    const paidAmt = Number(amount_paid) || 0;
    if (paidAmt > 0) {
      const pm = String(payment_method || 'cash').toLowerCase().replace(/\s+/g, '_');
      await client.query(
        'INSERT INTO payments (invoice_order_id, amount, payment_method, payment_date) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)',
        [invoiceId, paidAmt, pm]
      );
    }

    // 7. Recalculate invoice totals (this updates sub_total, grand_total, balance_due, and auto-completes status if balance is 0)
    await recalculateInvoiceTotals(invoiceId, client);

    // 8. Update Web Booking status to converted
    const { rows: updatedBookingRows } = await client.query(
      'UPDATE web_bookings SET status = $1, invoice_order_id = $2 WHERE booking_id = $3 RETURNING *',
      ['converted', invoiceId, id]
    );
    const convertedBooking = updatedBookingRows[0];
    if (convertedBooking.service_id) {
      const sRes = await client.query('SELECT service_name FROM services WHERE id = $1', [convertedBooking.service_id]);
      if (sRes.rows.length > 0) convertedBooking.service_name = sRes.rows[0].service_name;
    }

    // Commit Transaction
    await client.query('COMMIT');

    sendScheduleEmail(convertedBooking, 'converted').catch(err => console.error('sendScheduleEmail (converted) failed:', err));

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
