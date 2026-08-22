const express = require('express');
const router = express.Router();
const db = require('../db');
const { requirePermission } = require('../middleware/permissions');

router.use(requirePermission('Customers'));

// GET all vehicles
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT v.*, c.full_name as client_name, o.org_name as organization_name, vt.name as vehicle_type_name
      FROM vehicles v 
      LEFT JOIN clients c ON v.client_id = c.id 
      LEFT JOIN organizations o ON v.organization_id = o.id
      LEFT JOIN vehicle_types vt ON v.vehicle_type_id = vt.id
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
    const { rows } = await db.query(`
      SELECT v.*, vt.name as vehicle_type_name
      FROM vehicles v
      LEFT JOIN vehicle_types vt ON v.vehicle_type_id = vt.id
      WHERE v.id = $1
    `, [id]);
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
    const { client_id, organization_id, make_model, license_vin, vehicle_type, vehicle_type_id, induction_date, is_active } = req.body;
    if ((!client_id && !organization_id) || !make_model) {
      return res.status(400).json({ message: 'Either client_id or organization_id, and make_model are required' });
    }

    const vtId = (vehicle_type_id && Number(vehicle_type_id) > 0) ? Number(vehicle_type_id) : null;

    const { rows } = await db.query(
      `INSERT INTO vehicles (client_id, organization_id, make_model, license_vin, vehicle_type, vehicle_type_id, induction_date, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        client_id || null,
        organization_id || null,
        make_model,
        license_vin || '',
        vehicle_type || 'Sedan',
        vtId,
        induction_date || new Date(),
        is_active !== undefined ? !!is_active : true,
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Error creating vehicle:', err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
});

// UPDATE a vehicle
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { client_id, organization_id, make_model, license_vin, vehicle_type, vehicle_type_id, induction_date, is_active } = req.body;
    if ((!client_id && !organization_id) || !make_model) {
      return res.status(400).json({ message: 'Either client_id or organization_id, and make_model are required' });
    }

    const vtId = (vehicle_type_id && Number(vehicle_type_id) > 0) ? Number(vehicle_type_id) : null;

    const { rows } = await db.query(
      `UPDATE vehicles SET
         client_id = COALESCE($1, client_id),
         organization_id = COALESCE($2, organization_id),
         make_model = $3,
         license_vin = $4,
         vehicle_type = COALESCE($5, vehicle_type),
         vehicle_type_id = COALESCE($6, vehicle_type_id),
         induction_date = COALESCE($7, induction_date, CURRENT_TIMESTAMP),
         is_active = COALESCE($8, is_active)
       WHERE id = $9 RETURNING *`,
      [
        client_id || null,
        organization_id || null,
        make_model,
        license_vin || '',
        vehicle_type || null,
        vtId,
        induction_date || null,
        is_active !== undefined ? !!is_active : null,
        id,
      ]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Vehicle not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Error updating vehicle:', err);
    res.status(500).json({ message: err.message || 'Server error' });
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
