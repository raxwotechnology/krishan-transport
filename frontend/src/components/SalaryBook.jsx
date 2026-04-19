import React from 'react';
import DataTable from './DataTable';
import Modal from './Modal';
import SalaryForm from './SalaryForm';
import { salaryAPI, vehicleAPI } from '../services/api';
import { generatePDFReport } from '../utils/reportGenerator';
import { Download } from 'lucide-react';
import '../styles/forms.css';
import VehicleFilter from './VehicleFilter';

const SalaryBook = () => {
  const userRole = localStorage.getItem('kt_user_role');
  const canManage = ['Admin', 'Manager'].includes(userRole);

  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [salaryRecords, setSalaryRecords] = React.useState([]);
  const [vehicles, setVehicles] = React.useState([]);
  const [selectedVehicle, setSelectedVehicle] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [editingItem, setEditingItem] = React.useState(null);
  const [success, setSuccess] = React.useState(null);

  const columns = canManage
    ? ['MONTH', 'EMPLOYEE', 'VEHICLE', 'BASIC', 'INCENTIVE', 'ADVANCE', 'NET PAY', 'ACTION']
    : ['MONTH', 'EMPLOYEE', 'VEHICLE', 'BASIC', 'INCENTIVE', 'ADVANCE', 'NET PAY'];
  
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
      const response = await salaryAPI.get();
      const rawData = Array.isArray(response.data) ? response.data : [];
      const formatted = rawData.map(item => ({
        ...item,
        net_val: item.netPay,
        basic: `LKR ${item.basic}`,
        netPay: `LKR ${Number(item.netPay).toFixed(2)}`,
        action: canManage ? (
          <div className="table-actions">
            <button className="edit-btn" onClick={() => handleEdit(item)}>Edit</button>
            <button className="delete-btn" onClick={() => handleDelete(item._id)}>Delete</button>
          </div>
        ) : null
      }));
      setSalaryRecords(formatted);
      setError(null);
    } catch (err) {
      setError('Connection issue: using local salary records.');
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = React.useMemo(() => {
    if (!selectedVehicle) return salaryRecords;
    return salaryRecords.filter(r => r.vehicle === selectedVehicle);
  }, [salaryRecords, selectedVehicle]);

  const stats = React.useMemo(() => {
    const totalPaid = filteredRecords.reduce((sum, r) => sum + (parseFloat(r.net_val) || 0), 0);
    const totalEmployees = new Set(filteredRecords.map(r => r.employee)).size;
    return { totalPaid, totalEmployees };
  }, [filteredRecords]);

  const handleAddSalary = async (data) => {
    try {
      if (editingItem) {
        await salaryAPI.update(editingItem._id, data);
        setSuccess('Salary record updated!');
      } else {
        await salaryAPI.create(data);
        setSuccess('New salary record added!');
      }
      fetchRecords();
      setIsModalOpen(false);
      setEditingItem(null);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Error saving salary details.');
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this salary record?')) {
      try {
        await salaryAPI.delete(id);
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
    const exportColumns = ['MONTH', 'EMPLOYEE', 'VEHICLE', 'BASIC', 'INCENTIVE', 'ADVANCE', 'NET PAY'];
    const exportData = filteredRecords.map(r => [
      r.month || '—',
      r.employee || '—',
      r.vehicle || '—',
      r.basic || '—',
      r.incentive !== undefined ? `LKR ${r.incentive}` : '—',
      r.advance !== undefined ? `LKR ${r.advance}` : '—',
      r.netPay || '—'
    ]);
    
    generatePDFReport({
      title: 'Salary Report',
      columns: exportColumns,
      data: exportData,
      filename: `Salary_Report_${new Date().toISOString().split('T')[0]}.pdf`
    });
  };

  return (
    <div className="book-container">
      <div className="book-summary">
        <div className="summary-item">
          <label>TOTAL SALARY PAID</label>
          <h3 style={{ color: '#10B981' }}>LKR {stats.totalPaid.toLocaleString()}</h3>
        </div>
        <div className="summary-item" style={{ borderRight: 'none' }}>
          <label>UNIQUE EMPLOYEES</label>
          <h3>{stats.totalEmployees}</h3>
        </div>
      </div>

      <VehicleFilter 
        vehicles={vehicles} 
        selectedVehicle={selectedVehicle} 
        onSelect={setSelectedVehicle} 
      />

      <div className="book-filters">
        <div className="search-box">
          <input type="text" placeholder="Search employee name..." />
        </div>
        <div className="filter-actions">
          <button className="secondary-btn" onClick={handleExportPDF} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Download size={16} /> Export PDF
          </button>
          {canManage && (
            <button className="add-btn" onClick={() => { setEditingItem(null); setIsModalOpen(true); }}>
              + Add Record
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
        emptyMessage={loading ? "Loading..." : "No salary records found."} 
      />

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setEditingItem(null); }} 
        title={editingItem ? 'Edit Salary Record' : 'Add Salary Record'}
      >
        <SalaryForm 
          onSubmit={handleAddSalary} 
          onCancel={() => { setIsModalOpen(false); setEditingItem(null); }} 
          initialData={editingItem}
        />
      </Modal>
    </div>
  );
};

export default SalaryBook;
