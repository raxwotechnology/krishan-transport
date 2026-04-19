import React from 'react';
import DataTable from './DataTable';
import Modal from './Modal';
import HireForm from './HireForm';
import { hireAPI, vehicleAPI } from '../services/api';
import { generatePDFReport } from '../utils/reportGenerator';
import { Download } from 'lucide-react';
import '../styles/forms.css';
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
    ? ['DATE', 'CLIENT', 'EMPLOYEE', 'VEHICLE', 'LOCATION', 'AMOUNT', 'COMMISSION', 'BILL#', 'ACTION']
    : ['DATE', 'CLIENT', 'EMPLOYEE', 'VEHICLE', 'LOCATION', 'AMOUNT', 'COMMISSION', 'BILL#'];
  
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
        employee:   item.employee || '—',
        amount_val: item.amount,
        comm_val:   item.commission,
        amount:     `LKR ${item.amount}`,
        commission: `LKR ${item.commission}`,
        action: (
          <div className="table-actions">
            <button className="edit-btn" onClick={() => handleEdit(item)}>Edit</button>
            <button className="delete-btn" onClick={() => handleDelete(item._id)}>Delete</button>
          </div>
        )
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
    const totalJobs = filteredRecords.length;
    const totalRevenue = filteredRecords.reduce((sum, r) => sum + (parseFloat(r.amount_val) || 0), 0);
    const totalComm = filteredRecords.reduce((sum, r) => sum + (parseFloat(r.comm_val) || 0), 0);
    return { totalJobs, totalRevenue, totalComm, net: totalRevenue - totalComm };
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
    const exportColumns = ['DATE', 'CLIENT', 'EMPLOYEE', 'VEHICLE', 'LOCATION', 'AMOUNT', 'COMMISSION', 'BILL#'];
    const exportData = filteredRecords.map(r => [
      r.date || '—',
      r.client || '—',
      r.employee || '—',
      r.vehicle || '—',
      r.location || '—',
      r.amount || '—',
      r.commission || '—',
      r.billNumber || '—'
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
          <label>TOTAL REVENUE</label>
          <h3 style={{ color: '#2563EB' }}>LKR {stats.totalRevenue.toLocaleString()}</h3>
        </div>
        <div className="summary-item">
          <label>COMMISSIONS</label>
          <h3 style={{ color: '#F59E0B' }}>LKR {stats.totalComm.toLocaleString()}</h3>
        </div>
        <div className="summary-item" style={{ borderRight: 'none' }}>
          <label>NET REVENUE</label>
          <h3 style={{ color: '#10B981' }}>LKR {stats.net.toLocaleString()}</h3>
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
