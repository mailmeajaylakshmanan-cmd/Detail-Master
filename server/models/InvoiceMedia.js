const mongoose = require('mongoose');

const invoiceMediaSchema = new mongoose.Schema({
  invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', required: true },
  imageIds: [{ type: String, required: true }] // Cloudinary public_ids
}, { timestamps: true });

module.exports = mongoose.model('InvoiceMedia', invoiceMediaSchema);
