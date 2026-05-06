const mongoose = require('mongoose');

const InvoiceSchema = new mongoose.Schema({
  invoiceNo: { type: String, required: true, unique: true },
  date: { type: Date, default: Date.now },
  clientName: { type: String, required: true },
  site: { type: String },
  vehicleNo: { type: String, required: true },
  vehicleType: { type: String },
  jobDescription: { type: String },
  
  // Time tracking
  startTime: { type: String },
  endTime: { type: String },
  totalUnits: { type: Number, default: 0 }, // Hours or Days
  unitType: { type: String, enum: ['Hours', 'Days', 'Lumpsum', 'KM'], default: 'Hours' },
  ratePerUnit: { type: Number, default: 0 },
  
  // Additional Charges
  transportCharge: { type: Number, default: 0 },
  otherCharges: { type: Number, default: 0 },
  otherChargesDescription: { type: String },

  // Items for breakdown
  items: [{
    description: { type: String },
    units: { type: Number, default: 0 },
    unitType: { type: String },
    rate: { type: Number, default: 0 },
    amount: { type: Number, default: 0 },
    city: { type: String },
    address: { type: String },
    workingHours: { type: Number },
    startTime: { type: String },
    endTime: { type: String },
    vehicleType: { type: String },
    hireId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hire' }
  }],
  
  // Totals
  subtotal: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  
  status: { type: String, enum: ['Draft', 'Sent', 'Paid', 'Cancelled'], default: 'Draft' },
  remarks: { type: String },
  hireId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hire' },
  groupId: { type: String },
  isGrouped: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Invoice', InvoiceSchema);
