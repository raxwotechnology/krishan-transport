import React from 'react';
import DataTable from './DataTable';
import Modal from './Modal';
import { extraIncomeAPI, vehicleAPI, employeeAPI } from '../services/api';
import { Download, Search, RefreshCw, PlusCircle, Wallet, Trash2, Plus } from 'lucide-react';
import Autocomplete from './Autocomplete';
import '../styles/forms.css';
import '../styles/books.css';
import { useMonthFilter, filterByMonth } from '../context/MonthFilterContext';

const ExtraIncomeForm = ({ onSubmit, onCancel, initialData, records = [] }) => {
  const [vehicles, setVehicles] = React.useState([]);
  const [employeesList, setEmployeesList] = React.useState([]);
  const [formData, setFormData] = React.useState(initialData || { 
    date: new Date().toISOString().split('T')[0], 
    jobType: '',
    description: '', 
    amount: '', 
    employees: [''], 
    vehicle: '',
    address: '',
    location: '',
    note: '' 
  });

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const [vRes, eRes] = await Promise.all([vehicleAPI.get(), employeeAPI.get()]);
        setVehicles(Array.isArray(vRes.data) ? vRes.data : []);
        setEmployeesList(Array.isArray(eRes.data) ? eRes.data : []);
      } catch (err) { console.error(err); }
    };
    fetchData();
  }, []);

  React.useEffect(() => {
    if (initialData) {
      const formattedDate = initialData.date ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      setFormData({ 
        ...initialData, 
        date: formattedDate,
        employees: initialData.employees?.length ? initialData.employees : ['']
      });
    }
  }, [initialData]);

  const addEmployeeField = () => {
    setFormData({ ...formData, employees: [...formData.employees, ''] });
  };

  const removeEmployeeField = (idx) => {
    const updated = formData.employees.filter((_, i) => i !== idx);
    setFormData({ ...formData, employees: updated.length ? updated : [''] });
  };

  const handleEmployeeChange = (idx, val) => {
    const updated = [...formData.employees];
    updated[idx] = val;
    setFormData({ ...formData, employees: updated });
  };
  
  return (
    <form className="hire-form" onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }}>
      <div className="hire-form-scroll">
        <div className="form-section">
          <p className="form-section-title">Income / Job Basics</p>
          <div className="form-grid-2">
            <div className="form-group">
              <label>Date *</label>
              <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Income Amount (LKR) *</label>
              <input type="number" required placeholder="0.00" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
            </div>
          </div>
          <div className="form-grid-2" style={{ marginTop: '16px' }}>
            <div className="form-group">
              <label>Job Type *</label>
              <Autocomplete 
                options={[
                  "Building Cleaning", 
                  "Board Installation", 
                  "Contract Work", 
                  "Machine Rental", 
                  "Other Service",
                  ...new Set(records.map(r => r.jobType).filter(Boolean))
                ]}
                value={formData.jobType}
                onChange={e => setFormData({...formData, jobType: e.target.value})}
                placeholder="Select or type job type..."
                required
              />
            </div>
            <div className="form-group">
              <label>Specific Job / Description</label>
              <input type="text" placeholder="e.g. 3rd Floor Glass Cleaning" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
            </div>
          </div>
        </div>

        <div className="form-section">
          <p className="form-section-title">Location Details</p>
          <div className="form-grid-2">
            <div className="form-group">
              <label>Address / Site</label>
              <input type="text" placeholder="e.g. No 45, Galle Road" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Building / Location Detail</label>
              <input type="text" placeholder="e.g. Majestic City" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
            </div>
          </div>
        </div>

        <div className="form-section">
          <p className="form-section-title">Resources Used</p>
          <div className="form-group">
            <label>Vehicle (If any)</label>
            <Autocomplete 
              options={vehicles.map(v => v.number)}
              value={formData.vehicle}
              onChange={e => setFormData({ ...formData, vehicle: e.target.value })}
              placeholder="Search vehicle number..."
            />
          </div>
          
          <div className="form-group" style={{ marginTop: '16px' }}>
            <label>Personnel Involved (Staff)</label>
            {formData.employees.map((emp, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <div style={{ flex: 1 }}>
                  <Autocomplete 
                    options={employeesList.map(e => e.name)}
                    value={emp}
                    onChange={e => handleEmployeeChange(idx, e.target.value)}
                    placeholder="Search staff name..."
                  />
                </div>
                {formData.employees.length > 1 && (
                  <button type="button" onClick={() => removeEmployeeField(idx)} style={{ background: '#FEE2E2', border: 'none', borderRadius: '8px', color: '#DC2626', padding: '0 10px', cursor: 'pointer' }}>
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
            <button type="button" onClick={addEmployeeField} className="secondary-btn" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
              <Plus size={14} /> Add Staff
            </button>
          </div>
        </div>

        <div className="form-section">
          <p className="form-section-title">Additional Info</p>
          <div className="form-group">
            <label>Notes</label>
            <textarea placeholder="Additional info..." value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} rows={3} />
          </div>
        </div>
      </div>

      <div className="hire-form-footer">
        <div className="total-display">
          <span>Income Amount</span>
          <strong>LKR {parseFloat(formData.amount || 0).toLocaleString()}</strong>
        </div>
        <div className="modal-actions">
          <button type="button" className="cancel-btn" onClick={onCancel}>Cancel</button>
          <button type="submit" className="submit-btn">{initialData ? 'Update Income' : 'Add Income'}</button>
        </div>
      </div>
    </form>
  );
};

const ExtraIncome = () => {
  const userRole = localStorage.getItem('kt_user_role');
  const canManage = ['Admin', 'Manager'].includes(userRole);
  const { selectedMonth, selectedYear, isFilterActive } = useMonthFilter();

  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [records, setRecords] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [editingRecord, setEditingRecord] = React.useState(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [successMsg, setSuccessMsg] = React.useState('');

  const columns = canManage 
    ? ['DATE', 'JOB TYPE', 'LOCATION', 'AMOUNT (LKR)', 'ACTION']
    : ['DATE', 'JOB TYPE', 'LOCATION', 'AMOUNT (LKR)'];

  React.useEffect(() => { fetchRecords(); }, [selectedMonth, selectedYear, isFilterActive]);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res = await extraIncomeAPI.get();
      let raw = Array.isArray(res.data) ? res.data : [];
      
      // Global Month Filter
      raw = filterByMonth(raw, 'date', selectedMonth, selectedYear, isFilterActive);

      const formatted = raw.map(r => ({
        ...r,
        rawData: r,
        date_disp: r.date ? new Date(r.date).toLocaleDateString() : '—',
        amount_disp: (
          <span style={{ fontWeight: '600', color: '#059669' }}>
            {parseFloat(r.amount || 0).toLocaleString()}
          </span>
        ),
        action: canManage ? (
          <div className="table-actions" onClick={e => e.stopPropagation()}>
            <button className="edit-btn" onClick={() => handleEdit(r)}>Edit</button>
            <button className="delete-btn" onClick={() => handleDelete(r._id)}>Delete</button>
          </div>
        ) : null
      }));
      setRecords(formatted);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const filteredRecords = React.useMemo(() => {
    return records.filter(r => {
      return !searchQuery || 
        (r.jobType || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.location || '').toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [records, searchQuery]);

  const totalAmount = React.useMemo(() => {
    return filteredRecords.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
  }, [filteredRecords]);

  const handleAdd = async (data) => {
    try {
      if (editingRecord) {
        await extraIncomeAPI.update(editingRecord._id, data);
        setSuccessMsg('Income updated successfully!');
      } else {
        await extraIncomeAPI.create(data);
        setSuccessMsg('Income added successfully!');
      }
      fetchRecords();
      setIsModalOpen(false);
      setEditingRecord(null);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) { console.error(err); }
  };

  const handleEdit = (record) => {
    setEditingRecord(record.rawData || record);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this income record?')) {
      try {
        await extraIncomeAPI.delete(id);
        setSuccessMsg('Record deleted');
        fetchRecords();
        setTimeout(() => setSuccessMsg(''), 3000);
      } catch (err) { console.error(err); }
    }
  };

  return (
    <div className="book-container">
      <div className="book-summary">
        <div className="summary-item">
          <label>EXTRA INCOME RECORDS</label>
          <h3>{filteredRecords.length}</h3>
        </div>
        <div className="summary-item" style={{ borderRight: 'none' }}>
          <label>TOTAL EXTRA INCOME</label>
          <h3 style={{ color: '#10B981' }}>LKR {totalAmount.toLocaleString()}</h3>
        </div>
      </div>

      <div className="book-filters">
        <div className="search-box">
          <Search className="search-icon" size={20} />
          <input 
            type="text" 
            placeholder="Search description, category..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="filter-actions">
          <button className="secondary-btn" onClick={fetchRecords} title="Refresh">
            <RefreshCw size={18} className={loading ? 'spinner' : ''} />
          </button>
          {canManage && (
            <button className="add-btn" onClick={() => { setEditingRecord(null); setIsModalOpen(true); }}>
              <PlusCircle size={18} /> <span>Add Income</span>
            </button>
          )}
        </div>
      </div>
      
      {successMsg && <div className="success-banner" style={{ margin: '0 20px 20px' }}>{successMsg}</div>}
      
      <DataTable 
        columns={columns} 
        data={filteredRecords.map(r => ({
          ...r,
          DATE: r.date_disp,
          'JOB TYPE': r.jobType || '—',
          LOCATION: r.location || r.address || '—',
          'AMOUNT (LKR)': r.amount_disp,
          ACTION: r.action
        }))} 
        loading={loading} 
        emptyMessage="No income records found." 
      />

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setEditingRecord(null); }} 
        title={editingRecord ? 'Edit Extra Income' : 'Add Extra Income'}
      >
        <ExtraIncomeForm 
          onSubmit={handleAdd} 
          onCancel={() => { setIsModalOpen(false); setEditingRecord(null); }} 
          initialData={editingRecord}
          records={records}
        />
      </Modal>
    </div>
  );
};

export default ExtraIncome;
