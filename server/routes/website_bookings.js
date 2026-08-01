const express = require('express');
const router = express.Router();
const db = require('../db');
const { sendScheduleEmail } = require('../utils/mailer');

// GET all bookings (excludes soft-deleted)
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM website_bookings WHERE is_deleted = FALSE ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// CREATE a booking (what the public website booking form calls)
router.post('/', async (req, res) => {
  try {
    const {
      customer_name, customer_phone, customer_email,
      car_make, car_model, service_interested, preferred_date, notes
    } = req.body;

    if (!customer_name || !customer_phone) {
      return res.status(400).json({ message: 'customer_name and customer_phone are required' });
    }

    const { rows } = await db.query(
      `INSERT INTO website_bookings
       (customer_name, customer_phone, customer_email, car_make, car_model, service_interested, preferred_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [customer_name, customer_phone, customer_email, car_make, car_model, service_interested, preferred_date, notes]
    );

    sendScheduleEmail(rows[0], 'created').catch(err => console.error('sendScheduleEmail (create) failed:', err));

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// UPDATE a booking — status change, reschedule, or soft-delete
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, preferred_date, is_deleted } = req.body;

    const { rows: current } = await db.query('SELECT * FROM website_bookings WHERE id = $1', [id]);
    if (current.length === 0) return res.status(404).json({ message: 'Booking not found' });
    const existing = current[0];

    const isReschedule = preferred_date !== undefined
      && new Date(preferred_date).getTime() !== new Date(existing.preferred_date).getTime();
    const isStatusChange = status !== undefined && status !== existing.status;

    const { rows } = await db.query(
      `UPDATE website_bookings
       SET status = COALESCE($1, status),
           preferred_date = COALESCE($2, preferred_date),
           previous_preferred_date = CASE WHEN $3 THEN preferred_date ELSE previous_preferred_date END,
           is_deleted = COALESCE($4, is_deleted),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 RETURNING *`,
      [status, preferred_date, isReschedule, is_deleted, id]
    );

    // Reschedule takes priority in the email if both happened in the same request
    if (isReschedule) {
      sendScheduleEmail(rows[0], 'rescheduled').catch(err => console.error('sendScheduleEmail (reschedule) failed:', err));
    } else if (isStatusChange) {
      sendScheduleEmail(rows[0], rows[0].status).catch(err => console.error('sendScheduleEmail (status) failed:', err));
    }

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
