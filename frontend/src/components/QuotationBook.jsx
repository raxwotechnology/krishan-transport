import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { FileCheck, Plus, Download, Trash2, Search, Loader2, Calendar, CheckCircle2, Clock, XCircle, Truck } from 'lucide-react';
import { generateQuotationPDF } from '../utils/billingGenerator';
import '../styles/forms.css';
import '../styles/books.css';

const DEFAULT_TERMS = `1. Prices are exclusive of any taxes unless mentioned.
2. Payment must be made as per agreed terms.
3. We are not responsible for any delays due to site access issues.`;

const defaultForm = () => ({
  clientName: '', clientAddress: '', date: new Date().toISOString().split('T')[0],
  vehicleType: '', vehicleNo: '', maxHeight: '', maxWeight: '',
  mandatoryCharge: 0, transportCharge: 0, extraHourRate: 0,
  validityDays: 30, termsAndConditions: DEFAULT_TERMS,
  estimatedTotal: 0, status: 'Draft'
});

const QuotationBook = () => {
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState(defaultForm());

  useEffect(() => { fetchQuotations(); }, []);

  const fetchQuotations = async () => {
    try {
      const res = await api.get('/quotations');
      setQuotations(Array.isArray(res.data) ? res.data : []);
    } catch (err) { console.error('Error fetching quotations', err); }
    finally { setLoading(false); }
  };

  const calcTotal = (d) =>
    +(Number(d.mandatoryCharge || 0) + Number(d.transportCharge || 0)).toFixed(2);

  const handleChange = (e) => {
    const updated = { ...formData, [e.target.name]: e.target.value };
    updated.estimatedTotal = calcTotal(updated);
    setFormData(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/quotations', { ...formData, estimatedTotal: calcTotal(formData) });
      setShowModal(false);
      setFormData(defaultForm());
      fetchQuotations();
    } catch { alert('Error saving quotation'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this quotation?')) {
      await api.delete(`/quotations/${id}`);
      fetchQuotations();
    }
  };

  const filtered = quotations.filter(q =>
    (q.clientName  || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (q.quotationNo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (q.vehicleType || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const badge = (status) => {
    switch(status) {
      case 'Accepted': return <span className="badge badge-success"><CheckCircle2 size={12} /> Accepted</span>;
      case 'Sent':     return <span className="badge badge-info"><Clock size={12} /> Sent</span>;
      case 'Rejected': return <span className="badge badge-danger"><XCircle size={12} /> Rejected</span>;
      default:         return <span className="badge badge-warning"><Clock size={12} /> Draft</span>;
    }
  };

  const fd = formData;

  return (
    <div className="hire-book-container">

      {/* Summary */}
      <div className="book-container">
        <div className="book-summary">
          <div className="summary-item"><label>TOTAL QUOTATIONS</label><h3>{quotations.length}</h3></div>
          <div className="summary-item" style={{ borderRight:'none' }}>
            <label>ACCEPTED</label>
            <h3 style={{ color:'#16a34a' }}>{quotations.filter(q => q.status === 'Accepted').length}</h3>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="book-header">
        <div className="header-main">
          <div className="title-section"><FileCheck className="title-icon" size={24} /><h1>Service Quotations</h1></div>
          <button className="add-btn" onClick={() => setShowModal(true)}><Plus size={18} /> New Quotation</button>
        </div>
        <div className="search-bar">
          <Search size={16} />
          <input type="text" placeholder="Search by No, Client, Vehicle Type..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="loading-state"><Loader2 className="spinner" /><p>Loading...</p></div>
      ) : (
        <div className="table-responsive">
          <table className="hire-table">
            <thead><tr>
              <th>Quote No</th><th>Date</th><th>Client</th><th>Vehicle Type</th>
              <th>Max Height</th><th>Max Weight</th><th>Min Charge</th>
              <th>Transport</th><th>Extra/Hr</th><th>Est. Total</th><th>Validity</th><th>Status</th><th>Actions</th>
            </tr></thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={13} style={{ textAlign:'center', padding:'40px', color:'#94a3b8' }}>No quotations yet. Click "+ New Quotation" to create one.</td></tr>
              ) : filtered.map(q => (
                <tr key={q._id}>
                  <td><strong>{q.quotationNo}</strong></td>
                  <td>{new Date(q.date).toLocaleDateString()}</td>
                  <td>{q.clientName}<br/><small>{q.clientAddress}</small></td>
                  <td>{q.vehicleType || '—'}</td>
                  <td>{q.maxHeight || '—'}</td>
                  <td>{q.maxWeight || '—'}</td>
                  <td>LKR {(q.mandatoryCharge || 0).toLocaleString()}</td>
                  <td>LKR {(q.transportCharge || 0).toLocaleString()}</td>
                  <td>LKR {(q.extraHourRate || 0).toLocaleString()}</td>
                  <td className="amount-cell">LKR {(q.estimatedTotal || 0).toLocaleString()}</td>
                  <td>{q.validityDays} days</td>
                  <td>{badge(q.status)}</td>
                  <td className="actions-cell">
                    <button className="action-btn pdf" onClick={() => generateQuotationPDF(q)} title="Download PDF"><Download size={15} /></button>
                    <button className="action-btn delete" onClick={() => handleDelete(q._id)} title="Delete"><Trash2 size={15} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content invoice-modal" onClick={e => e.stopPropagation()}>

            {/* Sticky Header */}
            <div className="modal-header">
              <h2>New Service Quotation</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}><span aria-hidden>✕</span></button>
            </div>

            <form onSubmit={handleSubmit} className="hire-form">
              {/* Scrollable Body */}
              <div className="hire-form-scroll">

                {/* Client Info */}
                <div style={{ background:'#f8fafc', border:'1px solid #e8edf4', borderRadius:'10px', padding:'14px 16px', marginBottom:'12px' }}>
                  <p style={{ fontSize:'0.75rem', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.06em', color:'#64748b', marginBottom:'12px', marginTop:0 }}>📋 Client Information</p>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Client Name *</label>
                      <input type="text" name="clientName" value={fd.clientName} onChange={handleChange} required placeholder="Company or client name" />
                    </div>
                    <div className="form-group">
                      <label>Client Address</label>
                      <input type="text" name="clientAddress" value={fd.clientAddress} onChange={handleChange} placeholder="Full address" />
                    </div>
                    <div className="form-group">
                      <label>Quotation Date *</label>
                      <div className="input-with-icon">
                        <Calendar size={15} />
                        <input type="date" name="date" value={fd.date} onChange={handleChange} required />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Validity (Days)</label>
                      <input type="number" name="validityDays" value={fd.validityDays} onChange={handleChange} min="1" />
                    </div>
                  </div>
                </div>

                {/* Vehicle Specs */}
                <div style={{ background:'#f8fafc', border:'1px solid #e8edf4', borderRadius:'10px', padding:'14px 16px', marginBottom:'12px' }}>
                  <p style={{ fontSize:'0.75rem', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.06em', color:'#64748b', marginBottom:'12px', marginTop:0, display:'flex', alignItems:'center', gap:'6px' }}><Truck size={13} /> Vehicle Specifications</p>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Vehicle Type</label>
                      <input type="text" name="vehicleType" value={fd.vehicleType} onChange={handleChange} placeholder="e.g. Platform Truck" />
                    </div>
                    <div className="form-group">
                      <label>Vehicle Number</label>
                      <input type="text" name="vehicleNo" value={fd.vehicleNo} onChange={handleChange} placeholder="e.g. ZB-0532" />
                    </div>
                    <div className="form-group">
                      <label>Maximum Height</label>
                      <input type="text" name="maxHeight" value={fd.maxHeight} onChange={handleChange} placeholder="e.g. 20m / 70ft" />
                    </div>
                    <div className="form-group">
                      <label>Maximum Weight</label>
                      <input type="text" name="maxWeight" value={fd.maxWeight} onChange={handleChange} placeholder="e.g. 750KG" />
                    </div>
                  </div>
                </div>

                {/* Financial */}
                <div style={{ background:'#f8fafc', border:'1px solid #e8edf4', borderRadius:'10px', padding:'14px 16px', marginBottom:'12px' }}>
                  <p style={{ fontSize:'0.75rem', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.06em', color:'#64748b', marginBottom:'12px', marginTop:0 }}>💰 Pricing</p>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Mandatory / Min Charge (LKR)</label>
                      <input type="number" name="mandatoryCharge" value={fd.mandatoryCharge} onChange={handleChange} min="0" />
                    </div>
                    <div className="form-group">
                      <label>Transport Charge (LKR)</label>
                      <input type="number" name="transportCharge" value={fd.transportCharge} onChange={handleChange} min="0" />
                    </div>
                    <div className="form-group">
                      <label>Extra Hourly Rate (LKR)</label>
                      <input type="number" name="extraHourRate" value={fd.extraHourRate} onChange={handleChange} min="0" />
                    </div>
                    <div className="form-group">
                      <label>Status</label>
                      <select name="status" value={fd.status} onChange={handleChange}>
                        <option value="Draft">Draft</option><option value="Sent">Sent</option>
                        <option value="Accepted">Accepted</option><option value="Rejected">Rejected</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Terms */}
                <div style={{ background:'#f8fafc', border:'1px solid #e8edf4', borderRadius:'10px', padding:'14px 16px' }}>
                  <p style={{ fontSize:'0.75rem', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.06em', color:'#64748b', marginBottom:'10px', marginTop:0 }}>📄 Terms & Conditions</p>
                  <div className="form-group">
                    <textarea name="termsAndConditions" value={fd.termsAndConditions} onChange={handleChange} rows={4} />
                  </div>
                </div>

              </div>{/* end hire-form-scroll */}

              {/* Sticky Footer */}
              <div className="hire-form-footer">
                <div className="total-display">
                  <span>Estimated Total</span>
                  <strong>LKR {calcTotal(fd).toLocaleString()}</strong>
                </div>
                <div className="modal-actions">
                  <button type="button" className="cancel-btn" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="submit-btn" disabled={submitting}>
                    {submitting ? 'Saving...' : '💾 Save Quotation'}
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuotationBook;
