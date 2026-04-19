import React from 'react';
import DataTable from './DataTable';
import Modal from './Modal';
import { vehicleAPI } from '../services/api';
import { generatePDFReport } from '../utils/reportGenerator';
import { Download } from 'lucide-react';
import '../styles/forms.css';

const VehicleForm = ({ onSubmit, onCancel, initialData }) => {
  const [formData, setFormData] = React.useState(initialData || { number: '', model: '', type: '' });
  return (
    <form className="entry-form" onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }}>
      <div className="form-group">
        <label>Vehicle Number (Required)</label>
        <input type="text" placeholder="e.g. WP-1234" required value={formData.number} onChange={e => setFormData({...formData, number: e.target.value.toUpperCase()})} />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Model</label>
          <input type="text" placeholder="e.g. Isuzu Elf" value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} />
        </div>
        <div className="form-group">
          <label>Type</label>
          <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
            <option value="">Select Type</option>
            <option value="Truck">Truck</option>
            <option value="Van">Van</option>
            <option value="Prime Mover">Prime Mover</option>
          </select>
        </div>
      </div>
      <div className="form-actions">
        <button type="button" className="secondary-btn" onClick={onCancel}>Cancel</button>
        <button type="submit" className="primary-btn">{initialData ? 'Update Vehicle' : 'Add Vehicle'}</button>
      </div>
    </form>
  );
};

const Vehicles = () => {
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [vehicles, setVehicles] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [editingVehicle, setEditingVehicle] = React.useState(null);

  const columns = ['VEHICLE NUMBER', 'MODEL', 'TYPE', 'STATUS', 'ACTION'];

  React.useEffect(() => { fetchVehicles(); }, []);

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const res = await vehicleAPI.get();
      const raw = Array.isArray(res.data) ? res.data : [];
      setVehicles(raw.map(v => ({
        number: v.number,
        model: v.model || '-',
        type: v.type || '-',
        status: <span className="status-chip active">{v.status}</span>,
        action: (
          <div className="table-actions">
            <button className="edit-btn" onClick={() => handleEdit(v)}>Edit</button>
            <button className="delete-btn" onClick={() => handleDelete(v._id)}>Delete</button>
          </div>
        )
      })));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const stats = React.useMemo(() => {
    return {
      total: vehicles.length,
      active: vehicles.filter(v => 
        (typeof v.status === 'string' && v.status === 'Active') || 
        (v.status && v.status.props && v.status.props.children === 'Active')
      ).length
    };
  }, [vehicles]);

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
    const exportData = vehicles.map(v => [
      v.number || '—',
      v.model || '—',
      v.type || '—',
      (v.status && v.status.props) ? v.status.props.children : (v.status || '—')
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
        <div className="summary-item">
          <label>ACTIVE</label>
          <h3>{stats.active}</h3>
        </div>
        <div className="summary-item">
          <label>STATUS</label>
          <h3>{stats.total > 0 ? 'Operational' : 'No Data'}</h3>
        </div>
      </div>

      <div className="book-filters">
        <div className="filter-actions" style={{ marginLeft: 'auto', display: 'flex', gap: '1rem' }}>
          <button className="secondary-btn" onClick={handleExportPDF} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Download size={16} /> Export PDF
          </button>
          <button className="add-btn" onClick={() => setIsModalOpen(true)}>+ Add New Vehicle</button>
        </div>
      </div>
      
      <DataTable columns={columns} data={vehicles} loading={loading} emptyMessage="No vehicles registered." />

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
