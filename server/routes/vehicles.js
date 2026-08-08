const express = require('express');
const router = express.Router();
const db = require('../db');

// GET all vehicles
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT v.*, c.full_name as client_name, o.org_name as organization_name 
      FROM vehicles v 
      LEFT JOIN clients c ON v.client_id = c.id 
      LEFT JOIN organizations o ON v.organization_id = o.id
      ORDER BY v.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET a single vehicle
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await db.query('SELECT * FROM vehicles WHERE id = $1', [id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Vehicle not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// CREATE a vehicle
router.post('/', async (req, res) => {
  try {
    const { client_id, organization_id, make_model, license_vin, induction_date, is_active } = req.body;
    if ((!client_id && !organization_id) || !make_model) {
      return res.status(400).json({ message: 'Either client_id or organization_id, and make_model are required' });
    }

    const { rows } = await db.query(
      `INSERT INTO vehicles (client_id, organization_id, make_model, license_vin, induction_date, is_active)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        client_id || null,
        organization_id || null,
        make_model,
        license_vin,
        induction_date || new Date(),
        is_active !== undefined ? !!is_active : true,
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// UPDATE a vehicle
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { client_id, organization_id, make_model, license_vin, induction_date, is_active } = req.body;
    if ((!client_id && !organization_id) || !make_model) {
      return res.status(400).json({ message: 'Either client_id or organization_id, and make_model are required' });
    }

    const { rows } = await db.query(
      `UPDATE vehicles SET
         client_id = $1, organization_id = $2, make_model = $3, license_vin = $4, induction_date = $5,
         is_active = COALESCE($6, is_active),
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $7 RETURNING *`,
      [
        client_id || null,
        organization_id || null,
        make_model,
        license_vin,
        induction_date,
        is_active !== undefined ? !!is_active : null,
        id,
      ]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Vehicle not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE a vehicle
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rowCount } = await db.query('DELETE FROM vehicles WHERE id = $1', [id]);
    if (rowCount === 0) return res.status(404).json({ message: 'Vehicle not found' });
    res.json({ message: 'Vehicle deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
