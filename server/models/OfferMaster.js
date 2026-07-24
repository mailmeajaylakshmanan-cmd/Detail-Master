const mongoose = require('mongoose');

const offerMasterSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String, default: '' },
  defaultPrice: { type: Number, default: 0 },
  defaultValidityDays: { type: Number, default: 365 },
  terms: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('OfferMaster', offerMasterSchema);
