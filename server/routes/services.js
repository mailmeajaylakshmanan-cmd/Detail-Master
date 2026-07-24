const express = require('express');
const router = express.Router();
const Service = require('../models/Service');
const auth = require('../middleware/auth');
const { secureFind, secureFindOne } = require('../utils/queryHelper');

router.get('/', auth, async (req, res) => {
  try {
    const services = await secureFind(Service, {})
      .sort({ name: 1 })
      .lean();
    res.json(services);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const service = new Service(req.body);
    await service.save();
    const populated = await secureFindOne(Service, { _id: service._id }).lean();
    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const service = await Service.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!service) return res.status(404).json({ message: 'Service not found' });
    const populated = await secureFindOne(Service, { _id: service._id }).lean();
    res.json(populated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { isActive } = req.body;
    const service = await Service.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true }
    );
    if (!service) return res.status(404).json({ message: 'Service not found' });
    const populated = await secureFindOne(Service, { _id: service._id }).lean();
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
