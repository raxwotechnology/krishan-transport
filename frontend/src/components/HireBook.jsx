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
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [hireRecords, setHireRecords] = React.useState([]);
  const [vehicles, setVehicles] = React.useState([]);
  const [selectedVehicle, setSelectedVehicle] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [editingItem, setEditingItem] = React.useState(null);

  const columns = ['DATE', 'CLIENT', 'EMPLOYEE', 'VEHICLE', 'LOCATION', 'AMOUNT', 'COMMISSION', 'BILL#', 'ACTION'];
  
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
      console.error('Error fetching hires:', err);
      setError('Using offline hire records.');
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = React.useMemo(() => {
    if (!selectedVehicle) return hireRecords;
    return hireRecords.filter(r => r.vehicle === selectedVehicle);
  }, [hireRecords, selectedVehicle]);

  const stats = React.useMemo(() => {
    const totalJobs = filteredRecords.length;
    const totalRevenue = filteredRecords.reduce((sum, r) => sum + (parseFloat(r.amount?.replace('LKR ', '')) || 0), 0);
    const totalComm = filteredRecords.reduce((sum, r) => sum + (parseFloat(r.commission?.replace('LKR ', '')) || 0), 0);
    return { totalJobs, totalRevenue, totalComm, net: totalRevenue - totalComm };
  }, [filteredRecords]);

  const handleAddJob = async (data) => {
    try {
      if (editingItem) {
        await hireAPI.update(editingItem._id, data);
      } else {
        await hireAPI.create(data);
      }
      fetchRecords();
      setIsModalOpen(false);
      setEditingItem(null);
    } catch (err) {
      alert('Error saving job: ' + err.message);
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
        fetchRecords();
      } catch (err) { alert('Error deleting record'); }
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
          <h3>LKR {stats.totalRevenue.toLocaleString()}</h3>
        </div>
        <div className="summary-item">
          <label>COMMISSIONS</label>
          <h3>LKR {stats.totalComm.toLocaleString()}</h3>
        </div>
        <div className="summary-item">
          <label>NET</label>
          <h3>LKR {stats.net.toLocaleString()}</h3>
        </div>
      </div>

      <VehicleFilter 
        vehicles={vehicles} 
        selectedVehicle={selectedVehicle} 
        onSelect={setSelectedVehicle} 
      />

      <div className="book-filters">
        <div className="search-box">
          <input type="text" placeholder="Search client, vehicle..." />
        </div>
        <div className="filter-actions">
          <select>
            <option>All Months</option>
          </select>
          <button className="secondary-btn" onClick={handleExportPDF} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Download size={16} /> Export PDF
          </button>
          <button className="add-btn" onClick={() => setIsModalOpen(true)}>+ Add Job</button>
        </div>
      </div>

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
