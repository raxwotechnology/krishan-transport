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
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [salaryRecords, setSalaryRecords] = React.useState([]);
  const [vehicles, setVehicles] = React.useState([]);
  const [selectedVehicle, setSelectedVehicle] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [editingItem, setEditingItem] = React.useState(null);

  const columns = ['MONTH', 'EMPLOYEE', 'VEHICLE', 'BASIC', 'INCENTIVE', 'ADVANCE', 'NET PAY', 'ACTION'];
  
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
        basic: `LKR ${item.basic}`,
        netPay: `LKR ${Number(item.netPay).toFixed(2)}`,
        action: (
          <div className="table-actions">
            <button className="edit-btn" onClick={() => handleEdit(item)}>Edit</button>
            <button className="delete-btn" onClick={() => handleDelete(item._id)}>Delete</button>
          </div>
        )
      }));
      setSalaryRecords(formatted);
      setError(null);
    } catch (err) {
      console.error('Error fetching salaries:', err);
      setError('Using offline salary records.');
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = React.useMemo(() => {
    if (!selectedVehicle) return salaryRecords;
    return salaryRecords.filter(r => r.vehicle === selectedVehicle);
  }, [salaryRecords, selectedVehicle]);

  const stats = React.useMemo(() => {
    const totalPaid = filteredRecords.reduce((sum, r) => sum + (parseFloat(r.netPay?.replace('LKR ', '')) || 0), 0);
    const totalEmployees = new Set(filteredRecords.map(r => r.employee)).size;
    return { totalPaid, totalEmployees };
  }, [filteredRecords]);

  const handleAddSalary = async (data) => {
    try {
      if (editingItem) {
        await salaryAPI.update(editingItem._id, data);
      } else {
        await salaryAPI.create(data);
      }
      fetchRecords();
      setIsModalOpen(false);
      setEditingItem(null);
    } catch (err) {
      alert('Error saving salary: ' + err.message);
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
        fetchRecords();
      } catch (err) { alert('Error deleting record'); }
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
          <label>TOTAL PAID</label>
          <h3>LKR {stats.totalPaid.toLocaleString()}</h3>
        </div>
        <div className="summary-item">
          <label>EMPLOYEES</label>
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
          <input type="text" placeholder="Search name, vehicle..." />
        </div>
        <div className="filter-actions">
          <select>
            <option>All Months</option>
          </select>
          <button className="secondary-btn" onClick={handleExportPDF} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Download size={16} /> Export PDF
          </button>
          <button className="add-btn" onClick={() => setIsModalOpen(true)}>+ Add Record</button>
        </div>
      </div>

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
