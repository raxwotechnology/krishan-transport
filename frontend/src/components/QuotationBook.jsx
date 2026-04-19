import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  FileCheck, 
  Plus, 
  Download, 
  Trash2, 
  Search, 
  Loader2,
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
  Truck
} from 'lucide-react';
import { generateQuotationPDF } from '../utils/billingGenerator';
import '../styles/forms.css';
import '../styles/books.css';

const QuotationBook = () => {
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    clientName: '',
    clientAddress: '',
    date: new Date().toISOString().split('T')[0],
    vehicleType: '',
    vehicleNo: '',
    maxHeight: '',
    maxWeight: '',
    mandatoryCharge: 0,
    transportCharge: 0,
    extraHourRate: 0,
    validityDays: 30,
    termsAndConditions: '1. Prices are exclusive of any taxes unless mentioned.\n2. Payment must be made as per agreed terms.\n3. We are not responsible for any delays due to site access issues.',
    status: 'Draft'
  });

  useEffect(() => {
    fetchQuotations();
  }, []);

  const fetchQuotations = async () => {
    try {
      const res = await api.get('/quotations');
      setQuotations(res.data);
    } catch (err) {
      console.error("Error fetching quotations", err);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = (data) => {
    return (Number(data.mandatoryCharge) || 0) + (Number(data.transportCharge) || 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const estimatedTotal = calculateTotal(formData);
      await api.post('/quotations', { ...formData, estimatedTotal });
      setShowModal(false);
      resetForm();
      fetchQuotations();
    } catch (err) {
      alert("Error saving quotation");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this quotation?")) {
      await api.delete(`/quotations/${id}`);
      fetchQuotations();
    }
  };

  const resetForm = () => {
    setFormData({
      clientName: '',
      clientAddress: '',
      date: new Date().toISOString().split('T')[0],
      vehicleType: '',
      vehicleNo: '',
      maxHeight: '',
      maxWeight: '',
      mandatoryCharge: 0,
      transportCharge: 0,
      extraHourRate: 0,
      validityDays: 30,
      termsAndConditions: '1. Prices are exclusive of any taxes unless mentioned.\n2. Payment must be made as per agreed terms.\n3. We are not responsible for any delays due to site access issues.',
      status: 'Draft'
    });
  };

  const filteredQuotes = quotations.filter(quo => 
    quo.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    quo.quotationNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (quo.vehicleNo && quo.vehicleNo.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getStatusBadge = (status) => {
    switch(status) {
      case 'Accepted': return <span className="badge badge-success"><CheckCircle2 size={12} /> Accepted</span>;
      case 'Sent': return <span className="badge badge-info"><Clock size={12} /> Sent</span>;
      case 'Rejected': return <span className="badge badge-danger"><XCircle size={12} /> Rejected</span>;
      default: return <span className="badge badge-warning"><Clock size={12} /> Draft</span>;
    }
  };

  return (
    <div className="hire-book-container">
      <div className="book-header">
        <div className="header-main">
          <div className="title-section">
            <FileCheck className="title-icon" size={24} />
            <h1>Service Quotations</h1>
          </div>
          <button className="add-btn" onClick={() => setShowModal(true)}>
            <Plus size={20} /> New Quotation
          </button>
        </div>
        
        <div className="search-bar">
          <Search size={18} />
          <input 
            type="text" 
            placeholder="Search by Quote No, Client or Vehicle..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="loading-state">
          <Loader2 className="spinner" />
          <p>Loading Quotation Records...</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="hire-table">
            <thead>
              <tr>
                <th>Quote No</th>
                <th>Date</th>
                <th>Client</th>
                <th>Vehicle Type</th>
                <th>Estimated Total</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredQuotes.map(quo => (
                <tr key={quo._id}>
                  <td><strong>{quo.quotationNo}</strong></td>
                  <td>{new Date(quo.date).toLocaleDateString()}</td>
                  <td>{quo.clientName}</td>
                  <td>{quo.vehicleType || 'N/A'}</td>
                  <td className="amount-cell">Rs. {quo.estimatedTotal?.toLocaleString()}</td>
                  <td>{getStatusBadge(quo.status)}</td>
                  <td className="actions-cell">
                    <button className="action-btn pdf" onClick={() => generateQuotationPDF(quo)} title="Download PDF">
                      <Download size={16} />
                    </button>
                    <button className="action-btn delete" onClick={() => handleDelete(quo._id)} title="Delete">
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
              <h2>New Service Quotation</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="hire-form">
              <div className="form-grid">
                <div className="form-group">
                  <label>Client Name</label>
                  <input type="text" required value={formData.clientName} onChange={e => setFormData({...formData, clientName: e.target.value})} placeholder="Enter Client Name" />
                </div>
                <div className="form-group">
                  <label>Client Address</label>
                  <input type="text" value={formData.clientAddress} onChange={e => setFormData({...formData, clientAddress: e.target.value})} placeholder="Full Address" />
                </div>
                <div className="form-group">
                  <label>Quotation Date</label>
                  <div className="input-with-icon">
                    <Calendar size={16} />
                    <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Validity (Days)</label>
                  <input type="number" required value={formData.validityDays} onChange={e => setFormData({...formData, validityDays: e.target.value})} />
                </div>
              </div>

              <div className="form-section">
                <h3><Truck size={16} style={{marginRight: '8px'}}/> Vehicle Specifications</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Vehicle Type</label>
                    <input type="text" value={formData.vehicleType} onChange={e => setFormData({...formData, vehicleType: e.target.value})} placeholder="Ex: Platform Truck / Crane" />
                  </div>
                  <div className="form-group">
                    <label>Max Height</label>
                    <input type="text" value={formData.maxHeight} onChange={e => setFormData({...formData, maxHeight: e.target.value})} placeholder="Ex: 20m / 70ft" />
                  </div>
                  <div className="form-group">
                    <label>Max Weight</label>
                    <input type="text" value={formData.maxWeight} onChange={e => setFormData({...formData, maxWeight: e.target.value})} placeholder="Ex: 750KG" />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>Financial Breakdown</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Mandatory / Min Charge</label>
                    <input type="number" required value={formData.mandatoryCharge} onChange={e => setFormData({...formData, mandatoryCharge: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Transport Charge</label>
                    <input type="number" value={formData.transportCharge} onChange={e => setFormData({...formData, transportCharge: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Extra Hourly Rate</label>
                    <input type="number" value={formData.extraHourRate} onChange={e => setFormData({...formData, extraHourRate: e.target.value})} />
                  </div>
                </div>
              </div>

              <div className="form-group full-width">
                <label>Terms & Conditions</label>
                <textarea rows="3" value={formData.termsAndConditions} onChange={e => setFormData({...formData, termsAndConditions: e.target.value})}></textarea>
              </div>

              <div className="form-footer">
                <div className="total-display">
                  <span>Est. Subtotal:</span>
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

export default QuotationBook;
