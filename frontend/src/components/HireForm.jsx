import React, { useState, useEffect } from 'react';
import { vehicleAPI, clientAPI, employeeAPI } from '../services/api';

const HireForm = ({ onSubmit, onCancel, initialData }) => {
  const [vehicles, setVehicles]   = useState([]);
  const [clients, setClients]     = useState([]);
  const [employees, setEmployees] = useState([]);

  const [formData, setFormData] = useState(initialData ? {
    ...initialData,
    date: initialData.date
      ? new Date(initialData.date).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]
  } : {
    date:       new Date().toISOString().split('T')[0],
    client:     '',
    employee:   '',
    vehicle:    '',
    location:   '',
    amount:     '',
    commission: '',
    billNumber: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [vehRes, cliRes, empRes] = await Promise.all([
          vehicleAPI.get(),
          clientAPI.get(),
          employeeAPI.get()
        ]);
        setVehicles(Array.isArray(vehRes.data) ? vehRes.data : []);
        setClients(Array.isArray(cliRes.data)  ? cliRes.data  : []);
        setEmployees(Array.isArray(empRes.data) ? empRes.data  : []);
      } catch (err) { console.error(err); }
    };
    fetchData();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form className="entry-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label>Date</label>
        <input type="date" name="date" value={formData.date} onChange={handleChange} required />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Client Name</label>
          <select name="client" value={formData.client} onChange={handleChange} required>
            <option value="">Select a Client</option>
            {clients.map(c => (
              <option key={c._id} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Driver / Employee</label>
          <select name="employee" value={formData.employee} onChange={handleChange}>
            <option value="">Select Employee</option>
            {employees
              .filter(e => e.status === 'Active')
              .map(e => (
                <option key={e._id} value={e.name}>{e.name} — {e.role}</option>
              ))
            }
          </select>
        </div>
      </div>

      <div className="form-group">
        <label>Vehicle Number</label>
        <select name="vehicle" value={formData.vehicle} onChange={handleChange} required>
          <option value="">Select a Vehicle</option>
          {vehicles.map(v => (
            <option key={v._id} value={v.number}>{v.number}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>Location</label>
        <input type="text" name="location" value={formData.location} onChange={handleChange} placeholder="e.g. Colombo" />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Amount (LKR)</label>
          <input type="number" name="amount" value={formData.amount} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label>Commission (LKR)</label>
          <input type="number" name="commission" value={formData.commission} onChange={handleChange} />
        </div>
      </div>

      <div className="form-group">
        <label>Bill Number</label>
        <input type="text" name="billNumber" value={formData.billNumber} onChange={handleChange} placeholder="e.g. BL-001" />
      </div>

      <div className="form-actions">
        <button type="button" className="secondary-btn" onClick={onCancel}>Cancel</button>
        <button type="submit" className="primary-btn">
          {initialData ? 'Update Job' : 'Save Job'}
        </button>
      </div>
    </form>
  );
};

export default HireForm;
