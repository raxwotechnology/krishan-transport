const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Hire = require('../models/Hire');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const Expense = require('../models/Expense');
const Counter = require('../models/Counter');
const { authMiddleware, authorizeRoles } = require('../middleware/authMiddleware');

async function getNextSequence(name) {
  const counter = await Counter.findOneAndUpdate(
    { id: name },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return counter.seq;
}

router.get('/', authMiddleware, async (req, res) => {
  try {
    let query = {};
    // Restrict access for all roles EXCEPT Admin and Manager
    if (req.user.role !== 'Admin' && req.user.role !== 'Manager') {
      query.$or = [
        { driverName: req.user.name },
        { helperName: req.user.name }
      ];
    }
    const records = await Hire.find(query).sort({ date: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Single Hire Fetch for Drill-down
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const record = await Hire.findById(req.params.id);
    if (!record) return res.status(404).json({ message: 'Hire not found' });
    res.json(record);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    let dataArray = [];
    let common = {};
    let groupBilling = false;

    if (req.body.jobs && req.body.common) {
      dataArray = req.body.jobs;
      common = req.body.common;
      groupBilling = common.groupBilling;
    } else {
      dataArray = Array.isArray(req.body) ? req.body : [req.body];
      common = { date: dataArray[0].date, client: dataArray[0].client };
    }

    const createdHires = [];
    // Support adding to an existing group ("Add More" flow)
    const existingGroupId = common.groupId || null;
    const isAddingToExisting = !!existingGroupId;
    const groupId = existingGroupId || (groupBilling ? `GRP-${Date.now()}` : null);

    for (const item of dataArray) {
      const hireData = { ...common, ...item, groupId, isGrouped: groupBilling };
      
      // 1. Auto-generate Bill Number if missing
      if (!hireData.billNumber || hireData.billNumber === '' || hireData.billNumber === '—') {
        const seq = await getNextSequence('billNumber');
        const year = new Date().getFullYear().toString().slice(-2);
        const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
        hireData.billNumber = `BL-${year}${month}-${seq.toString().padStart(4, '0')}`;
      }

      // 2. Create Hire Record
      const hire = new Hire(hireData);
      const savedHire = await hire.save();
      createdHires.push(savedHire);

      // If NOT grouped, create separate Invoice/Payment/Expense
      if (!groupBilling) {
        // Individual Payment
        await mongoose.connection.collection('payments').insertOne({
          date: savedHire.date ? new Date(savedHire.date) : new Date(),
          client: savedHire.client,
          vehicle: savedHire.vehicle,
          address: savedHire.address,
          city: savedHire.city,
          driverName: savedHire.driverName,
          helperName: savedHire.helperName,
          totalHours: savedHire.workingHours,
          minimumHours: savedHire.minimumHours,
          hireAmount: savedHire.totalAmount,
          paidAmount: 0,
          balance: savedHire.totalAmount,
          status: 'Pending',
          hireId: savedHire._id,
          createdAt: new Date(),
          updatedAt: new Date()
        });

        // Individual Invoice
        const invSeq = await getNextSequence('invoiceNo');
        const invYear = new Date().getFullYear().toString().slice(-2);
        const invoiceNo = `INV-${invYear}-${invSeq.toString().padStart(4, '0')}`;
        const newInvoice = new Invoice({
          invoiceNo: invoiceNo,
          date: savedHire.date,
          clientName: savedHire.client,
          site: `${savedHire.address || ''}, ${savedHire.city || ''}`.trim(),
          vehicleNo: savedHire.vehicle,
          vehicleType: savedHire.vehicleType,
          jobDescription: savedHire.details || `Hire charges for ${savedHire.vehicle}`,
          totalUnits: savedHire.workingHours,
          ratePerUnit: savedHire.oneHourFee,
          transportCharge: savedHire.transportFee,
          subtotal: savedHire.billAmount,
          totalAmount: savedHire.billAmount,
          status: 'Draft',
          hireId: savedHire._id,
          startTime: savedHire.startTime,
          endTime: savedHire.endTime,
          items: [{
            description: `Hire charges for ${savedHire.vehicle} (${savedHire.startTime} - ${savedHire.endTime})`,
            units: savedHire.workingHours,
            unitType: 'Hours',
            rate: savedHire.oneHourFee,
            amount: savedHire.workingHours * savedHire.oneHourFee
          }]
        });
        await newInvoice.save();

        // Individual Expense for External
        if (savedHire.isExternal && Number(savedHire.externalCost) > 0) {
          await mongoose.connection.collection('expenses').insertOne({
            date: savedHire.date ? new Date(savedHire.date) : new Date(),
            description: `[EXT] Hire: ${savedHire.vehicle} - ${savedHire.client}`,
            amount: Number(savedHire.externalCost),
            category: 'Vehicle Hire',
            hireId: savedHire._id,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }
      }
    }

    // If Grouped, create OR UPDATE consolidated Invoice and Payment
    if (groupBilling && createdHires.length > 0) {
      // Fetch ALL hires in this group (including pre-existing ones)
      const allGroupHires = await Hire.find({ groupId });
      const totalAmount     = allGroupHires.reduce((sum, h) => sum + h.totalAmount, 0);
      const totalBillAmount = allGroupHires.reduce((sum, h) => sum + h.billAmount,  0);
      const vehicles        = [...new Set(allGroupHires.map(h => h.vehicle))].join(', ');
      const itemsList = allGroupHires.map(h => ({
        description: `Hire: ${h.vehicle} (${h.startTime || '—'} - ${h.endTime || '—'})`,
        units: h.workingHours || 0,
        unitType: 'Hours',
        rate: h.oneHourFee || 0,
        amount: h.totalAmount || 0,
        city: h.city,
        address: h.address,
        workingHours: h.workingHours,
        startTime: h.startTime,
        endTime: h.endTime,
        vehicleType: h.vehicleType,
        hireId: h._id
      }));

      if (isAddingToExisting) {
        /* ── UPDATE existing payment & invoice ── */
        const existingPayment = await mongoose.connection.collection('payments').findOne({ groupId });
        if (existingPayment) {
          const alreadyPaid = existingPayment.paidAmount || existingPayment.takenAmount || 0;
          await mongoose.connection.collection('payments').updateOne(
            { groupId },
            { $set: {
                vehicle: vehicles,
                hireAmount: totalAmount,
                balance: Math.max(0, totalAmount - alreadyPaid),
                items: itemsList.map(i => ({ ...i, rate: i.rate, amount: i.amount })),
                updatedAt: new Date()
            }}
          );
        }
        await Invoice.findOneAndUpdate(
          { groupId },
          { $set: {
              vehicleNo: vehicles,
              totalAmount: totalBillAmount,
              subtotal: totalBillAmount,
              items: itemsList,
              startTime: allGroupHires.sort((a,b) => (a.startTime||'99:99').localeCompare(b.startTime||'99:99'))[0]?.startTime,
              endTime:   allGroupHires.sort((a,b) => (b.endTime||'00:00').localeCompare(a.endTime||'00:00'))[0]?.endTime,
              transportCharge: allGroupHires.reduce((s,h) => s + (h.transportFee||0), 0),
              updatedAt: new Date()
          }}
        );
        console.log(`[GROUP] Updated existing payment & invoice for group ${groupId} (${allGroupHires.length} hires total)`);
      } else {
      // Group Payment (new group only)
      await mongoose.connection.collection('payments').insertOne({
        date: new Date(common.date),
        client: common.client,
        vehicle: vehicles,
        hireAmount: totalAmount,
        paidAmount: 0,
        balance: totalAmount,
        status: 'Pending',
        groupId: groupId,
        isGrouped: true,
        items: createdHires.map(h => ({
          description: `Hire: ${h.vehicle} (${h.startTime} - ${h.endTime})`,
          units: h.workingHours,
          rate: h.oneHourFee,
          amount: h.totalAmount,
          city: h.city,
          address: h.address,
          workingHours: h.workingHours,
          startTime: h.startTime,
          endTime: h.endTime,
          vehicleType: h.vehicleType,
          hireId: h._id
        })),
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Group Invoice
      const invSeq = await getNextSequence('invoiceNo');
      const invYear = new Date().getFullYear().toString().slice(-2);
      const invoiceNo = `INV-${invYear}-${invSeq.toString().padStart(4, '0')}`;
      const newInvoice = new Invoice({
        invoiceNo: invoiceNo,
        date: new Date(common.date),
        clientName: common.client,
        vehicleNo: vehicles,
        jobDescription: `Batch Hire: ${createdHires.length} vehicles`,
        totalAmount: totalBillAmount,
        subtotal: totalBillAmount,
        status: 'Draft',
        groupId: groupId,
        isGrouped: true,
        startTime: createdHires.sort((a, b) => (a.startTime || '99:99').localeCompare(b.startTime || '99:99'))[0]?.startTime,
        endTime: createdHires.sort((a, b) => (b.endTime || '00:00').localeCompare(a.endTime || '00:00'))[0]?.endTime,
        items: createdHires.map(h => ({
          description: `Hire: ${h.vehicle} (${h.startTime || '—'} - ${h.endTime || '—'})`,
          units: h.workingHours || 0,
          unitType: 'Hours',
          rate: h.oneHourFee || 0,
          amount: h.totalAmount || (h.workingHours * h.oneHourFee) || 0,
          city: h.city,
          address: h.address,
          workingHours: h.workingHours,
          startTime: h.startTime,
          endTime: h.endTime,
          vehicleType: h.vehicleType,
          hireId: h._id
        })),
        transportCharge: createdHires.reduce((s, h) => s + (h.transportFee || 0), 0)
      });
      await newInvoice.save();

      // Individual Expenses for External Hires still need to be created
      for (const h of createdHires) {
        if (h.isExternal && Number(h.externalCost) > 0) {
          await mongoose.connection.collection('expenses').insertOne({
            date: h.date ? new Date(h.date) : new Date(),
            description: `[EXT] Hire: ${h.vehicle} - ${h.client}`,
            amount: Number(h.externalCost),
            category: 'Vehicle Hire',
            hireId: h._id,
            groupId: groupId,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }
      }
      } // end isAddingToExisting else
    }

    res.status(201).json(req.body.jobs ? createdHires : createdHires[0]);
  } catch (err) {
    console.error('[HIRE] Creation Flow Error:', err);
    res.status(400).json({ message: err.message });
  }
});

router.put('/:id', authMiddleware, authorizeRoles('Admin', 'Manager'), async (req, res) => {
  try {
    const updated = await Hire.findByIdAndUpdate(req.params.id, req.body, { new: true });
    
    if (updated) {
      /* ── Status propagation ──────────────────────────── */
      if (req.body.status) {
        const hStatus  = req.body.status;
        const payStatus = hStatus === 'Completed' || hStatus === 'Paid' ? 'Paid' : 'Pending';
        const invStatus = hStatus === 'Completed' || hStatus === 'Paid' ? 'Paid' : 'Draft';
        try {
          if (updated.hireId || updated._id) {
            await mongoose.connection.collection('payments').updateOne(
              { hireId: updated._id },
              { $set: { status: payStatus, updatedAt: new Date() } }
            );
            const Invoice = require('../models/Invoice');
            await Invoice.findOneAndUpdate({ hireId: updated._id }, { status: invStatus });
          }
          if (updated.groupId) {
            await mongoose.connection.collection('payments').updateOne(
              { groupId: updated.groupId },
              { $set: { status: payStatus, updatedAt: new Date() } }
            );
            const Invoice = require('../models/Invoice');
            await Invoice.findOneAndUpdate({ groupId: updated.groupId }, { status: invStatus });
          }
          console.log(`[HIRE→SYNC] Status "${hStatus}" propagated`);
        } catch (stErr) {
          console.error('[HIRE→SYNC]', stErr.message);
        }
      }

      // Sync with Payment Record
      try {
        await mongoose.connection.collection('payments').updateOne(
          { hireId: updated._id },
          {
            $set: {
              date: updated.date ? new Date(updated.date) : new Date(),
              client: updated.client,
              vehicle: updated.vehicle,
              address: updated.address,
              city: updated.city,
              driverName: updated.driverName,
              helperName: updated.helperName,
              startTime: updated.startTime,
              endTime: updated.endTime,
              restTime: updated.restTime,
              totalHours: updated.workingHours,
              minimumHours: updated.minimumHours,
              hoursInBill: updated.workingHours,
              commission: updated.commission,
              hireAmount: updated.totalAmount,
              updatedAt: new Date()
            },
            $setOnInsert: {
              paidAmount: 0,
              balance: updated.totalAmount,
              status: 'Pending',
              createdAt: new Date()
            }
          },
          { upsert: true }
        );
        console.log(`[PAYMENT] Synced for Hire: ${updated._id}`);
      } catch (payErr) {
        console.error('[PAYMENT] Sync Update Failed:', payErr.message);
      }

      // Sync Expense
      try {
        if (updated.isExternal && Number(updated.externalCost) > 0) {
          await mongoose.connection.collection('expenses').updateOne(
            { hireId: updated._id },
            {
              $set: {
                date: updated.date ? new Date(updated.date) : new Date(),
                description: `[EXT] Hire: ${updated.vehicle} - ${updated.client}`,
                amount: Number(updated.externalCost),
                category: 'Vehicle Hire',
                note: `Auto-generated from Hire Bill ${updated.billNumber}. Category: ${updated.vehicleType || 'N/A'}`,
                updatedAt: new Date()
              },
              $setOnInsert: {
                createdAt: new Date()
              }
            },
            { upsert: true }
          );
          console.log(`[EXPENSE] Direct Synced for Hire: ${updated._id}`);
        } else {
          await mongoose.connection.collection('expenses').deleteOne({ hireId: updated._id });
        }
      } catch (expErr) {
        console.error('[EXPENSE] Direct Sync Failed:', expErr.message);
      }

      // Sync Invoice
      try {
        await Invoice.findOneAndUpdate(
          { hireId: updated._id, status: 'Draft' }, // Only sync if still in Draft
          {
            $set: {
              date: updated.date,
              clientName: updated.client,
              site: `${updated.address || ''}, ${updated.city || ''}`.trim(),
              vehicleNo: updated.vehicle,
              vehicleType: updated.vehicleType,
              jobDescription: updated.details || `Hire charges for ${updated.vehicle}`,
              startTime: updated.startTime,
              endTime: updated.endTime,
              totalUnits: updated.workingHours,
              ratePerUnit: updated.oneHourFee,
              transportCharge: updated.transportFee,
              subtotal: updated.billAmount,
              totalAmount: updated.billAmount,
              updatedAt: new Date()
            }
          }
        );
        console.log(`[INVOICE] Synced for Hire: ${updated._id}`);
      } catch (invErr) {
        console.error('[INVOICE] Sync Failed:', invErr.message);
      }
    }
    
    res.json(updated);
  } catch (err) {
    console.error('❌ Error updating hire/payment:', err);
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', authMiddleware, authorizeRoles('Admin', 'Manager'), async (req, res) => {
  try {
    const { isGroup } = req.query;
    const id = req.params.id;

    if (isGroup === 'true') {
      // id is groupId
      await Hire.deleteMany({ groupId: id });
      await Payment.deleteMany({ groupId: id });
      await Invoice.deleteMany({ groupId: id });
      // Expenses are linked by hireId, but also have groupId now
      await Expense.deleteMany({ groupId: id });
    } else {
      // id is hireId
      await Hire.findByIdAndDelete(id);
      await Payment.findOneAndDelete({ hireId: id });
      await Expense.findOneAndDelete({ hireId: id });
      await Invoice.findOneAndDelete({ hireId: id });
    }
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
