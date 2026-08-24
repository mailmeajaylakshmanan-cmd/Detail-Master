const express = require('express');
const router = express.Router();
const db = require('../db');
const { requirePermission } = require('../middleware/permissions');

router.use(requirePermission('Customers'));
const { protect } = require('../middleware/auth');

// Get all organizations with vehicles
router.get('/', protect, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        o.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', v.id,
              'make_model', v.make_model,
              'license_vin', v.license_vin,
              'vehicle_type_id', v.vehicle_type_id,
              'vehicle_type', vt.name,
              'is_active', v.is_active
            )
            ORDER BY v.id DESC
          ) FILTER (WHERE v.id IS NOT NULL),
          '[]'
        ) AS vehicles_json
      FROM organizations o
      LEFT JOIN vehicles v ON v.organization_id = o.id
      LEFT JOIN vehicle_types vt ON v.vehicle_type_id = vt.id
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
            plate: v.license_vin || '',
            vehicle_type_id: v.vehicle_type_id || null,
            type: v.vehicle_type || '',
            isActive: v.is_active !== false,
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
router.get('/:id', protect, async (req, res) => {
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
router.post('/', protect, async (req, res) => {
  try {
    const { org_name, contact_person, phone, email, address, is_active } = req.body;

    if (!org_name) {
      return res.status(400).json({ error: 'org_name is required' });
    }

    const result = await db.query(
      `INSERT INTO organizations
       (org_name, contact_person, phone, email, address, is_active, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
       RETURNING *`,
      [org_name, contact_person, phone, email, address, is_active !== undefined ? is_active : true]
    );

    res.status(201).json({ ...result.rows[0], vehicles: [] });
  } catch (err) {
    console.error('Error creating organization:', err);
    res.status(500).json({ error: 'Failed to create organization' });
  }
});

// Update an organization
router.put('/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const { org_name, contact_person, phone, email, address, is_active } = req.body;

    const result = await db.query(
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
      return res.status(404).json({ error: 'Organization not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating organization:', err);
    res.status(500).json({ error: 'Failed to update organization' });
  }
});

// Billing audit trail for one organization
router.get('/:id/invoices', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const { from, to } = req.query;

    const { rows } = await db.query(
      `WITH svc AS (
         SELECT invoice_order_id, COALESCE(SUM(unit_price), 0) AS revenue
         FROM invoice_services GROUP BY invoice_order_id
       ),
       tp AS (
         SELECT invoice_order_id,
                COALESCE(SUM(selling_price), 0) AS revenue,
                COALESCE(SUM(labour_charge), 0) AS cost
         FROM invoice_third_party_services GROUP BY invoice_order_id
       ),
       veh AS (
         SELECT iv.invoice_order_id,
                json_agg(json_build_object(
                  'vehicleId', iv.vehicle_id,
                  'makeModel', v.make_model,
                  'licenseVin', v.license_vin,
                  'visitorName', iv.visitor_name,
                  'checkinTime', iv.checkin_time,
                  'checkoutTime', iv.checkout_time
                ) ORDER BY iv.id) AS vehicles
         FROM invoice_vehicles iv
         JOIN vehicles v ON iv.vehicle_id = v.id
         GROUP BY iv.invoice_order_id
       )
       SELECT
         i.id, i.invoice_number, i.status, i.created_at,
         i.grand_total, i.amount_paid, i.balance_due, i.discount,
         (COALESCE(svc.revenue, 0) + COALESCE(tp.revenue, 0) - i.discount) AS revenue,
         (COALESCE(svc.revenue, 0) + COALESCE(tp.revenue, 0) - COALESCE(tp.cost, 0) - i.discount) AS profit,
         COALESCE(veh.vehicles, '[]') AS vehicles
       FROM invoices i
       LEFT JOIN svc ON svc.invoice_order_id = i.id
       LEFT JOIN tp ON tp.invoice_order_id = i.id
       LEFT JOIN veh ON veh.invoice_order_id = i.id
       WHERE i.organization_id = $1
         AND ($2::timestamp IS NULL OR i.created_at >= $2::timestamp)
         AND ($3::timestamp IS NULL OR i.created_at < $3::timestamp)
       ORDER BY i.created_at DESC`,
      [id, from || null, to || null]
    );

    const summary = rows.reduce((acc, r) => ({
      invoiceCount: acc.invoiceCount + 1,
      totalRevenue: acc.totalRevenue + Number(r.revenue),
      totalProfit: acc.totalProfit + Number(r.profit),
      totalOutstanding: acc.totalOutstanding + Number(r.balance_due),
    }), { invoiceCount: 0, totalRevenue: 0, totalProfit: 0, totalOutstanding: 0 });

    res.json({ invoices: rows, summary });
  } catch (err) {
    console.error('Error fetching organization billing:', err);
    res.status(500).json({ error: 'Failed to fetch organization billing' });
  }
});

// Delete an organization
router.delete('/:id', protect, async (req, res) => {
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
