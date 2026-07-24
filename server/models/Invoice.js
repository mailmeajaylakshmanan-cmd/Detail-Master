const mongoose = require('mongoose');

const serviceLineSchema = new mongoose.Schema({
  service: { type: String, required: true },
  description: { type: String, default: '' },
  price: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
});

function parseDateString(str) {
  if (!str) return null;
  const match = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (match) {
    return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
  }
  const d = new Date(str);
  if (!isNaN(d.getTime())) return d;
  return null;
}

const invoiceSchema = new mongoose.Schema({
  invoiceNo: { type: String, required: true },
  date: { type: Date, default: Date.now },
  customer: {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, default: '' },
  },
  carMake: { type: String, default: '' },
  carModel: { type: String, default: '' },
  licensePlate: { type: String, default: '' },
  showTerms: { type: Boolean, default: true },
  termsAndConditions: { type: String, default: '' },
  serviceDate: { type: String, default: '' },
  serviceDates: [Date],
  services: [serviceLineSchema],
  subTotal: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  payments: [{
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    method: { type: String, enum: ['UPI', 'Cash', 'Bank Transfer', 'Card'], default: 'Cash' },
    type: { type: String, default: 'Advance' }
  }],
  balance: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['pending', 'partial', 'paid'],
    default: 'pending',
  },
  notes: { type: String, default: 'Thank you for choosing Detailing Masters for your car care needs!' },
}, { timestamps: true, strict: true });

// Auto-generate invoice number and update balance before validation
invoiceSchema.pre('validate', async function (next) {
  if (!this.invoiceNo) {
    const lastInvoice = await mongoose.model('Invoice').findOne().sort({ createdAt: -1 });
    let nextNumber = 1;
    if (lastInvoice && lastInvoice.invoiceNo && lastInvoice.invoiceNo.startsWith('DM-')) {
      const lastNumber = parseInt(lastInvoice.invoiceNo.replace('DM-', ''), 10);
      if (!isNaN(lastNumber)) {
        nextNumber = lastNumber + 1;
      }
    }
    this.invoiceNo = `DM-${String(nextNumber).padStart(4, '0')}`;
  }

  // Parse serviceDate string to serviceDates array if serviceDates is empty
  if (this.serviceDate && (!this.serviceDates || this.serviceDates.length === 0)) {
    const dates = this.serviceDate
      .split(/&|,/)
      .map(d => parseDateString(d.trim()))
      .filter(d => d !== null);
    this.serviceDates = dates;
  }

  // Calculate and update balance
  const totalPaidAmount = this.payments ? this.payments.reduce((sum, payment) => sum + (payment.amount || 0), 0) : 0;
  this.balance = this.total - totalPaidAmount;

  // Auto-resolve status based on balance
  if (this.total > 0) {
    if (this.balance <= 0) {
      this.status = 'paid';
    } else if (this.balance < this.total) {
      this.status = 'partial';
    } else {
      this.status = 'pending';
    }
  }

  next();
});

invoiceSchema.index({ invoiceNo: 1 }, { unique: true });
invoiceSchema.index({ status: 1, createdAt: -1, 'customer.name': 1, invoiceNo: 1 });
invoiceSchema.index({ serviceDates: 1 });

module.exports = mongoose.model('Invoice', invoiceSchema);
