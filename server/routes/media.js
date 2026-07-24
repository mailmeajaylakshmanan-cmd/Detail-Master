const express = require('express');
const router = express.Router();
const cloudinary = require('cloudinary').v2;
const InvoiceMedia = require('../models/InvoiceMedia');
const { protect } = require('../middleware/auth');
const { secureFindOne } = require('../utils/queryHelper');

// Configure cloudinary with dummy/env variables. In production, these should be in .env
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'demo',
  api_key: process.env.CLOUDINARY_API_KEY || '123456789',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'secret'
});

// @route   GET /api/media/view-photos/:invoiceId
// @desc    Get secure signed URLs for invoice media
// @access  Private (Studio)
router.get('/view-photos/:invoiceId', protect, async (req, res) => {
  try {
    const media = await secureFindOne(InvoiceMedia, { invoiceId: req.params.invoiceId }, req);

    if (!media) {
      return res.status(404).json({ message: "No media found for this invoice." });
    }

    // Generate a URL that expires in 1 hour
    const secureUrls = media.imageIds.map(id => {
      return cloudinary.url(id, {
        sign_url: true,
        type: 'authenticated',
        expires_at: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour from now
      });
    });

    res.json({ photos: secureUrls });
  } catch (error) {
    console.error("Error generating signed URLs:", error);
    res.status(500).json({ message: "Server error generating media URLs" });
  }
});

module.exports = router;
