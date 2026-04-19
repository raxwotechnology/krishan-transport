import React from 'react';
import DataTable from './DataTable';
import Modal from './Modal';
import { vehicleAPI } from '../services/api';
import { generatePDFReport } from '../utils/reportGenerator';
import { Download, Search } from 'lucide-react';
import '../styles/forms.css';
import '../styles/books.css';

const VehicleForm = ({ onSubmit, onCancel, initialData }) => {
  const [formData, setFormData] = React.useState(initialData || { number: '', model: '', type: '', status: 'Active' });
  return (
    <form className="entry-form" onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }}>
      <div className="form-group">
        <label>Vehicle Number (Required)</label>
        <input 
          type="text" 
          placeholder="e.g. WP-1234" 
          required 
          value={formData.number} 
          onChange={e => setFormData({...formData, number: e.target.value.toUpperCase()})} 
        />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Model</label>
          <input 
            type="text" 
            placeholder="e.g. Isuzu Elf" 
            value={formData.model} 
            onChange={e => setFormData({...formData, model: e.target.value})} 
          />
        </div>
        <div className="form-group">
          <label>Type</label>
          <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
            <option value="">Select Type</option>
            <option value="Truck">Truck</option>
            <option value="Van">Van</option>
            <option value="Prime Mover">Prime Mover</option>
            <option value="Crane">Crane</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>
       <div className="form-group">
          <label>Status</label>
          <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
            <option value="Active">Active</option>
            <option value="Maintenance">Maintenance</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      <div className="form-actions">
        <button type="button" className="secondary-btn" onClick={onCancel}>Cancel</button>
        <button type="submit" className="primary-btn">{initialData ? 'Update Vehicle' : 'Add Vehicle'}</button>
      </div>
    </form>
  );
};

const Vehicles = () => {
  const userRole = localStorage.getItem('kt_user_role');
  const canManage = ['Admin', 'Manager'].includes(userRole);

  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [vehicleRecords, setVehicleRecords] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [editingVehicle, setEditingVehicle] = React.useState(null);
  const [searchQuery, setSearchQuery] = React.useState('');

  const columns = canManage 
    ? ['VEHICLE NUMBER', 'MODEL', 'TYPE', 'STATUS', 'ACTION']
    : ['VEHICLE NUMBER', 'MODEL', 'TYPE', 'STATUS'];

  React.useEffect(() => { fetchVehicles(); }, []);

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const res = await vehicleAPI.get();
      const raw = Array.isArray(res.data) ? res.data : [];
      const formatted = raw.map(v => ({
        ...v,
        number: v.number || '—',
        model: v.model || '—',
        type: v.type || '—',
        status_text: v.status || 'Active',
        status: (
          <span className={`status-badge ${v.status === 'Active' ? 'status-active' : 'status-inactive'}`}>
            {v.status || 'Active'}
          </span>
        ),
        action: canManage ? (
          <div className="table-actions">
            <button className="edit-btn" onClick={() => handleEdit(v)}>Edit</button>
            <button className="delete-btn" onClick={() => handleDelete(v._id)}>Delete</button>
          </div>
        ) : null
      }));
      setVehicleRecords(formatted);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const filteredRecords = React.useMemo(() => {
    return vehicleRecords.filter(r => {
      return !searchQuery || 
        (r.number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.model  || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.type   || '').toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [vehicleRecords, searchQuery]);

  const stats = React.useMemo(() => {
    return {
      total: filteredRecords.length,
      active: filteredRecords.filter(v => v.status_text === 'Active').length
    };
  }, [filteredRecords]);

  const handleAdd = async (data) => {
    try {
      if (editingVehicle) {
        await vehicleAPI.update(editingVehicle._id, data);
      } else {
        await vehicleAPI.create(data);
      }
      fetchVehicles();
      setIsModalOpen(false);
      setEditingVehicle(null);
    } catch (err) { alert('Error saving vehicle'); }
  };

  const handleEdit = (vehicle) => {
    setEditingVehicle(vehicle);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure?')) {
      try {
        await vehicleAPI.delete(id);
        fetchVehicles();
      } catch (err) { alert('Error deleting vehicle'); }
    }
  };

  const handleExportPDF = () => {
    const exportColumns = ['VEHICLE NUMBER', 'MODEL', 'TYPE', 'STATUS'];
    const exportData = filteredRecords.map(v => [
      v.number || '—',
      v.model || '—',
      v.type || '—',
      v.status_text || '—'
    ]);
    
    generatePDFReport({
      title: 'Vehicles Report',
      columns: exportColumns,
      data: exportData,
      filename: `Vehicles_Report_${new Date().toISOString().split('T')[0]}.pdf`
    });
  };

  return (
    <div className="book-container">
      <div className="book-summary">
        <div className="summary-item">
          <label>TOTAL FLEET</label>
          <h3>{stats.total} Vehicles</h3>
        </div>
        <div className="summary-item" style={{ borderRight: 'none' }}>
          <label>ACTIVE</label>
          <h3 style={{ color: '#10B981' }}>{stats.active} Operating</h3>
        </div>
      </div>

      <div className="book-filters">
        <div className="search-box">
          <Search className="search-icon" size={16} />
          <input 
            type="text" 
            placeholder="Search by number, model, type..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="filter-actions" style={{ marginLeft: 'auto', display: 'flex', gap: '1rem' }}>
          <button className="secondary-btn" onClick={handleExportPDF} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Download size={16} /> Export PDF
          </button>
          {canManage && (
            <button className="add-btn" onClick={() => { setEditingVehicle(null); setIsModalOpen(true); }}>
              + Register Vehicle
            </button>
          )}
        </div>
      </div>
      
      <DataTable 
        columns={columns} 
        data={filteredRecords} 
        loading={loading} 
        emptyMessage="No vehicles registered." 
      />

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setEditingVehicle(null); }} 
        title={editingVehicle ? 'Edit Vehicle' : 'Register New Vehicle'}
      >
        <VehicleForm 
          onSubmit={handleAdd} 
          onCancel={() => { setIsModalOpen(false); setEditingVehicle(null); }} 
          initialData={editingVehicle}
        />
      </Modal>
    </div>
  );
};

export default Vehicles;
