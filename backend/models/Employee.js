const mongoose = require('mongoose');

const EmployeeSchema = new mongoose.Schema({
  name:       { type: String, required: true },
  nic:        { type: String },
  role:       { type: String, enum: ['Driver', 'Helper', 'Mechanic', 'Admin', 'Other'], default: 'Driver' },
  contact:    { type: String },
  joinedDate: { type: Date, default: Date.now },
  status:     { type: String, enum: ['Active', 'Inactive'], default: 'Active' }
}, { timestamps: true });

module.exports = mongoose.model('Employee', EmployeeSchema);
