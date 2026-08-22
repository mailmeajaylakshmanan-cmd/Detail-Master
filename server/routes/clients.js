const express = require('express');
const router = express.Router();
const db = require('../db');
const { buildBulkInsert } = require('../utils/db');
const { requirePermission } = require('../middleware/permissions');

router.use(requirePermission('Customers'));

// Shared shape: normalize a vehicle row to the compact object the UI expects.
function mapVehicleRow(v) {
  const parts = v.make_model ? v.make_model.split(' ') : [''];
  return {
    id: v.id,
    make: parts[0] || '',
    model: parts.slice(1).join(' ') || '',
    plate: v.license_vin || '',
    type: v.vehicle_type || '',
    vehicle_type_id: v.vehicle_type_id || null,
    isActive: v.is_active !== false,
  };
}

// Convert a row that carries vehicles_json into a client object with vehicles[].
function parseClientRow(c) {
  const vehiclesJson = typeof c.vehicles_json === 'string'
    ? JSON.parse(c.vehicles_json)
    : (c.vehicles_json || []);
  const out = { ...c, vehicles: vehiclesJson.map(mapVehicleRow) };
  delete out.vehicles_json;
  return out;
}

// Normalize an API vehicle payload into a row for the vehicles table.
function vehicleRowToInsert(clientId, v) {
  const make_model = `${v.make || ''} ${v.model || ''}`.trim() || 'Unknown';
  return [clientId, make_model, v.plate || '', v.type || 'Sedan', v.vehicle_type_id || null];
}

