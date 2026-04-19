import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  FileText, 
  Plus, 
  Download, 
  Trash2, 
  Search, 
  ExternalLink,
  Loader2,
  Calendar,
  CheckCircle2,
  Clock,
  XCircle
} from 'lucide-react';
import { generateInvoicePDF } from '../utils/billingGenerator';
import '../styles/forms.css';
import '../styles/books.css';

const InvoiceBook = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    clientName: '',
    site: '',
    vehicleNo: '',
    jobDescription: '',
    date: new Date().toISOString().split('T')[0],
    unitType: 'Hours',
    totalUnits: 1,
    ratePerUnit: 0,
    transportCharge: 0,
    otherCharges: 0,
    otherChargesDescription: '',
    status: 'Draft'
  });

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const res = await api.get('/invoices');
      setInvoices(res.data);
    } catch (err) {
      console.error("Error fetching invoices", err);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = (data) => {
    const sub = (Number(data.totalUnits) || 0) * (Number(data.ratePerUnit) || 0);
    return sub + (Number(data.transportCharge) || 0) + (Number(data.otherCharges) || 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const totalAmount = calculateTotal(formData);
      await api.post('/invoices', { ...formData, totalAmount });
      setShowModal(false);
      resetForm();
      fetchInvoices();
    } catch (err) {
      alert("Error saving invoice");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this invoice?")) {
      await api.delete(`/invoices/${id}`);
      fetchInvoices();
    }
  };

  const resetForm = () => {
    setFormData({
      clientName: '',
      site: '',
      vehicleNo: '',
      jobDescription: '',
      date: new Date().toISOString().split('T')[0],
      unitType: 'Hours',
      totalUnits: 1,
      ratePerUnit: 0,
      transportCharge: 0,
      otherCharges: 0,
      otherChargesDescription: '',
      status: 'Draft'
    });
  };

  const filteredInvoices = invoices.filter(inv => 
    inv.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.vehicleNo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status) => {
    switch(status) {
      case 'Paid': return <span className="badge badge-success"><CheckCircle2 size={12} /> Paid</span>;
      case 'Sent': return <span className="badge badge-info"><ExternalLink size={12} /> Sent</span>;
      case 'Cancelled': return <span className="badge badge-danger"><XCircle size={12} /> Cancelled</span>;
      default: return <span className="badge badge-warning"><Clock size={12} /> Draft</span>;
    }
  };

  return (
    <div className="hire-book-container">
      <div className="book-header">
        <div className="header-main">
          <div className="title-section">
            <FileText className="title-icon" size={24} />
            <h1>Professional Invoices</h1>
          </div>
          <button className="add-btn" onClick={() => setShowModal(true)}>
            <Plus size={20} /> New Invoice
          </button>
        </div>
        
        <div className="search-bar">
          <Search size={18} />
          <input 
            type="text" 
            placeholder="Search by Invoice No, Client or Vehicle..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="loading-state">
          <Loader2 className="spinner" />
          <p>Loading Invoice Records...</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="hire-table">
            <thead>
              <tr>
                <th>Invoice No</th>
                <th>Date</th>
                <th>Client</th>
                <th>Vehicle</th>
                <th>Total Amout</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map(inv => (
                <tr key={inv._id}>
                  <td><strong>{inv.invoiceNo}</strong></td>
                  <td>{new Date(inv.date).toLocaleDateString()}</td>
                  <td>{inv.clientName}<br/><small>{inv.site}</small></td>
                  <td>{inv.vehicleNo}</td>
                  <td className="amount-cell">Rs. {inv.totalAmount?.toLocaleString()}</td>
                  <td>{getStatusBadge(inv.status)}</td>
                  <td className="actions-cell">
                    <button className="action-btn pdf" onClick={() => generateInvoicePDF(inv)} title="Download PDF">
                      <Download size={16} />
                    </button>
                    <button className="action-btn delete" onClick={() => handleDelete(inv._id)} title="Delete">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content invoice-modal">
            <div className="modal-header">
              <h2>New Professional Invoice</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="hire-form">
              <div className="form-grid">
                <div className="form-group">
                  <label>Client Name</label>
                  <input type="text" required value={formData.clientName} onChange={e => setFormData({...formData, clientName: e.target.value})} placeholder="Enter Client Name" />
                </div>
                <div className="form-group">
                  <label>Site / Location</label>
                  <input type="text" value={formData.site} onChange={e => setFormData({...formData, site: e.target.value})} placeholder="Project Site" />
                </div>
                <div className="form-group">
                  <label>Vehicle Number</label>
                  <input type="text" required value={formData.vehicleNo} onChange={e => setFormData({...formData, vehicleNo: e.target.value})} placeholder="Ex: ZA-8390" />
                </div>
                <div className="form-group">
                  <label>Date</label>
                  <div className="input-with-icon">
                    <Calendar size={16} />
                    <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                  </div>
                </div>
              </div>

              <div className="form-group full-width">
                <label>Job Description</label>
                <textarea rows="2" value={formData.jobDescription} onChange={e => setFormData({...formData, jobDescription: e.target.value})} placeholder="Enter work details..."></textarea>
              </div>

              <div className="form-section">
                <h3>Financial Breakdown</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Unit Type</label>
                    <select value={formData.unitType} onChange={e => setFormData({...formData, unitType: e.target.value})}>
                      <option value="Hours">Hours</option>
                      <option value="Days">Days</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Total {formData.unitType}</label>
                    <input type="number" required value={formData.totalUnits} onChange={e => setFormData({...formData, totalUnits: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Rate per {formData.unitType}</label>
                    <input type="number" required value={formData.ratePerUnit} onChange={e => setFormData({...formData, ratePerUnit: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Transport Charge</label>
                    <input type="number" value={formData.transportCharge} onChange={e => setFormData({...formData, transportCharge: e.target.value})} />
                  </div>
                </div>
              </div>

              <div className="form-footer">
                <div className="total-display">
                  <span>Grand Total:</span>
                  <strong>Rs. {calculateTotal(formData).toLocaleString()}</strong>
                </div>
                <div className="modal-actions">
                  <button type="button" className="cancel-btn" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="submit-btn" disabled={submitting}>
                    {submitting ? 'Generating...' : 'Save & Close'}
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
