const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');
const { authMiddleware, authorizeRoles } = require('../middleware/authMiddleware');

// GET all employees with stats (supports monthly filtering)
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const { month, year } = req.query;
    const employees = await Employee.find().sort({ name: 1 });
    
    // Fetch all hires and attendance to calculate stats
    const Hire = require('../models/Hire');
    const Attendance = require('../models/Attendance');
    
    let hireQuery = {};
    let attQuery = { status: 'Present' };

    if (month !== undefined && year !== undefined) {
      const monthIdx = parseInt(month);
      const yearNum = parseInt(year);
      
      const start = new Date(yearNum, monthIdx, 1);
      const end = new Date(yearNum, monthIdx + 1, 0, 23, 59, 59, 999);
      
      hireQuery.date = { $gte: start, $lte: end };
      attQuery.date = { $gte: start, $lte: end };
    }

    const [hires, attendance] = await Promise.all([
      Hire.find(hireQuery, 'date driverName helperName'),
      Attendance.find(attQuery, 'date employee')
    ]);

    const records = employees.map(emp => {
      const empObj = emp.toObject();
      const name = (emp.name || '').trim().toLowerCase();
      
      // Calculate jobs (driver or helper)
      const jobsCount = hires.filter(h => 
        (h.driverName && h.driverName.trim().toLowerCase() === name) || 
        (h.helperName && h.helperName.trim().toLowerCase() === name)
      ).length;
      
      // Calculate working days (present)
      const daysCount = attendance.filter(a => 
        a.employee && a.employee.trim().toLowerCase() === name
      ).length;

      return {
        ...empObj,
        totalJobs: jobsCount,
        totalWorkingDays: daysCount
      };
    });

    res.json(records);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST create employee
router.post('/', authMiddleware, async (req, res, next) => {
  const data = { ...req.body };
  if (!data.username || (typeof data.username === 'string' && data.username.trim() === '')) {
    delete data.username;
  }
  
  const record = new Employee(data);
  try {
    const newRecord = await record.save();
    res.status(201).json(newRecord);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT update employee
router.put('/:id', authMiddleware, authorizeRoles('Admin', 'Manager'), async (req, res, next) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    const data = { ...req.body };
    if (data.hasOwnProperty('username') && (!data.username || (typeof data.username === 'string' && data.username.trim() === ''))) {
      employee.set('username', undefined);
    } else if (data.username) {
      employee.username = data.username.trim();
    }

    const fields = ['name', 'nic', 'role', 'contact', 'joinedDate', 'status', 'salaryType', 'basicSalary', 'dailyWage', 'hourlyRate'];
    fields.forEach(field => {
      if (data.hasOwnProperty(field)) {
        employee[field] = data[field];
      }
    });

    if (data.password && (typeof data.password === 'string' && data.password.trim() !== '')) {
      employee.password = data.password;
    }

    const updated = await employee.save();
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE employee
router.delete('/:id', authMiddleware, authorizeRoles('Admin'), async (req, res, next) => {
  try {
    await Employee.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
