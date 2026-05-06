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
import RecordDetails from './RecordDetails';
import { useMonthFilter, filterByMonth } from '../context/MonthFilterContext';

const FUEL_TYPES = ['All', 'Diesel', 'Petrol'];

const DieselBook = () => {
  const userRole = localStorage.getItem('kt_user_role');
  const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const canManage = isDev || ['Admin', 'Manager'].includes(userRole);
  const { selectedMonth, selectedYear, isFilterActive } = useMonthFilter();

  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [viewModalOpen, setViewModalOpen] = React.useState(false);
  const [selectedRecord, setSelectedRecord] = React.useState(null);
  const [dieselRecords, setDieselRecords] = React.useState([]);
  const [vehicles, setVehicles] = React.useState([]);
  const [selectedVehicle, setSelectedVehicle] = React.useState(null);
  const [selectedFuelType, setSelectedFuelType] = React.useState('All');
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [editingItem, setEditingItem] = React.useState(null);
  const [success, setSuccess] = React.useState(null);
  const [searchQuery, setSearchQuery] = React.useState('');

  const columns = ['DATE', 'VEHICLE', 'FUEL TYPE', 'DRIVER', 'LITERS', 'TOTAL COST', 'STATUS', 'ACTION'];

  React.useEffect(() => {
    fetchRecords();
    fetchVehicles();
  }, [selectedMonth, selectedYear, isFilterActive]);

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
      let rawData = Array.isArray(response.data) ? response.data : [];

      // Global Month Filter
      rawData = filterByMonth(rawData, 'date', selectedMonth, selectedYear, isFilterActive);

      const formatted = rawData.map(item => ({
        ...item,
        rawData: item,
        date: new Date(item.date).toLocaleDateString(),
        vehicle: item.vehicle,
        fuelType_disp: (
          <span
            className={`status-badge ${item.fuelType === 'Petrol' ? 'status-pending' : 'status-active'}`}
            style={item.fuelType === 'Petrol'
              ? { background: '#EDE9FE', color: '#7C3AED', border: '1px solid #C4B5FD' }
              : { background: '#D1FAE5', color: '#065F46', border: '1px solid #6EE7B7' }}
          >
            {item.fuelType || 'Diesel'}
          </span>
        ),
        driver: item.employee || '—',
        liters: item.liters,
        totalCost: `LKR ${(item.total || 0).toLocaleString()}`,
        status_disp: (
          <span className={`status-badge ${item.status === 'Verified' ? 'status-active' : 'status-pending'}`}>
            {item.status || 'Logged'}
          </span>
        ),
        action: (
          <div className="table-actions" onClick={e => e.stopPropagation()}>
            {canManage && <button className="edit-btn" onClick={() => handleEdit(item)}>Edit</button>}
            {canManage && <button className="delete-btn" onClick={() => handleDelete(item._id)}>Delete</button>}
          </div>
        )
      }));
      setDieselRecords(formatted);
      setError(null);
    } catch (err) {
      setError('Connection issue: could not load fuel records.');
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = React.useMemo(() => {
    return dieselRecords.filter(r => {
      const matchVehicle  = !selectedVehicle || r.vehicle === selectedVehicle;
      const matchFuelType = selectedFuelType === 'All' || (r.fuelType || 'Diesel') === selectedFuelType;
      const matchSearch   = !searchQuery ||
        (r.employee || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.vehicle  || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.date     || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchVehicle && matchFuelType && matchSearch;
    });
  }, [dieselRecords, selectedVehicle, selectedFuelType, searchQuery]);

  // Summary stats — scoped to current filter
  const stats = React.useMemo(() => {
    const totalLiters = filteredRecords.reduce((sum, r) => sum + (parseFloat(r.liters) || 0), 0);
    const totalCost   = filteredRecords.reduce((sum, r) => sum + (parseFloat(r.rawData?.total ?? r.total) || 0), 0);
    const avgPrice    = totalLiters > 0 ? totalCost / totalLiters : 0;
    return { totalLiters, totalCost, avgPrice };
  }, [filteredRecords]);

  const handleAddEntry = async (data) => {
    try {
      if (editingItem) {
        await dieselAPI.update(editingItem._id, data);
        setSuccess('Fuel entry updated!');
      } else {
        await dieselAPI.create(data);
        setSuccess('Fuel entry added!');
      }
      fetchRecords();
      setIsModalOpen(false);
      setEditingItem(null);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Error saving fuel entry.');
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleEdit = (item) => {
    const target = item.rawData || item;
    setEditingItem(target);
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this fuel record?')) {
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
    const exportColumns = ['DATE', 'FUEL TYPE', 'EMPLOYEE', 'VEHICLE', 'LITERS', 'PRICE/L', 'TOTAL', 'ODOMETER', 'NOTE'];
    const exportData = filteredRecords.map(r => [
      r.date || '—',
      r.fuelType || 'Diesel',
      r.employee || '—',
      r.vehicle || '—',
      r.liters || '—',
      r.pricePerLiter || '—',
      r.total || '—',
      r.odometer || '—',
      r.note || '—'
    ]);

    generatePDFReport({
      title: `Fuel Book Report${selectedFuelType !== 'All' ? ` — ${selectedFuelType}` : ''}`,
      columns: exportColumns,
      data: exportData,
      filename: `FuelBook_${selectedFuelType}_${new Date().toISOString().split('T')[0]}.pdf`
    });
  };

  // Fuel type filter tab styles
  const fuelTabStyle = (type) => ({
    padding: '6px 18px',
    borderRadius: '20px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '13px',
    transition: 'all 0.2s',
    ...(selectedFuelType === type
      ? type === 'Diesel'
        ? { background: '#D1FAE5', color: '#065F46', boxShadow: '0 0 0 2px #6EE7B7' }
        : type === 'Petrol'
          ? { background: '#EDE9FE', color: '#7C3AED', boxShadow: '0 0 0 2px #C4B5FD' }
          : { background: '#1E3A5F', color: '#fff', boxShadow: '0 0 0 2px #3B82F6' }
      : { background: '#F1F5F9', color: '#64748B' })
  });

  return (
    <div className="book-container">

      {/* Summary Stats */}
      <div className="book-summary">
        <div className="summary-item">
          <label>TOTAL LITERS{selectedFuelType !== 'All' ? ` (${selectedFuelType})` : ''}</label>
          <h3>{stats.totalLiters.toFixed(1)} L</h3>
        </div>
        <div className="summary-item">
          <label>TOTAL COST{selectedFuelType !== 'All' ? ` (${selectedFuelType})` : ''}</label>
          <h3 style={{ color: '#EF4444' }}>LKR {stats.totalCost.toLocaleString()}</h3>
        </div>
        <div className="summary-item" style={{ borderRight: 'none' }}>
          <label>AVG PRICE / L</label>
          <h3 style={{ color: '#2563EB' }}>LKR {stats.avgPrice.toFixed(2)}</h3>
        </div>
      </div>

      {/* Fuel Type Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', padding: '12px 20px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: '4px' }}>Fuel Type:</span>
        {FUEL_TYPES.map(type => (
          <button key={type} style={fuelTabStyle(type)} onClick={() => setSelectedFuelType(type)}>
            {type === 'All' ? 'All' : type === 'Diesel' ? 'Diesel' : 'Petrol'}
          </button>
        ))}
      </div>

      {/* Vehicle Filter */}
      <VehicleFilter
        vehicles={vehicles}
        selectedVehicle={selectedVehicle}
        onSelect={setSelectedVehicle}
      />

      {/* Search + Actions */}
      <div className="book-filters">
        <div className="search-box">
          <Search className="search-icon" size={16} />
          <input
            type="text"
            placeholder="Search date, driver, vehicle..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="filter-actions">
          <button className="secondary-btn" onClick={handleExportPDF} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Download size={16} /> Export PDF
          </button>
          {canManage && (
            <button className="add-btn" onClick={handleAddNew}>
              + Add Entry
            </button>
          )}
        </div>
      </div>

      {success && <div className="success-banner">{success}</div>}
      {error   && <div className="error-banner">{error}</div>}

      <DataTable
        columns={columns}
        data={filteredRecords}
        loading={loading}
        onRowClick={(row) => { setSelectedRecord(row); setViewModalOpen(true); }}
        emptyMessage={loading ? 'Loading...' : `No ${selectedFuelType === 'All' ? 'fuel' : selectedFuelType.toLowerCase()} records found.`}
      />

      <Modal 
        isOpen={viewModalOpen} 
        onClose={() => setViewModalOpen(false)} 
        title="Fuel Transaction Details"
      >
        <RecordDetails data={selectedRecord} type="diesel" />
        <div className="modal-footer" style={{ padding: '15px 24px', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', background: '#F8FAFC' }}>
            <button className="secondary-btn" onClick={() => setViewModalOpen(false)}>Close</button>
        </div>
      </Modal>

      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingItem(null); }}
        title={editingItem ? 'Edit Fuel Entry' : 'Add Fuel Entry'}
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
