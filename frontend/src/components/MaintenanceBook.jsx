import React, { useState, useEffect, useMemo } from 'react';
import DataTable from './DataTable';
import Modal from './Modal';
import { maintenanceAPI, vehicleAPI } from '../services/api';
import { Search, RefreshCw, PlusCircle, Wrench, Filter } from 'lucide-react';
import '../styles/forms.css';
import '../styles/books.css';
import RecordDetails from './RecordDetails';
import { useMonthFilter, filterByMonth } from '../context/MonthFilterContext';

const MaintenanceForm = ({ onSubmit, onCancel, initialData, vehicles }) => {
  const [formData, setFormData] = useState(initialData || { 
    date: new Date().toISOString().split('T')[0], 
    vehicleId: '', 
    vehicleNumber: '', 
    type: 'Service', 
    description: '', 
    cost: '', 
    notes: '' 
  });

  useEffect(() => {
    if (initialData) {
      const formatDate = (d) => {
        if (!d) return '';
        try {
          return new Date(d).toISOString().split('T')[0];
        } catch (e) { return ''; }
      };
      setFormData({ 
        ...initialData, 
        date: formatDate(initialData.date) 
      });
    }
  }, [initialData]);

  const handleVehicleChange = (e) => {
    const vId = e.target.value;
    const vehicle = vehicles.find(v => v._id === vId);
    setFormData({ 
      ...formData, 
      vehicleId: vId, 
      vehicleNumber: vehicle ? vehicle.number : '' 
    });
  };
  
  return (
    <form className="hire-form" onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }}>
      <div className="hire-form-scroll">
        <div className="form-section">
          <p className="form-section-title">Maintenance Details</p>
          <div className="form-grid-2">
            <div className="form-group">
              <label>Date *</label>
              <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Vehicle *</label>
              <select required value={formData.vehicleId} onChange={handleVehicleChange}>
                <option value="">Select Vehicle</option>
                {vehicles.map(v => (
                  <option key={v._id} value={v._id}>{v.number} - {v.model}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-grid-2" style={{ marginTop: '16px' }}>
            <div className="form-group">
              <label>Type *</label>
              <select required value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                <option value="Service">Service</option>
                <option value="Repair">Repair</option>
                <option value="Battery">Battery</option>
                <option value="Tyre">Tyre</option>
                <option value="License">License Renewal</option>
                <option value="Insurance">Insurance Renewal</option>
                <option value="Safety">Safety Certificate</option>
                <option value="Finance">Lease/Speed Draft</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label>Cost (LKR)</label>
              <input type="number" placeholder="0.00" value={formData.cost} onChange={e => setFormData({...formData, cost: e.target.value})} />
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '16px' }}>
            <label>Description *</label>
            <input 
              type="text" 
              required 
              placeholder="e.g. Engine oil change, Front tyre replacement" 
              value={formData.description} 
              onChange={e => setFormData({...formData, description: e.target.value})} 
            />
          </div>

          <div className="form-group" style={{ marginTop: '16px' }}>
            <label>Notes</label>
            <textarea placeholder="Additional info..." value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} rows={3} />
          </div>
        </div>
      </div>

      <div className="hire-form-footer">
        <div className="total-display">
          <span>Maintenance Cost</span>
          <strong style={{ color: '#3B82F6' }}>LKR {parseFloat(formData.cost || 0).toLocaleString()}</strong>
        </div>
        <div className="modal-actions">
          <button type="button" className="cancel-btn" onClick={onCancel}>Cancel</button>
          <button type="submit" className="submit-btn" style={{ background: '#3B82F6' }}>
            {initialData ? 'Update Record' : 'Add Record'}
          </button>
        </div>
      </div>
    </form>
  );
};

