const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
  number: { type: String, required: true, unique: true },
  model: { type: String },
  type: { type: String },
  fuelType: { type: String, enum: ['Diesel', 'Petrol'], default: 'Diesel' },
  status: { type: String, default: 'Active' },
  hourlyRate: { type: Number, default: 0 },

  // Leasing Details
  hasLeasing: { type: Boolean, default: false },
  leasingCompany: { type: String },
  monthlyPremium: { type: Number, default: 0 },
  leaseDueDate: { type: Number }, // e.g., 20 (day of month)
  leaseStartDate: { type: Date },
  leaseFinalDate: { type: Date },

  // Monthly Lease Payment Tracker
  leasePayments: [{
    year:     { type: Number, required: true },
    month:    { type: Number, required: true }, // 1–12
    paid:     { type: Boolean, default: false },
    paidDate: { type: Date },
    amountPaid: { type: Number, default: 0 },
    balance: { type: Number, default: 0 }
  }],

  // Speed Draft Details
  hasSpeedDraft: { type: Boolean, default: false },
  speedDraftCompany: { type: String },
  speedDraftMonthlyPremium: { type: Number, default: 0 },
  speedDraftDueDate: { type: Number }, // e.g., 20 (day of month)
  speedDraftStartDate: { type: Date },
  speedDraftFinalDate: { type: Date },

  // Monthly Speed Draft Payment Tracker
  speedDraftPayments: [{
    year:     { type: Number, required: true },
    month:    { type: Number, required: true }, // 1–12
    paid:     { type: Boolean, default: false },
    paidDate: { type: Date },
    amountPaid: { type: Number, default: 0 },
    balance: { type: Number, default: 0 }
  }],

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
