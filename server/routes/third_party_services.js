const express = require('express');
const router = express.Router();
const db = require('../db');

// GET all third-party services
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM third_party_services ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET a single third-party service
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await db.query('SELECT * FROM third_party_services WHERE id = $1', [id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Third-party service not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// CREATE a third-party service
router.post('/', async (req, res) => {
  try {
    const { service_name, vendor_name, labour_count, labour_charge, service_cost, selling_price, is_active } = req.body;
    if (!service_name || selling_price === undefined) {
      return res.status(400).json({ message: 'service_name and selling_price are required' });
    }

    const { rows } = await db.query(
      `INSERT INTO third_party_services
       (service_name, vendor_name, labour_count, labour_charge, service_cost, selling_price, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        service_name,
        vendor_name || null,
        labour_count !== undefined ? labour_count : 1,
        labour_charge || 0,
        service_cost || 0,
        selling_price,
        is_active !== undefined ? is_active : true,
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// UPDATE a third-party service
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { service_name, vendor_name, labour_count, labour_charge, service_cost, selling_price, is_active } = req.body;
    if (!service_name || selling_price === undefined) {
      return res.status(400).json({ message: 'service_name and selling_price are required' });
    }

    const { rows } = await db.query(
      `UPDATE third_party_services
       SET service_name = $1, vendor_name = $2, labour_count = $3, labour_charge = $4,
           service_cost = $5, selling_price = $6, is_active = $7, updated_at = CURRENT_TIMESTAMP
       WHERE id = $8 RETURNING *`,
      [
        service_name,
        vendor_name || null,
        labour_count !== undefined ? labour_count : 1,
        labour_charge || 0,
        service_cost || 0,
        selling_price,
        is_active !== undefined ? is_active : true,
        id,
      ]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Third-party service not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE a third-party service
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rowCount } = await db.query('DELETE FROM third_party_services WHERE id = $1', [id]);
    if (rowCount === 0) return res.status(404).json({ message: 'Third-party service not found' });
    res.json({ message: 'Third-party service deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
