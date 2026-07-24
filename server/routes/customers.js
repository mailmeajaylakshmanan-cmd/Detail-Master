const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');
const auth = require('../middleware/auth');
const { secureFind, secureFindOne } = require('../utils/queryHelper');

// GET all customers (with search for autocomplete)
router.get('/', auth, async (req, res) => {
  try {
    const { search } = req.query;
    let customers;

    if (search) {
      // High-performance Atlas Search (Requires Search Index to be built manually in MongoDB Atlas)
      // Fallback to normal query if we just want basic regex before index builds:
      customers = await Customer.aggregate([
        {
          $search: {
            index: "default", // Name of the Atlas Search Index
            text: {
              query: search,
              path: ["name", "phone"]
            }
          }
        },

        { $limit: 10000 },
        { $sort: { name: 1 } }
      ]);
    } else {
      customers = await secureFind(Customer, {}).sort({ name: 1 }).lean();
    }

    // Dynamically calculate bookings based on invoices
    const Invoice = require('../models/Invoice');
    const phones = customers.map(c => c.phone);
    
    const invoiceCounts = await Invoice.aggregate([
      { $match: { 'customer.phone': { $in: phones } } },
      { $group: { _id: '$customer.phone', count: { $sum: 1 } } }
    ]);

    const countMap = {};
    invoiceCounts.forEach(item => {
      countMap[item._id] = item.count;
    });

    customers = customers.map(c => ({
      ...c,
      totalInvoices: countMap[c.phone] || 0
    }));

    res.json(customers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST create customer
router.post('/', auth, async (req, res) => {
  try {
    const existing = await secureFindOne(Customer, { phone: req.body.phone }).lean();
    if (existing) return res.status(400).json({ message: 'Customer with this phone already exists' });
    const customer = new Customer(req.body);
    await customer.save();
    res.status(201).json(customer);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT update customer
router.put('/:id', auth, async (req, res) => {
  try {
    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    res.json(customer);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PATCH customer status (Active/Inactive)
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { isActive } = req.body;
    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true }
    );
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    res.json(customer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
