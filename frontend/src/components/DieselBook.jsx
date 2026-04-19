import React from 'react';
import DataTable from './DataTable';
import Modal from './Modal';
import DieselForm from './DieselForm';
import { dieselAPI, vehicleAPI } from '../services/api';
import { generatePDFReport } from '../utils/reportGenerator';
import { Download, Search } from 'lucide-react';
import '../styles/forms.css';
import '../styles/books.css';
import VehicleFilter from './VehicleFilter';

const DieselBook = () => {
  const userRole = localStorage.getItem('kt_user_role');
  const canManage = ['Admin', 'Manager'].includes(userRole);

  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [dieselRecords, setDieselRecords] = React.useState([]);
  const [vehicles, setVehicles] = React.useState([]);
  const [selectedVehicle, setSelectedVehicle] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [editingItem, setEditingItem] = React.useState(null);
  const [success, setSuccess] = React.useState(null);
  const [searchQuery, setSearchQuery] = React.useState('');

  const columns = canManage
    ? ['DATE', 'EMPLOYEE', 'VEHICLE', 'LITERS', 'PRICE/L', 'TOTAL', 'ODOMETER', 'NOTE', 'ACTION']
    : ['DATE', 'EMPLOYEE', 'VEHICLE', 'LITERS', 'PRICE/L', 'TOTAL', 'ODOMETER', 'NOTE'];

  React.useEffect(() => {
    fetchRecords();
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      const res = await vehicleAPI.get();
      setVehicles(Array.isArray(res.data) ? res.data : []);
    } catch (err) { console.error(err); }
  };

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const response = await dieselAPI.get();
      const rawData = Array.isArray(response.data) ? response.data : [];
      
      const formatted = rawData.map(item => ({
        ...item,
        date: new Date(item.date).toLocaleDateString(),
        employee: item.employee || '—',
        pricePerLiter_disp: `LKR ${(item.pricePerLiter || 0).toLocaleString()}`,
        total_val: item.total,
        total: `LKR ${Number(item.total).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`,
        action: canManage ? (
          <div className="table-actions">
            <button className="edit-btn" onClick={() => handleEdit(item)}>Edit</button>
            <button className="delete-btn" onClick={() => handleDelete(item._id)}>Delete</button>
          </div>
        ) : null
      }));
      setDieselRecords(formatted);
      setError(null);
    } catch (err) {
      setError('Connection issue: could not load diesel records.');
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = React.useMemo(() => {
    return dieselRecords.filter(r => {
      const matchVehicle = !selectedVehicle || r.vehicle === selectedVehicle;
      const matchSearch = !searchQuery || 
        (r.employee || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.vehicle  || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.date     || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchVehicle && matchSearch;
    });
  }, [dieselRecords, selectedVehicle, searchQuery]);

  // Summary Calculations
  const stats = React.useMemo(() => {
    const totalLiters = filteredRecords.reduce((sum, r) => sum + (parseFloat(r.liters) || 0), 0);
    const totalCost = filteredRecords.reduce((sum, r) => sum + (parseFloat(r.total_val) || 0), 0);
    const avgPrice = totalLiters > 0 ? totalCost / totalLiters : 0;
    return { totalLiters, totalCost, avgPrice };
  }, [filteredRecords]);

  const handleAddEntry = async (data) => {
    try {
      if (editingItem) {
        await dieselAPI.update(editingItem._id, data);
        setSuccess('Diesel entry updated!');
      } else {
        await dieselAPI.create(data);
        setSuccess('Diesel entry added!');
      }
      fetchRecords();
      setIsModalOpen(false);
      setEditingItem(null);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Error saving diesel entry.');
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this diesel record?')) {
      try {
        await dieselAPI.delete(id);
        setSuccess('Entry deleted.');
        fetchRecords();
        setTimeout(() => setSuccess(null), 3000);
      } catch (err) {
        setError('Could not delete record.');
        setTimeout(() => setError(null), 5000);
      }
    }
  };

  const handleExportPDF = () => {
    const exportColumns = ['DATE', 'EMPLOYEE', 'VEHICLE', 'LITERS', 'PRICE/L', 'TOTAL', 'ODOMETER', 'NOTE'];
    const exportData = filteredRecords.map(r => [
      r.date || '—',
      r.employee || '—',
      r.vehicle || '—',
      r.liters || '—',
      r.pricePerLiter_disp || '—',
      r.total || '—',
      r.odometer || '—',
      r.note || '—'
    ]);
    
    generatePDFReport({
      title: 'Diesel Book Report',
      columns: exportColumns,
      data: exportData,
      filename: `DieselBook_Report_${new Date().toISOString().split('T')[0]}.pdf`
    });
  };

  return (
    <div className="book-container">
      <div className="book-summary">
        <div className="summary-item">
          <label>TOTAL LITERS</label>
          <h3>{stats.totalLiters.toFixed(1)} L</h3>
        </div>
        <div className="summary-item">
          <label>TOTAL COST</label>
          <h3 style={{ color: '#EF4444' }}>LKR {stats.totalCost.toLocaleString()}</h3>
        </div>
        <div className="summary-item" style={{ borderRight: 'none' }}>
          <label>AVG PRICE / L</label>
          <h3 style={{ color: '#2563EB' }}>LKR {stats.avgPrice.toFixed(2)}</h3>
        </div>
      </div>

      <VehicleFilter 
        vehicles={vehicles} 
        selectedVehicle={selectedVehicle} 
        onSelect={setSelectedVehicle} 
      />

      <div className="book-filters">
        <div className="search-box">
          <Search className="search-icon" size={16} />
          <input 
            type="text" 
            placeholder="Search date, employee, vehicle..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="filter-actions">
          <button className="secondary-btn" onClick={handleExportPDF} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Download size={16} /> Export PDF
          </button>
          {canManage && (
            <button className="add-btn" onClick={() => { setEditingItem(null); setIsModalOpen(true); }}>
              + Add Entry
            </button>
          )}
        </div>
      </div>

      {success && <div className="success-banner">{success}</div>}
      {error && <div className="error-banner">{error}</div>}

      <DataTable 
        columns={columns} 
        data={filteredRecords} 
        loading={loading}
        emptyMessage={loading ? "Loading..." : "No diesel records found."} 
      />

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setEditingItem(null); }} 
        title={editingItem ? 'Edit Diesel Entry' : 'Add Diesel Entry'}
      >
        <DieselForm 
          onSubmit={handleAddEntry} 
          onCancel={() => { setIsModalOpen(false); setEditingItem(null); }} 
          initialData={editingItem}
        />
      </Modal>
    </div>
  );
};

export default DieselBook;
