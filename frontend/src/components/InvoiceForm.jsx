import React, { useState, useEffect } from 'react';
import { clientAPI, vehicleAPI, hireAPI } from '../services/api';
import Autocomplete from './Autocomplete';
import '../styles/forms.css';

/* ── Helpers ───────────────────────────────────────────────── */
const defaultForm = () => ({
  clientName: '',
  site: '',
  vehicleNo: '',
  vehicleType: '',
  date: new Date().toISOString().split('T')[0],
  jobDescription: '',
  unitType: 'Hours',
  totalUnits: 0,
  ratePerUnit: 0,
  transportCharge: 0,
  otherCharges: 0,
  otherChargesDescription: '',
  totalAmount: 0,
  status: 'Draft',
});

const calcTotal = (d) => {
  const itemTotal = d.items?.length > 0 
    ? d.items.reduce((s, i) => s + (Number(i.amount) || 0), 0)
    : Number(d.totalUnits || 0) * Number(d.ratePerUnit || 0);
    
  return +(
    itemTotal +
    Number(d.transportCharge || 0) +
    Number(d.otherCharges    || 0)
  ).toFixed(2);
};

const calcSubtotal = (d) => {
  if (d.items?.length > 0) {
    return +(d.items.reduce((s, i) => s + (Number(i.amount) || 0), 0)).toFixed(2);
  }
  return +(Number(d.totalUnits || 0) * Number(d.ratePerUnit || 0)).toFixed(2);
};

