const mongoose = require('mongoose');

const ExpenseSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  description: { type: String, required: true },
  amount: { type: Number, required: true },
  category: { type: String },
  note: { type: String },
  hireId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hire' }
}, { timestamps: true });

module.exports = mongoose.model('Expense', ExpenseSchema);
