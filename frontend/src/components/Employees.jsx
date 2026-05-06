import React from 'react';
import DataTable from './DataTable';
import Modal from './Modal';
import EmployeeForm from './EmployeeForm';
import { employeeAPI } from '../services/api';
import { generatePDFReport } from '../utils/reportGenerator';
import { Download, Search, UserPlus, RefreshCw } from 'lucide-react';
import '../styles/forms.css';
import '../styles/books.css';
import RecordDetails from './RecordDetails';
import { useMonthFilter } from '../context/MonthFilterContext';
import api from '../services/api';
import { Calendar } from 'lucide-react';

const Employees = () => {
  const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const userRole = localStorage.getItem('kt_user_role');
  const canManage = isDev || ['Admin', 'Manager'].includes(userRole);

  const { selectedMonth, selectedYear, isFilterActive, monthYear, setSelectedMonth, setSelectedYear, months, years } = useMonthFilter();
  
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [viewModalOpen, setViewModalOpen] = React.useState(false);
  const [selectedRecord, setSelectedRecord] = React.useState(null);
  const [records, setRecords] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [success, setSuccess] = React.useState(null);
  const [editingItem, setEditingItem] = React.useState(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [roleFilter, setRoleFilter] = React.useState('All');

  const columns = canManage
    ? ['NAME', 'NIC', 'ROLE', 'JOBS', 'DAYS', 'JOINED', 'CONTACT', 'STATUS', 'ACTION']
    : ['NAME', 'NIC', 'ROLE', 'JOBS', 'DAYS', 'JOINED', 'CONTACT', 'STATUS'];

  React.useEffect(() => {
    fetchRecords(selectedMonth, selectedYear);
  }, [selectedMonth, selectedYear, isFilterActive]);

  const fetchRecords = async (m = selectedMonth, y = selectedYear) => {
    setLoading(true);
    try {
      // Pass month/year to API to get monthly stats
      const query = isFilterActive ? `?month=${m}&year=${y}` : '';
      const response = await api.get(`/employees${query}`);
      const raw = Array.isArray(response.data) ? response.data : [];
      
      const formatted = raw.map(item => ({
        ...item,
        rawData: item,
        name: item.name || '—',
        contact: item.contact || '—',
        jobs: (
          <span style={{ fontWeight: 800, color: '#2563EB' }}>
            {item.totalJobs || 0}
          </span>
        ),
        days: (
          <span style={{ fontWeight: 800, color: '#10B981' }}>
            {item.totalWorkingDays || 0}
          </span>
        ),
        joined: item.joinedDate ? new Date(item.joinedDate).toLocaleDateString() : '—',
        status_text: item.status || 'Active',
        status_disp: (
          <span className={`status-badge ${item.status === 'Active' ? 'status-active' : 'status-inactive'}`}>
            {item.status || 'Active'}
          </span>
        ),
        action: canManage ? (
          <div className="table-actions">
            <button className="edit-btn" onClick={() => handleEdit(item)}>Edit</button>
            <button className="delete-btn" onClick={() => handleDelete(item._id)}>Delete</button>
          </div>
        ) : null
      }));
      setRecords(formatted);
      setError(null);
    } catch (err) {
      console.error('Fetch Employees Error:', err);
      setError('Connection issue: could not load employee directory.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (data) => {
    try {
      if (editingItem) {
        await employeeAPI.update(editingItem._id, data);
        setSuccess('Employee updated successfully.');
      } else {
        await employeeAPI.create(data);
        setSuccess('New employee registered.');
      }
      fetchRecords();
      setIsModalOpen(false);
      setEditingItem(null);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Error processing request.');
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleEdit = (item) => {
    const target = item.rawData || item;
    setEditingItem(target);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this employee?')) {
      try {
        await employeeAPI.delete(id);
        setSuccess('Employee removed.');
        fetchRecords();
        setTimeout(() => setSuccess(null), 3000);
      } catch (err) {
        setError('Error deleting record.');
        setTimeout(() => setError(null), 5000);
      }
    }
  };

  const handleExportPDF = () => {
    const exportColumns = ['NAME', 'NIC', 'ROLE', 'JOBS', 'DAYS', 'CONTACT', 'STATUS'];
    const exportData = filteredRecords.map(r => [
      r.name || '—',
      r.nic || '—',
      r.role || '—',
      r.totalJobs || 0,
      r.totalWorkingDays || 0,
      r.contact || '—',
      r.status_text || '—'
    ]);
    
    generatePDFReport({
      title: 'Employee Directory',
      columns: exportColumns,
      data: exportData,
      filename: `Employees_${new Date().toISOString().split('T')[0]}.pdf`
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
    return { total, active };
  }, [records]);

  return (
    <div className="book-container">
      {/* Monthly Filter Bar */}
      <div className="book-filters" style={{ marginBottom: '0px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Calendar size={20} color="#2563EB" />
          <h3 style={{ margin: 0, fontSize: '1rem', color: '#1E293B' }}>Performance Period:</h3>
        </div>
        <div className="filter-actions">
          <select 
            value={selectedMonth} 
            onChange={e => setSelectedMonth(parseInt(e.target.value))}
            className="secondary-btn"
            style={{ height: '38px', minWidth: '130px', fontWeight: '700' }}
          >
            {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
          <select 
            value={selectedYear} 
            onChange={e => setSelectedYear(parseInt(e.target.value))}
            className="secondary-btn"
            style={{ height: '38px', minWidth: '100px', fontWeight: '700' }}
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button className="secondary-btn" onClick={() => fetchRecords()}><RefreshCw size={16} className={loading ? 'spinner' : ''} /></button>
        </div>
      </div>

      <div className="book-summary">
        <div className="summary-item">
          <label>TOTAL EMPLOYEES</label>
          <h3>{stats.total}</h3>
        </div>
        <div className="summary-item" style={{ borderRight: 'none' }}>
          <label>{isFilterActive ? `${months[selectedMonth].toUpperCase()} ACTIVE` : 'ACTIVE STAFF'}</label>
          <h3 style={{ color: '#10B981' }}>{stats.active}</h3>
        </div>
      </div>

      <div className="book-filters">
        <div className="search-box">
          <Search className="search-icon" size={18} />
          <input
            type="text"
            placeholder="Search name, NIC, or contact..."
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
          <button className="secondary-btn" onClick={handleExportPDF}>
            <Download size={16} /> Export
          </button>
          <button className="secondary-btn" onClick={fetchRecords}>
            <RefreshCw size={16} className={loading ? 'spinner' : ''} />
          </button>
          {canManage && (
            <button className="add-btn" onClick={() => { setEditingItem(null); setIsModalOpen(true); }}>
              <UserPlus size={18} /> Register
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
        onRowClick={(row) => { setSelectedRecord(row); setViewModalOpen(true); }}
        emptyMessage={loading ? 'Connecting to server...' : 'No employees found.'}
      />

      <Modal 
        isOpen={viewModalOpen} 
        onClose={() => setViewModalOpen(false)} 
        title="Employee Profile Details"
      >
        <RecordDetails data={selectedRecord} type="employee" />
        <div className="modal-footer" style={{ padding: '15px 24px', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', background: '#F8FAFC' }}>
            <button className="secondary-btn" onClick={() => setViewModalOpen(false)}>Close</button>
        </div>
      </Modal>

      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingItem(null); }}
        title={editingItem ? 'Edit Employee Record' : 'Register New Employee'}
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
