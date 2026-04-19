const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  client: { type: String, required: true },
  vehicle: { type: String },
  hireAmount: { type: Number, required: true },
  paidAmount: { type: Number, required: true },
  balance: { type: Number, required: true },
  status: { type: String, enum: ['Pending', 'Paid'], default: 'Pending' }
}, { timestamps: true });

module.exports = mongoose.model('Payment', PaymentSchema);
