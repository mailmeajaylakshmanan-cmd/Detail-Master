const express = require('express');
const router = express.Router();
const db = require('../db');
const { recalculateInvoiceTotals } = require('../utils/finance');

function mapPaymentMethod(method) {
  const m = String(method || 'cash').toLowerCase().replace(/\s+/g, '_');
  if (m === 'bank_transfer' || m === 'bank-transfer') return 'bank_transfer';
  if (m === 'upi') return 'upi';
  if (m === 'card') return 'card';
  if (m === 'cash') return 'cash';
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
         v.make_model AS vehicle_name, v.license_vin, v.vehicle_type
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

    const [servicesRes, thirdPartyRes, paymentsRes] = await Promise.all([
      db.query(
        `SELECT isv.*, s.service_name, s.category, v.license_vin AS vehicle_plate
         FROM invoice_services isv
         JOIN services s ON isv.service_id = s.id
         LEFT JOIN vehicles v ON isv.vehicle_id = v.id
         WHERE isv.invoice_order_id = $1
         ORDER BY isv.id ASC`,
        [id]
      ),
      db.query(
        `SELECT itp.*, v.license_vin AS vehicle_plate 
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
    ]);

    invoice.services = servicesRes.rows;
    invoice.thirdPartyServices = thirdPartyRes.rows;
    invoice.payments = paymentsRes.rows;
    res.json(invoice);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// CREATE invoice + all service lines (+ optional payments) in one call
// Body: client_id, vehicle_id, service_ids: number[], discount?, amount_paid?,
//       status?, special_notes?, include_terms?, terms_conditions?, payments?,
//       third_party_items?: [{ third_party_service_id?, service_name, vendor_name?,
//                              labour_count?, labour_charge?, service_cost?, selling_price }]
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
      const sRes = await client.query('SELECT id, base_price FROM services WHERE id = ANY($1::int[])', [ids]);
      
      req.body.service_items.forEach(si => {
        const dbSrv = sRes.rows.find(r => r.id === si.service_id);
        if (dbSrv) {
          lines.push({
            service_id: si.service_id,
            unit_price: Number(dbSrv.base_price) || 0,
            vehicle_ids: Array.isArray(si.vehicle_ids) && si.vehicle_ids.length > 0 ? si.vehicle_ids : [vehicle_id || null]
          });
        }
      });
    } else if (Array.isArray(service_ids) && service_ids.length > 0) {
      const sRes = await client.query('SELECT id, base_price FROM services WHERE id = ANY($1::int[])', [service_ids]);
      lines = service_ids.map((id) => {
        const row = sRes.rows.find((r) => r.id === id);
        return {
          service_id: id,
          unit_price: row ? Number(row.base_price) : 0,
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

    for (const line of lines) {
      const vIds = line.vehicle_ids.length > 0 ? line.vehicle_ids : [null];
      for (const vId of vIds) {
        await client.query(
          `INSERT INTO invoice_services (invoice_order_id, service_id, unit_price, vehicle_id)
           VALUES ($1, $2, $3, $4)`,
          [invoice.id, line.service_id, line.unit_price, vId]
        );
      }
    }

    for (const t of tPartyItems) {
      const vIds = Array.isArray(t.vehicle_ids) && t.vehicle_ids.length > 0 ? t.vehicle_ids : [vehicle_id || null];
      for (const vId of vIds) {
        await client.query(
          `INSERT INTO invoice_third_party_services
           (invoice_order_id, third_party_service_id, service_name, vendor_name, labour_count, labour_charge, service_cost, selling_price, vehicle_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            invoice.id,
            t.third_party_service_id || null,
            t.service_name,
            t.vendor_name || null,
            t.labour_count !== undefined ? t.labour_count : 1,
            t.labour_charge || 0,
            t.service_cost || 0,
            t.selling_price || 0,
            vId,
          ]
        );
      }
    }

    for (const p of paymentRows) {
      const method = mapPaymentMethod(p.method || p.payment_method);
      const ref =
        method === 'cash' || method === 'card' || method === 'other'
          ? null
          : (p.reference_no || null);

      await client.query(
        `INSERT INTO payments (invoice_order_id, amount, payment_method, payment_date, reference_no, notes)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          invoice.id,
          Number(p.amount),
          method,
          p.date || p.payment_date || new Date(),
          ref,
          p.notes || null,
        ]
      );
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

    const existing = await client.query('SELECT id FROM invoices WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Invoice not found' });
    }

    if (Array.isArray(service_ids)) {
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
      for (const row of priceRes.rows) {
        await client.query(
          `INSERT INTO invoice_services (invoice_order_id, service_id, unit_price)
           VALUES ($1, $2, $3)`,
          [id, row.id, Number(row.base_price) || 0]
        );
      }
    }

    if (Array.isArray(third_party_items)) {
      const items = third_party_items.filter((t) => t && t.service_name);
      await client.query('DELETE FROM invoice_third_party_services WHERE invoice_order_id = $1', [id]);
      for (const t of items) {
        await client.query(
          `INSERT INTO invoice_third_party_services
           (invoice_order_id, third_party_service_id, service_name, vendor_name, labour_count, labour_charge, service_cost, selling_price)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            id,
            t.third_party_service_id || null,
            t.service_name,
            t.vendor_name || null,
            t.labour_count !== undefined ? t.labour_count : 1,
            t.labour_charge || 0,
            t.service_cost || 0,
            t.selling_price || 0,
          ]
        );
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
        status ? mapStatus(status) : null,
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

module.exports = router;
