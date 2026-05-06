const mongoose = require('mongoose');

const ExtraIncomeSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  jobType: { type: String, required: true },
  description: { type: String },
  amount: { type: Number, required: true },
  employees: [{ type: String }],
  vehicle: { type: String },
  address: { type: String },
  location: { type: String },
  note: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('ExtraIncome', ExtraIncomeSchema);
