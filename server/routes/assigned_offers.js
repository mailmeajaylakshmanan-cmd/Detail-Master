const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { protect } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');
const { getBrowser } = require('../utils/pdf');
const { renderOfferHtml } = require('../utils/invoiceHtmlTemplate');

router.use(protect, requirePermission('Offers'));

// Function to generate Offer number
async function generateOfferNo() {
  const result = await pool.query("SELECT COUNT(*) FROM assigned_offers WHERE DATE(created_at) = CURRENT_DATE");
  const count = parseInt(result.rows[0].count) + 1;
  const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  return `OFF-${dateStr}-${count.toString().padStart(3, '0')}`;
}

// POST /offers - Create new assigned offer
router.post('/', protect, async (req, res) => {
  const { customer, vehicleId, masterOfferId, packageName, price, validityDate, totalWashes, freeWashes, terms, services = [], thirdPartyItems = [] } = req.body;
  
  if (!customer || !customer.id) {
    return res.status(400).json({ message: 'Customer is required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // 1. Generate Offer No
    const resultCount = await client.query("SELECT COUNT(*) FROM assigned_offers WHERE DATE(created_at) = CURRENT_DATE");
    const count = parseInt(resultCount.rows[0].count) + 1;
    const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const offerNo = `OFF-${dateStr}-${count.toString().padStart(3, '0')}`;
    
    // 2. Generate Linked Purchase Invoice
    const invoiceNumber = `INV-DM-${Date.now()}`;
    const invoicePrice = Number(price) || 0;
    
    // Calculate subtotal from selected services
    let servicesSubTotal = services.reduce((acc, s) => acc + (Number(s.price) || 0), 0);
    let thirdPartySubTotal = thirdPartyItems.reduce((acc, t) => acc + (Number(t.selling_price) || 0), 0);
    let calculatedSubTotal = servicesSubTotal + thirdPartySubTotal;
    
    // If no services were selected, we fallback to just the package price as subtotal
    let subTotal = calculatedSubTotal > 0 ? calculatedSubTotal : invoicePrice;
    let discount = Math.max(0, subTotal - invoicePrice);
    
    const invRes = await client.query(
      `INSERT INTO invoices (
         invoice_number, client_id, vehicle_id, status,
         sub_total, discount, grand_total, amount_paid, balance_due,
         special_notes, include_terms, terms_conditions
       ) VALUES (
         $1, $2, $3, $4,
         $5, $6, $7, 0, $8,
         $9, true, null
       ) RETURNING id`,
      [
        invoiceNumber,
        customer.id,
        vehicleId || null,
        'open',
        subTotal,
        discount,
        invoicePrice, // Grand total is always the package price
        invoicePrice, // Balance due starts as the package price
        `Purchase of Package: ${packageName}`
      ]
    );
    const invoiceId = invRes.rows[0].id;

    // 3. Insert Line Items into Invoice
    if (services.length > 0 || thirdPartyItems.length > 0) {
      for (const s of services) {
        if (!s.service_id) continue;
        await client.query(
          `INSERT INTO invoice_services (invoice_order_id, service_id, unit_price)
           VALUES ($1, $2, $3)`,
          [invoiceId, s.service_id, s.price || 0]
        );
      }
      for (const t of thirdPartyItems) {
        await client.query(
          `INSERT INTO invoice_third_party_services 
           (invoice_order_id, third_party_service_id, service_name, vendor_name, labour_count, labour_charge, selling_price)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            invoiceId, 
            t.third_party_service_id || null, 
            t.service_name || 'Custom Third-Party Service',
            t.vendor_name || null,
            t.labour_count || 1,
            t.labour_charge || 0,
            t.selling_price || 0
          ]
        );
      }
    } else {
      // Fallback: If no services selected, insert generic package line item
      await client.query(
        `INSERT INTO invoice_third_party_services 
         (invoice_order_id, service_name, selling_price)
         VALUES ($1, $2, $3)`,
        [invoiceId, `Package Subscription: ${packageName}`, invoicePrice]
      );
    }

    // 4. Save Assigned Offer with invoice link
    const result = await client.query(
      `INSERT INTO assigned_offers 
       (offer_no, client_id, vehicle_id, master_offer_id, package_name, price, validity_date, total_washes, free_washes, terms, purchase_invoice_order_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [
        offerNo, 
        customer.id, 
        vehicleId || null, 
        masterOfferId || null, 
        packageName, 
        invoicePrice, 
        validityDate, 
        totalWashes || 0, 
        freeWashes || 0, 
        terms || '',
        invoiceId
      ]
    );

    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ message: 'Server error assigning offer' });
  } finally {
    client.release();
  }
});

// Helper mapping for frontend
const mapAssignedOffer = (offerData) => ({
  id: offerData.id,
  offerNo: offerData.offer_no,
  date: offerData.created_at,
  customer: {
    id: offerData.client_id,
    name: offerData.customer_name,
    phone: offerData.customer_phone
  },
  packageName: offerData.package_name,
  price: offerData.price,
  validityDate: offerData.validity_date,
  totalWashes: offerData.total_washes,
  freeWashes: offerData.free_washes,
  completedWashes: offerData.completed_washes,
  freeWashesUsed: offerData.free_washes_used,
  terms: offerData.terms,
  status: offerData.status,
  carMake: offerData.vehicle_make || '', 
  carModel: '',
  licensePlate: offerData.license_vin || '',
  vehicleId: offerData.vehicle_id || null,
  masterOfferId: offerData.master_offer_id || null,
  serviceIds: offerData.service_ids || [],
  thirdPartyServiceIds: offerData.third_party_service_ids || []
});

// GET /offers - List all assigned offers
router.get('/', protect, async (req, res) => {
  try {
    const { client_id } = req.query;
    
    let query = `
      SELECT o.*, c.full_name as customer_name, c.phone as customer_phone, v.make_model as vehicle_make, mo.service_ids, mo.third_party_service_ids
      FROM assigned_offers o
      JOIN clients c ON o.client_id = c.id
      LEFT JOIN vehicles v ON o.vehicle_id = v.id
      LEFT JOIN master_offers mo ON o.master_offer_id = mo.id
    `;
    const params = [];
    
    if (client_id) {
      query += ` WHERE o.client_id = $1`;
      params.push(client_id);
    }
    
    query += ` ORDER BY o.created_at DESC`;
    
    const result = await pool.query(query, params);
    res.json(result.rows.map(mapAssignedOffer));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error fetching offers' });
  }
});

// GET /offers/:id - Get a specific assigned offer
router.get('/:id', protect, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT o.*, c.full_name as "customer_name", c.phone as "customer_phone", mo.service_ids, mo.third_party_service_ids, v.make_model as "vehicle_make", v.license_vin
       FROM assigned_offers o
       JOIN clients c ON o.client_id = c.id
       LEFT JOIN vehicles v ON o.vehicle_id = v.id
       LEFT JOIN master_offers mo ON o.master_offer_id = mo.id
       WHERE o.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Offer not found' });
    }
    
    const offerData = result.rows[0];
    
    // Map to frontend expected shape
    res.json(mapAssignedOffer(offerData));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /offers/:id/redeem - Redeem a wash
router.post('/:id/redeem', protect, async (req, res) => {
  const { invoiceOrderId, usageType } = req.body;
  if (!invoiceOrderId) {
    return res.status(400).json({ message: 'Invoice order ID is required to redeem a wash' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const offerRes = await client.query('SELECT * FROM assigned_offers WHERE id = $1', [req.params.id]);
    if (offerRes.rows.length === 0) throw new Error('Offer not found');
    const offer = offerRes.rows[0];

    const type = usageType || 'regular';
    if (type === 'free' && offer.free_washes_used >= offer.free_washes) {
       throw new Error('No free washes remaining in this package');
    }
    if (type === 'regular' && offer.completed_washes >= offer.total_washes) {
       throw new Error('No washes remaining in this package');
    }

    // Insert usage record
    await client.query(
      `INSERT INTO assigned_offer_usages (assigned_offer_id, invoice_order_id, usage_type) VALUES ($1, $2, $3)`,
      [offer.id, invoiceOrderId, type]
    );

    // Update counters
    if (type === 'free') {
      await client.query(`UPDATE assigned_offers SET free_washes_used = free_washes_used + 1 WHERE id = $1`, [offer.id]);
    } else {
      await client.query(`UPDATE assigned_offers SET completed_washes = completed_washes + 1 WHERE id = $1`, [offer.id]);
    }

    await client.query('COMMIT');
    res.json({ message: 'Wash successfully redeemed' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(400).json({ message: err.message || 'Server error redeeming wash' });
  } finally {
    client.release();
  }
});

// GET /offers/:id/pdf - Generate PDF for a specific assigned offer
router.get('/:id/pdf', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT o.*, c.full_name as "customer_name", c.phone as "customer_phone", mo.service_ids, mo.third_party_service_ids, v.make_model as "vehicle_make", v.license_vin
       FROM assigned_offers o
       JOIN clients c ON o.client_id = c.id
       LEFT JOIN vehicles v ON o.vehicle_id = v.id
       LEFT JOIN master_offers mo ON o.master_offer_id = mo.id
       WHERE o.id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Offer not found' });
    }

    const offerData = result.rows[0];
    const html = renderOfferHtml(offerData);
    const browser = await getBrowser();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', bottom: '0', left: '0', right: '0' }
    });
    await page.close();

    res.json({ base64: Buffer.from(pdfBuffer).toString('base64') });
  } catch (err) {
    console.error('Offer PDF Generation Error:', err);
    res.status(500).json({ message: 'Error generating PDF: ' + err.message });
  }
});

module.exports = router;
