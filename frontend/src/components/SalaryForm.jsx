import React, { useState, useEffect } from 'react';
import { vehicleAPI, employeeAPI } from '../services/api';

const SalaryForm = ({ onSubmit, onCancel, initialData }) => {
  const [vehicles, setVehicles] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [formData, setFormData] = useState(initialData || {
    month: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
    employee: '',
    vehicle: '',
    basic: '',
    incentive: '',
    advance: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [vRes, eRes] = await Promise.all([vehicleAPI.get(), employeeAPI.get()]);
        setVehicles(Array.isArray(vRes.data) ? vRes.data : []);
        setEmployees(Array.isArray(eRes.data) ? eRes.data : []);
      } catch (err) { console.error(err); }
    };
    fetchData();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const netPay = parseFloat(formData.basic || 0) + parseFloat(formData.incentive || 0) - parseFloat(formData.advance || 0);
    onSubmit({ ...formData, netPay });
  };

  return (
    <form className="entry-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label>Month</label>
        <input type="text" name="month" value={formData.month} onChange={handleChange} required />
      </div>

      <div className="form-group">
        <label>Employee</label>
        <select name="employee" value={formData.employee} onChange={handleChange} required>
          <option value="">Select Employee</option>
          {employees.filter(e => e.status === 'Active').map(e => (
            <option key={e._id} value={e.name}>{e.name} — {e.role}</option>
          ))}
          {/* Fallback: allow manual entry if no employees registered */}
          {employees.length === 0 && (
            <option value={formData.employee}>{formData.employee || 'No employees registered yet'}</option>
          )}
        </select>
        {employees.length === 0 && (
          <input
            type="text"
            name="employee"
            placeholder="Enter employee name manually"
            value={formData.employee}
            onChange={handleChange}
            style={{ marginTop: '8px' }}
          />
        )}
      </div>

      <div className="form-group">
        <label>Vehicle Number</label>
        <select name="vehicle" value={formData.vehicle} onChange={handleChange}>
          <option value="">Select a Vehicle</option>
          {vehicles.map(v => (
            <option key={v._id} value={v.number}>{v.number}</option>
          ))}
        </select>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Basic Pay (LKR)</label>
          <input type="number" name="basic" value={formData.basic} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label>Incentive (LKR)</label>
          <input type="number" name="incentive" value={formData.incentive} onChange={handleChange} />
        </div>
      </div>

      <div className="form-group">
        <label>Advance Deduction (LKR)</label>
        <input type="number" name="advance" value={formData.advance} onChange={handleChange} />
      </div>

      <div className="form-actions">
        <button type="button" className="secondary-btn" onClick={onCancel}>Cancel</button>
        <button type="submit" className="primary-btn">{initialData ? 'Update Salary' : 'Save Salary'}</button>
      </div>
    </form>
  );
};

export default SalaryForm;