const MaintenanceBook = () => {
  const userRole = localStorage.getItem('kt_user_role');
  const canManage = ['Admin', 'Manager'].includes(userRole);

  const { selectedMonth, selectedYear, isFilterActive } = useMonthFilter();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [defaultDate, setDefaultDate] = useState(new Date().toISOString().split('T')[0]);

  const [records, setRecords] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingRecord, setEditingRecord] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('All');
  const [successMsg, setSuccessMsg] = useState('');

  const columns = canManage 
    ? ['DATE', 'VEHICLE', 'TYPE', 'DESCRIPTION', 'COST (LKR)', 'ACTION']
    : ['DATE', 'VEHICLE', 'TYPE', 'DESCRIPTION', 'COST (LKR)'];

  useEffect(() => { 
    fetchRecords();
    fetchVehicles();
  }, [selectedMonth, selectedYear, isFilterActive]);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res = await maintenanceAPI.get();
      let raw = Array.isArray(res.data) ? res.data : [];
      
      // Global Month Filter
      raw = filterByMonth(raw, 'date', selectedMonth, selectedYear, isFilterActive);

      setRecords(raw);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchVehicles = async () => {
    try {
      const res = await vehicleAPI.get();
      setVehicles(Array.isArray(res.data) ? res.data : []);
    } catch (err) { console.error(err); }
  };

  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      const matchesSearch = !searchQuery || 
        (r.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.vehicleNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.type || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesVehicle = vehicleFilter === 'All' || r.vehicleNumber === vehicleFilter;
      
      return matchesSearch && matchesVehicle;
    });
  }, [records, searchQuery, vehicleFilter]);

  const totalCost = useMemo(() => {
    return filteredRecords.reduce((sum, r) => sum + (parseFloat(r.cost) || 0), 0);
  }, [filteredRecords]);

  const handleAdd = async (data) => {
    try {
      if (editingRecord) {
        await maintenanceAPI.update(editingRecord._id, data);
        setSuccessMsg('Maintenance record updated successfully!');
      } else {
        await maintenanceAPI.create(data);
        setSuccessMsg('Maintenance record added successfully!');
        if (data.date) setDefaultDate(data.date);
      }
      fetchRecords();
      setIsModalOpen(false);
      setEditingRecord(null);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) { console.error(err); }
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this maintenance record?')) {
      try {
        await maintenanceAPI.delete(id);
        setSuccessMsg('Record deleted');
        fetchRecords();
        setTimeout(() => setSuccessMsg(''), 3000);
      } catch (err) { console.error(err); }
    }
  };

  return (
    <div className="book-container">
      <div className="book-summary">
        <div className="summary-item">
          <label>RECORDS</label>
          <h3>{filteredRecords.length}</h3>
        </div>
        <div className="summary-item" style={{ borderRight: 'none' }}>
          <label>TOTAL MAINTENANCE COST</label>
          <h3 style={{ color: '#3B82F6' }}>LKR {totalCost.toLocaleString()}</h3>
        </div>
      </div>

      <div className="book-filters">
        <div className="search-box">
          <Search className="search-icon" size={20} />
          <input 
            type="text" 
            placeholder="Search description, type, vehicle..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="filter-group" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div className="select-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#F9FAFB', padding: '0 12px', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
            <Filter size={16} color="#6B7280" />
            <select 
              value={vehicleFilter} 
              onChange={e => setVehicleFilter(e.target.value)}
              style={{ border: 'none', background: 'transparent', padding: '8px 0', outline: 'none', fontSize: '14px', color: '#374151', fontWeight: '500' }}
            >
              <option value="All">All Vehicles</option>
              {vehicles.map(v => (
                <option key={v._id} value={v.number}>{v.number}</option>
              ))}
            </select>
          </div>

          <button className="secondary-btn" onClick={fetchRecords} title="Refresh">
            <RefreshCw size={18} className={loading ? 'spinner' : ''} />
          </button>
          
          {canManage && (
            <button className="add-btn" style={{ background: '#3B82F6' }} onClick={() => { setEditingRecord(null); setIsModalOpen(true); }}>
              <PlusCircle size={18} /> <span>Add Maintenance</span>
            </button>
          )}
        </div>
      </div>
      
      {successMsg && <div className="success-banner" style={{ margin: '0 20px 20px' }}>{successMsg}</div>}
      
      <DataTable 
        columns={columns} 
        data={filteredRecords.map(r => ({
          ...r,
          date: r.date ? new Date(r.date).toLocaleDateString() : '—',
          vehicleNo: <span style={{ fontWeight: '600' }}>{r.vehicleNumber}</span>,
          type: (
            <span className={`status-badge ${r.type.toLowerCase()}`} style={{ 
              padding: '4px 10px', 
              borderRadius: '20px', 
              fontSize: '12px', 
              fontWeight: '500',
              backgroundColor: r.type === 'Repair' ? '#FEE2E2' : (r.type === 'Service' ? '#DBEAFE' : (r.type === 'Finance' ? '#FEF3C7' : (['License', 'Insurance', 'Safety'].includes(r.type) ? '#E0E7FF' : '#F3F4F6'))),
              color: r.type === 'Repair' ? '#EF4444' : (r.type === 'Service' ? '#3B82F6' : (r.type === 'Finance' ? '#D97706' : (['License', 'Insurance', 'Safety'].includes(r.type) ? '#4338CA' : '#374151')))
            }}>
              {r.type}
            </span>
          ),
          description: r.description,
          'COST (LKR)': <span style={{ fontWeight: '600', color: '#3B82F6' }}>{parseFloat(r.cost || 0).toLocaleString()}</span>,
          action: canManage ? (
            <div className="table-actions">
              <button className="edit-btn" onClick={() => handleEdit(r)}>Edit</button>
              <button className="delete-btn" onClick={() => handleDelete(r._id)}>Delete</button>
            </div>
          ) : null
        }))} 
        loading={loading} 
        onRowClick={(row) => {
          setSelectedRecord(row);
          setViewModalOpen(true);
        }}
        emptyMessage="No maintenance records found." 
      />

      <Modal 
        isOpen={viewModalOpen} 
        onClose={() => setViewModalOpen(false)} 
        title="Maintenance Record Details"
        wide
      >
        <RecordDetails data={selectedRecord} type="maintenance" />
        <div className="modal-footer" style={{ padding: '15px 24px', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', background: '#F8FAFC' }}>
            <button className="secondary-btn" onClick={() => setViewModalOpen(false)}>Close</button>
        </div>
      </Modal>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setEditingRecord(null); }} 
        title={editingRecord ? 'Edit Maintenance Record' : 'Add Maintenance Record'}
      >
        <MaintenanceForm 
          onSubmit={handleAdd} 
          onCancel={() => { setIsModalOpen(false); setEditingRecord(null); }} 
          initialData={editingRecord || { date: defaultDate, type: 'Service' }}
          vehicles={vehicles}
        />
      </Modal>
    </div>
  );
};

export default MaintenanceBook;
