const mongoose = require('mongoose');

const HireSchema = new mongoose.Schema({
  date:       { type: Date, default: Date.now },
  client:     { type: String, required: true },
  employee:   { type: String },          // driver / employee who did the job
  vehicle:    { type: String, required: true },
  location:   { type: String },
  amount:     { type: Number, required: true },
  commission: { type: Number, default: 0 },
  billNumber: { type: String },
  status:     { type: String, enum: ['Pending', 'Paid'], default: 'Pending' }
}, { timestamps: true });

module.exports = mongoose.model('Hire', HireSchema);
