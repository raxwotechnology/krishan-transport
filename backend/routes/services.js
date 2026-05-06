const express = require('express');
const router = express.Router();
const Service = require('../models/Service');
const Maintenance = require('../models/Maintenance');
const Vehicle = require('../models/Vehicle');

// Get all services
router.get('/', async (req, res) => {
  try {
    const services = await Service.find().sort({ date: -1 });
    res.json(services);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create service and push to maintenance
router.post('/', async (req, res) => {
  const service = new Service(req.body);
  try {
    const newService = await service.save();

    // Find vehicle ID if not provided
    let vehicleId = req.body.vehicleId;
    if (!vehicleId) {
      const v = await Vehicle.findOne({ number: req.body.vehicleNumber });
      if (v) vehicleId = v._id;
    }

    // Auto-create Maintenance record
    if (newService.cost > 0) {
      const maintenance = new Maintenance({
        vehicleId: vehicleId,
        vehicleNumber: newService.vehicleNumber,
        date: newService.date,
        type: 'Service',
        description: `Full Service: ${newService.details || 'No details'}`,
        cost: newService.cost,
        notes: `Auto-generated from Service Book. ${newService.note || ''}`
      });
      await maintenance.save();
    }

    res.status(201).json(newService);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update service
router.put('/:id', async (req, res) => {
  try {
    const updatedService = await Service.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updatedService);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete service
router.delete('/:id', async (req, res) => {
  try {
    await Service.findByIdAndDelete(req.params.id);
    res.json({ message: 'Service record deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
