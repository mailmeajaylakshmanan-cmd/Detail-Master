const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { protect } = require('../middleware/auth');
const { getBrowser } = require('../utils/pdf');
const { renderQuotationHtml } = require('../utils/invoiceHtmlTemplate');

/**
 * Generate unique quotation number: QT-YYYYMM-XXXX
 */
async function generateQuotationNumber(client) {
  const now = new Date();
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prefix = `QT-${yearMonth}-`;

  const countRes = await client.query(
    "SELECT COUNT(*) AS count FROM quotations WHERE quotation_number LIKE $1",
    [`${prefix}%`]
  );
  const nextSeq = parseInt(countRes.rows[0].count, 10) + 1;
  return `${prefix}${String(nextSeq).padStart(4, '0')}`;
}

// GET /api/quotations - List quotations with search and pagination
router.get('/', protect, async (req, res) => {
  try {
    const { q, status, limit = 50, offset = 0 } = req.query;
    let query = `
      SELECT q.*, 
        c.phone as client_profile_phone,
        c.full_name as client_profile_name,
        org.org_name as organization_name,
        org.phone as organization_phone,
        org.contact_person as organization_contact_person,
        v.make_model as registered_vehicle_model
      FROM quotations q
      LEFT JOIN clients c ON q.client_id = c.id
      LEFT JOIN organizations org ON q.organization_id = org.id
      LEFT JOIN vehicles v ON q.vehicle_id = v.id
      WHERE 1=1
    `;
    const params = [];

    if (q && q.trim()) {
      params.push(`%${q.trim()}%`);
      query += ` AND (
        q.quotation_number ILIKE $${params.length} OR
        q.client_name ILIKE $${params.length} OR
        q.client_phone ILIKE $${params.length} OR
        org.org_name ILIKE $${params.length} OR
        q.license_plate ILIKE $${params.length} OR
        q.vehicle_name ILIKE $${params.length}
      )`;
    }

    if (status && status !== 'all') {
      params.push(status);
      query += ` AND q.status = $${params.length}`;
    }

    query += ` ORDER BY q.created_at DESC`;

    if (limit) {
      params.push(parseInt(limit, 10));
      query += ` LIMIT $${params.length}`;
    }
    if (offset) {
      params.push(parseInt(offset, 10));
      query += ` OFFSET $${params.length}`;
    }

    const result = await pool.query(query, params);

    // Also get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM quotations q
      LEFT JOIN organizations org ON q.organization_id = org.id
      WHERE 1=1
      ${q && q.trim() ? ` AND (
        q.quotation_number ILIKE '%${q.trim()}%' OR
        q.client_name ILIKE '%${q.trim()}%' OR
        q.client_phone ILIKE '%${q.trim()}%' OR
        org.org_name ILIKE '%${q.trim()}%' OR
        q.license_plate ILIKE '%${q.trim()}%' OR
        q.vehicle_name ILIKE '%${q.trim()}%'
      )` : ''}
      ${status && status !== 'all' ? ` AND q.status = '${status}'` : ''}
    `;
    const countRes = await pool.query(countQuery);

    res.json({
      quotations: result.rows,
      total: parseInt(countRes.rows[0]?.total || 0, 10),
    });
  } catch (err) {
    console.error('Error fetching quotations:', err);
    res.status(500).json({ message: 'Error fetching quotations', error: err.message });
  }
});

// GET /api/quotations/:id - Get single quotation
router.get('/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT q.*, 
        c.phone as client_profile_phone,
        c.full_name as client_profile_name,
        c.email as client_email,
        org.org_name as organization_name,
        org.phone as organization_phone,
        org.contact_person as organization_contact_person,
        org.email as organization_email,
        org.address as organization_address,
        v.make_model as registered_vehicle_model,
        v.vehicle_type_id
       FROM quotations q
       LEFT JOIN clients c ON q.client_id = c.id
       LEFT JOIN organizations org ON q.organization_id = org.id
       LEFT JOIN vehicles v ON q.vehicle_id = v.id
       WHERE q.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Quotation not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching quotation details:', err);
    res.status(500).json({ message: 'Error fetching quotation details', error: err.message });
  }
});

// POST /api/quotations - Create new quotation
router.post('/', protect, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const {
      client_id,
      organization_id,
      client_name,
      client_phone,
      client_address,
      vehicle_id,
      vehicle_name,
      license_plate,
      vehicle_type,
      sub_total = 0,
      discount = 0,
      discount_type = 'fixed',
      discount_value = 0,
      grand_total = 0,
      notes = '',
      valid_until = null,
      status = 'draft',
      services = []
    } = req.body;

    const quotationNumber = await generateQuotationNumber(client);

    const insertQuery = `
      INSERT INTO quotations (
        quotation_number,
        client_id,
        organization_id,
        client_name,
        client_phone,
        client_address,
        vehicle_id,
        vehicle_name,
        license_plate,
        vehicle_type,
        sub_total,
        discount,
        discount_type,
        discount_value,
        grand_total,
        notes,
        valid_until,
        status,
        services,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19,
        NOW(), NOW()
      ) RETURNING *;
    `;

    const values = [
      quotationNumber,
      client_id || null,
      organization_id || null,
      client_name || 'Walk-in Customer',
      client_phone || '',
      client_address || '',
      vehicle_id || null,
      vehicle_name || '',
      license_plate ? license_plate.toUpperCase().trim() : '',
      vehicle_type || '',
      Number(sub_total) || 0,
      Number(discount) || 0,
      discount_type || 'fixed',
      Number(discount_value) || 0,
      Number(grand_total) || 0,
      notes || '',
      valid_until || null,
      status || 'draft',
      JSON.stringify(services || [])
    ];

    const result = await client.query(insertQuery, values);
    await client.query('COMMIT');

    res.status(201).json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating quotation:', err);
    res.status(500).json({ message: 'Error creating quotation', error: err.message });
  } finally {
    client.release();
  }
});

// PUT /api/quotations/:id - Update quotation
router.put('/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      client_id,
      organization_id,
      client_name,
      client_phone,
      client_address,
      vehicle_id,
      vehicle_name,
      license_plate,
      vehicle_type,
      sub_total = 0,
      discount = 0,
      discount_type = 'fixed',
      discount_value = 0,
      grand_total = 0,
      notes,
      valid_until,
      status,
      services
    } = req.body;

    const updateQuery = `
      UPDATE quotations SET
        client_id = COALESCE($1, client_id),
        organization_id = COALESCE($2, organization_id),
        client_name = COALESCE($3, client_name),
        client_phone = COALESCE($4, client_phone),
        client_address = COALESCE($5, client_address),
        vehicle_id = COALESCE($6, vehicle_id),
        vehicle_name = COALESCE($7, vehicle_name),
        license_plate = COALESCE($8, license_plate),
        vehicle_type = COALESCE($9, vehicle_type),
        sub_total = $10,
        discount = $11,
        discount_type = $12,
        discount_value = $13,
        grand_total = $14,
        notes = COALESCE($15, notes),
        valid_until = COALESCE($16, valid_until),
        status = COALESCE($17, status),
        services = COALESCE($18, services),
        updated_at = NOW()
      WHERE id = $19
      RETURNING *;
    `;

    const values = [
      client_id || null,
      organization_id || null,
      client_name,
      client_phone,
      client_address,
      vehicle_id || null,
      vehicle_name,
      license_plate ? license_plate.toUpperCase().trim() : null,
      vehicle_type,
      Number(sub_total) || 0,
      Number(discount) || 0,
      discount_type || 'fixed',
      Number(discount_value) || 0,
      Number(grand_total) || 0,
      notes,
      valid_until,
      status,
      services ? JSON.stringify(services) : null,
      id
    ];

    const result = await pool.query(updateQuery, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Quotation not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating quotation:', err);
    res.status(500).json({ message: 'Error updating quotation', error: err.message });
  }
});

// DELETE /api/quotations/:id - Delete quotation
router.delete('/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM quotations WHERE id = $1 RETURNING id, quotation_number', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Quotation not found' });
    }
    res.json({ message: 'Quotation deleted successfully', deleted: result.rows[0] });
  } catch (err) {
    console.error('Error deleting quotation:', err);
    res.status(500).json({ message: 'Error deleting quotation', error: err.message });
  }
});

// GET /api/quotations/:id/pdf - Generate high-resolution PDF for quotation
router.get('/:id/pdf', protect, async (req, res) => {
  let page = null;
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT q.*, 
        c.phone as client_profile_phone,
        c.full_name as client_profile_name,
        c.email as client_email,
        org.org_name as organization_name,
        org.phone as organization_phone,
        org.contact_person as organization_contact_person,
        org.email as organization_email,
        org.address as organization_address,
        v.make_model as registered_vehicle_model,
        v.vehicle_type_id
       FROM quotations q
       LEFT JOIN clients c ON q.client_id = c.id
       LEFT JOIN organizations org ON q.organization_id = org.id
       LEFT JOIN vehicles v ON q.vehicle_id = v.id
       WHERE q.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Quotation not found' });
    }

    const quotation = result.rows[0];
    const html = renderQuotationHtml(quotation);

    const browser = await getBrowser();
    page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', bottom: '0', left: '0', right: '0' }
    });
    await page.close();
    page = null;

    res.json({ base64: Buffer.from(pdfBuffer).toString('base64') });
  } catch (err) {
    if (page) {
      try { await page.close(); } catch (_) {}
    }
    console.error('Quotation PDF Generation Error:', err);
    res.status(500).json({ message: 'Error generating PDF: ' + err.message });
  }
});

module.exports = router;
