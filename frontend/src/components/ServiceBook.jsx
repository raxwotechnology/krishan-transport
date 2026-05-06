import React from 'react';
import DataTable from './DataTable';
import Modal from './Modal';
import { serviceAPI, vehicleAPI } from '../services/api';
import { Search, RefreshCw, PlusCircle, Wrench, Calendar, Ruler } from 'lucide-react';
import Autocomplete from './Autocomplete';
import VehicleFilter from './VehicleFilter';
import '../styles/forms.css';
import '../styles/books.css';
import RecordDetails from './RecordDetails';
import { useMonthFilter, filterByMonth } from '../context/MonthFilterContext';

const ServiceForm = ({ onSubmit, onCancel, initialData }) => {
  const [vehicles, setVehicles] = React.useState([]);
  const [formData, setFormData] = React.useState(initialData || { 
    date: new Date().toISOString().split('T')[0], 
    vehicleNumber: '',
    currentMileage: '',
    nextServiceMileage: '',
    nextServiceDate: '',
    cost: '',
    details: '',
    note: ''
  });

  React.useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const res = await vehicleAPI.get();
        setVehicles(Array.isArray(res.data) ? res.data : []);
      } catch (err) { console.error(err); }
    };
    fetchVehicles();
  }, []);

  React.useEffect(() => {
    if (initialData) {
      const formatDate = (d) => {
        if (!d) return '';
        try {
          return new Date(d).toISOString().split('T')[0];
        } catch (e) { return ''; }
      };
      setFormData({
        ...initialData,
        date: formatDate(initialData.date),
        nextServiceDate: formatDate(initialData.nextServiceDate)
      });
    }
  }, [initialData]);

  return (
    <form className="hire-form" onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }}>
      <div className="hire-form-scroll">
        <div className="form-section">
          <p className="form-section-title">Service Details</p>
          <div className="form-grid-2">
            <div className="form-group">
              <label>Service Date *</label>
              <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Vehicle Number *</label>
              <Autocomplete 
                options={vehicles.map(v => v.number)}
                value={formData.vehicleNumber}
                onChange={e => setFormData({...formData, vehicleNumber: e.target.value})}
                placeholder="Search vehicle..."
                required
              />
            </div>
          </div>
          <div className="form-grid-2" style={{ marginTop: '16px' }}>
            <div className="form-group">
              <label>Current Mileage (km)</label>
              <input type="number" placeholder="0" value={formData.currentMileage} onChange={e => setFormData({...formData, currentMileage: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Service Cost (LKR) *</label>
              <input type="number" required placeholder="0.00" value={formData.cost} onChange={e => setFormData({...formData, cost: e.target.value})} />
            </div>
          </div>
        </div>

        <div className="form-section">
          <p className="form-section-title">Next Service Schedule (Renew)</p>
          <div className="form-grid-2">
            <div className="form-group">
              <label>Next Service Date</label>
              <input type="date" value={formData.nextServiceDate} onChange={e => setFormData({...formData, nextServiceDate: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Next Service Mileage (km)</label>
              <input type="number" placeholder="0" value={formData.nextServiceMileage} onChange={e => setFormData({...formData, nextServiceMileage: e.target.value})} />
            </div>
          </div>
        </div>

        <div className="form-section">
          <p className="form-section-title">Technical Details</p>
          <div className="form-group">
            <label>Service Items / Details</label>
            <textarea placeholder="e.g. Engine oil, Air filter, Break pad check..." value={formData.details} onChange={e => setFormData({...formData, details: e.target.value})} rows={3} />
          </div>
          <div className="form-group" style={{ marginTop: '16px' }}>
            <label>Additional Notes</label>
            <textarea placeholder="Any other observations..." value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} rows={2} />
          </div>
        </div>
      </div>

      <div className="hire-form-footer">
        <div className="total-display">
          <span>Service Cost</span>
          <strong>LKR {parseFloat(formData.cost || 0).toLocaleString()}</strong>
        </div>
        <div className="modal-actions">
          <button type="button" className="cancel-btn" onClick={onCancel}>Cancel</button>
          <button type="submit" className="submit-btn">{initialData ? 'Update Record' : 'Save Service Record'}</button>
        </div>
      </div>
    </form>
  );
};

const ServiceBook = () => {
  const userRole = localStorage.getItem('kt_user_role');
  const canManage = ['Admin', 'Manager'].includes(userRole);

  const { selectedMonth, selectedYear, isFilterActive } = useMonthFilter();

  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [viewModalOpen, setViewModalOpen] = React.useState(false);
  const [selectedRecord, setSelectedRecord] = React.useState(null);
  const [defaultDate, setDefaultDate] = React.useState(new Date().toISOString().split('T')[0]);
  const [records, setRecords] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [editingRecord, setEditingRecord] = React.useState(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedVehicle, setSelectedVehicle] = React.useState(null);
  const [vehicles, setVehicles] = React.useState([]);
  const [successMsg, setSuccessMsg] = React.useState('');

  const columns = canManage 
    ? ['DATE', 'VEHICLE', 'MILEAGE', 'COST (LKR)', 'NEXT SERVICE', 'ACTION']
    : ['DATE', 'VEHICLE', 'MILEAGE', 'COST (LKR)', 'NEXT SERVICE'];

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
      const res = await serviceAPI.get();
      let raw = Array.isArray(res.data) ? res.data : [];
      
      // Global Month Filter
      raw = filterByMonth(raw, 'date', selectedMonth, selectedYear, isFilterActive);

      setRecords(raw.map(r => ({
        ...r,
        rawData: r,
        date_disp: r.date ? new Date(r.date).toLocaleDateString() : '—',
        next_disp: r.nextServiceDate ? new Date(r.nextServiceDate).toLocaleDateString() : (r.nextServiceMileage ? `${r.nextServiceMileage} km` : '—'),
        cost_disp: <span style={{ fontWeight: 600, color: '#2563EB' }}>{parseFloat(r.cost || 0).toLocaleString()}</span>,
        action: canManage ? (
          <div className="table-actions" onClick={e => e.stopPropagation()}>
            <button className="edit-btn" onClick={() => handleEdit(r)}>Edit</button>
            <button className="delete-btn" onClick={() => handleDelete(r._id)}>Delete</button>
          </div>
        ) : null
      })));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleAdd = async (data) => {
    try {
      if (editingRecord) {
        await serviceAPI.update(editingRecord._id, data);
        setSuccessMsg('Service record updated!');
      } else {
        await serviceAPI.create(data);
        setSuccessMsg('Service record saved & synced to Maintenance!');
        if (data.date) setDefaultDate(data.date);
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
    if (window.confirm('Delete this service record? (Note: Maintenance record will remain)')) {
      try {
        await serviceAPI.delete(id);
        setSuccessMsg('Record deleted');
        fetchRecords();
        setTimeout(() => setSuccessMsg(''), 3000);
      } catch (err) { console.error(err); }
    }
  };

  const filteredRecords = React.useMemo(() => {
    return records.filter(r => {
      const matchesSearch = !searchQuery || 
        (r.vehicleNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.details || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesVehicle = !selectedVehicle || r.vehicleNumber === selectedVehicle;
      
      return matchesSearch && matchesVehicle;
    });
  }, [records, searchQuery, selectedVehicle]);

  return (
    <div className="book-container">
      <div className="book-summary">
        <div className="summary-item">
          <label>TOTAL SERVICES</label>
          <h3>{records.length} Records</h3>
        </div>
        <div className="summary-item" style={{ borderRight: 'none' }}>
          <label>RECENT COST</label>
          <h3 style={{ color: '#2563EB' }}>
            LKR {records.slice(0, 5).reduce((sum, r) => sum + (parseFloat(r.cost) || 0), 0).toLocaleString()}
          </h3>
        </div>
      </div>
      
      <VehicleFilter 
        vehicles={vehicles} 
        selectedVehicle={selectedVehicle} 
        onSelect={setSelectedVehicle} 
      />

      <div className="book-filters">
        <div className="search-box">
          <Search className="search-icon" size={20} />
          <input 
            type="text" 
            placeholder="Search vehicle or details..." 
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
              <PlusCircle size={18} /> <span>New Service</span>
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
          vehicleNo: r.vehicleNumber,
          MILEAGE: r.currentMileage ? `${r.currentMileage} km` : '—',
          'COST (LKR)': r.cost_disp,
          'NEXT SERVICE': r.next_disp,
          ACTION: r.action
        }))}
        loading={loading}
        onRowClick={(row) => {
          setSelectedRecord(row);
          setViewModalOpen(true);
        }}
        emptyMessage="No service records found."
      />

      <Modal 
        isOpen={viewModalOpen} 
        onClose={() => setViewModalOpen(false)} 
        title="Service Record Details"
        wide
      >
        <RecordDetails data={selectedRecord} type="services" />
        <div className="modal-footer" style={{ padding: '15px 24px', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', background: '#F8FAFC' }}>
            <button className="secondary-btn" onClick={() => setViewModalOpen(false)}>Close</button>
        </div>
      </Modal>

      <Modal 
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingRecord(null); }}
        title={editingRecord ? 'Edit Service Record' : 'Record New Vehicle Service'}
      >
        <ServiceForm 
          onSubmit={handleAdd}
          onCancel={() => { setIsModalOpen(false); setEditingRecord(null); }}
          initialData={editingRecord || { date: defaultDate }}
        />
      </Modal>
    </div>
  );
};

export default ServiceBook;
