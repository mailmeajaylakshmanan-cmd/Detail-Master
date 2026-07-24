const mongoose = require('mongoose');

const websiteBookingSchema = new mongoose.Schema({
  customerName: { type: String, required: true },
  customerEmail: { type: String },
  customerPhone: { type: String, required: true },
  carMake: { type: String },
  carModel: { type: String },
  serviceInterested: { type: String },
  preferredDate: { type: Date },
  status: { 
    type: String, 
    enum: ['Pending', 'Confirmed', 'Cancelled', 'Completed'],
    default: 'Pending'
  },
  notes: { type: String },
}, { timestamps: true });

module.exports = mongoose.models.WebsiteBooking || mongoose.model('WebsiteBooking', websiteBookingSchema);
