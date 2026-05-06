const express = require('express');
const router = express.Router();
const Vehicle = require('../models/Vehicle');
const Expense = require('../models/Expense');
const Maintenance = require('../models/Maintenance');
const { authMiddleware, authorizeRoles } = require('../middleware/authMiddleware');

// Renewal logic for compliance documents
router.patch('/:id/renew', authMiddleware, authorizeRoles('Admin', 'Manager'), async (req, res) => {
  try {
    const { type, newExpirationDate, cost } = req.body;
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });

    // Update the relevant date based on type
    if (type === 'insurance') {
      vehicle.insuranceExpirationDate = newExpirationDate;
    } else if (type === 'license') {
      vehicle.licenseExpirationDate = newExpirationDate;
    } else if (type === 'safety') {
      vehicle.safetyExpirationDate = newExpirationDate;
    } else {
      return res.status(400).json({ message: 'Invalid renewal type' });
    }

    await vehicle.save();

    // Create a maintenance record if cost is provided
    if (cost > 0) {
      let maintType = 'Other';
      if (type === 'insurance') maintType = 'Insurance';
      if (type === 'license') maintType = 'License';
      if (type === 'safety') maintType = 'Safety';

      const maintenance = new Maintenance({
        date: new Date(),
        type: maintType,
        description: `${type.charAt(0).toUpperCase() + type.slice(1)} Renewal - ${vehicle.number}`,
        cost: cost,
        vehicleId: vehicle._id,
        vehicleNumber: vehicle.number,
        notes: `Auto-generated from renewal of ${type}`
      });
      await maintenance.save();
    }

    res.json({ message: 'Renewal successful', vehicle });
  } catch (err) {
    console.error('Renewal error:', err);
    res.status(400).json({ message: err.message });
  }
});

// Get all vehicles
router.get('/', authMiddleware, async (req, res) => {
  try {
    const vehicles = await Vehicle.find().sort({ number: 1 });
    res.json(vehicles);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add new vehicle
router.post('/', authMiddleware, async (req, res) => {
  const vehicle = new Vehicle(req.body);
  try {
    const newVehicle = await vehicle.save();
    res.status(201).json(newVehicle);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update vehicle
router.put('/:id', authMiddleware, authorizeRoles('Admin', 'Manager'), async (req, res) => {
  try {
    const updatedVehicle = await Vehicle.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(updatedVehicle);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete vehicle
router.delete('/:id', authMiddleware, authorizeRoles('Admin', 'Manager'), async (req, res) => {
  try {
    await Vehicle.findByIdAndDelete(req.params.id);
    res.json({ message: 'Vehicle deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Mark / unmark a monthly lease payment
router.patch('/:id/lease-payment', authMiddleware, authorizeRoles('Admin', 'Manager'), async (req, res) => {
  try {
    const year  = Number(req.body.year);
    const month = Number(req.body.month);
    const paid  = Boolean(req.body.paid);
    const amountPaid = Number(req.body.amountPaid) || 0;
    const paidDate = req.body.paidDate ? new Date(req.body.paidDate) : (paid ? new Date() : null);

    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });

    const monthlyPremium = vehicle.monthlyPremium || 0;
    const balance = paid ? (monthlyPremium - amountPaid) : 0;

    // Safely initialise the array if missing on older documents
    if (!Array.isArray(vehicle.leasePayments)) {
      vehicle.leasePayments = [];
    }

    // Find existing entry for this month/year
    const idx = vehicle.leasePayments.findIndex(
      lp => Number(lp.year) === year && Number(lp.month) === month
    );

    if (idx >= 0) {
      vehicle.leasePayments[idx].paid = paid;
      vehicle.leasePayments[idx].paidDate = paidDate;
      vehicle.leasePayments[idx].amountPaid = amountPaid;
      vehicle.leasePayments[idx].balance = balance;
    } else {
      vehicle.leasePayments.push({ year, month, paid, paidDate, amountPaid, balance });
    }

    vehicle.markModified('leasePayments'); // ensure Mongoose detects nested array change
    await vehicle.save();

    // Auto-sync Maintenance Record
    const desc = `Lease Payment - ${month}/${year}`;
    if (paid && amountPaid > 0) {
      let maint = await Maintenance.findOne({ vehicleId: vehicle._id, description: desc });
      if (!maint) {
         maint = new Maintenance({
           date: paidDate || new Date(),
           type: 'Finance',
           description: desc,
           cost: amountPaid,
           vehicleId: vehicle._id,
           vehicleNumber: vehicle.number,
           notes: `Auto-generated lease payment`
         });
      } else {
         maint.cost = amountPaid;
         maint.date = paidDate || new Date();
      }
      await maint.save();
    } else if (!paid) {
      await Maintenance.deleteOne({ vehicleId: vehicle._id, description: desc });
    }

    res.json(vehicle);
  } catch (err) {
    console.error('Lease payment update error:', err);
    res.status(400).json({ message: err.message });
  }
});

// Mark / unmark a monthly speed draft payment
router.patch('/:id/speed-draft-payment', authMiddleware, authorizeRoles('Admin', 'Manager'), async (req, res) => {
  try {
    const year  = Number(req.body.year);
    const month = Number(req.body.month);
    const paid  = Boolean(req.body.paid);
    const amountPaid = Number(req.body.amountPaid) || 0;
    const paidDate = req.body.paidDate ? new Date(req.body.paidDate) : (paid ? new Date() : null);

    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });

    const monthlyPremium = vehicle.speedDraftMonthlyPremium || 0;
    const balance = paid ? (monthlyPremium - amountPaid) : 0;

    if (!Array.isArray(vehicle.speedDraftPayments)) {
      vehicle.speedDraftPayments = [];
    }

    const idx = vehicle.speedDraftPayments.findIndex(
      sp => Number(sp.year) === year && Number(sp.month) === month
    );

    if (idx >= 0) {
      vehicle.speedDraftPayments[idx].paid = paid;
      vehicle.speedDraftPayments[idx].paidDate = paidDate;
      vehicle.speedDraftPayments[idx].amountPaid = amountPaid;
      vehicle.speedDraftPayments[idx].balance = balance;
    } else {
      vehicle.speedDraftPayments.push({ year, month, paid, paidDate, amountPaid, balance });
    }

    vehicle.markModified('speedDraftPayments');
    await vehicle.save();

    // Auto-sync Maintenance Record
    const desc = `Speed Draft Payment - ${month}/${year}`;
    if (paid && amountPaid > 0) {
      let maint = await Maintenance.findOne({ vehicleId: vehicle._id, description: desc });
      if (!maint) {
         maint = new Maintenance({
           date: paidDate || new Date(),
           type: 'Finance',
           description: desc,
           cost: amountPaid,
           vehicleId: vehicle._id,
           vehicleNumber: vehicle.number,
           notes: `Auto-generated speed draft payment`
         });
      } else {
         maint.cost = amountPaid;
         maint.date = paidDate || new Date();
      }
      await maint.save();
    } else if (!paid) {
      await Maintenance.deleteOne({ vehicleId: vehicle._id, description: desc });
    }

    res.json(vehicle);
  } catch (err) {
    console.error('Speed draft payment update error:', err);
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
