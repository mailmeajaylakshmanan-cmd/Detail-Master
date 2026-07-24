const express = require('express');
const router = express.Router();
const Invoice = require('../models/Invoice');
const auth = require('../middleware/auth');
const { secureFind, secureFindOne } = require('../utils/queryHelper');
const Customer = require('../models/Customer');

async function syncCustomerStats(phone) {
  if (!phone) return;
  const invoices = await Invoice.find({ 'customer.phone': phone });
  const totalInvoices = invoices.length;
  const totalBalance = invoices.reduce((sum, inv) => sum + (inv.balance || 0), 0);
  const totalPaid = invoices.reduce((sum, inv) => {
    const paid = inv.payments ? inv.payments.reduce((s, p) => s + (Number(p.amount) || 0), 0) : 0;
    return sum + (paid || Number(inv.advancePaid) || 0);
  }, 0);

  await Customer.findOneAndUpdate(
    { phone },
    { $set: { totalInvoices, totalPaid, totalBalance } },
    { upsert: false }
  );
}

// Helper to launch browser correctly in both local and Serverless/Vercel environments
async function launchBrowser() {
  const isLocal = !process.env.VERCEL && !process.env.AWS_REGION && process.env.NODE_ENV !== 'production';

  if (isLocal) {
    // Local Windows/Mac development
    const p = await import('puppeteer');
    const puppeteer = p.default || p;
    return await puppeteer.launch({ 
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  } else {
    // Vercel / AWS Lambda / Serverless environment
    const p = await import('puppeteer-core');
    const puppeteerCore = p.default || p;
    const c = await import('@sparticuz/chromium');
    const chromium = c.default || c;

    return await puppeteerCore.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
      ignoreHTTPSErrors: true
    });
  }
}

// GET all invoices

router.get('/', auth, async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { 'customer.name': { $regex: search, $options: 'i' } },
        { invoiceNo: { $regex: search, $options: 'i' } },
        { 'customer.phone': { $regex: search, $options: 'i' } },
      ];
    }
    const invoices = await secureFind(Invoice, query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();
    const total = await Invoice.countDocuments(query);
    res.json({ invoices, total, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET single invoice
router.get('/:id', auth, async (req, res) => {
  try {
    const invoice = await secureFindOne(Invoice, { _id: req.params.id }).lean();
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// TEST GET generate invoice PDF (no auth)
router.get('/test/pdf', async (req, res) => {
  try {
    const browser = await launchBrowser();
    const page = await browser.newPage();
    // Test a reliable public URL to isolate browser issues from application issues
    await page.goto('https://example.com', { waitUntil: 'networkidle2', timeout: 30000 });
    const pdfBuffer = await page.pdf({ format: 'A4' });
    await browser.close();
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Length': pdfBuffer.length
    });
    res.send(pdfBuffer);
  } catch (err) {
    res.status(500).json({ 
      message: 'Failed to generate PDF', 
      error: err.message, 
      stack: err.stack 
    });
  }
});

// GET generate invoice PDF
router.get('/:id/pdf', auth, async (req, res) => {
  try {
    const invoice = await secureFindOne(Invoice, { _id: req.params.id });
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

    // Ensure frontend URL is known
    const frontendUrl = req.headers.origin || req.headers.referer?.split('/invoices')[0] || 'http://localhost:5173';
    const targetUrl = `${frontendUrl}/invoices/${req.params.id}`;

    const browser = await launchBrowser();
    const page = await browser.newPage();

    // Pass the auth token to puppeteer so it can load the invoice data
    if (req.cookies?.token) {
      const urlObj = new URL(frontendUrl);
      await page.setCookie({
        name: 'token',
        value: req.cookies.token,
        domain: urlObj.hostname,
      });
    }

    // Bypass React PrivateRoute by setting localStorage before page loads
    await page.evaluateOnNewDocument(() => {
      localStorage.setItem('isAuthenticated', 'true');
    });

    // Await network idle to ensure data fetching is complete
    await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 30000 });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' }
    });

    await browser.close();

    // Vercel / AWS Lambda can corrupt binary buffers in responses
    // Sending it as a base64 JSON string is 100% reliable
    res.json({
      base64: Buffer.from(pdfBuffer).toString('base64'),
      filename: `Invoice-${invoice.invoiceNo}.pdf`
    });
  } catch (err) {
    console.error("PDF generation failed:", err);
    res.status(500).json({ 
      message: 'Failed to generate PDF', 
      error: err.message, 
      stack: err.stack 
    });
  }
});



// GET generate quotation PDF
router.get('/:id/quotation/pdf', auth, async (req, res) => {
  try {
    const invoice = await secureFindOne(Invoice, { _id: req.params.id });
    if (!invoice) return res.status(404).json({ message: 'Quotation not found' });

    let frontendUrl = req.headers.origin || 'http://localhost:5173';
    if (!req.headers.origin && req.headers.referer) {
      if (req.headers.referer.includes('/quotations')) frontendUrl = req.headers.referer.split('/quotations')[0];
      else if (req.headers.referer.includes('/invoices')) frontendUrl = req.headers.referer.split('/invoices')[0];
    }
    const targetUrl = `${frontendUrl}/quotations/${req.params.id}`;

    const browser = await launchBrowser();
    const page = await browser.newPage();

    if (req.cookies?.token) {
      const urlObj = new URL(frontendUrl);
      await page.setCookie({ name: 'token', value: req.cookies.token, domain: urlObj.hostname });
    }

    await page.evaluateOnNewDocument(() => { localStorage.setItem('isAuthenticated', 'true'); });
    await page.setViewport({ width: 1280, height: 1024 });
    await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForSelector('#invoice-print', { timeout: 10000 });
    await new Promise(resolve => setTimeout(resolve, 800));

    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '0', right: '0', bottom: '0', left: '0' } });
    await browser.close();
    res.json({ base64: Buffer.from(pdfBuffer).toString('base64'), filename: `Quotation-${invoice.invoiceNo}.pdf` });
  } catch (err) {
    res.status(500).json({ message: 'Failed to generate Quotation PDF', error: err.message, stack: err.stack });
  }
});

// POST create invoice
router.post('/', auth, async (req, res) => {
  try {
    const invoice = new Invoice(req.body);
    await invoice.save();
    if (invoice.customer && invoice.customer.phone) {
      await syncCustomerStats(invoice.customer.phone);
    }
    res.status(201).json(invoice);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT update invoice
router.put('/:id', auth, async (req, res) => {
  try {
    const invoice = await secureFindOne(Invoice, { _id: req.params.id });
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    
    const oldPhone = invoice.customer?.phone;
    
    // Assign fields
    Object.assign(invoice, req.body);
    
    await invoice.save();
    
    if (oldPhone) await syncCustomerStats(oldPhone);
    if (invoice.customer?.phone && invoice.customer.phone !== oldPhone) {
      await syncCustomerStats(invoice.customer.phone);
    }
    
    res.json(invoice);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PATCH update status only
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const invoice = await secureFindOne(Invoice, { _id: req.params.id });
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    
    invoice.status = status;
    await invoice.save();
    if (invoice.customer?.phone) {
      await syncCustomerStats(invoice.customer.phone);
    }
    res.json(invoice);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE invoice
router.delete('/:id', auth, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    const phone = invoice.customer?.phone;
    await Invoice.findByIdAndDelete(req.params.id);
    if (phone) await syncCustomerStats(phone);
    res.json({ message: 'Invoice deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
