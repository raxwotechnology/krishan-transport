import React, { useState, useEffect } from 'react';
import { vehicleAPI, clientAPI, employeeAPI } from '../services/api';
import '../styles/books.css';
import '../styles/forms.css';

const defaultForm = () => ({
  date:            new Date().toISOString().split('T')[0],
  client:          '',
  vehicle:         '',
  location:        '',
  driverName:      '',
  helperName:      '',
  startTime:       '',
  endTime:         '',
  restTime:        0,
  workingHours:    0,
  minimumHours:    0,
  oneHourFee:      0,
  extraHours:      0,
  extraHourFee:    0,
  transportFee:    0,
  dieselCost:      0,
  billAmount:      0,
  commission:      0,
  timeSheetNumber: '',
  billNumber:      '',
  totalAmount:     0,
  details:         '',
  status:          'Pending'
});

const HireForm = ({ onSubmit, onCancel, initialData }) => {
  const [vehicles, setVehicles]   = useState([]);
  const [clients, setClients]     = useState([]);
  const [employees, setEmployees] = useState([]);
  const [formData, setFormData]   = useState(
    initialData
      ? { ...defaultForm(), ...initialData, date: initialData.date ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0] }
      : defaultForm()
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [vehRes, cliRes, empRes] = await Promise.all([
          vehicleAPI.get(), clientAPI.get(), employeeAPI.get()
        ]);
        setVehicles(Array.isArray(vehRes.data) ? vehRes.data : []);
        setClients(Array.isArray(cliRes.data)  ? cliRes.data  : []);
        setEmployees(Array.isArray(empRes.data) ? empRes.data  : []);
      } catch (err) { console.error(err); }
    };
    fetchData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };

      // Auto-calculate working hours from start/end/rest
      if (['startTime', 'endTime', 'restTime'].includes(name)) {
        const start = name === 'startTime' ? value : updated.startTime;
        const end   = name === 'endTime'   ? value : updated.endTime;
        const rest  = parseFloat(name === 'restTime' ? value : updated.restTime) || 0;
        if (start && end) {
          const [sh, sm] = start.split(':').map(Number);
          const [eh, em] = end.split(':').map(Number);
          let totalMins = (eh * 60 + em) - (sh * 60 + sm);
          if (totalMins < 0) totalMins += 1440; // handle past midnight
          totalMins -= rest;
          updated.workingHours = Math.max(0, +(totalMins / 60).toFixed(2));
        }
      }

      // Auto-calculate extra hours = working - minimum
      if (['workingHours', 'minimumHours'].includes(name)) {
        const wh = parseFloat(name === 'workingHours' ? value : updated.workingHours) || 0;
        const mh = parseFloat(name === 'minimumHours'  ? value : updated.minimumHours) || 0;
        updated.extraHours = Math.max(0, +(wh - mh).toFixed(2));
      }

      // Auto-calculate bill amount: (minHrs × rate) + (extraHrs × extraRate) + transport
      const mh  = parseFloat(updated.minimumHours)  || 0;
      const ohf = parseFloat(updated.oneHourFee)    || 0;
      const eh  = parseFloat(updated.extraHours)    || 0;
      const ehf = parseFloat(updated.extraHourFee)  || 0;
      const tf  = parseFloat(updated.transportFee)  || 0;
      updated.billAmount = +(mh * ohf + eh * ehf + tf).toFixed(2);

      // Auto-calculate total = bill + diesel - commission
      const dc  = parseFloat(updated.dieselCost)  || 0;
      const com = parseFloat(updated.commission)  || 0;
      updated.totalAmount = +(updated.billAmount + dc - com).toFixed(2);

      return updated;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const section = {
    background: '#f8fafc',
    border: '1px solid #e8edf4',
    borderRadius: '10px',
    padding: '14px 16px',
    marginBottom: '12px',
  };
  const sectionTitle = {
    fontSize: '0.75rem',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: '#64748b',
    marginBottom: '12px',
    marginTop: 0,
  };

  const row = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' };
  const grp = { display: 'flex', flexDirection: 'column', gap: '4px' };
  const lbl = { fontSize: '0.77rem', fontWeight: '600', color: '#475569' };
  const inp = (extra = {}) => ({
    padding: '8px 10px',
    border: '1.5px solid #e2e8f0',
    borderRadius: '7px',
    fontSize: '0.86rem',
    fontFamily: 'inherit',
    width: '100%',
    boxSizing: 'border-box',
    ...extra,
  });

  return (
    <form onSubmit={handleSubmit} className="hire-form">

      {/* ── SCROLLABLE CONTENT ── */}
      <div className="hire-form-scroll">

        {/* 📋 Basic Info */}
        <div style={section}>
          <p style={sectionTitle}>📋 Basic Information</p>
          <div style={row}>
            <div style={grp}>
              <label style={lbl}>Date *</label>
              <input type="date" name="date" value={formData.date} onChange={handleChange} required style={inp()} />
            </div>
            <div style={grp}>
              <label style={lbl}>Bill Number</label>
              <input type="text" name="billNumber" value={formData.billNumber} onChange={handleChange} placeholder="e.g. BL-2607" style={inp()} />
            </div>
            <div style={grp}>
              <label style={lbl}>Time Sheet No</label>
              <input type="text" name="timeSheetNumber" value={formData.timeSheetNumber} onChange={handleChange} placeholder="e.g. TS-001" style={inp()} />
            </div>
          </div>
          <div style={{ ...row, marginTop: '10px' }}>
            <div style={grp}>
              <label style={lbl}>Company Name *</label>
              <select name="client" value={formData.client} onChange={handleChange} required style={inp()}>
                <option value="">Select Client</option>
                {clients.map(c => <option key={c._id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div style={grp}>
              <label style={lbl}>Vehicle Number *</label>
              <select name="vehicle" value={formData.vehicle} onChange={handleChange} required style={inp()}>
                <option value="">Select Vehicle</option>
                {vehicles.map(v => <option key={v._id} value={v.number}>{v.number}</option>)}
              </select>
            </div>
            <div style={grp}>
              <label style={lbl}>Location / Site</label>
              <input type="text" name="location" value={formData.location} onChange={handleChange} placeholder="e.g. Colombo" style={inp()} />
            </div>
          </div>
        </div>

        {/* 👷 Personnel */}
        <div style={section}>
          <p style={sectionTitle}>👷 Personnel</p>
          <div style={row}>
            <div style={grp}>
              <label style={lbl}>Driver Name</label>
              <input type="text" name="driverName" value={formData.driverName} onChange={handleChange} placeholder="Driver's name" style={inp()} />
            </div>
            <div style={grp}>
              <label style={lbl}>Helper Name</label>
              <input type="text" name="helperName" value={formData.helperName} onChange={handleChange} placeholder="Helper's name" style={inp()} />
            </div>
          </div>
        </div>

        {/* ⏱ Time Tracking */}
        <div style={section}>
          <p style={sectionTitle}>⏱ Time Tracking</p>
          <div style={row}>
            <div style={grp}>
              <label style={lbl}>Start Time</label>
              <input type="time" name="startTime" value={formData.startTime} onChange={handleChange} style={inp()} />
            </div>
            <div style={grp}>
              <label style={lbl}>End Time</label>
              <input type="time" name="endTime" value={formData.endTime} onChange={handleChange} style={inp()} />
            </div>
            <div style={grp}>
              <label style={lbl}>Rest (min)</label>
              <input type="number" name="restTime" value={formData.restTime} onChange={handleChange} min="0" style={inp()} />
            </div>
            <div style={grp}>
              <label style={{ ...lbl, color: '#2563eb' }}>Working Hours ⚡</label>
              <input type="number" name="workingHours" value={formData.workingHours} onChange={handleChange} step="0.01"
                style={inp({ background: '#eff6ff', fontWeight: '700', color: '#1d4ed8' })} />
            </div>
          </div>
        </div>

        {/* 💰 Billing Breakdown */}
        <div style={section}>
          <p style={sectionTitle}>💰 Billing Breakdown (Auto-Calculated)</p>
          <div style={row}>
            <div style={grp}>
              <label style={lbl}>Min Hours</label>
              <input type="number" name="minimumHours" value={formData.minimumHours} onChange={handleChange} step="0.01" min="0" style={inp()} />
            </div>
            <div style={grp}>
              <label style={lbl}>1 Hour Fee (LKR)</label>
              <input type="number" name="oneHourFee" value={formData.oneHourFee} onChange={handleChange} min="0" style={inp()} />
            </div>
            <div style={grp}>
              <label style={{ ...lbl, color: '#b45309' }}>Extra Hours ⚡</label>
              <input type="number" name="extraHours" value={formData.extraHours} onChange={handleChange} step="0.01"
                style={inp({ background: '#fefce8', fontWeight: '700', color: '#b45309' })} />
            </div>
            <div style={grp}>
              <label style={lbl}>Extra Hour Fee (LKR)</label>
              <input type="number" name="extraHourFee" value={formData.extraHourFee} onChange={handleChange} min="0" style={inp()} />
            </div>
          </div>
          <div style={{ ...row, marginTop: '10px' }}>
            <div style={grp}>
              <label style={lbl}>Transport Fee (LKR)</label>
              <input type="number" name="transportFee" value={formData.transportFee} onChange={handleChange} min="0" style={inp()} />
            </div>
            <div style={grp}>
              <label style={lbl}>Diesel Cost (LKR)</label>
              <input type="number" name="dieselCost" value={formData.dieselCost} onChange={handleChange} min="0" style={inp()} />
            </div>
            <div style={grp}>
              <label style={lbl}>Commission (LKR)</label>
              <input type="number" name="commission" value={formData.commission} onChange={handleChange} min="0" style={inp()} />
            </div>
          </div>
          <div style={{ ...row, marginTop: '10px' }}>
            <div style={grp}>
              <label style={{ ...lbl, color: '#16a34a' }}>Bill Amount ⚡ (LKR)</label>
              <input type="number" name="billAmount" value={formData.billAmount} readOnly
                style={inp({ background: '#dcfce7', fontWeight: '700', color: '#15803d', cursor: 'default' })} />
            </div>
            <div style={grp}>
              <label style={{ ...lbl, color: '#2563eb', fontSize: '0.8rem' }}>TOTAL AMOUNT ⚡ (LKR)</label>
              <input type="number" name="totalAmount" value={formData.totalAmount} readOnly
                style={inp({ background: '#dbeafe', fontWeight: '800', fontSize: '1rem', color: '#1d4ed8', cursor: 'default' })} />
            </div>
          </div>
        </div>

        {/* 📝 Details */}
        <div style={section}>
          <p style={sectionTitle}>📝 Additional Details</p>
          <div style={grp}>
            <label style={lbl}>Details / Remarks</label>
            <textarea name="details" value={formData.details} onChange={handleChange} rows="3"
              placeholder="Add any notes..." style={inp({ resize: 'vertical', minHeight: '70px' })} />
          </div>
          <div style={{ ...grp, marginTop: '10px' }}>
            <label style={lbl}>Status</label>
            <select name="status" value={formData.status} onChange={handleChange} style={inp()}>
              <option value="Pending">Pending</option>
              <option value="Paid">Paid</option>
            </select>
          </div>
        </div>

      </div>{/* end hire-form-scroll */}

      {/* ── STICKY FOOTER (always visible) ── */}
      <div className="hire-form-footer">
        <div className="total-display">
          <span>Total Amount</span>
          <strong>LKR {Number(formData.totalAmount).toLocaleString()}</strong>
        </div>
        <div className="modal-actions">
          <button type="button" className="cancel-btn" onClick={onCancel}>Cancel</button>
          <button type="submit" className="submit-btn">
            {initialData ? '✅ Update Job' : '💾 Save Job'}
          </button>
        </div>
      </div>

    </form>
  );
};

export default HireForm;
