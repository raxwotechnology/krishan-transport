import React, { useState, useEffect } from 'react';
import { vehicleAPI, clientAPI } from '../services/api';
import '../styles/books.css';
import '../styles/forms.css';

const defaultForm = () => ({
  date:          new Date().toISOString().split('T')[0],
  client:        '',
  vehicle:       '',
  location:      '',
  startTime:     '',
  endTime:       '',
  restTime:      0,
  totalHours:    0,
  minimumHours:  0,
  hoursInBill:   0,
  commission:    0,
  dayPayment:    0,
  takenAmount:   0,
  hireAmount:    0,
  paidAmount:    0,
  balance:       0,
  status:        'Pending'
});

const PaymentForm = ({ onSubmit, onCancel, initialData }) => {
  const [vehicles, setVehicles] = useState([]);
  const [clients, setClients]   = useState([]);
  const [formData, setFormData] = useState(
    initialData
      ? { ...defaultForm(), ...initialData, date: initialData.date ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0] }
      : defaultForm()
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [vehRes, cliRes] = await Promise.all([vehicleAPI.get(), clientAPI.get()]);
        setVehicles(Array.isArray(vehRes.data) ? vehRes.data : []);
        setClients(Array.isArray(cliRes.data)  ? cliRes.data  : []);
      } catch (err) { console.error(err); }
    };
    fetchData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };

      // Auto-calc total hours from start/end/rest
      if (['startTime', 'endTime', 'restTime'].includes(name)) {
        const start = name === 'startTime' ? value : updated.startTime;
        const end   = name === 'endTime'   ? value : updated.endTime;
        const rest  = parseFloat(name === 'restTime' ? value : updated.restTime) || 0;
        if (start && end) {
          const [sh, sm] = start.split(':').map(Number);
          const [eh, em] = end.split(':').map(Number);
          let totalMins = (eh * 60 + em) - (sh * 60 + sm);
          if (totalMins < 0) totalMins += 1440;
          totalMins -= rest;
          updated.totalHours = Math.max(0, +(totalMins / 60).toFixed(2));
        }
      }

      // Auto-calc hours in bill = total - minimum
      if (['totalHours', 'minimumHours'].includes(name)) {
        const th = parseFloat(name === 'totalHours'   ? value : updated.totalHours)   || 0;
        const mh = parseFloat(name === 'minimumHours' ? value : updated.minimumHours) || 0;
        updated.hoursInBill = Math.max(0, +(th - mh).toFixed(2));
      }

      // Auto-calc balance = hireAmount - commission - dayPayment - takenAmount
      const hire   = parseFloat(updated.hireAmount)  || 0;
      const comm   = parseFloat(updated.commission)  || 0;
      const dayPay = parseFloat(updated.dayPayment)  || 0;
      const taken  = parseFloat(updated.takenAmount) || 0;
      updated.balance = +(hire - comm - dayPay - taken).toFixed(2);
      updated.status  = updated.balance <= 0 ? 'Paid' : 'Pending';

      return updated;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const section = {
    background: '#f8fafc', border: '1px solid #e8edf4',
    borderRadius: '10px', padding: '14px 16px', marginBottom: '12px',
  };
  const sectionTitle = {
    fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase',
    letterSpacing: '0.06em', color: '#64748b', marginBottom: '12px', marginTop: 0,
  };
  const row = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' };
  const grp = { display: 'flex', flexDirection: 'column', gap: '4px' };
  const lbl = { fontSize: '0.77rem', fontWeight: '600', color: '#475569' };
  const inp = (extra = {}) => ({
    padding: '8px 10px', border: '1.5px solid #e2e8f0', borderRadius: '7px',
    fontSize: '0.86rem', fontFamily: 'inherit', width: '100%',
    boxSizing: 'border-box', ...extra,
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
              <label style={lbl}>Vehicle Number</label>
              <select name="vehicle" value={formData.vehicle} onChange={handleChange} style={inp()}>
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
              <label style={lbl}>Rest Time (min)</label>
              <input type="number" name="restTime" value={formData.restTime} onChange={handleChange} min="0" style={inp()} />
            </div>
            <div style={grp}>
              <label style={{ ...lbl, color: '#2563eb' }}>Total Hours ⚡</label>
              <input type="number" name="totalHours" value={formData.totalHours} onChange={handleChange} step="0.01"
                style={inp({ background: '#eff6ff', fontWeight: '700', color: '#1d4ed8' })} />
            </div>
          </div>
        </div>

        {/* 💰 Payment Details */}
        <div style={section}>
          <p style={sectionTitle}>💰 Payment Breakdown</p>
          <div style={row}>
            <div style={grp}>
              <label style={lbl}>Minimum Hours</label>
              <input type="number" name="minimumHours" value={formData.minimumHours} onChange={handleChange} step="0.01" min="0" style={inp()} />
            </div>
            <div style={grp}>
              <label style={{ ...lbl, color: '#b45309' }}>Hours in Bill ⚡</label>
              <input type="number" name="hoursInBill" value={formData.hoursInBill} onChange={handleChange} step="0.01"
                style={inp({ background: '#fefce8', fontWeight: '700', color: '#b45309' })} />
            </div>
            <div style={grp}>
              <label style={lbl}>Hire Amount (LKR) *</label>
              <input type="number" name="hireAmount" value={formData.hireAmount} onChange={handleChange} min="0" required style={inp()} />
            </div>
          </div>
          <div style={{ ...row, marginTop: '10px' }}>
            <div style={grp}>
              <label style={lbl}>Commission (LKR)</label>
              <input type="number" name="commission" value={formData.commission} onChange={handleChange} min="0" style={inp()} />
            </div>
            <div style={grp}>
              <label style={lbl}>Day Payment (LKR)</label>
              <input type="number" name="dayPayment" value={formData.dayPayment} onChange={handleChange} min="0" style={inp()} />
            </div>
            <div style={grp}>
              <label style={lbl}>Taken Amount (LKR)</label>
              <input type="number" name="takenAmount" value={formData.takenAmount} onChange={handleChange} min="0" style={inp()} />
            </div>
            <div style={grp}>
              <label style={lbl}>Paid Amount (LKR)</label>
              <input type="number" name="paidAmount" value={formData.paidAmount} onChange={handleChange} min="0" style={inp()} />
            </div>
          </div>
          <div style={{ ...row, marginTop: '10px' }}>
            <div style={grp}>
              <label style={{ ...lbl, color: formData.balance > 0 ? '#dc2626' : '#16a34a' }}>Balance ⚡ (LKR)</label>
              <input type="number" name="balance" value={formData.balance} readOnly
                style={inp({ background: formData.balance > 0 ? '#fee2e2' : '#dcfce7', fontWeight: '800', color: formData.balance > 0 ? '#dc2626' : '#16a34a', cursor: 'default' })} />
            </div>
            <div style={grp}>
              <label style={lbl}>Status ⚡</label>
              <input type="text" value={formData.status} readOnly
                style={inp({ background: formData.status === 'Paid' ? '#dcfce7' : '#fefce8', fontWeight: '700', color: formData.status === 'Paid' ? '#15803d' : '#92400e', cursor: 'default' })} />
            </div>
          </div>
        </div>

      </div>{/* end hire-form-scroll */}

      {/* ── STICKY FOOTER ── */}
      <div className="hire-form-footer">
        <div className="total-display">
          <span>Balance</span>
          <strong style={{ color: formData.balance > 0 ? '#dc2626' : '#16a34a' }}>
            LKR {Number(formData.balance).toLocaleString()}
          </strong>
        </div>
        <div className="modal-actions">
          <button type="button" className="cancel-btn" onClick={onCancel}>Cancel</button>
          <button type="submit" className="submit-btn">
            {initialData ? '✅ Update Payment' : '💾 Save Payment'}
          </button>
        </div>
      </div>

    </form>
  );
};

export default PaymentForm;
