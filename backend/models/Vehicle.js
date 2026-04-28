const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
  number: { type: String, required: true, unique: true },
  model: { type: String },
  type: { type: String },
  fuelType: { type: String, enum: ['Diesel', 'Petrol'], default: 'Diesel' },
  status: { type: String, default: 'Active' },

  // Leasing Details
  hasLeasing: { type: Boolean, default: false },
  leasingCompany: { type: String },
  monthlyPremium: { type: Number, default: 0 },
  leaseDueDate: { type: Number }, // e.g., 20 (day of month)
  leaseFinalDate: { type: Date },

  // Compliance Dates
  insuranceEffectiveDate: { type: Date },
  insuranceExpirationDate: { type: Date },

  licenseEffectiveDate: { type: Date },
  licenseExpirationDate: { type: Date },

  safetyEffectiveDate: { type: Date },
  safetyExpirationDate: { type: Date },

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Vehicle', vehicleSchema);
