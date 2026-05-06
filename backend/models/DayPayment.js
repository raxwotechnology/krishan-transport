const mongoose = require('mongoose');

const DayPaymentSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  employee: { type: String, required: true },
  role: { type: String },
  dailyWage: { type: Number, default: 0 },
  hourlyEarnings: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  note: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('DayPayment', DayPaymentSchema);
