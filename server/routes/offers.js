const express = require('express');
const router = express.Router();
const Offer = require('../models/Offer');
const auth = require('../middleware/auth');
const { secureFindOne } = require('../utils/queryHelper');

// Helper to launch browser correctly in both local and Serverless/Vercel environments
async function launchBrowser() {
  const isLocal = !process.env.VERCEL && !process.env.AWS_REGION && process.env.NODE_ENV !== 'production';

  if (isLocal) {
    const p = await import('puppeteer');
    const puppeteer = p.default || p;
    return await puppeteer.launch({ 
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  } else {
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

// GET all offers
router.get('/', auth, async (req, res) => {
  try {
    const offers = await Offer.find().sort({ createdAt: -1 }).lean();
    res.json(offers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST create offer
router.post('/', auth, async (req, res) => {
  try {
    const offer = new Offer(req.body);
    await offer.save();
    res.status(201).json(offer);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// GET single offer
router.get('/:id', auth, async (req, res) => {
  try {
    const offer = await secureFindOne(Offer, { _id: req.params.id }).populate('masterOfferId').lean();
    if (!offer) return res.status(404).json({ message: 'Offer not found' });
    res.json(offer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET generate offer PDF
router.get('/:id/pdf', auth, async (req, res) => {
  try {
    const offer = await secureFindOne(Offer, { _id: req.params.id });
    if (!offer) return res.status(404).json({ message: 'Offer not found' });

    let frontendUrl = req.headers.origin || 'http://localhost:5173';
    if (!req.headers.origin && req.headers.referer) {
      if (req.headers.referer.includes('/offers')) frontendUrl = req.headers.referer.split('/offers')[0];
    }
    const targetUrl = `${frontendUrl}/offers/${req.params.id}`;

    const browser = await launchBrowser();
    const page = await browser.newPage();

    if (req.cookies?.token) {
      const urlObj = new URL(frontendUrl);
      await page.setCookie({
        name: 'token',
        value: req.cookies.token,
        domain: urlObj.hostname,
      });
    }

    await page.evaluateOnNewDocument(() => {
      localStorage.setItem('isAuthenticated', 'true');
    });

    await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 30000 });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' }
    });

    await browser.close();

    res.json({
      base64: Buffer.from(pdfBuffer).toString('base64'),
      filename: `Offer-${offer.offerNo}.pdf`
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

module.exports = router;
