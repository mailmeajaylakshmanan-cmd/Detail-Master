const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { protect } = require('../middleware/auth');

const mapOffer = (row) => ({
  id: row.id,
  name: row.name,
  description: row.description,
  defaultPrice: row.default_price,
  defaultValidityDays: row.default_validity_days,
  totalWashes: row.total_washes,
  freeWashes: row.free_washes,
  terms: row.terms,
  isActive: row.is_active,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

// GET /offerMaster
router.get('/', protect, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM master_offers ORDER BY name ASC'
    );
    res.json(result.rows.map(mapOffer));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /offerMaster/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM master_offers WHERE id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Offer not found' });
    }
    res.json(mapOffer(result.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /offerMaster
router.post('/', protect, async (req, res) => {
  const { name, description, defaultPrice, defaultValidityDays, totalWashes, freeWashes, terms } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO master_offers 
       (name, description, default_price, default_validity_days, total_washes, free_washes, terms)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [name, description, defaultPrice || 0, defaultValidityDays || 365, totalWashes || 0, freeWashes || 0, terms]
    );
    res.status(201).json(mapOffer(result.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /offerMaster/:id
router.put('/:id', protect, async (req, res) => {
  const { name, description, defaultPrice, defaultValidityDays, totalWashes, freeWashes, terms, is_active } = req.body;
  try {
    const result = await pool.query(
      `UPDATE master_offers SET 
        name = $1, 
        description = $2, 
        default_price = $3, 
        default_validity_days = $4,
        total_washes = $5,
        free_washes = $6,
        terms = $7,
        is_active = COALESCE($8, is_active),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $9 RETURNING *`,
      [name, description, defaultPrice, defaultValidityDays, totalWashes || 0, freeWashes || 0, terms, is_active, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Offer not found' });
    }
    res.json(mapOffer(result.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /offerMaster/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM master_offers WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Offer not found' });
    }
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
