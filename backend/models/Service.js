const mongoose = require('mongoose');

const ServiceSchema = new mongoose.Schema({
  vehicleId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
  vehicleNumber:  { type: String, required: true },
  date:           { type: Date, default: Date.now },
  currentMileage: { type: Number, default: 0 },
  nextServiceMileage: { type: Number, default: 0 },
  nextServiceDate: { type: Date },
  cost:           { type: Number, default: 0 },
  details:        { type: String },
  note:           { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Service', ServiceSchema);
