const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Payment = require('../models/Payment');
const Invoice = require('../models/Invoice');
const Hire = require('../models/Hire');
const { authMiddleware, authorizeRoles } = require('../middleware/authMiddleware');

/* ── Status Mapping Helpers ──────────────────────────────────── */
const paymentStatusToHire    = { Paid: 'Completed', Pending: 'Pending', Partial: 'Pending' };
const paymentStatusToInvoice = { Paid: 'Paid',      Pending: 'Draft',   Partial: 'Sent'   };

router.get('/', authMiddleware, async (req, res) => {
  try {
    const records = await Payment.find().sort({ date: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', authMiddleware, authorizeRoles('Admin', 'Manager'), async (req, res) => {
  const record = new Payment(req.body);
  try {
    const newRecord = await record.save();
    res.status(201).json(newRecord);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/:id', authMiddleware, authorizeRoles('Admin', 'Manager'), async (req, res) => {
  try {
    const updated = await Payment.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: 'Payment not found' });

    /* ── Cross-sync when status changes ────────────────────── */
    if (req.body.status) {
      const hireStatus = paymentStatusToHire[req.body.status]    || 'Pending';
      const invStatus  = paymentStatusToInvoice[req.body.status] || 'Draft';

      try {
        // Individual hire link
        if (updated.hireId) {
          await Hire.findByIdAndUpdate(updated.hireId, { status: hireStatus });
          await Invoice.findOneAndUpdate({ hireId: updated.hireId }, { status: invStatus });
        }
        // Group link
        if (updated.groupId) {
          await Hire.updateMany({ groupId: updated.groupId }, { status: hireStatus });
          await Invoice.findOneAndUpdate({ groupId: updated.groupId }, { status: invStatus });
        }
        console.log(`[PAYMENT→SYNC] Status "${req.body.status}" propagated — hire:${hireStatus} invoice:${invStatus}`);
      } catch (syncErr) {
        console.error('[PAYMENT→SYNC] Failed:', syncErr.message);
      }
    }

    /* ── Re-compute balance whenever takenAmount / paidAmount / hireAmount changes ── */
    const hireAmt  = req.body.hireAmount  !== undefined ? req.body.hireAmount  : updated.hireAmount;
    const taken    = req.body.takenAmount !== undefined ? req.body.takenAmount : updated.takenAmount;
    const paidAmt  = req.body.paidAmount  !== undefined ? req.body.paidAmount  : updated.paidAmount;
    const totalPaid = Math.max(taken || 0, paidAmt || 0);
    const newBalance = Math.max(0, (hireAmt || 0) - totalPaid);

    if (newBalance !== updated.balance) {
      await Payment.findByIdAndUpdate(req.params.id, { balance: newBalance });
      updated.balance = newBalance;
    }

    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', authMiddleware, authorizeRoles('Admin', 'Manager'), async (req, res) => {
  try {
    await Payment.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
