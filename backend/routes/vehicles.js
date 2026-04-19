const express = require('express');
const router = express.Router();
const Vehicle = require('../models/Vehicle');
const { authMiddleware, authorizeRoles } = require('../middleware/authMiddleware');

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
router.post('/', authMiddleware, authorizeRoles('Admin', 'Manager'), async (req, res) => {
  const vehicle = new Vehicle(req.body);
  try {
    const newVehicle = await vehicle.save();
    res.status(201).json(newVehicle);
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

module.exports = router;
