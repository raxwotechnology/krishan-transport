const express = require('express');
const router = express.Router();
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const Hire    = require('../models/Hire');
const Counter = require('../models/Counter');

async function getNextSequence(name) {
  const counter = await Counter.findOneAndUpdate(
    { id: name },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return counter.seq;
}

/* ── Status Mapping Helpers ──────────────────────────────────── */
const invStatusToPayment = { Paid: 'Paid', Draft: 'Pending', Sent: 'Pending', Cancelled: 'Pending' };
const invStatusToHire    = { Paid: 'Completed', Draft: 'Pending', Sent: 'Pending', Cancelled: 'Pending' };

// Get all invoices
router.get('/', async (req, res) => {
  try {
    const invoices = await Invoice.find().sort({ createdAt: -1 });
    res.json(invoices);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create invoice
router.post('/', async (req, res) => {
  try {
    if (!req.body.invoiceNo || req.body.invoiceNo === '') {
      const seq  = await getNextSequence('invoiceNo');
      const year = new Date().getFullYear().toString().slice(-2);
      req.body.invoiceNo = `INV-${year}-${seq.toString().padStart(4, '0')}`;
    }
    const newInvoice = new Invoice(req.body);
    const saved = await newInvoice.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update invoice + cross-sync
router.put('/:id', async (req, res) => {
  try {
    const updated = await Invoice.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: 'Invoice not found' });

    /* ── Cross-sync when status changes ────────────────────── */
    if (req.body.status) {
      const payStatus  = invStatusToPayment[req.body.status] || 'Pending';
      const hireStatus = invStatusToHire[req.body.status]    || 'Pending';

      try {
        if (updated.hireId) {
          await Payment.findOneAndUpdate({ hireId: updated.hireId }, { status: payStatus });
          await Hire.findByIdAndUpdate(updated.hireId, { status: hireStatus });
        }
        if (updated.groupId) {
          await Payment.findOneAndUpdate({ groupId: updated.groupId }, { status: payStatus });
          await Hire.updateMany({ groupId: updated.groupId }, { status: hireStatus });
        }
        console.log(`[INVOICE→SYNC] Status "${req.body.status}" propagated — pay:${payStatus} hire:${hireStatus}`);
      } catch (syncErr) {
        console.error('[INVOICE→SYNC] Failed:', syncErr.message);
      }
    }

    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete invoice
router.delete('/:id', async (req, res) => {
  try {
    await Invoice.findByIdAndDelete(req.params.id);
    res.json({ message: 'Invoice deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
