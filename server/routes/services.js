const express = require('express');
const router = express.Router();
const db = require('../db');
const queryCache = require('../utils/queryCache');
const { protect } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');

async function saveVehiclePrices(serviceId, vehiclePrices) {
  if (!Array.isArray(vehiclePrices)) return;
  for (const item of vehiclePrices) {
    if (!item.vehicle_type_id) continue;
    const priceVal = Number(item.price) || 0;
    await db.query(
      `INSERT INTO service_vehicle_prices (service_id, vehicle_type_id, price)
       VALUES ($1, $2, $3)
       ON CONFLICT (service_id, vehicle_type_id)
       DO UPDATE SET price = EXCLUDED.price, updated_at = CURRENT_TIMESTAMP`,
      [serviceId, item.vehicle_type_id, priceVal]
    );
  }
}

// ✅ PUBLIC ROUTE: Anyone (including website visitors) can fetch services — cached
router.get('/', async (req, res) => {
  try {
    const { active_only } = req.query;
    const cacheKey = `services_list_${active_only === 'true' ? 'active' : 'all'}`;

    const result = await queryCache.getOrSet(cacheKey, async () => {
      const query = active_only === 'true'
        ? 'SELECT * FROM services WHERE is_active = true ORDER BY id ASC'
        : 'SELECT * FROM services ORDER BY created_at DESC';
      const { rows: services } = await db.query(query);
      const { rows: vpRows } = await db.query(`
        SELECT svp.id, svp.service_id, svp.vehicle_type_id, vt.name AS vehicle_type_name, svp.price
        FROM service_vehicle_prices svp
        JOIN vehicle_types vt ON svp.vehicle_type_id = vt.id
      `);

      const vpMap = {};
      vpRows.forEach(vp => {
        if (!vpMap[vp.service_id]) vpMap[vp.service_id] = [];
        vpMap[vp.service_id].push({
          id: vp.id,
          vehicle_type_id: vp.vehicle_type_id,
          vehicle_type_name: vp.vehicle_type_name,
          price: Number(vp.price)
        });
      });

      return services.map(s => ({
        ...s,
        base_price: s.base_price !== undefined ? s.base_price : 0,
        vehicle_prices: vpMap[s.id] || []
      }));
    }, 300);

    res.json(result);
  } catch (err) {
    console.error('Error fetching services:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ✅ PUBLIC ROUTE: GET a single service
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await db.query('SELECT * FROM services WHERE id = $1', [id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Service not found' });

    const service = rows[0];
    const { rows: vpRows } = await db.query(`
      SELECT svp.id, svp.service_id, svp.vehicle_type_id, vt.name AS vehicle_type_name, svp.price
      FROM service_vehicle_prices svp
      JOIN vehicle_types vt ON svp.vehicle_type_id = vt.id
      WHERE svp.service_id = $1
    `, [id]);

    service.vehicle_prices = vpRows.map(vp => ({
      id: vp.id,
      vehicle_type_id: vp.vehicle_type_id,
      vehicle_type_name: vp.vehicle_type_name,
      price: Number(vp.price)
    }));

    res.json(service);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// 🔒 PROTECTED ROUTES: Only logged-in admin can create/edit/delete services
router.post('/', protect, requirePermission('Services'), async (req, res) => {
  try {
    const { service_name, category, is_active, estimate_time, vehicle_prices } = req.body;
    if (!service_name) return res.status(400).json({ message: 'service_name is required' });
    
    const { rows } = await db.query(
      'INSERT INTO services (service_name, category, is_active, estimate_time) VALUES ($1, $2, $3, $4) RETURNING *',
      [service_name, category, is_active !== undefined ? is_active : true, estimate_time || null]
    );

    const createdService = rows[0];

    if (vehicle_prices && Array.isArray(vehicle_prices)) {
      await saveVehiclePrices(createdService.id, vehicle_prices);
    }

    // Fetch complete service with vehicle_prices
    const { rows: vpRows } = await db.query(`
      SELECT svp.id, svp.service_id, svp.vehicle_type_id, vt.name AS vehicle_type_name, svp.price
      FROM service_vehicle_prices svp
      JOIN vehicle_types vt ON svp.vehicle_type_id = vt.id
      WHERE svp.service_id = $1
    `, [createdService.id]);

    createdService.vehicle_prices = vpRows.map(vp => ({
      id: vp.id,
      vehicle_type_id: vp.vehicle_type_id,
      vehicle_type_name: vp.vehicle_type_name,
      price: Number(vp.price)
    }));

    queryCache.delPrefix('services_');
    res.status(201).json(createdService);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// 🔒 PROTECTED ROUTE: UPDATE a service
router.put('/:id', protect, requirePermission('Services'), async (req, res) => {
  try {
    const { id } = req.params;
    const { service_name, category, is_active, estimate_time, vehicle_prices } = req.body;
    if (!service_name) return res.status(400).json({ message: 'service_name is required' });
    
    const { rows } = await db.query(
      'UPDATE services SET service_name = $1, category = $2, is_active = $3, estimate_time = $4 WHERE id = $5 RETURNING *',
      [service_name, category, is_active !== undefined ? is_active : true, estimate_time || null, id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Service not found' });

    const updatedService = rows[0];

    if (vehicle_prices && Array.isArray(vehicle_prices)) {
      await saveVehiclePrices(id, vehicle_prices);
    }

    const { rows: vpRows } = await db.query(`
      SELECT svp.id, svp.service_id, svp.vehicle_type_id, vt.name AS vehicle_type_name, svp.price
      FROM service_vehicle_prices svp
      JOIN vehicle_types vt ON svp.vehicle_type_id = vt.id
      WHERE svp.service_id = $1
    `, [id]);

    updatedService.vehicle_prices = vpRows.map(vp => ({
      id: vp.id,
      vehicle_type_id: vp.vehicle_type_id,
      vehicle_type_name: vp.vehicle_type_name,
      price: Number(vp.price)
    }));

    queryCache.delPrefix('services_');
    res.json(updatedService);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// 🔒 PROTECTED ROUTE: GET dependencies for a service before deletion
router.get('/:id/dependencies', protect, requirePermission('Services'), async (req, res) => {
  try {
    const { id } = req.params;
    
    const invoicesResult = await db.query(
      'SELECT COUNT(DISTINCT invoice_order_id)::int as count FROM invoice_services WHERE service_id = $1',
      [id]
    );
    
    const bookingsResult = await db.query(
      'SELECT COUNT(DISTINCT booking_id)::int as count FROM web_booking_services WHERE service_id = $1',
      [id]
    );

    const invoices = invoicesResult.rows[0]?.count || 0;
    const webBookings = bookingsResult.rows[0]?.count || 0;
    const total = invoices + webBookings;

    res.json({
      invoices,
      webBookings,
      total
    });
  } catch (err) {
    console.error('Error checking service dependencies:', err);
    res.status(500).json({ message: 'Server error checking dependencies' });
  }
});

// 🔒 PROTECTED ROUTE: DELETE a service
router.delete('/:id', protect, requirePermission('Services'), async (req, res) => {
  try {
    const { id } = req.params;

    const { rows: invCount } = await db.query(
      'SELECT COUNT(*)::int as count FROM invoice_services WHERE service_id = $1',
      [id]
    );
    const { rows: bookCount } = await db.query(
      'SELECT COUNT(*)::int as count FROM web_booking_services WHERE service_id = $1',
      [id]
    );

    const hasUsage = (invCount[0]?.count || 0) > 0 || (bookCount[0]?.count || 0) > 0;

    if (hasUsage) {
      const { rowCount } = await db.query('UPDATE services SET is_active = false WHERE id = $1', [id]);
      if (rowCount === 0) return res.status(404).json({ message: 'Service not found' });
      queryCache.delPrefix('services_');
      res.json({ message: 'Service archived (historical records preserved)' });
    } else {
      await db.query('DELETE FROM service_vehicle_prices WHERE service_id = $1', [id]);
      const { rowCount } = await db.query('DELETE FROM services WHERE id = $1', [id]);
      if (rowCount === 0) return res.status(404).json({ message: 'Service not found' });
      queryCache.delPrefix('services_');
      res.json({ message: 'Service deleted permanently' });
    }
  } catch (err) {
    console.error('Error deleting service:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
