import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { FileText, Plus, Download, Trash2, Search, ExternalLink, Loader2, Calendar, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { generateInvoicePDF } from '../utils/billingGenerator';
import '../styles/forms.css';
import '../styles/books.css';

const defaultForm = () => ({
  clientName: '', site: '', vehicleNo: '', jobDescription: '',
  date: new Date().toISOString().split('T')[0],
  unitType: 'Hours', totalUnits: 0, ratePerUnit: 0,
  transportCharge: 0, otherCharges: 0, otherChargesDescription: '',
  totalAmount: 0, status: 'Draft'
});

const InvoiceBook = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState(defaultForm());

  useEffect(() => { fetchInvoices(); }, []);

  const fetchInvoices = async () => {
    try {
      const res = await api.get('/invoices');
      setInvoices(Array.isArray(res.data) ? res.data : []);
    } catch (err) { console.error('Error fetching invoices', err); }
    finally { setLoading(false); }
  };

  const calcTotal = (d) => {
    const sub = (Number(d.totalUnits) || 0) * (Number(d.ratePerUnit) || 0);
    return +(sub + (Number(d.transportCharge) || 0) + (Number(d.otherCharges) || 0)).toFixed(2);
  };

  const handleChange = (e) => {
    const updated = { ...formData, [e.target.name]: e.target.value };
    updated.totalAmount = calcTotal(updated);
    setFormData(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/invoices', { ...formData, totalAmount: calcTotal(formData) });
      setShowModal(false);
      setFormData(defaultForm());
      fetchInvoices();
    } catch { alert('Error saving invoice'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this invoice?')) {
      await api.delete(`/invoices/${id}`);
      fetchInvoices();
    }
  };

  const filtered = invoices.filter(inv =>
    (inv.clientName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (inv.invoiceNo  || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (inv.vehicleNo  || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const badge = (status) => {
    switch(status) {
      case 'Paid':      return <span className="badge badge-success"><CheckCircle2 size={12} /> Paid</span>;
      case 'Sent':      return <span className="badge badge-info"><ExternalLink size={12} /> Sent</span>;
      case 'Cancelled': return <span className="badge badge-danger"><XCircle size={12} /> Cancelled</span>;
      default:          return <span className="badge badge-warning"><Clock size={12} /> Draft</span>;
    }
  };

  const totalRevenue = invoices.reduce((s, i) => s + (i.totalAmount || 0), 0);

  const fd = formData;

  return (
    <div className="hire-book-container">

      {/* Summary */}
      <div className="book-container">
        <div className="book-summary">
          <div className="summary-item"><label>TOTAL INVOICES</label><h3>{invoices.length}</h3></div>
          <div className="summary-item" style={{ borderRight: 'none' }}>
            <label>TOTAL BILLED</label>
            <h3 style={{ color: 'var(--primary)' }}>LKR {totalRevenue.toLocaleString()}</h3>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="book-header">
        <div className="header-main">
          <div className="title-section"><FileText className="title-icon" size={24} /><h1>Professional Invoices</h1></div>
          <button className="add-btn" onClick={() => setShowModal(true)}><Plus size={18} /> New Invoice</button>
        </div>
        <div className="search-bar">
          <Search size={16} />
          <input type="text" placeholder="Search by No, Client, Vehicle..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="loading-state"><Loader2 className="spinner" /><p>Loading...</p></div>
      ) : (
        <div className="table-responsive">
          <table className="hire-table">
            <thead><tr>
              <th>Invoice No</th><th>Date</th><th>Client</th><th>Site</th>
              <th>Vehicle</th><th>Description</th><th>Units</th><th>Rate</th>
              <th>Transport</th><th>Total</th><th>Status</th><th>Actions</th>
            </tr></thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={12} style={{ textAlign:'center', padding:'40px', color:'#94a3b8' }}>No invoices yet. Click "+ New Invoice" to create one.</td></tr>
              ) : filtered.map(inv => (
                <tr key={inv._id}>
                  <td><strong>{inv.invoiceNo}</strong></td>
                  <td>{new Date(inv.date).toLocaleDateString()}</td>
                  <td>{inv.clientName}</td>
                  <td>{inv.site || '—'}</td>
                  <td>{inv.vehicleNo}</td>
                  <td style={{ maxWidth: '160px', whiteSpace: 'normal' }}>{inv.jobDescription || '—'}</td>
                  <td>{inv.totalUnits} {inv.unitType}</td>
                  <td>LKR {(inv.ratePerUnit || 0).toLocaleString()}</td>
                  <td>LKR {(inv.transportCharge || 0).toLocaleString()}</td>
                  <td className="amount-cell">LKR {(inv.totalAmount || 0).toLocaleString()}</td>
                  <td>{badge(inv.status)}</td>
                  <td className="actions-cell">
                    <button className="action-btn pdf" onClick={() => generateInvoicePDF(inv)} title="Download PDF"><Download size={15} /></button>
                    <button className="action-btn delete" onClick={() => handleDelete(inv._id)} title="Delete"><Trash2 size={15} /></button>
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
              <h2>New Professional Invoice</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}><span aria-hidden>✕</span></button>
            </div>

            <form onSubmit={handleSubmit} className="hire-form">
              {/* Scrollable Body */}
              <div className="hire-form-scroll">

                {/* Client & Date */}
                <div style={{ background:'#f8fafc', border:'1px solid #e8edf4', borderRadius:'10px', padding:'14px 16px', marginBottom:'12px' }}>
                  <p style={{ fontSize:'0.75rem', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.06em', color:'#64748b', marginBottom:'12px', marginTop:0 }}>📋 Client & Job Details</p>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Client / Company *</label>
                      <input type="text" name="clientName" value={fd.clientName} onChange={handleChange} required placeholder="Client name" />
                    </div>
                    <div className="form-group">
                      <label>Site / Location</label>
                      <input type="text" name="site" value={fd.site} onChange={handleChange} placeholder="Project site" />
                    </div>
                    <div className="form-group">
                      <label>Vehicle Number *</label>
                      <input type="text" name="vehicleNo" value={fd.vehicleNo} onChange={handleChange} required placeholder="e.g. ZA-8390" />
                    </div>
                    <div className="form-group">
                      <label>Date *</label>
                      <div className="input-with-icon">
                        <Calendar size={15} />
                        <input type="date" name="date" value={fd.date} onChange={handleChange} required />
                      </div>
                    </div>
                    <div className="form-group full-width">
                      <label>Job Description</label>
                      <textarea name="jobDescription" value={fd.jobDescription} onChange={handleChange} rows={2} placeholder="Describe the work done..." />
                    </div>
                  </div>
                </div>

                {/* Financial */}
                <div style={{ background:'#f8fafc', border:'1px solid #e8edf4', borderRadius:'10px', padding:'14px 16px' }}>
                  <p style={{ fontSize:'0.75rem', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.06em', color:'#64748b', marginBottom:'12px', marginTop:0 }}>💰 Financial Breakdown</p>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Unit Type</label>
                      <select name="unitType" value={fd.unitType} onChange={handleChange}>
                        <option value="Hours">Hours</option><option value="Days">Days</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Total {fd.unitType}</label>
                      <input type="number" name="totalUnits" value={fd.totalUnits} onChange={handleChange} min="0" step="0.01" />
                    </div>
                    <div className="form-group">
                      <label>Rate per {fd.unitType} (LKR)</label>
                      <input type="number" name="ratePerUnit" value={fd.ratePerUnit} onChange={handleChange} min="0" />
                    </div>
                    <div className="form-group">
                      <label>Transport Charge (LKR)</label>
                      <input type="number" name="transportCharge" value={fd.transportCharge} onChange={handleChange} min="0" />
                    </div>
                    <div className="form-group">
                      <label>Other Charge Desc</label>
                      <input type="text" name="otherChargesDescription" value={fd.otherChargesDescription} onChange={handleChange} placeholder="e.g. Overtime" />
                    </div>
                    <div className="form-group">
                      <label>Other Charges (LKR)</label>
                      <input type="number" name="otherCharges" value={fd.otherCharges} onChange={handleChange} min="0" />
                    </div>
                    <div className="form-group">
                      <label>Status</label>
                      <select name="status" value={fd.status} onChange={handleChange}>
                        <option value="Draft">Draft</option><option value="Sent">Sent</option>
                        <option value="Paid">Paid</option><option value="Cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>
                </div>

              </div>{/* end hire-form-scroll */}

              {/* Sticky Footer */}
              <div className="hire-form-footer">
                <div className="total-display">
                  <span>Grand Total</span>
                  <strong>LKR {calcTotal(fd).toLocaleString()}</strong>
                </div>
                <div className="modal-actions">
                  <button type="button" className="cancel-btn" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="submit-btn" disabled={submitting}>
                    {submitting ? 'Saving...' : '💾 Save Invoice'}
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

export default InvoiceBook;