/* ── Component ─────────────────────────────────────────────── */
const InvoiceForm = ({ onSubmit, onCancel, initialData }) => {
  const [formData,   setFormData]   = useState(defaultForm());
  const [clients,    setClients]    = useState([]);
  const [vehicles,   setVehicles]   = useState([]);
  const [hireRecords, setHireRecords] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  /* Load dropdowns & pre-fill when editing */
  useEffect(() => {
    fetchLinkedData();
    if (initialData) {
      setFormData({
        ...defaultForm(),
        ...initialData,
        date: initialData.date
          ? new Date(initialData.date).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
      });
    } else {
      setFormData(defaultForm());
    }
  }, [initialData]);

  const fetchLinkedData = async () => {
    try {
      const [cRes, vRes, hRes] = await Promise.all([
        clientAPI.get(),
        vehicleAPI.get(),
        hireAPI.get()
      ]);
      setClients(Array.isArray(cRes.data) ? cRes.data : []);
      setVehicles(Array.isArray(vRes.data) ? vRes.data : []);
      setHireRecords(Array.isArray(hRes.data) ? hRes.data : []);
    } catch (err) {
      console.error('Failed to fetch linked data', err);
    }
  };

  /* Generic field change — recalcs total automatically */
  const handleChange = (e) => {
    const { name, value } = e.target;
    const updated = { ...formData, [name]: value };

    // Auto-fill logic from recent hires
    if (name === 'clientName' && value && !initialData) {
      const lastHire = hireRecords
        .filter(h => (h.client || h.clientName) === value)
        .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
      
      if (lastHire) {
        if (!updated.site) updated.site = lastHire.site || lastHire.address || '';
        if (!updated.vehicleNo) updated.vehicleNo = lastHire.vehicle || '';
        if (!updated.startTime) updated.startTime = lastHire.startTime || '';
        if (!updated.endTime) updated.endTime = lastHire.endTime || '';
        if (!updated.jobDescription) updated.jobDescription = lastHire.details || '';
        if (!updated.unitType) updated.unitType = 'Hours';
        if (!updated.totalUnits) updated.totalUnits = lastHire.workingHours || 0;
        
        // Auto-fill vehicle type if we just got a vehicleNo
        if (updated.vehicleNo) {
          const vObj = vehicles.find(v => v.number === updated.vehicleNo);
          if (vObj) updated.vehicleType = vObj.type || '';
        }
      }
    }

    updated.totalAmount = calcTotal(updated);
    setFormData(updated);
  };

  /* Vehicle select → auto-fill vehicleType from DB record */
  const handleVehicleChange = (e) => {
    const selectedNo = e.target.value;
    const vehicleObj = vehicles.find((v) => v.number === selectedNo);
    const updated = {
      ...formData,
      vehicleNo:   selectedNo,
      vehicleType: vehicleObj?.type || formData.vehicleType,
    };
    updated.totalAmount = calcTotal(updated);
    setFormData(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    // Auto-create missing records
    try {
      if (formData.clientName && !clients.find(c => c.name.toLowerCase() === formData.clientName.toLowerCase())) {
        await clientAPI.create({ name: formData.clientName, status: 'Active' });
      }
      if (formData.vehicleNo && !vehicles.find(v => v.number.toLowerCase() === formData.vehicleNo.toLowerCase())) {
        await vehicleAPI.create({ number: formData.vehicleNo, status: 'Active' });
      }
    } catch (err) { console.error('Auto-creation failed', err); }

    try {
      await onSubmit({ ...formData, totalAmount: calcTotal(formData) });
    } finally {
      setSubmitting(false);
    }
  };

  /* Derived display values */
  const subtotal  = calcSubtotal(formData);
  const grandTotal = calcTotal(formData);

  return (
    <form onSubmit={handleSubmit} className="hire-form">
      <div className="hire-form-scroll">

        {/* ── Section 1: Client & Logistics ── */}
        <div className="form-section">
          <p className="form-section-title">Client &amp; Logistics</p>
          <div className="form-grid">

            <div className="form-group">
              <label>Client Name *</label>
              <Autocomplete 
                name="clientName" 
                value={formData.clientName} 
                onChange={handleChange} 
                options={clients.map(c => c.name)}
                placeholder="Client name"
                required
              />
            </div>

            <div className="form-group">
              <label>Site / Location</label>
              <input
                type="text" name="site"
                value={formData.site} onChange={handleChange}
                placeholder="e.g. Site #4"
              />
            </div>

            {/* Vehicle Number — triggers auto-fill of type */}
            <div className="form-group">
              <label>Vehicle Number</label>
              <Autocomplete 
                name="vehicleNo" 
                value={formData.vehicleNo} 
                onChange={handleChange} 
                options={vehicles.map(v => v.number)}
                placeholder="Vehicle No"
              />
            </div>

            {/* Vehicle Type — auto-filled but still editable */}
            <div className="form-group">
              <label>Vehicle Type</label>
              <select name="vehicleType" value={formData.vehicleType} onChange={handleChange}>
                <option value="">Select Type</option>
                <option value="Truck">Truck</option>
                <option value="Mini Truck">Mini Truck</option>
                <option value="Van">Van</option>
                <option value="Mini Van">Mini Van</option>
                <option value="Prime Mover">Prime Mover</option>
                <option value="Crane">Crane</option>
                <option value="Tipper">Tipper</option>
                <option value="Flatbed">Flatbed</option>
                <option value="Pickup">Pickup</option>
                <option value="Bus">Bus</option>
                <option value="Other">Other</option>
              </select>
              {formData.vehicleNo && formData.vehicleType && (
                <span style={{ fontSize: '11px', color: '#2563EB', marginTop: '4px', display: 'block' }}>
                  ✓ Auto-filled from vehicle record
                </span>
              )}
            </div>

          </div>

          <div className="form-group" style={{ marginTop: '16px' }}>
            <label>Invoice Date *</label>
            <input type="date" name="date" value={formData.date} onChange={handleChange} required />
          </div>
        </div>

        {/* ── Section 2: Job Details ── */}
        <div className="form-section">
          <p className="form-section-title">Job Details</p>
          <div className="form-grid-2">
            <div className="form-group">
              <label>Start Time</label>
              <input type="time" name="startTime" value={formData.startTime || ''} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>End Time</label>
              <input type="time" name="endTime" value={formData.endTime || ''} onChange={handleChange} />
            </div>
          </div>
          <div className="form-group" style={{ marginTop: '16px' }}>
            <label>Description</label>
            <textarea
              name="jobDescription" value={formData.jobDescription}
              onChange={handleChange} rows="2"
              placeholder="Describe the work done..."
            />
          </div>
        </div>

        {/* ── Section 3: Pricing & Itemization ── */}
        <div className="form-section">
          <p className="form-section-title">Pricing & Itemization</p>
          
          {formData.items && formData.items.length > 0 ? (
            <div className="itemized-editor" style={{ marginBottom: '20px' }}>
              <p style={{ fontWeight: 'bold', fontSize: '12px', color: '#1E40AF', marginBottom: '8px' }}>Batch Items (Grouped Billing Active)</p>
              <div className="table-responsive" style={{ border: '1px solid #E2E8F0', borderRadius: '10px', overflow: 'hidden' }}>
                <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                  <thead style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '10px' }}>JOB DESCRIPTION / SITE</th>
                      <th style={{ textAlign: 'center', padding: '10px' }}>UNITS</th>
                      <th style={{ textAlign: 'right', padding: '10px' }}>RATE</th>
                      <th style={{ textAlign: 'right', padding: '10px' }}>TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.items.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9', background: idx % 2 === 0 ? '#FFFFFF' : '#FAFBFC' }}>
                        <td style={{ padding: '8px' }}>
                          <input 
                            type="text" 
                            className="inline-input"
                            value={item.description || `${item.city || ''} ${item.address || ''}`.trim() || 'Service Item'} 
                            onChange={(e) => {
                              const newItems = [...formData.items];
                              newItems[idx].description = e.target.value;
                              setFormData({ ...formData, items: newItems });
                            }}
                            style={{ width: '100%', padding: '4px', border: '1px solid transparent', borderRadius: '4px', fontSize: '11px' }}
                          />
                        </td>
                        <td style={{ padding: '8px', textAlign: 'center' }}>
                          <input 
                            type="number" 
                            className="inline-input"
                            value={item.units || item.workingHours || 0} 
                            onChange={(e) => {
                              const newItems = [...formData.items];
                              newItems[idx].units = parseFloat(e.target.value) || 0;
                              newItems[idx].amount = (newItems[idx].units * (newItems[idx].rate || 0));
                              setFormData({ ...formData, items: newItems });
                            }}
                            style={{ width: '50px', textAlign: 'center', padding: '4px', border: '1px solid #CBD5E1', borderRadius: '4px', fontSize: '11px' }}
                          />
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>
                          <input 
                            type="number" 
                            className="inline-input"
                            value={item.rate || 0} 
                            onChange={(e) => {
                              const newItems = [...formData.items];
                              newItems[idx].rate = parseFloat(e.target.value) || 0;
                              newItems[idx].amount = ((newItems[idx].units || 0) * newItems[idx].rate);
                              setFormData({ ...formData, items: newItems });
                            }}
                            style={{ width: '80px', textAlign: 'right', padding: '4px', border: '1px solid #CBD5E1', borderRadius: '4px', fontSize: '11px' }}
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
          ) : (
            <div className="form-grid-2" style={{ marginBottom: '16px' }}>
              <div className="form-group">
                <label>Unit Type</label>
                <select name="unitType" value={formData.unitType} onChange={handleChange}>
                  <option value="Hours">Hours</option>
                  <option value="Days">Days</option>
                  <option value="Lumpsum">Lumpsum</option>
                  <option value="KM">KM</option>
                </select>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label>Total Units ({formData.unitType})</label>
                  <input
                    type="number" name="totalUnits"
                    value={formData.totalUnits} onChange={handleChange}
                    min="0" step="0.1"
                  />
                </div>
                <div className="form-group">
                  <label>Rate per Unit (LKR)</label>
                  <input
                    type="number" name="ratePerUnit"
                    value={formData.ratePerUnit} onChange={handleChange}
                    min="0"
                  />
                </div>
              </div>
            </div>
          )}

          <div style={{
            margin: '10px 0 4px',
            padding: '12px',
            background: '#EFF6FF',
            borderRadius: '12px',
            fontSize: '14px',
            color: '#1D4ED8',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            border: '1px solid #DBEAFE'
          }}>
            <span style={{ fontWeight: 500, color: '#60A5FA', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.05em' }}>Subtotal (Excl. Add-ons)</span>
            <strong style={{ fontSize: '16px' }}>LKR {subtotal.toLocaleString()}</strong>
          </div>

          <div className="form-grid" style={{ marginTop: '12px' }}>

            <div className="form-group">
              <label>Transport Charge (LKR)</label>
              <input
                type="number" name="transportCharge"
                value={formData.transportCharge} onChange={handleChange}
                min="0"
              />
            </div>

            <div className="form-group">
              <label>Other Charges (LKR)</label>
              <input
                type="number" name="otherCharges"
                value={formData.otherCharges} onChange={handleChange}
                min="0"
              />
            </div>

            <div className="form-group">
              <label>Status</label>
              <select name="status" value={formData.status} onChange={handleChange}>
                <option value="Draft">Draft</option>
                <option value="Sent">Sent</option>
                <option value="Paid">Paid</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

          </div>
        </div>

      </div>{/* end hire-form-scroll */}

      {/* ── Footer: Grand Total + Actions ── */}
      <div className="hire-form-footer">
        <div className="total-display" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Grand Total
          </span>
          <strong style={{ fontSize: '22px', color: '#2563EB' }}>
            LKR {grandTotal.toLocaleString()}
          </strong>
          {(Number(formData.transportCharge) > 0 || Number(formData.otherCharges) > 0) && (
            <span style={{ fontSize: '11px', color: '#64748B' }}>
              {subtotal.toLocaleString()} + {Number(formData.transportCharge || 0).toLocaleString()} + {Number(formData.otherCharges || 0).toLocaleString()}
            </span>
          )}
        </div>
        <div className="modal-actions">
          <button type="button" className="cancel-btn" onClick={onCancel}>Cancel</button>
          <button type="submit" className="submit-btn" disabled={submitting}>
            {submitting ? 'Saving...' : initialData ? 'Update Invoice' : 'Save & Generate'}
          </button>
        </div>
      </div>
    </form>
  );
};

export default InvoiceForm;
