const express = require('express');
const router = express.Router();
const db = require('../db');

// GET all clients with their vehicles (single query)
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        c.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', v.id,
              'make_model', v.make_model,
              'license_vin', v.license_vin
            )
            ORDER BY v.id
          ) FILTER (WHERE v.id IS NOT NULL),
          '[]'
        ) AS vehicles_json
      FROM clients c
      LEFT JOIN vehicles v ON v.client_id = c.id
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `);

    const clientsWithVehicles = rows.map(client => {
      const vehiclesJson = typeof client.vehicles_json === 'string'
        ? JSON.parse(client.vehicles_json)
        : (client.vehicles_json || []);
      const { vehicles_json, ...rest } = client;
      return {
        ...rest,
        vehicles: vehiclesJson.map(v => {
          const parts = v.make_model ? v.make_model.split(' ') : [''];
          return {
            id: v.id,
            make: parts[0] || '',
            model: parts.slice(1).join(' ') || '',
            plate: v.license_vin || ''
          };
        })
      };
    });

    res.json(clientsWithVehicles);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET a single client
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await db.query('SELECT * FROM clients WHERE id = $1', [id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Client not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// CREATE a client
router.post('/', async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { full_name, phone, email, address, vehicles } = req.body;
    if (!full_name || !phone) return res.status(400).json({ message: 'full_name and phone are required' });
    
    await client.query('BEGIN');
    const { rows } = await client.query(
      'INSERT INTO clients (full_name, phone, email, address) VALUES ($1, $2, $3, $4) RETURNING *',
      [full_name, phone, email, address]
    );
    const newClient = rows[0];

    // Insert vehicles if any
    if (vehicles && vehicles.length > 0) {
      newClient.vehicles = [];
      for (const v of vehicles) {
        if (v.make || v.model || v.plate) {
          const make_model = `${v.make || ''} ${v.model || ''}`.trim();
          const vRows = await client.query(
            'INSERT INTO vehicles (client_id, make_model, license_vin) VALUES ($1, $2, $3) RETURNING *',
            [newClient.id, make_model, v.plate]
          );
          newClient.vehicles.push(vRows.rows[0]);
        }
      }
    }

    await client.query('COMMIT');
    res.status(201).json(newClient);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
});

// UPDATE a client
router.put('/:id', async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { id } = req.params;
    const { full_name, phone, email, address, vehicles } = req.body;
    if (!full_name || !phone) return res.status(400).json({ message: 'full_name and phone are required' });
    
    await client.query('BEGIN');
    const { rows } = await client.query(
      'UPDATE clients SET full_name = $1, phone = $2, email = $3, address = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5 RETURNING *',
      [full_name, phone, email, address, id]
    );
    if (rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Client not found' });
    }
    const updatedClient = rows[0];

    // Handle vehicles (simple approach: delete existing and re-insert)
    if (vehicles !== undefined) {
      await client.query('DELETE FROM vehicles WHERE client_id = $1', [id]);
      updatedClient.vehicles = [];
      for (const v of vehicles) {
        if (v.make || v.model || v.plate) {
          const make_model = `${v.make || ''} ${v.model || ''}`.trim();
          const vRows = await client.query(
            'INSERT INTO vehicles (client_id, make_model, license_vin) VALUES ($1, $2, $3) RETURNING *',
            [id, make_model, v.plate]
          );
          updatedClient.vehicles.push(vRows.rows[0]);
        }
      }
    }

    await client.query('COMMIT');
    res.json(updatedClient);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
});

// DELETE a client
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rowCount } = await db.query('DELETE FROM clients WHERE id = $1', [id]);
    if (rowCount === 0) return res.status(404).json({ message: 'Client not found' });
    res.json({ message: 'Client deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
