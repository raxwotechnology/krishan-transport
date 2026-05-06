const express = require('express');
const router = express.Router();
const Maintenance = require('../models/Maintenance');

// Get all maintenance records
router.get('/', async (req, res) => {
  try {
    const maintenance = await Maintenance.find().sort({ date: -1 });
    res.json(maintenance);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create new maintenance record
router.post('/', async (req, res) => {
  const maintenance = new Maintenance({
    vehicleId: req.body.vehicleId,
    vehicleNumber: req.body.vehicleNumber,
    date: req.body.date,
    type: req.body.type,
    description: req.body.description,
    cost: req.body.cost,
    notes: req.body.notes
  });

  try {
    const newMaintenance = await maintenance.save();
    res.status(201).json(newMaintenance);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update maintenance record
router.put('/:id', async (req, res) => {
  try {
    const record = await Maintenance.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!record) return res.status(404).json({ message: 'Record not found' });
    res.json(record);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete maintenance record
router.delete('/:id', async (req, res) => {
  try {
    const record = await Maintenance.findById(req.params.id);
    if (!record) return res.status(404).json({ message: 'Record not found' });
    
    await Maintenance.findByIdAndDelete(req.params.id);
    res.json({ message: 'Maintenance record deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
