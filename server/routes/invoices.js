const express = require('express');
const router = express.Router();
const db = require('../db');
const { recalculateInvoiceTotals } = require('../utils/finance');
const { buildBulkInsert } = require('../utils/db');
const { getBrowser } = require('../utils/pdf');
const { requirePermission } = require('../middleware/permissions');

router.use(requirePermission('Invoicing & Records'));

function mapPaymentMethod(method) {
  const m = String(method || 'cash').toLowerCase().replace(/\s+/g, '_');
  if (['cash', 'upi', 'bank_transfer', 'card'].includes(m)) return m;
  return 'other';
}

function mapStatus(status, balanceDue, grandTotal, amountPaid) {
  const allowed = new Set(['draft', 'open', 'pending', 'completed', 'cancelled']);
  if (status && allowed.has(String(status).toLowerCase())) {
    return String(status).toLowerCase();
  }
  // Derive from money if UI sent pending/partial/paid
  const bal = Number(balanceDue);
  const total = Number(grandTotal);
  const paid = Number(amountPaid);
  if (total > 0 && bal <= 0) return 'completed';
  if (paid > 0 && bal > 0) return 'open';
  if (status === 'paid') return 'completed';
  if (status === 'partial') return 'open';
  return 'draft';
}

function buildInvoiceNumber() {
  return `INV-DM-${Date.now()}`;
}

