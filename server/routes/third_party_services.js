const express = require('express');
const router = express.Router();
const db = require('../db');
const { requirePermission } = require('../middleware/permissions');

router.use(requirePermission('Third-Party Services'));

async function saveVehiclePrices(tpServiceId, vehiclePrices) {
  if (!Array.isArray(vehiclePrices)) return;
  for (const item of vehiclePrices) {
    if (!item.vehicle_type_id) continue;
    const priceVal = Number(item.selling_price ?? item.price) || 0;
    await db.query(
      `INSERT INTO third_party_service_vehicle_prices (third_party_service_id, vehicle_type_id, selling_price)
       VALUES ($1, $2, $3)
       ON CONFLICT (third_party_service_id, vehicle_type_id)
       DO UPDATE SET selling_price = EXCLUDED.selling_price, updated_at = CURRENT_TIMESTAMP`,
      [tpServiceId, item.vehicle_type_id, priceVal]
    );
  }
}

// GET all third-party services (with vehicle_prices)
router.get('/', async (req, res) => {
  try {
    const { rows: items } = await db.query('SELECT * FROM third_party_services ORDER BY created_at DESC');
    const { rows: vpRows } = await db.query(`
      SELECT tpsvp.id, tpsvp.third_party_service_id, tpsvp.vehicle_type_id, vt.name AS vehicle_type_name, tpsvp.selling_price
      FROM third_party_service_vehicle_prices tpsvp
      JOIN vehicle_types vt ON tpsvp.vehicle_type_id = vt.id
    `);

    const vpMap = {};
    vpRows.forEach(vp => {
      if (!vpMap[vp.third_party_service_id]) vpMap[vp.third_party_service_id] = [];
      vpMap[vp.third_party_service_id].push({
        id: vp.id,
        vehicle_type_id: vp.vehicle_type_id,
        vehicle_type_name: vp.vehicle_type_name,
        selling_price: Number(vp.selling_price)
      });
    });

    const result = items.map(t => ({
      ...t,
      vehicle_prices: vpMap[t.id] || []
    }));

    res.json(result);
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

    const item = rows[0];
    const { rows: vpRows } = await db.query(`
      SELECT tpsvp.id, tpsvp.third_party_service_id, tpsvp.vehicle_type_id, vt.name AS vehicle_type_name, tpsvp.selling_price
      FROM third_party_service_vehicle_prices tpsvp
      JOIN vehicle_types vt ON tpsvp.vehicle_type_id = vt.id
      WHERE tpsvp.third_party_service_id = $1
    `, [id]);

    item.vehicle_prices = vpRows.map(vp => ({
      id: vp.id,
      vehicle_type_id: vp.vehicle_type_id,
      vehicle_type_name: vp.vehicle_type_name,
      selling_price: Number(vp.selling_price)
    }));

    res.json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// CREATE a third-party service
router.post('/', async (req, res) => {
  try {
    const { service_name, vendor_name, vendor_cost, labour_count, labour_charge, selling_price, is_active, vehicle_prices } = req.body;
    if (!service_name || selling_price === undefined) {
      return res.status(400).json({ message: 'service_name and selling_price are required' });
    }

    const { rows } = await db.query(
      `INSERT INTO third_party_services
       (service_name, vendor_name, vendor_cost, labour_count, labour_charge, selling_price, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        service_name,
        vendor_name || null,
        vendor_cost || 0,
        labour_count !== undefined ? labour_count : 1,
        labour_charge || 0,
        selling_price,
        is_active !== undefined ? is_active : true,
      ]
    );

    const createdItem = rows[0];

    if (vehicle_prices && Array.isArray(vehicle_prices)) {
      await saveVehiclePrices(createdItem.id, vehicle_prices);
    }

    const { rows: vpRows } = await db.query(`
      SELECT tpsvp.id, tpsvp.third_party_service_id, tpsvp.vehicle_type_id, vt.name AS vehicle_type_name, tpsvp.selling_price
      FROM third_party_service_vehicle_prices tpsvp
      JOIN vehicle_types vt ON tpsvp.vehicle_type_id = vt.id
      WHERE tpsvp.third_party_service_id = $1
    `, [createdItem.id]);

    createdItem.vehicle_prices = vpRows.map(vp => ({
      id: vp.id,
      vehicle_type_id: vp.vehicle_type_id,
      vehicle_type_name: vp.vehicle_type_name,
      selling_price: Number(vp.selling_price)
    }));

    res.status(201).json(createdItem);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// UPDATE a third-party service
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { service_name, vendor_name, vendor_cost, labour_count, labour_charge, selling_price, is_active, vehicle_prices } = req.body;
    if (!service_name || selling_price === undefined) {
      return res.status(400).json({ message: 'service_name and selling_price are required' });
    }

    const { rows } = await db.query(
      `UPDATE third_party_services
       SET service_name = $1, vendor_name = $2, vendor_cost = $3, labour_count = $4, labour_charge = $5,
           selling_price = $6, is_active = $7, updated_at = CURRENT_TIMESTAMP
       WHERE id = $8 RETURNING *`,
      [
        service_name,
        vendor_name || null,
        vendor_cost || 0,
        labour_count !== undefined ? labour_count : 1,
        labour_charge || 0,
        selling_price,
        is_active !== undefined ? is_active : true,
        id,
      ]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Third-party service not found' });

    const updatedItem = rows[0];

    if (vehicle_prices && Array.isArray(vehicle_prices)) {
      await saveVehiclePrices(id, vehicle_prices);
    }

    const { rows: vpRows } = await db.query(`
      SELECT tpsvp.id, tpsvp.third_party_service_id, tpsvp.vehicle_type_id, vt.name AS vehicle_type_name, tpsvp.selling_price
      FROM third_party_service_vehicle_prices tpsvp
      JOIN vehicle_types vt ON tpsvp.vehicle_type_id = vt.id
      WHERE tpsvp.third_party_service_id = $1
    `, [id]);

    updatedItem.vehicle_prices = vpRows.map(vp => ({
      id: vp.id,
      vehicle_type_id: vp.vehicle_type_id,
      vehicle_type_name: vp.vehicle_type_name,
      selling_price: Number(vp.selling_price)
    }));

    res.json(updatedItem);
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
