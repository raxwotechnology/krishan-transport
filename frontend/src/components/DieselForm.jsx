import React, { useState, useEffect } from 'react';
import { vehicleAPI } from '../services/api';

const DieselForm = ({ onSubmit, onCancel, initialData }) => {
  const [vehicles, setVehicles] = useState([]);
  const [formData, setFormData] = useState(initialData ? {
    ...initialData,
    date: initialData.date ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
  } : {
    date: new Date().toISOString().split('T')[0],
    vehicle: '',
    liters: '',
    pricePerLiter: '',
    odometer: '',
    note: ''
  });

  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const res = await vehicleAPI.get();
        setVehicles(Array.isArray(res.data) ? res.data : []);
      } catch (err) { console.error(err); }
    };
    fetchVehicles();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const total = parseFloat(formData.liters) * parseFloat(formData.pricePerLiter);
    onSubmit({ ...formData, total });
  };

  return (
    <form className="entry-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label>Date</label>
        <input type="date" name="date" value={formData.date} onChange={handleChange} required />
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
          <label>Liters</label>
          <input type="number" step="0.01" name="liters" value={formData.liters} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label>Price per Liter</label>
          <input type="number" step="0.01" name="pricePerLiter" value={formData.pricePerLiter} onChange={handleChange} required />
        </div>
      </div>
      <div className="form-group">
        <label>Odometer Reading</label>
        <input type="number" name="odometer" value={formData.odometer} onChange={handleChange} />
      </div>
      <div className="form-group">
        <label>Note</label>
        <textarea name="note" value={formData.note} onChange={handleChange}></textarea>
      </div>
      
      <div className="form-actions">
        <button type="button" className="secondary-btn" onClick={onCancel}>Cancel</button>
        <button type="submit" className="primary-btn">{initialData ? 'Update Entry' : 'Save Entry'}</button>
      </div>
    </form>
  );
};

export default DieselForm;