// GET invoices with filters + pagination
// Query: page, limit, search, status, client_id
// status=open → not completed/cancelled
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;
    const search = (req.query.search || '').trim();
    const status = (req.query.status || '').trim();
    const clientId = req.query.client_id;

    const where = [];
    const params = [];

    if (clientId) {
      params.push(clientId);
      where.push(`i.client_id = $${params.length}`);
    }

    if (status === 'open') {
      where.push(`i.status NOT IN ('completed', 'cancelled')`);
    } else if (status && status !== 'All') {
      params.push(status);
      where.push(`LOWER(i.status::text) = LOWER($${params.length})`);
    }

    if (search) {
      params.push(`%${search}%`);
      const idx = params.length;
      where.push(`(
        i.invoice_number ILIKE $${idx}
        OR c.full_name ILIKE $${idx}
        OR v.license_vin ILIKE $${idx}
        OR v.make_model ILIKE $${idx}
      )`);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const listParams = [...params, limit, offset];
    const limitIdx = params.length + 1;
    const offsetIdx = params.length + 2;

    const [countRes, listRes] = await Promise.all([
      db.query(
        `SELECT COUNT(*)::int AS total
         FROM invoices i
         LEFT JOIN clients c ON i.client_id = c.id
         LEFT JOIN organizations o ON i.organization_id = o.id
         LEFT JOIN vehicles v ON i.vehicle_id = v.id
         ${whereSql}`,
        params
      ),
      db.query(
        `SELECT
           i.id, i.invoice_number, i.client_id, i.organization_id, i.vehicle_id, i.status,
           i.sub_total, i.discount, i.grand_total, i.amount_paid, i.balance_due,
           i.special_notes, i.include_terms, i.terms_conditions,
           i.created_at, i.updated_at,
           c.full_name AS client_name, c.phone AS client_phone,
           o.org_name AS organization_name, o.phone AS organization_phone,
           v.make_model AS vehicle_name, v.license_vin
         FROM invoices i
         LEFT JOIN clients c ON i.client_id = c.id
         LEFT JOIN organizations o ON i.organization_id = o.id
         LEFT JOIN vehicles v ON i.vehicle_id = v.id
         ${whereSql}
         ORDER BY i.created_at DESC
         LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
        listParams
      ),
    ]);

    const total = countRes.rows[0]?.total || 0;
    res.json({
      invoices: listRes.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET one invoice + service lines + payments
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const invRes = await db.query(
      `SELECT
         i.*,
         c.full_name AS client_name, c.phone AS client_phone, c.email AS client_email, c.address AS client_address,
         o.org_name AS organization_name, o.phone AS organization_phone, o.email AS organization_email, o.address AS organization_address,
         v.make_model AS vehicle_name, v.license_vin, v.vehicle_type,
         EXISTS(SELECT 1 FROM assigned_offers ao WHERE ao.purchase_invoice_order_id = i.id) AS is_offer_purchase
       FROM invoices i
       LEFT JOIN clients c ON i.client_id = c.id
       LEFT JOIN organizations o ON i.organization_id = o.id
       LEFT JOIN vehicles v ON i.vehicle_id = v.id
       WHERE i.id = $1`,
      [id]
    );
    if (invRes.rows.length === 0) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    const invoice = invRes.rows[0];

    const [servicesRes, thirdPartyRes, paymentsRes, vehicleVisitsRes, usagesRes] = await Promise.all([
      db.query(
        `SELECT isv.*, s.service_name, s.category, v.license_vin AS vehicle_plate,
                v.make_model AS vehicle_name
         FROM invoice_services isv
         JOIN services s ON isv.service_id = s.id
         LEFT JOIN vehicles v ON isv.vehicle_id = v.id
         WHERE isv.invoice_order_id = $1
         ORDER BY isv.id ASC`,
        [id]
      ),
      db.query(
        `SELECT itp.*, v.license_vin AS vehicle_plate,
                v.make_model AS vehicle_name
         FROM invoice_third_party_services itp
         LEFT JOIN vehicles v ON itp.vehicle_id = v.id
         WHERE itp.invoice_order_id = $1
         ORDER BY itp.id ASC`,
        [id]
      ),
      db.query(
        `SELECT * FROM payments
         WHERE invoice_order_id = $1
         ORDER BY payment_date DESC`,
        [id]
      ),
      db.query(
        `SELECT iv.*, v.make_model, v.license_vin, v.vehicle_type_id, v.vehicle_type,
                vt.name AS vehicle_type_name
         FROM invoice_vehicles iv
         JOIN vehicles v ON iv.vehicle_id = v.id
         LEFT JOIN vehicle_types vt ON v.vehicle_type_id = vt.id
         WHERE iv.invoice_order_id = $1
         ORDER BY iv.id ASC`,
        [id]
      ),
      db.query(
        `SELECT u.*, a.completed_washes, a.total_washes, a.free_washes_used, a.free_washes
         FROM assigned_offer_usages u
         JOIN assigned_offers a ON u.assigned_offer_id = a.id
         WHERE u.invoice_order_id = $1`,
        [id]
      ),
    ]);

    const usages = usagesRes.rows;
    invoice.services = servicesRes.rows.map(s => {
      if (Number(s.unit_price) === 0 && usages.length > 0) {
        // Blindly assign an offer usage to a service that is free
        const usage = usages.shift();
        return { 
          ...s, 
          assigned_offer_id: usage.assigned_offer_id,
          usage_type: usage.usage_type,
          completed_washes: usage.completed_washes,
          total_washes: usage.total_washes,
          free_washes_used: usage.free_washes_used,
          free_washes: usage.free_washes
        };
      }
      return s;
    });
    invoice.thirdPartyServices = thirdPartyRes.rows;
    invoice.payments = paymentsRes.rows;
    invoice.vehicleVisits = vehicleVisitsRes.rows;
    res.json(invoice);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Check for schedule conflicts before booking a service on a vehicle.
// A conflict = the SAME service already booked on a DIFFERENT vehicle with an
// overlapping check-in/check-out window, on an invoice that's still active
// (not completed or cancelled). Different services at the same time are fine
// (different bay/team) — only same-service double-booking is a conflict.
// Body: { vehicle_id, checkin_time, checkout_time, service_ids?: number[],
//         third_party_service_ids?: number[], exclude_invoice_id? }
router.post('/check-conflicts', async (req, res) => {
  try {
    const { vehicle_id, checkin_time, checkout_time, service_ids, third_party_service_ids, exclude_invoice_id } = req.body;

    if (!vehicle_id || !checkin_time || !checkout_time) {
      return res.json({ conflicts: [] });
    }

    const svcIds = Array.isArray(service_ids) ? service_ids.filter(Boolean) : [];
    const tpIds = Array.isArray(third_party_service_ids) ? third_party_service_ids.filter(Boolean) : [];

    if (svcIds.length === 0 && tpIds.length === 0) {
      return res.json({ conflicts: [] });
    }

    const conflicts = [];

    if (svcIds.length > 0) {
      const { rows } = await db.query(
        `SELECT DISTINCT s.service_name, v.make_model, v.license_vin,
                iv.checkin_time, iv.checkout_time,
                COALESCE(c.full_name, o.org_name) AS customer_name
         FROM invoice_services isv
         JOIN services s ON isv.service_id = s.id
         JOIN invoice_vehicles iv ON iv.invoice_order_id = isv.invoice_order_id AND iv.vehicle_id = isv.vehicle_id
         JOIN invoices i ON i.id = iv.invoice_order_id
         JOIN vehicles v ON v.id = iv.vehicle_id
         LEFT JOIN clients c ON i.client_id = c.id
         LEFT JOIN organizations o ON i.organization_id = o.id
         WHERE isv.service_id = ANY($1::int[])
           AND iv.vehicle_id != $2
           AND iv.checkin_time < $4::timestamp
           AND iv.checkout_time > $3::timestamp
           AND i.status NOT IN ('completed', 'cancelled')
           AND ($5::int IS NULL OR i.id != $5::int)`,
        [svcIds, vehicle_id, checkin_time, checkout_time, exclude_invoice_id || null]
      );
      conflicts.push(...rows);
    }

    if (tpIds.length > 0) {
      const { rows } = await db.query(
        `SELECT DISTINCT itp.service_name, v.make_model, v.license_vin,
                iv.checkin_time, iv.checkout_time,
                COALESCE(c.full_name, o.org_name) AS customer_name
         FROM invoice_third_party_services itp
         JOIN invoice_vehicles iv ON iv.invoice_order_id = itp.invoice_order_id AND iv.vehicle_id = itp.vehicle_id
         JOIN invoices i ON i.id = iv.invoice_order_id
         JOIN vehicles v ON v.id = iv.vehicle_id
         LEFT JOIN clients c ON i.client_id = c.id
         LEFT JOIN organizations o ON i.organization_id = o.id
         WHERE itp.third_party_service_id = ANY($1::int[])
           AND iv.vehicle_id != $2
           AND iv.checkin_time < $4::timestamp
           AND iv.checkout_time > $3::timestamp
           AND i.status NOT IN ('completed', 'cancelled')
           AND ($5::int IS NULL OR i.id != $5::int)`,
        [tpIds, vehicle_id, checkin_time, checkout_time, exclude_invoice_id || null]
      );
      conflicts.push(...rows);
    }

    res.json({ conflicts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// CREATE invoice + all service lines (+ optional payments) in one call
// Body: client_id, vehicle_id, service_ids: number[], discount?, amount_paid?,
//       status?, special_notes?, include_terms?, terms_conditions?, payments?,
//       vehicle_visits?: [{ vehicle_id, visitor_name?, visitor_phone?, checkin_time?, checkout_time? }],
//       third_party_items?: [{ third_party_service_id?, service_name, vendor_name?,
//                              labour_count?, labour_charge?, selling_price }]
router.post('/', async (req, res) => {
  const client = await db.pool.connect();
  try {
    const {
      client_id,
      organization_id,
      vehicle_id,
      service_ids,
      discount,
      special_notes,
      include_terms,
      terms_conditions,
      status,
      payments,
      third_party_items,
      vehicle_visits,
    } = req.body;

    if (!client_id && !organization_id) {
      return res.status(400).json({ message: 'client_id or organization_id is required' });
    }

    const ids = Array.isArray(service_ids)
      ? [...new Set(service_ids.map(Number).filter((n) => Number.isFinite(n) && n > 0))]
      : [];

    const thirdPartyItems = Array.isArray(third_party_items)
      ? third_party_items.filter((t) => t && t.service_name)
      : [];

    if (ids.length === 0 && thirdPartyItems.length === 0) {
      return res.status(400).json({ message: 'At least one service_id or third-party item is required' });
    }

    await client.query('BEGIN');

    let lines = [];

    // Support new payload format: service_items = [{ service_id, vehicle_ids: [1, 2] }]
    // Support legacy payload: service_ids = [1, 2, 3] with single vehicle_id
    if (Array.isArray(req.body.service_items) && req.body.service_items.length > 0) {
      const ids = req.body.service_items.map(s => s.service_id);
      const sRes = await client.query('SELECT id FROM services WHERE id = ANY($1::int[])', [ids]);

      req.body.service_items.forEach(si => {
        const dbSrv = sRes.rows.find(r => r.id === si.service_id);
        if (dbSrv) {
          const vIds = Array.isArray(si.vehicle_ids) && si.vehicle_ids.length > 0 ? si.vehicle_ids : [vehicle_id || null];
          lines.push({
            service_id: si.service_id,
            unit_price: si.assigned_offer_id ? 0 : (Number(si.price) / vIds.length || 0),
            assigned_offer_id: si.assigned_offer_id || null,
            vehicle_ids: vIds
          });
        }
      });
    } else if (Array.isArray(service_ids) && service_ids.length > 0) {
      const sRes = await client.query('SELECT id FROM services WHERE id = ANY($1::int[])', [service_ids]);
      lines = service_ids.map((id) => {
        const row = sRes.rows.find((r) => r.id === id);
        return {
          service_id: id,
          unit_price: 0,
          vehicle_ids: [vehicle_id || null]
        };
      });
    }

    // Calc subtotal with multipliers based on number of vehicles per line
    const serviceSubTotal = lines.reduce((sum, line) => {
       const qty = line.vehicle_ids.length || 1;
       return sum + (line.unit_price * qty);
    }, 0);

    const tPartyItems = Array.isArray(third_party_items) ? third_party_items : [];
    const thirdPartySubTotal = tPartyItems.reduce((sum, t) => {
      const qty = Array.isArray(t.vehicle_ids) && t.vehicle_ids.length > 0 ? t.vehicle_ids.length : 1;
      return sum + (Number(t.selling_price) * qty);
    }, 0);

    const subTotal = serviceSubTotal + thirdPartySubTotal;
    const discountAmt = Number(discount) || 0;
    const grandTotal = Math.max(0, subTotal - discountAmt);

    // Optional payments in same request
    const paymentRows = Array.isArray(payments)
      ? payments.filter((p) => Number(p.amount) > 0)
      : [];
    const amountPaidFromPayments = paymentRows.reduce(
      (sum, p) => sum + (Number(p.amount) || 0),
      0
    );
    const amountPaid = amountPaidFromPayments;
    const balanceDue = grandTotal - amountPaid;
    const finalStatus = mapStatus(status, balanceDue, grandTotal, amountPaid);
    const invoiceNumber = buildInvoiceNumber();

    const invRes = await client.query(
      `INSERT INTO invoices (
         invoice_number, client_id, organization_id, vehicle_id, status,
         sub_total, discount, grand_total, amount_paid, balance_due,
         special_notes, include_terms, terms_conditions
       ) VALUES (
         $1, $2, $3, $4, $5,
         $6, $7, $8, $9, $10,
         $11, $12, $13
       ) RETURNING *`,
      [
        invoiceNumber,
        client_id || null,
        organization_id || null,
        vehicle_id || null,
        finalStatus,
        subTotal,
        discountAmt,
        grandTotal,
        amountPaid,
        balanceDue,
        special_notes || null,
        include_terms !== undefined ? !!include_terms : true,
        terms_conditions || null,
      ]
    );

    const invoice = invRes.rows[0];

    // ── Batch inserts (one round-trip each instead of one per line) ──

    if (Array.isArray(vehicle_visits)) {
      const visitRows = vehicle_visits
        .filter(v => v && v.vehicle_id)
        .map(v => [
          invoice.id,
          v.vehicle_id,
          v.visitor_name || null,
          v.visitor_phone || null,
          v.checkin_time || null,
          v.checkout_time || null,
        ]);
      if (visitRows.length > 0) {
        const q = buildBulkInsert(
          'invoice_vehicles',
          ['invoice_order_id', 'vehicle_id', 'visitor_name', 'visitor_phone', 'checkin_time', 'checkout_time'],
          visitRows
        );
        await client.query(q.text, q.params);
      }
    }

    const serviceRows = [];
    const usageUsagesToInsert = [];
    
    for (const line of lines) {
      const vIds = line.vehicle_ids.length > 0 ? line.vehicle_ids : [null];
      for (const vId of vIds) {
        serviceRows.push([invoice.id, line.service_id, line.unit_price, vId]);
        if (line.assigned_offer_id) {
          usageUsagesToInsert.push({ offer_id: line.assigned_offer_id, invoice_id: invoice.id });
        }
      }
    }
    
    if (serviceRows.length > 0) {
      const q = buildBulkInsert(
        'invoice_services',
        ['invoice_order_id', 'service_id', 'unit_price', 'vehicle_id'],
        serviceRows
      );
      await client.query(q.text, q.params);
    }
    
    // Insert usages after invoice_services
    if (usageUsagesToInsert.length > 0) {
      const uniqueUsagesMap = new Map();
      for (const usage of usageUsagesToInsert) {
        uniqueUsagesMap.set(usage.offer_id, usage);
      }
      const uniqueUsages = Array.from(uniqueUsagesMap.values());
      for (const usage of uniqueUsages) {
        await client.query(
          `INSERT INTO assigned_offer_usages (assigned_offer_id, invoice_order_id, usage_type)
           VALUES ($1, $2, $3)`,
          [usage.offer_id, usage.invoice_id, 'regular']
        );
        await client.query(
          `UPDATE assigned_offers SET completed_washes = completed_washes + 1 WHERE id = $1`,
          [usage.offer_id]
        );
      }
    }

    const tPartyRows = [];
    for (const t of tPartyItems) {
      const vIds = Array.isArray(t.vehicle_ids) && t.vehicle_ids.length > 0 ? t.vehicle_ids : [vehicle_id || null];
      for (const vId of vIds) {
        tPartyRows.push([
          invoice.id,
          t.third_party_service_id || null,
          t.service_name,
          t.vendor_name || null,
          t.labour_count !== undefined ? t.labour_count : 1,
          t.labour_charge || 0,
          t.selling_price ? (Number(t.selling_price) / (vIds.length || 1)) : 0,
          t.vendor_cost ? (Number(t.vendor_cost) / (vIds.length || 1)) : 0,
          vId,
        ]);
      }
    }
    if (tPartyRows.length > 0) {
      const q = buildBulkInsert(
        'invoice_third_party_services',
        ['invoice_order_id', 'third_party_service_id', 'service_name', 'vendor_name', 'labour_count', 'labour_charge', 'selling_price', 'vendor_cost', 'vehicle_id'],
        tPartyRows
      );
      await client.query(q.text, q.params);
    }

    const paymentRowsToInsert = [];
    for (const p of paymentRows) {
      const method = mapPaymentMethod(p.method || p.payment_method);
      const ref =
        method === 'cash' || method === 'card' || method === 'other'
          ? null
          : (p.reference_no || null);

      paymentRowsToInsert.push([
        invoice.id,
        Number(p.amount),
        method,
        p.date || p.payment_date || new Date(),
        ref,
        p.notes || null,
      ]);
    }
    if (paymentRowsToInsert.length > 0) {
      const q = buildBulkInsert(
        'payments',
        ['invoice_order_id', 'amount', 'payment_method', 'payment_date', 'reference_no', 'notes'],
        paymentRowsToInsert
      );
      await client.query(q.text, q.params);
    }

    // Recompute from lines + payments so totals stay consistent
    await recalculateInvoiceTotals(invoice.id, client);

    const refreshed = await client.query('SELECT * FROM invoices WHERE id = $1', [invoice.id]);
    const servicesRes = await client.query(
      `SELECT isv.*, s.service_name
       FROM invoice_services isv
       JOIN services s ON isv.service_id = s.id
       WHERE isv.invoice_order_id = $1
       ORDER BY isv.id ASC`,
      [invoice.id]
    );

    await client.query('COMMIT');

    res.status(201).json({
      ...refreshed.rows[0],
      services: servicesRes.rows,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
});

// UPDATE header fields (discount / notes / status) and optionally replace service lines
router.put('/:id', async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { id } = req.params;
    const {
      discount,
      special_notes,
      include_terms,
      terms_conditions,
      status,
      service_ids,
      vehicle_id,
      third_party_items,
    } = req.body;

    await client.query('BEGIN');

    const existing = await client.query('SELECT id, client_id, organization_id FROM invoices WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Invoice not found' });
    }

    if (Array.isArray(req.body.vehicle_visits)) {
      await client.query('DELETE FROM invoice_vehicles WHERE invoice_order_id = $1', [id]);
      const visitRows = req.body.vehicle_visits
        .filter(v => v && v.vehicle_id)
        .map(v => [
          id,
          v.vehicle_id,
          v.visitor_name || null,
          v.visitor_phone || null,
          v.checkin_time || null,
          v.checkout_time || null,
        ]);
      if (visitRows.length > 0) {
        const q = buildBulkInsert(
          'invoice_vehicles',
          ['invoice_order_id', 'vehicle_id', 'visitor_name', 'visitor_phone', 'checkin_time', 'checkout_time'],
          visitRows
        );
        await client.query(q.text, q.params);
      }
    }

    if (Array.isArray(req.body.service_items) && req.body.service_items.length > 0) {
      const svcIds = req.body.service_items.map(s => s.service_id);
      const priceRes = await client.query(
        `SELECT id FROM services WHERE id = ANY($1::int[]) AND is_active = TRUE`,
        [svcIds]
      );
      
      // Revert any existing usages
      const usageRes = await client.query('SELECT * FROM assigned_offer_usages WHERE invoice_order_id = $1', [id]);
      for (const usage of usageRes.rows) {
        if (usage.usage_type === 'free') {
          await client.query('UPDATE assigned_offers SET free_washes_used = GREATEST(0, free_washes_used - 1) WHERE id = $1', [usage.assigned_offer_id]);
        } else {
          await client.query('UPDATE assigned_offers SET completed_washes = GREATEST(0, completed_washes - 1) WHERE id = $1', [usage.assigned_offer_id]);
        }
      }
      await client.query('DELETE FROM assigned_offer_usages WHERE invoice_order_id = $1', [id]);
      
      await client.query('DELETE FROM invoice_services WHERE invoice_order_id = $1', [id]);
      const priceById = new Map(priceRes.rows.map(r => [r.id, r]));
      const serviceRows = [];
      const usageUsagesToInsert = [];
      for (const si of req.body.service_items) {
        const row = priceById.get(si.service_id);
        if (!row) continue;
        const vIds = Array.isArray(si.vehicle_ids) && si.vehicle_ids.length > 0
          ? si.vehicle_ids
          : [vehicle_id || null];
        for (const vId of vIds) {
          const unitPrice = si.assigned_offer_id ? 0 : (Number(si.price) / vIds.length || 0);
          serviceRows.push([id, row.id, unitPrice, vId]);
          
          if (si.assigned_offer_id) {
            usageUsagesToInsert.push({ offer_id: si.assigned_offer_id, invoice_id: id });
          }
        }
      }
      if (serviceRows.length > 0) {
        const q = buildBulkInsert(
          'invoice_services',
          ['invoice_order_id', 'service_id', 'unit_price', 'vehicle_id'],
          serviceRows
        );
        await client.query(q.text, q.params);
      }
      
      // Insert usages after invoice_services
      if (usageUsagesToInsert.length > 0) {
        const uniqueUsagesMap = new Map();
        for (const usage of usageUsagesToInsert) {
          uniqueUsagesMap.set(usage.offer_id, usage);
        }
        const uniqueUsages = Array.from(uniqueUsagesMap.values());
        for (const usage of uniqueUsages) {
          await client.query(
            `INSERT INTO assigned_offer_usages (assigned_offer_id, invoice_order_id, usage_type)
             VALUES ($1, $2, $3)`,
            [usage.offer_id, usage.invoice_id, 'regular']
          );
          await client.query(
            `UPDATE assigned_offers SET completed_washes = completed_washes + 1 WHERE id = $1`,
            [usage.offer_id]
          );
        }
      }
    } else if (Array.isArray(service_ids)) {
      const ids = [...new Set(service_ids.map(Number).filter((n) => Number.isFinite(n) && n > 0))];
      if (ids.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'At least one service_id is required' });
      }

      const priceRes = await client.query(
        `SELECT id, base_price FROM services WHERE id = ANY($1::int[]) AND is_active = TRUE`,
        [ids]
      );
      if (priceRes.rows.length !== ids.length) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'One or more services are invalid or inactive' });
      }

      await client.query('DELETE FROM invoice_services WHERE invoice_order_id = $1', [id]);
      const serviceRows = priceRes.rows.map(r => [
        id,
        r.id,
        0,
        vehicle_id || null,
      ]);
      const q = buildBulkInsert(
        'invoice_services',
        ['invoice_order_id', 'service_id', 'unit_price', 'vehicle_id'],
        serviceRows
      );
      await client.query(q.text, q.params);
    }

    if (Array.isArray(third_party_items)) {
      const items = third_party_items.filter((t) => t && t.service_name);
      await client.query('DELETE FROM invoice_third_party_services WHERE invoice_order_id = $1', [id]);
      const tPartyRows = [];
      for (const t of items) {
        const vIds = Array.isArray(t.vehicle_ids) && t.vehicle_ids.length > 0
          ? t.vehicle_ids
          : [vehicle_id || null];
        for (const vId of vIds) {
          tPartyRows.push([
            id,
            t.third_party_service_id || null,
            t.service_name,
            t.vendor_name || null,
            t.labour_count !== undefined ? t.labour_count : 1,
            t.labour_charge || 0,
            t.selling_price ? (Number(t.selling_price) / (vIds.length || 1)) : 0,
            t.vendor_cost ? (Number(t.vendor_cost) / (vIds.length || 1)) : 0,
            vId,
          ]);
        }
      }
      if (tPartyRows.length > 0) {
        const q = buildBulkInsert(
          'invoice_third_party_services',
          ['invoice_order_id', 'third_party_service_id', 'service_name', 'vendor_name', 'labour_count', 'labour_charge', 'selling_price', 'vendor_cost', 'vehicle_id'],
          tPartyRows
        );
        await client.query(q.text, q.params);
      }
    }

    const mappedStatus = status ? mapStatus(status) : null;
    
    // Auto-revert package wash if cancelled
    if (mappedStatus === 'cancelled') {
      const usageRes = await client.query('SELECT * FROM assigned_offer_usages WHERE invoice_order_id = $1', [id]);
      if (usageRes.rows.length > 0) {
        for (const usage of usageRes.rows) {
          if (usage.usage_type === 'free') {
            await client.query('UPDATE assigned_offers SET free_washes_used = GREATEST(0, free_washes_used - 1) WHERE id = $1', [usage.assigned_offer_id]);
          } else {
            await client.query('UPDATE assigned_offers SET completed_washes = GREATEST(0, completed_washes - 1) WHERE id = $1', [usage.assigned_offer_id]);
          }
          await client.query('DELETE FROM assigned_offer_usages WHERE id = $1', [usage.id]);
        }
      }
    }

    await client.query(
      `UPDATE invoices SET
         discount = COALESCE($1, discount),
         special_notes = COALESCE($2, special_notes),
         include_terms = COALESCE($3, include_terms),
         terms_conditions = COALESCE($4, terms_conditions),
         status = COALESCE($5, status),
         vehicle_id = COALESCE($6, vehicle_id),
         organization_id = COALESCE($7, organization_id),
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $8`,
      [
        discount !== undefined ? Number(discount) || 0 : null,
        special_notes !== undefined ? special_notes : null,
        include_terms !== undefined ? !!include_terms : null,
        terms_conditions !== undefined ? terms_conditions : null,
        mappedStatus,
        vehicle_id || null,
        req.body.organization_id || null,
        id,
      ]
    );

    await recalculateInvoiceTotals(id, client);
    const refreshed = await client.query('SELECT * FROM invoices WHERE id = $1', [id]);
    await client.query('COMMIT');
    res.json(refreshed.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
});

function getClientUrl(req) {
  const origin = req.get('origin');
  if (origin && (origin.startsWith('http://') || origin.startsWith('https://'))) {
    return origin.replace(/\/+$/, '');
  }
  const referer = req.get('referer');
  if (referer && (referer.startsWith('http://') || referer.startsWith('https://'))) {
    try {
      const u = new URL(referer);
      return u.origin.replace(/\/+$/, '');
    } catch {}
  }
  if (process.env.CLIENT_URL) {
    const list = process.env.CLIENT_URL.split(',').map(s => s.trim()).filter(Boolean);
    const prod = list.find(u => u.startsWith('https://'));
    if (prod) return prod.replace(/\/+$/, '');
    if (list[0]) return list[0].replace(/\/+$/, '');
  }
  return 'https://manage.detailingmasters.in';
}

// PDF Generation Endpoint
router.get('/:id/pdf', async (req, res) => {
  try {
    const { id } = req.params;
    const browser = await getBrowser();
    const page = await browser.newPage();
    
    // Dynamically match the frontend's origin URL
    const clientUrl = getClientUrl(req);
    
    console.log(`[PDF] Generating for Invoice ID: ${id} using URL: ${clientUrl}`);
    
    // Inject the authentication token so puppeteer isn't redirected to /login
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (token) {
      await page.evaluateOnNewDocument((authToken) => {
        localStorage.setItem('token', authToken);
        localStorage.setItem('isAuthenticated', 'true');
      }, token);
    }
    
    // Navigate to the invoice view page
    await page.goto(`${clientUrl}/invoices/${id}`, { waitUntil: ['domcontentloaded', 'networkidle2'], timeout: 25000 });
    
    // Wait for the invoice to render
    try {
      await page.waitForSelector('#invoice-print', { timeout: 15000 });
    } catch (err) {
      const html = await page.content();
      console.error("[PDF] Timeout waiting for #invoice-print. Page HTML snippet:", html.substring(0, 1500));
      throw err;
    }

    // Force a single-page PDF that only contains the invoice
    await page.evaluate(() => {
      const invoice = document.getElementById('invoice-print');
      if (invoice) {
        document.body.innerHTML = '';
        document.body.appendChild(invoice);
        
        document.body.style.margin = '0';
        document.body.style.padding = '0';
        document.body.style.background = '#fff';
        document.documentElement.style.margin = '0';
        document.documentElement.style.padding = '0';
        document.documentElement.style.background = '#fff';
        
        document.querySelectorAll('.print\\:hidden').forEach(e => e.remove());
      }
    });

    const pdfBuffer = await page.pdf({ 
      format: 'A4',
      printBackground: true,
      margin: { top: '0', bottom: '0', left: '0', right: '0' }
    });
    
    await page.close();
    
    res.json({ base64: Buffer.from(pdfBuffer).toString('base64') });
  } catch (err) {
    console.error('Invoice PDF Generation Error:', err);
    res.status(500).json({ message: 'Error generating PDF: ' + err.message });
  }
});

// PDF Generation Endpoint for Service Report
router.get('/:id/service-report/pdf', async (req, res) => {
  try {
    const { id } = req.params;
    const browser = await getBrowser();
    const page = await browser.newPage();
    
    // Dynamically match the frontend's origin URL
    const clientUrl = getClientUrl(req);
    
    console.log(`[PDF] Generating Service Report for Invoice ID: ${id} using URL: ${clientUrl}`);
    
    // Inject the authentication token so puppeteer isn't redirected to /login
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (token) {
      await page.evaluateOnNewDocument((authToken) => {
        localStorage.setItem('token', authToken);
        localStorage.setItem('isAuthenticated', 'true');
      }, token);
    }
    
    // Navigate to the service report page
    await page.goto(`${clientUrl}/invoices/${id}/service-report`, { waitUntil: ['domcontentloaded', 'networkidle2'], timeout: 25000 });
    
    // Wait for the report to render
    try {
      await page.waitForSelector('#invoice-print', { timeout: 15000 });
    } catch (err) {
      const html = await page.content();
      console.error("[PDF] Timeout waiting for #invoice-print. Page HTML snippet:", html.substring(0, 1500));
      throw err;
    }

    // Force a single-page PDF that only contains the report
    await page.evaluate(() => {
      const report = document.getElementById('invoice-print');
      if (report) {
        document.body.innerHTML = '';
        document.body.appendChild(report);
        
        document.body.style.margin = '0';
        document.body.style.padding = '0';
        document.body.style.background = '#fff';
        document.documentElement.style.margin = '0';
        document.documentElement.style.padding = '0';
        document.documentElement.style.background = '#fff';
        
        document.querySelectorAll('.print\\:hidden').forEach(e => e.remove());
      }
    });

    const pdfBuffer = await page.pdf({ 
      format: 'A4',
      printBackground: true,
      margin: { top: '0', bottom: '0', left: '0', right: '0' }
    });
    
    await page.close();
    
    res.json({ base64: Buffer.from(pdfBuffer).toString('base64') });
  } catch (err) {
    console.error('Service Report PDF Generation Error:', err);
    res.status(500).json({ message: 'Error generating PDF: ' + err.message });
  }
});

module.exports = router;
