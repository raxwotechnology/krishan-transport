const express = require('express');
const router = express.Router();
const Hire = require('../models/Hire');
const { authMiddleware, authorizeRoles } = require('../middleware/authMiddleware');

router.get('/', authMiddleware, async (req, res) => {
  try {
    let query = {};
    // Restrict access for all roles EXCEPT Admin and Manager
    if (req.user.role !== 'Admin' && req.user.role !== 'Manager') {
      query.employee = req.user.name;
    }
    const records = await Hire.find(query).sort({ date: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  const record = new Hire(req.body);
  try {
    const newRecord = await record.save();
    res.status(201).json(newRecord);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/:id', authMiddleware, authorizeRoles('Admin', 'Manager'), async (req, res) => {
  try {
    const updated = await Hire.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', authMiddleware, authorizeRoles('Admin', 'Manager'), async (req, res) => {
  try {
    await Hire.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
