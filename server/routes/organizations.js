const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken } = require('../middleware/auth');

// Get all organizations with vehicles
router.get('/', verifyToken, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        o.*,
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
      FROM organizations o
      LEFT JOIN vehicles v ON v.organization_id = o.id
      GROUP BY o.id
      ORDER BY o.org_name ASC
    `);

    const orgsWithVehicles = rows.map(org => {
      const vehiclesJson = typeof org.vehicles_json === 'string'
        ? JSON.parse(org.vehicles_json)
        : (org.vehicles_json || []);
      const { vehicles_json, ...rest } = org;
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

    res.json(orgsWithVehicles);
  } catch (err) {
    console.error('Error fetching organizations:', err);
    res.status(500).json({ error: 'Failed to fetch organizations' });
  }
});

// Get a single organization
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      'SELECT * FROM organizations WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching organization:', err);
    res.status(500).json({ error: 'Failed to fetch organization' });
  }
});

// Create a new organization
router.post('/', verifyToken, async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { org_name, contact_person, phone, email, address, is_active, vehicles } = req.body;
    
    if (!org_name) {
      return res.status(400).json({ error: 'org_name is required' });
    }

    await client.query('BEGIN');
    const result = await client.query(
      `INSERT INTO organizations 
       (org_name, contact_person, phone, email, address, is_active, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
       RETURNING *`,
      [org_name, contact_person, phone, email, address, is_active !== undefined ? is_active : true]
    );
    
    const newOrg = result.rows[0];

    if (vehicles && vehicles.length > 0) {
      newOrg.vehicles = [];
      for (const v of vehicles) {
        if (v.make || v.model || v.plate) {
          const make_model = `${v.make || ''} ${v.model || ''}`.trim();
          const vRows = await client.query(
            'INSERT INTO vehicles (organization_id, make_model, license_vin) VALUES ($1, $2, $3) RETURNING *',
            [newOrg.id, make_model, v.plate]
          );
          newOrg.vehicles.push(vRows.rows[0]);
        }
      }
    }

    await client.query('COMMIT');
    res.status(201).json(newOrg);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating organization:', err);
    res.status(500).json({ error: 'Failed to create organization' });
  } finally {
    client.release();
  }
});

// Update an organization
router.put('/:id', verifyToken, async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { id } = req.params;
    const { org_name, contact_person, phone, email, address, is_active, vehicles } = req.body;

    await client.query('BEGIN');
    const result = await client.query(
      `UPDATE organizations 
       SET org_name = COALESCE($1, org_name),
           contact_person = COALESCE($2, contact_person),
           phone = COALESCE($3, phone),
           email = COALESCE($4, email),
           address = COALESCE($5, address),
           is_active = COALESCE($6, is_active)
       WHERE id = $7
       RETURNING *`,
      [org_name, contact_person, phone, email, address, is_active, id]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Organization not found' });
    }
    
    const updatedOrg = result.rows[0];

    // Handle vehicles (delete existing and re-insert)
    if (vehicles !== undefined) {
      await client.query('DELETE FROM vehicles WHERE organization_id = $1', [id]);
      updatedOrg.vehicles = [];
      for (const v of vehicles) {
        if (v.make || v.model || v.plate) {
          const make_model = `${v.make || ''} ${v.model || ''}`.trim();
          const vRows = await client.query(
            'INSERT INTO vehicles (organization_id, make_model, license_vin) VALUES ($1, $2, $3) RETURNING *',
            [id, make_model, v.plate]
          );
          updatedOrg.vehicles.push(vRows.rows[0]);
        }
      }
    }

    await client.query('COMMIT');
    res.json(updatedOrg);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error updating organization:', err);
    res.status(500).json({ error: 'Failed to update organization' });
  } finally {
    client.release();
  }
});

// Delete an organization
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      'DELETE FROM organizations WHERE id = $1 RETURNING id',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    
    res.json({ message: 'Organization deleted successfully' });
  } catch (err) {
    console.error('Error deleting organization:', err);
    res.status(500).json({ error: 'Failed to delete organization' });
  }
});

module.exports = router;
