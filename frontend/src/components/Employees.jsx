import React from 'react';
import DataTable from './DataTable';
import Modal from './Modal';
import EmployeeForm from './EmployeeForm';
import { employeeAPI } from '../services/api';
import { generatePDFReport } from '../utils/reportGenerator';
import { Download } from 'lucide-react';
import '../styles/forms.css';

const Employees = () => {
  const userRole = localStorage.getItem('kt_user_role');
  const canManage = ['Admin', 'Manager'].includes(userRole);

  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [records, setRecords] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [success, setSuccess] = React.useState(null);
  const [editingItem, setEditingItem] = React.useState(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [roleFilter, setRoleFilter] = React.useState('All');

  const columns = canManage
    ? ['NAME', 'NIC', 'ROLE', 'CONTACT', 'JOINED', 'STATUS', 'ACTION']
    : ['NAME', 'NIC', 'ROLE', 'CONTACT', 'JOINED', 'STATUS'];

  React.useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const response = await employeeAPI.get();
      const raw = Array.isArray(response.data) ? response.data : [];
      const formatted = raw.map(item => ({
        ...item,
        joined: item.joinedDate ? new Date(item.joinedDate).toLocaleDateString() : '—',
        status_text: item.status,
        status: (
          <span className={`status-badge ${item.status === 'Active' ? 'status-active' : 'status-inactive'}`}>
            {item.status}
          </span>
        ),
        action: (
          <div className="table-actions">
            <button className="edit-btn" onClick={() => handleEdit(item)}>Edit</button>
            <button className="delete-btn" onClick={() => handleDelete(item._id)}>Delete</button>
          </div>
        )
      }));
      setRecords(formatted);
      setError(null);
    } catch (err) {
      setError('Could not load employees from server.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (data) => {
    try {
      if (editingItem) {
        await employeeAPI.update(editingItem._id, data);
        setSuccess('Employee updated successfully!');
      } else {
        await employeeAPI.create(data);
        setSuccess('Employee registered successfully!');
      }
      fetchRecords();
      setIsModalOpen(false);
      setEditingItem(null);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Error saving employee details.');
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this employee record?')) {
      try {
        await employeeAPI.delete(id);
        setSuccess('Employee deleted successfully.');
        fetchRecords();
        setTimeout(() => setSuccess(null), 3000);
      } catch (err) {
        setError('Error deleting employee');
        setTimeout(() => setError(null), 5000);
      }
    }
  };

  const handleExportPDF = () => {
    const exportColumns = ['NAME', 'NIC', 'ROLE', 'CONTACT', 'JOINED', 'STATUS'];
    const exportData = filteredRecords.map(r => [
      r.name || '—',
      r.nic || '—',
      r.role || '—',
      r.contact || '—',
      r.joined || '—',
      r.status_text || '—'
    ]);
    
    generatePDFReport({
      title: 'Employees Report',
      columns: exportColumns,
      data: exportData,
      filename: `Employees_Report_${new Date().toISOString().split('T')[0]}.pdf`
    });
  };

  const filteredRecords = React.useMemo(() => {
    return records.filter(r => {
      const matchSearch = !searchQuery ||
        r.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.nic?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.contact?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchRole = roleFilter === 'All' || r.role === roleFilter;
      return matchSearch && matchRole;
    });
  }, [records, searchQuery, roleFilter]);

  const stats = React.useMemo(() => {
    const total = records.length;
    const active = records.filter(r => r.status_text === 'Active').length;
    const drivers = records.filter(r => r.role === 'Driver').length;
    return { total, drivers, active };
  }, [records]);

  return (
    <div className="book-container">
      <div className="book-summary">
        <div className="summary-item">
          <label>TOTAL EMPLOYEES</label>
          <h3>{stats.total}</h3>
        </div>
        <div className="summary-item">
          <label>ACTIVE STAFF</label>
          <h3 style={{ color: '#10B981' }}>{stats.active}</h3>
        </div>
        <div className="summary-item" style={{ borderRight: 'none' }}>
          <label>DRIVERS</label>
          <h3>{stats.drivers}</h3>
        </div>
      </div>

      <div className="book-filters">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search name, NIC, contact..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="filter-actions">
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
            <option value="All">All Roles</option>
            <option value="Driver">Driver</option>
            <option value="Helper">Helper</option>
            <option value="Mechanic">Mechanic</option>
            <option value="Manager">Manager</option>
            <option value="Admin">Admin</option>
            <option value="Other">Other</option>
          </select>
          <button className="secondary-btn" onClick={handleExportPDF} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Download size={16} /> Export PDF
          </button>
          <button className="add-btn" onClick={() => { setEditingItem(null); setIsModalOpen(true); }}>
            + Register Employee
          </button>
        </div>
      </div>

      {success && <div className="success-banner">{success}</div>}
      {error && <div className="error-banner">{error}</div>}

      <DataTable
        columns={columns}
        data={filteredRecords}
        loading={loading}
        emptyMessage={loading ? 'Loading...' : 'No employee records found.'}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingItem(null); }}
        title={editingItem ? 'Edit Employee' : 'Register New Employee'}
      >
        <EmployeeForm
          onSubmit={handleSave}
          onCancel={() => { setIsModalOpen(false); setEditingItem(null); }}
          initialData={editingItem}
        />
      </Modal>
    </div>
  );
};

export default Employees;
