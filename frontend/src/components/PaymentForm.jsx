import React, { useState, useEffect } from 'react';
import { vehicleAPI, clientAPI, paymentAPI } from '../services/api';
import Autocomplete from './Autocomplete';
import '../styles/books.css';
import '../styles/forms.css';

/* ─── Helpers ──────────────────────────────────────────────── */
const blank = () => ({
  date:         new Date().toISOString().split('T')[0],
  client:       '',
  vehicle:      '',
  address:      '',
  city:         '',
  startTime:    '',
  endTime:      '',
  restTime:     0,
  totalHours:   0,
  minimumHours: 0,
  hoursInBill:  0,
  hireAmount:   0,
  commission:   0,
  dayPayment:   0,
  takenAmount:  0,
  paidAmount:   0,
  balance:      0,
  status:       'Pending',
});

const fromDB = (d) => ({
  ...blank(),
  ...d,
  date:       d?.date ? new Date(d.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
  address:    d?.address || '',
  city:       d?.city    || d?.location || '',
  restTime:   d?.restTime   ?? 0,
  totalHours: d?.totalHours ?? 0,
  minimumHours: d?.minimumHours ?? 0,
  hoursInBill:  d?.hoursInBill  ?? 0,
  hireAmount:   d?.hireAmount   ?? 0,
  commission:   d?.commission   ?? 0,
  dayPayment:   d?.dayPayment   ?? 0,
  takenAmount:  d?.takenAmount  ?? 0,
  balance:      d?.balance      ?? 0,
});

/* Auto-calculate hours & balance — does NOT touch status */
const compute = (f) => {
  const next = { ...f };

  // Total hours from start/end/rest
  if (next.startTime && next.endTime) {
    const [sh, sm] = next.startTime.split(':').map(Number);
    const [eh, em] = next.endTime.split(':').map(Number);
    let mins = (eh * 60 + em) - (sh * 60 + sm);
    if (mins < 0) mins += 1440; // overnight
    mins = Math.max(0, mins - (parseFloat(next.restTime) || 0));
    next.totalHours = +(mins / 60).toFixed(2);
  }

  // Hours in bill = total - minimum
  const th = parseFloat(next.totalHours)   || 0;
  const mh = parseFloat(next.minimumHours) || 0;
  next.hoursInBill = Math.max(0, +(th - mh).toFixed(2));

  // Balance = hire - commission - dayPayment - takenAmount
  const hire   = parseFloat(next.hireAmount)  || 0;
  const comm   = parseFloat(next.commission)  || 0;
  const dayPay = parseFloat(next.dayPayment)  || 0;
  const taken  = parseFloat(next.takenAmount) || 0;
  next.balance = +(hire - comm - dayPay - taken).toFixed(2);

  // ⚠️ Status is NOT auto-set here — user controls it manually via dropdown

  return next;
};

/* Suggested status based on balance (for hint only, not forced) */
const suggestStatus = (f) => {
  const hire = parseFloat(f.hireAmount) || 0;
  return hire > 0 && (parseFloat(f.balance) || 0) <= 0 ? 'Paid' : 'Pending';
};

/* ─── Component ─────────────────────────────────────────────── */
const PaymentForm = ({ onSubmit, onCancel, initialData }) => {
  /* Reference data */
  const [vehicles,  setVehicles]  = useState([]);
  const [clients,   setClients]   = useState([]);
  const [prevJobs,  setPrevJobs]  = useState([]); // for auto-fill

  /* Form state */
  const [form, setForm] = useState(initialData ? fromDB(initialData) : blank());

  /* Re-sync when switching edit targets */
  useEffect(() => {
    setForm(initialData ? fromDB(initialData) : blank());
  }, [initialData]);

  /* Load reference data */
  useEffect(() => {
    const load = async () => {
      try {
        const [vR, cR, pR] = await Promise.all([
          vehicleAPI.get(),
          clientAPI.get(),
          paymentAPI.get(),
        ]);

        setVehicles(Array.isArray(vR.data) ? vR.data : []);
        setClients (Array.isArray(cR.data) ? cR.data : []);
        setPrevJobs(Array.isArray(pR.data) ? pR.data : []);
      } catch (err) {
        console.error('PaymentForm load error:', err);
      }
    };
    load();
  }, []);

  /* Handle any field change */
  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm(prev => {
      const next = { ...prev, [name]: value };

      /* Smart auto-fill on vehicle select (only in Add mode) */
      if (name === 'vehicle' && value && !initialData) {
        const last = prevJobs
          .filter(j => j.vehicle === value)
          .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
        if (last) {
          // no driver/helper autofill
        }
      }

      /* Smart auto-fill on client select (only in Add mode) */
      if (name === 'client' && value && !initialData) {
        const last = prevJobs
          .filter(j => j.client === value)
          .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
        if (last) {
          if (!prev.address) next.address = last.address || '';
          if (!prev.city)    next.city    = last.city    || '';
          if (!prev.minimumHours) next.minimumHours = last.minimumHours || 0;
        }
      }

      /* Smart logic: if status is changed to 'Paid', auto-fill takenAmount to clear balance */
      if (name === 'status' && value === 'Paid') {
        const hire = parseFloat(next.hireAmount) || 0;
        const comm = parseFloat(next.commission) || 0;
        const dayP = parseFloat(next.dayPayment) || 0;
        next.takenAmount = Math.max(0, +(hire - comm - dayP).toFixed(2));
      }

      return compute(next);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Auto-create missing records
    try {
      if (form.client && !clients.find(c => c.name.toLowerCase() === form.client.toLowerCase())) {
        await clientAPI.create({ name: form.client, status: 'Active' });
      }
      if (form.vehicle && !vehicles.find(v => v.number.toLowerCase() === form.vehicle.toLowerCase())) {
        await vehicleAPI.create({ number: form.vehicle, status: 'Active' });
      }
    } catch (err) { console.error(err); }

    onSubmit({ ...form });
  };

  /* ── Render ─────────────────────────────────────────────── */
  return (
    <form onSubmit={handleSubmit} className="hire-form">
      <div className="hire-form-scroll">

        {/* ── Section 1: Logistics ─────────────────────── */}
        {form.isGrouped && (
          <div className="form-section" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', marginBottom: '20px' }}>
            <p style={{ margin: 0, fontSize: '13px', color: '#1E40AF', fontWeight: 'bold' }}>
              ℹ️ This is a CONSOLIDATED payment for multiple hires.
            </p>
            <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#1E40AF' }}>
              The Hire Amount and details below are aggregated from {form.vehicle?.split(',').length} vehicles.
            </p>
          </div>
        )}
        <div className="form-section">
          <p className="form-section-title">Logistics Information</p>
          <div className="form-grid">

            <div className="form-group">
              <label>Date *</label>
              <input type="date" name="date" value={form.date} onChange={handleChange} required />
            </div>

            <div className="form-group">
              <label>Company Name *</label>
              <Autocomplete 
                name="client" 
                value={form.client} 
                onChange={handleChange} 
                options={clients.map(c => c.name)}
                placeholder="Client name"
                required
              />
            </div>

            <div className="form-group">
              <label>Vehicle Number</label>
              <Autocomplete 
                name="vehicle" 
                value={form.vehicle} 
                onChange={handleChange} 
                options={vehicles.map(v => v.number)}
                placeholder="Vehicle No"
              />
            </div>

            <div className="form-group">
              <label>Service Address</label>
              <input type="text" name="address" value={form.address} onChange={handleChange} placeholder="e.g. 123 Main St" />
            </div>

            <div className="form-group">
              <label>City</label>
              <input type="text" name="city" value={form.city} onChange={handleChange} placeholder="e.g. Colombo" />
            </div>

          </div>
        </div>

        {/* ── Section 2: Itemized Breakdown (for Grouped Payments) ── */}
        {form.items && form.items.length > 0 && (
          <div className="form-section">
            <p className="form-section-title">Itemized Breakdown</p>
            <div className="table-responsive" style={{ border: '1px solid #E2E8F0', borderRadius: '10px', overflow: 'hidden' }}>
              <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                <thead style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '10px' }}>JOB / SITE</th>
                    <th style={{ textAlign: 'center', padding: '10px' }}>HRS</th>
                    <th style={{ textAlign: 'right', padding: '10px' }}>RATE</th>
                    <th style={{ textAlign: 'right', padding: '10px' }}>TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {form.items.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9', background: idx % 2 === 0 ? '#FFFFFF' : '#FAFBFC' }}>
                      <td style={{ padding: '8px' }}>
                        <input 
                          type="text" 
                          value={item.description || `${item.city || ''} ${item.address || ''}`.trim() || 'Service Item'} 
                          onChange={(e) => {
                            const newItems = [...form.items];
                            newItems[idx].description = e.target.value;
                            setForm({ ...form, items: newItems });
                          }}
                          style={{ width: '100%', padding: '4px', border: '1px solid transparent', borderRadius: '4px', fontSize: '11px' }}
                        />
                      </td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        <input 
                          type="number" 
                          value={item.units || item.workingHours || 0} 
                          onChange={(e) => {
                            const newItems = [...form.items];
                            const units = parseFloat(e.target.value) || 0;
                            newItems[idx].units = units;
                            newItems[idx].workingHours = units;
                            newItems[idx].amount = (units * (newItems[idx].rate || 0));
                            
                            // Recalc total hire amount
                            const newTotal = newItems.reduce((s, i) => s + (i.amount || 0), 0);
                            setForm({ ...form, items: newItems, hireAmount: newTotal, balance: newTotal - (form.commission || 0) - (form.dayPayment || 0) - (form.takenAmount || 0) });
                          }}
                          style={{ width: '50px', textAlign: 'center', padding: '4px', border: '1px solid #CBD5E1', borderRadius: '4px', fontSize: '11px' }}
                        />
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>
                        <input 
                          type="number" 
                          value={item.rate || 0} 
                          onChange={(e) => {
                            const newItems = [...form.items];
                            const rate = parseFloat(e.target.value) || 0;
                            newItems[idx].rate = rate;
                            newItems[idx].amount = ((newItems[idx].units || newItems[idx].workingHours || 0) * rate);
                            
                            // Recalc total hire amount
                            const newTotal = newItems.reduce((s, i) => s + (i.amount || 0), 0);
                            setForm({ ...form, items: newItems, hireAmount: newTotal, balance: newTotal - (form.commission || 0) - (form.dayPayment || 0) - (form.takenAmount || 0) });
                          }}
                          style={{ width: '70px', textAlign: 'right', padding: '4px', border: '1px solid #CBD5E1', borderRadius: '4px', fontSize: '11px' }}
                        />
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', color: '#1E40AF' }}>
                        LKR {(item.amount || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Section 3: Time Tracking ─────────────────── */}
        <div className="form-section">
          <p className="form-section-title">Time Tracking</p>
          <div className="form-grid">

            <div className="form-group">
              <label>Start Time</label>
              <input type="time" name="startTime" value={form.startTime} onChange={handleChange} />
            </div>

            <div className="form-group">
              <label>End Time</label>
              <input type="time" name="endTime" value={form.endTime} onChange={handleChange} />
            </div>

            <div className="form-group">
              <label>Rest Time (min)</label>
              <input type="number" name="restTime" value={form.restTime} onChange={handleChange} min="0" />
            </div>

            <div className="form-group">
              <label>Total Hours <span style={{color:'#2563EB',fontSize:'11px'}}>(auto)</span></label>
              <input type="number" value={form.totalHours} readOnly className="input-highlight-blue" />
            </div>

            <div className="form-group">
              <label>Minimum Hours</label>
              <input type="number" name="minimumHours" value={form.minimumHours} onChange={handleChange} step="0.5" min="0" />
            </div>

            <div className="form-group">
              <label>Hours in Bill <span style={{color:'#D97706',fontSize:'11px'}}>(auto)</span></label>
              <input type="number" value={form.hoursInBill} readOnly className="input-highlight-gold" />
            </div>

          </div>
        </div>

        {/* ── Section 3: Payment Breakdown ─────────────── */}
        <div className="form-section">
          <p className="form-section-title">Payment Breakdown</p>
          <div className="form-grid">

            <div className="form-group">
              <label>Hire Amount (LKR) *</label>
              <input type="number" name="hireAmount" value={form.hireAmount} onChange={handleChange} min="0" required />
            </div>

            <div className="form-group">
              <label>Commission (LKR)</label>
              <input type="number" name="commission" value={form.commission} onChange={handleChange} min="0" />
            </div>

            <div className="form-group">
              <label>Day Payment (LKR)</label>
              <input type="number" name="dayPayment" value={form.dayPayment} onChange={handleChange} min="0" />
            </div>

            <div className="form-group">
              <label>Taken Amount (LKR)</label>
              <input type="number" name="takenAmount" value={form.takenAmount} onChange={handleChange} min="0" />
            </div>

            <div className="form-group">
              <label>Balance (LKR) <span style={{color:'#D97706',fontSize:'11px'}}>(auto)</span></label>
              <input type="number" value={form.balance} readOnly
                className={form.balance > 0 ? 'input-highlight-gold' : 'input-highlight-green'} />
            </div>

            <div className="form-group">
              <label>
                Payment Status
                {suggestStatus(form) !== form.status && (
                  <span style={{ marginLeft: '8px', fontSize: '11px', color: '#2563EB', fontWeight: '500' }}>
                    ↑ Suggest: {suggestStatus(form)}
                  </span>
                )}
              </label>
              <select name="status" value={form.status} onChange={handleChange}
                className={form.status === 'Paid' ? 'input-highlight-green' : 'input-highlight-gold'}>
                <option value="Pending">Pending</option>
                <option value="Paid">Paid</option>
                <option value="Partial">Partial</option>
              </select>
            </div>

          </div>
        </div>

      </div>

      {/* ── Sticky Footer ────────────────────────────────── */}
      <div className="hire-form-footer">
        <div className="total-display">
          <span>Hire Amount</span>
          <strong style={{ color: '#1E40AF' }}>LKR {Number(form.hireAmount || 0).toLocaleString()}</strong>
          <span style={{ margin: '0 12px', color: '#94A3B8' }}>|</span>
          <span>Balance</span>
          <strong style={{ color: form.balance > 0 ? '#DC2626' : '#059669' }}>
            LKR {Number(form.balance).toLocaleString()}
          </strong>
        </div>
        <div className="modal-actions">
          <button type="button" className="cancel-btn" onClick={onCancel}>Cancel</button>
          <button type="submit" className="submit-btn">
            {initialData ? 'Update Payment' : 'Save Payment'}
          </button>
        </div>
      </div>
    </form>
  );
};

export default PaymentForm;
