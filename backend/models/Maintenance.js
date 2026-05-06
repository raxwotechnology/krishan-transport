const mongoose = require('mongoose');

const maintenanceSchema = new mongoose.Schema({
  vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
  vehicleNumber: { type: String, required: true },
  date: { type: Date, default: Date.now },
  type: { 
    type: String, 
    enum: ['Battery', 'Tyre', 'License', 'Insurance', 'Safety', 'Finance', 'Repair', 'Service', 'Other'],
    required: true 
  },
  description: { type: String, required: true },
  cost: { type: Number, default: 0 },
  notes: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Maintenance', maintenanceSchema);
