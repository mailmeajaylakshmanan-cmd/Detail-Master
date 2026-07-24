const express = require('express');
const router = express.Router();
const OfferMaster = require('../models/OfferMaster');
const auth = require('../middleware/auth');

// GET all templates
router.get('/', auth, async (req, res) => {
  try {
    const templates = await OfferMaster.find().sort({ createdAt: -1 });
    res.json(templates);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST create template
router.post('/', auth, async (req, res) => {
  try {
    const template = new OfferMaster(req.body);
    await template.save();
    res.status(201).json(template);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT update template
router.put('/:id', auth, async (req, res) => {
  try {
    const template = await OfferMaster.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!template) return res.status(404).json({ message: 'Template not found' });
    res.json(template);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE template
router.delete('/:id', auth, async (req, res) => {
  try {
    const template = await OfferMaster.findByIdAndDelete(req.params.id);
    if (!template) return res.status(404).json({ message: 'Template not found' });
    res.json({ message: 'Template deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
