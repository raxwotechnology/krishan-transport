const express = require('express');
const router = express.Router();
const Diesel = require('../models/Diesel');

// Get all records
router.get('/', async (req, res) => {
  try {
    const records = await Diesel.find().sort({ date: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add new record
router.post('/', async (req, res) => {
  const record = new Diesel(req.body);
  try {
    const newRecord = await record.save();
    res.status(201).json(newRecord);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update record
router.put('/:id', async (req, res) => {
  try {
    const updatedRecord = await Diesel.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updatedRecord);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete record
router.delete('/:id', async (req, res) => {
  try {
    await Diesel.findByIdAndDelete(req.params.id);
    res.json({ message: 'Record deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
