const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
  offerNo: { type: String, required: true },
  customer: {
    name: { type: String, required: true },
    phone: { type: String, required: true },
  },
  carMake: { type: String, default: '' },
  carModel: { type: String, default: '' },
  licensePlate: { type: String, default: '' },
  masterOfferId: { type: mongoose.Schema.Types.ObjectId, ref: 'OfferMaster' },
  packageName: { type: String, required: true },
  description: { type: String, default: '' },
  price: { type: Number, default: 0 },
  validityDate: { type: String, default: '' },
  terms: { type: String, default: '' },
  status: { type: String, enum: ['active', 'expired', 'used'], default: 'active' },
  date: { type: Date, default: Date.now },
}, { timestamps: true });

// Auto-generate offer number
offerSchema.pre('validate', async function (next) {
  if (!this.offerNo) {
    const lastOffer = await mongoose.model('Offer').findOne().sort({ createdAt: -1 });
    let nextNumber = 1;
    if (lastOffer && lastOffer.offerNo && lastOffer.offerNo.startsWith('OFF-')) {
      const lastNumber = parseInt(lastOffer.offerNo.replace('OFF-', ''), 10);
      if (!isNaN(lastNumber)) {
        nextNumber = lastNumber + 1;
      }
    }
    this.offerNo = `OFF-${String(nextNumber).padStart(4, '0')}`;
  }
  next();
});

offerSchema.index({ offerNo: 1 }, { unique: true });

module.exports = mongoose.model('Offer', offerSchema);
