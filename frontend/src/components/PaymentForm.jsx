import React, { useState, useEffect } from 'react';
import { vehicleAPI, clientAPI } from '../services/api';

const PaymentForm = ({ onSubmit, onCancel, initialData }) => {
  const [vehicles, setVehicles] = useState([]);
  const [clients, setClients] = useState([]);
  const [formData, setFormData] = useState(initialData ? {
    ...initialData,
    date: initialData.date ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
  } : {
    date: new Date().toISOString().split('T')[0],
    client: '',
    vehicle: '',
    hireAmount: '',
    paidAmount: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [vehRes, cliRes] = await Promise.all([vehicleAPI.get(), clientAPI.get()]);
        setVehicles(Array.isArray(vehRes.data) ? vehRes.data : []);
        setClients(Array.isArray(cliRes.data) ? cliRes.data : []);
      } catch (err) { console.error(err); }
    };
    fetchData();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const balance = parseFloat(formData.hireAmount) - parseFloat(formData.paidAmount);
    const status = balance <= 0 ? 'Paid' : 'Pending';
    onSubmit({ ...formData, balance, status });
  };

  return (
    <form className="entry-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label>Date</label>
        <input type="date" name="date" value={formData.date} onChange={handleChange} required />
      </div>
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
        <label>Vehicle Number</label>
        <select name="vehicle" value={formData.vehicle} onChange={handleChange} required>
          <option value="">Select a Vehicle</option>
          {vehicles.map(v => (
            <option key={v._id} value={v.number}>{v.number}</option>
          ))}
        </select>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Hire Amount</label>
          <input type="number" name="hireAmount" value={formData.hireAmount} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label>Paid Amount</label>
          <input type="number" name="paidAmount" value={formData.paidAmount} onChange={handleChange} required />
        </div>
      </div>
      
      <div className="form-actions">
        <button type="button" className="secondary-btn" onClick={onCancel}>Cancel</button>
        <button type="submit" className="primary-btn">{initialData ? 'Update Payment' : 'Save Payment'}</button>
      </div>
    </form>
  );
};

export default PaymentForm;
