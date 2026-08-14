const express = require('express');
const router = express.Router();
const db = require('../db');

// GET all vehicle types
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM vehicle_types ORDER BY id ASC');
    res.json(rows);
  } catch (err) {
    console.error('Error fetching vehicle types:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET single vehicle type
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await db.query('SELECT * FROM vehicle_types WHERE id = $1', [id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Vehicle type not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Error fetching vehicle type:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// CREATE a vehicle type
router.post('/', async (req, res) => {
  try {
    const { name, is_active } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ message: 'Vehicle type name is required' });

    const trimmedName = name.trim();
    const activeFlag = is_active !== undefined ? !!is_active : true;

    const { rows } = await db.query(
      `INSERT INTO vehicle_types (name, is_active) VALUES ($1, $2) RETURNING *`,
      [trimmedName, activeFlag]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ message: 'A vehicle type with this name already exists' });
    }
    console.error('Error creating vehicle type:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// UPDATE a vehicle type
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, is_active } = req.body;

    if (!name || !name.trim()) return res.status(400).json({ message: 'Vehicle type name is required' });

    const trimmedName = name.trim();
    const activeFlag = is_active !== undefined ? !!is_active : true;

    const { rows } = await db.query(
      `UPDATE vehicle_types 
       SET name = $1, is_active = $2, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $3 RETURNING *`,
      [trimmedName, activeFlag, id]
    );

    if (rows.length === 0) return res.status(404).json({ message: 'Vehicle type not found' });
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ message: 'A vehicle type with this name already exists' });
    }
    console.error('Error updating vehicle type:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET dependency counts before deleting
router.get('/:id/dependencies', async (req, res) => {
  try {
    const { id } = req.params;
    const [vRes, wbRes, svpRes] = await Promise.all([
      db.query('SELECT COUNT(*)::int AS count FROM vehicles WHERE vehicle_type_id = $1', [id]),
      db.query('SELECT COUNT(*)::int AS count FROM web_bookings WHERE vehicle_type_id = $1', [id]),
      db.query('SELECT COUNT(*)::int AS count FROM service_vehicle_prices WHERE vehicle_type_id = $1', [id]),
    ]);

    const vehicles = vRes.rows[0]?.count || 0;
    const webBookings = wbRes.rows[0]?.count || 0;
    const servicePrices = svpRes.rows[0]?.count || 0;
    const total = vehicles + webBookings + servicePrices;

    res.json({ vehicles, webBookings, servicePrices, total });
  } catch (err) {
    console.error('Error checking dependencies:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE a vehicle type
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rowCount } = await db.query('DELETE FROM vehicle_types WHERE id = $1', [id]);
    if (rowCount === 0) return res.status(404).json({ message: 'Vehicle type not found' });
    res.json({ message: 'Vehicle type deleted successfully' });
  } catch (err) {
    if (err.code === '23503') {
      return res.status(400).json({ message: 'Cannot delete vehicle type because it is referenced by existing vehicles or bookings' });
    }
    console.error('Error deleting vehicle type:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
