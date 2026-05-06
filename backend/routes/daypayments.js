const express = require('express');
const router = express.Router();
const DayPayment = require('../models/DayPayment');
const { authMiddleware, authorizeRoles } = require('../middleware/authMiddleware');

router.get('/', authMiddleware, async (req, res) => {
  try {
    const records = await DayPayment.find().sort({ date: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', authMiddleware, authorizeRoles('Admin', 'Manager'), async (req, res) => {
  try {
    const payment = new DayPayment(req.body);
    await payment.save();
    res.status(201).json(payment);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', authMiddleware, authorizeRoles('Admin', 'Manager'), async (req, res) => {
  try {
    await DayPayment.findByIdAndDelete(req.params.id);
    res.json({ message: 'Day payment deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
