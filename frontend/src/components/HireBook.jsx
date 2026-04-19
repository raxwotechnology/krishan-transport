import React from 'react';
import DataTable from './DataTable';
import Modal from './Modal';
import HireForm from './HireForm';
import { hireAPI, vehicleAPI } from '../services/api';
import { generatePDFReport } from '../utils/reportGenerator';
import { Download } from 'lucide-react';
import '../styles/forms.css';
import '../styles/books.css';
import VehicleFilter from './VehicleFilter';

const HireBook = () => {
  const userRole = localStorage.getItem('kt_user_role');
  const canManage = ['Admin', 'Manager'].includes(userRole);

  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [hireRecords, setHireRecords] = React.useState([]);
  const [vehicles, setVehicles] = React.useState([]);
  const [selectedVehicle, setSelectedVehicle] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [editingItem, setEditingItem] = React.useState(null);
  const [success, setSuccess] = React.useState(null);
  const [searchQuery, setSearchQuery] = React.useState('');

  const columns = canManage
    ? ['DATE', 'BILL#', 'COMPANY', 'VEHICLE', 'LOCATION', 'DRIVER', 'HOURS', 'BILL AMT', 'TOTAL', 'STATUS', 'ACTION']
    : ['DATE', 'BILL#', 'COMPANY', 'VEHICLE', 'LOCATION', 'DRIVER', 'HOURS', 'BILL AMT', 'TOTAL', 'STATUS'];
  
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
      const response = await hireAPI.get();
      const rawData = Array.isArray(response.data) ? response.data : [];
      const formatted = rawData.map(item => ({
        ...item,
        date:       new Date(item.date).toLocaleDateString(),
        billNumber: item.billNumber || '—',
        client:     item.client || '—',
        vehicle:    item.vehicle || '—',
        location:   item.location || '—',
        driverName: item.driverName || '—',
        workingHours: item.workingHours ? `${item.workingHours}h` : '—',
        billAmount_val: item.billAmount || 0,
        totalAmount_val: item.totalAmount || 0,
        billAmount: `LKR ${(item.billAmount || 0).toLocaleString()}`,
        totalAmount_disp: `LKR ${(item.totalAmount || 0).toLocaleString()}`,
        status: item.status || 'Pending',
        action: canManage ? (
          <div className="table-actions">
            <button className="edit-btn" onClick={() => handleEdit(item)}>Edit</button>
            <button className="delete-btn" onClick={() => handleDelete(item._id)}>Delete</button>
          </div>
        ) : undefined
      }));
      setHireRecords(formatted);
      setError(null);
    } catch (err) {
      setError('Connection issue: using local hire records.');
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = React.useMemo(() => {
    return hireRecords.filter(r => {
      const matchVehicle = !selectedVehicle || r.vehicle === selectedVehicle;
      const matchSearch = !searchQuery || 
        r.client?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.billNumber?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchVehicle && matchSearch;
    });
  }, [hireRecords, selectedVehicle, searchQuery]);

  const stats = React.useMemo(() => {
    const totalJobs    = filteredRecords.length;
    const totalRevenue = filteredRecords.reduce((sum, r) => sum + (r.billAmount_val || 0), 0);
    const totalAmount  = filteredRecords.reduce((sum, r) => sum + (r.totalAmount_val || 0), 0);
    return { totalJobs, totalRevenue, totalAmount };
  }, [filteredRecords]);

  const handleAddJob = async (data) => {
    try {
      if (editingItem) {
        await hireAPI.update(editingItem._id, data);
        setSuccess('Hire record updated!');
      } else {
        await hireAPI.create(data);
        setSuccess('New hire job added!');
      }
      fetchRecords();
      setIsModalOpen(false);
      setEditingItem(null);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Error saving hire details.');
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this hire record?')) {
      try {
        await hireAPI.delete(id);
        setSuccess('Record deleted.');
        fetchRecords();
        setTimeout(() => setSuccess(null), 3000);
      } catch (err) {
        setError('Could not delete record.');
        setTimeout(() => setError(null), 5000);
      }
    }
  };

  const handleExportPDF = () => {
    const exportColumns = ['DATE', 'BILL#', 'COMPANY', 'VEHICLE', 'LOCATION', 'DRIVER', 'HOURS', 'BILL AMT', 'TOTAL'];
    const exportData = filteredRecords.map(r => [
      r.date || '—',
      r.billNumber || '—',
      r.client || '—',
      r.vehicle || '—',
      r.location || '—',
      r.driverName || '—',
      r.workingHours || '—',
      r.billAmount || '—',
      r.totalAmount_disp || '—'
    ]);
    generatePDFReport({
      title: 'Hire Book Report',
      columns: exportColumns,
      data: exportData,
      filename: `HireBook_Report_${new Date().toISOString().split('T')[0]}.pdf`
    });
  };

  return (
    <div className="book-container">
      <div className="book-summary">
        <div className="summary-item">
          <label>TOTAL JOBS</label>
          <h3>{stats.totalJobs}</h3>
        </div>
        <div className="summary-item">
          <label>TOTAL BILL AMT</label>
          <h3 style={{ color: '#2563EB' }}>LKR {stats.totalRevenue.toLocaleString()}</h3>
        </div>
        <div className="summary-item" style={{ borderRight: 'none' }}>
          <label>NET TOTAL</label>
          <h3 style={{ color: '#10B981' }}>LKR {stats.totalAmount.toLocaleString()}</h3>
        </div>
      </div>

      <VehicleFilter 
        vehicles={vehicles} 
        selectedVehicle={selectedVehicle} 
        onSelect={setSelectedVehicle} 
      />

      <div className="book-filters">
        <div className="search-box">
          <input 
            type="text" 
            placeholder="Search client, bill, location..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="filter-actions">
          <button className="secondary-btn" onClick={handleExportPDF} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Download size={16} /> Export PDF
          </button>
          <button className="add-btn" onClick={() => { setEditingItem(null); setIsModalOpen(true); }}>
            + Add Job
          </button>
        </div>
      </div>

      {success && <div className="success-banner">{success}</div>}
      {error && <div className="error-banner">{error}</div>}

      <DataTable 
        columns={columns} 
        data={filteredRecords} 
        loading={loading}
        emptyMessage={loading ? "Loading..." : "No hire records found."} 
      />

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setEditingItem(null); }} 
        title={editingItem ? 'Edit Hire Job' : 'Add Hire Job'}
        wide
      >
        <HireForm 
          onSubmit={handleAddJob} 
          onCancel={() => { setIsModalOpen(false); setEditingItem(null); }} 
          initialData={editingItem}
        />
      </Modal>
    </div>
  );
};

export default HireBook;