// GET /clients/options — lightweight list for dropdowns (no vehicles).
router.get('/options', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, full_name, phone
       FROM clients
       ORDER BY full_name ASC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /clients/lookup?phone=... — single client + vehicles by phone (fast).
router.get('/lookup', async (req, res) => {
  try {
    const phone = (req.query.phone || '').trim();
    if (!phone) return res.status(400).json({ message: 'phone is required' });

    const { rows } = await db.query(
      `SELECT
         c.*,
         COALESCE(
           json_agg(
             json_build_object(
               'id', v.id,
               'make_model', v.make_model,
               'license_vin', v.license_vin,
               'vehicle_type', v.vehicle_type,
               'vehicle_type_id', v.vehicle_type_id,
               'is_active', v.is_active
             )
             ORDER BY v.id
           ) FILTER (WHERE v.id IS NOT NULL),
           '[]'
         ) AS vehicles_json
       FROM clients c
       LEFT JOIN vehicles v ON v.client_id = c.id
       WHERE c.phone = $1
       GROUP BY c.id
       LIMIT 1`,
      [phone]
    );

    if (rows.length === 0) return res.status(404).json({ message: 'Client not found' });

    res.json(parseClientRow(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET all clients with their vehicles.
router.get('/', async (req, res) => {
  try {
    const search = (req.query.search || '').trim();
    const hasPagination = req.query.page !== undefined || req.query.limit !== undefined;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit, 10) || 100));
    const offset = (page - 1) * limit;

    const params = [];
    let whereSql = '';
    if (search) {
      params.push(`%${search}%`);
      whereSql = `WHERE (c.full_name ILIKE $${params.length} OR c.phone ILIKE $${params.length})`;
    }

    const baseSelect = `
      SELECT
        c.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', v.id,
              'make_model', v.make_model,
              'license_vin', v.license_vin,
              'vehicle_type', v.vehicle_type,
              'vehicle_type_id', v.vehicle_type_id,
              'is_active', v.is_active
            )
            ORDER BY v.id
          ) FILTER (WHERE v.id IS NOT NULL),
          '[]'
        ) AS vehicles_json
      FROM clients c
      LEFT JOIN vehicles v ON v.client_id = c.id
      ${whereSql ? whereSql + ' AND ' : 'WHERE '}c.is_active = TRUE
      GROUP BY c.id
    `;

    const orderLimit = `ORDER BY c.created_at DESC`;

    if (hasPagination) {
      const [countRes, rowsRes] = await Promise.all([
        db.query(
          `SELECT COUNT(*)::int AS total FROM clients c ${whereSql}`,
          params
        ),
        db.query(
          `${baseSelect} ${orderLimit}
           LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
          [...params, limit, offset]
        ),
      ]);

      const total = countRes.rows[0]?.total || 0;
      const clients = rowsRes.rows.map(parseClientRow);

      return res.json({
        clients,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
        },
      });
    }

    const { rows } = await db.query(`${baseSelect} ${orderLimit}`, params);
    res.json(rows.map(parseClientRow));
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

// CREATE a client (+ vehicles) in a transaction with batched vehicle insert.
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

    const validVehicles = Array.isArray(vehicles)
      ? vehicles.filter(v => v.make || v.model || v.plate)
      : [];
    if (validVehicles.length > 0) {
      const insertRows = validVehicles.map(v => vehicleRowToInsert(newClient.id, v));
      const q = buildBulkInsert('vehicles', ['client_id', 'make_model', 'license_vin', 'vehicle_type', 'vehicle_type_id'], insertRows);
      const vRes = await client.query(q.text, q.params);
      newClient.vehicles = vRes.rows;
    }

    await client.query('COMMIT');
    res.status(201).json(newClient);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating client:', err);
    res.status(500).json({ message: err.message || 'Server error' });
  } finally {
    client.release();
  }
});

// UPDATE a client (+ vehicles)
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

    if (vehicles !== undefined) {
      const incoming = Array.isArray(vehicles) ? vehicles : [];
      updatedClient.vehicles = [];
      const incomingIds = incoming
        .map(v => parseInt(v.id))
        .filter(vid => !isNaN(vid));

      if (incomingIds.length > 0) {
        await client.query(`
          DELETE FROM vehicles
          WHERE client_id = $1
            AND id != ALL($2::int[])
            AND id NOT IN (SELECT vehicle_id FROM invoices WHERE vehicle_id IS NOT NULL)
        `, [id, incomingIds]);
      } else {
        await client.query(`
          DELETE FROM vehicles
          WHERE client_id = $1
            AND id NOT IN (SELECT vehicle_id FROM invoices WHERE vehicle_id IS NOT NULL)
        `, [id]);
      }

      const toUpdate = [];
      const toInsert = [];
      for (const v of incoming) {
        if (!v.make && !v.model && !v.plate) continue;
        if (v.id) toUpdate.push(v);
        else toInsert.push(v);
      }

      for (const v of toUpdate) {
        const make_model = `${v.make || ''} ${v.model || ''}`.trim() || 'Unknown';
        const vRows = await client.query(
          'UPDATE vehicles SET make_model = $1, license_vin = $2, vehicle_type = $3, vehicle_type_id = $4 WHERE id = $5 AND client_id = $6 RETURNING *',
          [make_model, v.plate || '', v.type || 'Sedan', v.vehicle_type_id || null, v.id, id]
        );
        if (vRows.rows.length > 0) updatedClient.vehicles.push(vRows.rows[0]);
      }

      if (toInsert.length > 0) {
        const insertRows = toInsert.map(v => vehicleRowToInsert(id, v));
        const q = buildBulkInsert('vehicles', ['client_id', 'make_model', 'license_vin', 'vehicle_type', 'vehicle_type_id'], insertRows);
        const vRes = await client.query(q.text, q.params);
        updatedClient.vehicles.push(...vRes.rows);
      }
    }

    await client.query('COMMIT');
    res.json(updatedClient);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error updating client:', err);
    res.status(500).json({ message: err.message || 'Server error' });
  } finally {
    client.release();
  }
});

// DELETE a client
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rowCount } = await db.query('UPDATE clients SET is_active = FALSE WHERE id = $1', [id]);
    if (rowCount === 0) return res.status(404).json({ message: 'Client not found' });
    res.json({ message: 'Client deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
