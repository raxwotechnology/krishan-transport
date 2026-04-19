const mongoose = require('mongoose');

const SalarySchema = new mongoose.Schema({
  month: { type: String, required: true },
  employee: { type: String, required: true },
  vehicle: { type: String },
  basic: { type: Number, required: true },
  incentive: { type: Number, default: 0 },
  advance: { type: Number, default: 0 },
  netPay: { type: Number, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Salary', SalarySchema);
