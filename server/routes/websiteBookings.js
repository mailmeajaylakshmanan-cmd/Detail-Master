const express = require('express');
const router = express.Router();
const WebsiteBooking = require('../models/WebsiteBooking');

// GET all website bookings
router.get('/', async (req, res) => {
  try {
    const bookings = await WebsiteBooking.find().sort({ createdAt: -1 });
    res.json(bookings);
  } catch (error) {
    console.error('Error fetching website bookings:', error);
    res.status(500).json({ error: 'Server error fetching bookings' });
  }
});

// POST a new website booking (public route for the actual website to hit)
router.post('/', async (req, res) => {
  try {
    const newBooking = new WebsiteBooking(req.body);
    await newBooking.save();
    res.status(201).json({ message: 'Booking received successfully', booking: newBooking });
  } catch (error) {
    console.error('Error creating website booking:', error);
    res.status(400).json({ error: 'Failed to create booking', details: error.message });
  }
});

// PUT to update booking status
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['Pending', 'Confirmed', 'Cancelled', 'Completed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    const booking = await WebsiteBooking.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    res.json(booking);
  } catch (error) {
    console.error('Error updating booking status:', error);
    res.status(500).json({ error: 'Server error updating booking' });
  }
});

module.exports = router;
