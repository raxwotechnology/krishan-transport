import React from 'react';
import DataTable from './DataTable';
import Modal from './Modal';
import { vehicleAPI, markLeasePayment } from '../services/api';
import { generatePDFReport } from '../utils/reportGenerator';
import { Download, Search, RefreshCw, PlusCircle, CheckCircle, XCircle, CreditCard } from 'lucide-react';
import '../styles/forms.css';
import '../styles/books.css';
import RecordDetails from './RecordDetails';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const LeasingBook = ({ vehicles }) => {
  const now = new Date();
  const [selYear, setSelYear] = React.useState(now.getFullYear());
  const leasingVehicles = vehicles.filter(v => v.rawData?.hasLeasing);

  if (leasingVehicles.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>
        <CreditCard size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
        <p style={{ fontWeight: 600 }}>No vehicles with active leasing found.</p>
      </div>
    );
  }

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);
  const totalPaid = leasingVehicles.reduce((sum, v) => {
    const paidMonths = (v.rawData?.leasePayments || []).filter(lp => lp.year === selYear && lp.paid).length;
    return sum + paidMonths * (parseFloat(v.rawData?.monthlyPremium) || 0);
  }, 0);
  const totalPending = leasingVehicles.reduce((sum, v) => {
    const paidMonths = (v.rawData?.leasePayments || []).filter(lp => lp.year === selYear && lp.paid).length;
    const totalMonths = selYear < now.getFullYear() ? 12 : now.getMonth() + 1;
    return sum + (totalMonths - paidMonths) * (parseFloat(v.rawData?.monthlyPremium) || 0);
  }, 0);

  return (
    <div style={{ padding: '20px' }}>
      {/* Summary & Year selector */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ background: '#D1FAE5', borderRadius: '12px', padding: '12px 20px' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#065F46', textTransform: 'uppercase' }}>Paid This Year</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#059669' }}>LKR {totalPaid.toLocaleString()}</div>
          </div>
          <div style={{ background: '#FEE2E2', borderRadius: '12px', padding: '12px 20px' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#991B1B', textTransform: 'uppercase' }}>Pending This Year</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#DC2626' }}>LKR {totalPending.toLocaleString()}</div>
          </div>
        </div>
        <select value={selYear} onChange={e => setSelYear(Number(e.target.value))}
          style={{ padding: '8px 14px', borderRadius: '10px', border: '1px solid #E2E8F0', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Per-vehicle table */}
      {leasingVehicles.map(v => {
        const rd = v.rawData || {};
        const payments = rd.leasePayments || [];
        return (
          <div key={v._id} style={{ background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0', marginBottom: '16px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ padding: '14px 20px', background: 'linear-gradient(135deg, #EFF6FF, #DBEAFE)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 800, color: '#1E293B', fontSize: '1rem' }}>{rd.number}</div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 500 }}>{rd.leasingCompany || 'Unknown Company'} · LKR {parseFloat(rd.monthlyPremium || 0).toLocaleString()}/month</div>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#2563EB', fontWeight: 700 }}>Due Day: {rd.leaseDueDate || '—'}</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px', padding: '16px' }}>
              {MONTHS.map((mName, mIdx) => {
                const month = mIdx + 1;
                const entry = payments.find(lp => lp.year === selYear && lp.month === month);
                const isPaid = entry?.paid || false;
                const isFuture = selYear === now.getFullYear() && month > now.getMonth() + 1;
                return (
                  <button key={month} disabled={true}
                    title={isPaid ? 'Paid' : isFuture ? 'Future month' : 'Unpaid'}
                    style={{
                      padding: '10px 6px', borderRadius: '10px', border: 'none', cursor: isFuture ? 'default' : 'pointer',
                      background: isFuture ? '#F8FAFC' : isPaid ? '#D1FAE5' : '#FEF2F2',
                      color: isFuture ? '#CBD5E1' : isPaid ? '#059669' : '#DC2626',
                      fontWeight: 700, fontSize: '0.72rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                      transition: 'all 0.2s ease', opacity: isFuture ? 0.5 : 1,
                      boxShadow: isPaid ? '0 0 0 1px #6EE7B7' : isFuture ? 'none' : '0 0 0 1px #FCA5A5'
                    }}>
                    <span>{mName}</span>
                    {isFuture ? <span style={{ fontSize: '0.6rem' }}>—</span>
                      : isPaid ? <CheckCircle size={14} /> : <XCircle size={14} />}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};


const VehicleForm = ({ onSubmit, onCancel, initialData }) => {
  const [formData, setFormData] = React.useState(initialData || { number: '', model: '', type: '', fuelType: 'Diesel', status: 'Active' });

  React.useEffect(() => {
    if (initialData) {
      setFormData({ fuelType: 'Diesel', hourlyRate: 0, ...initialData });
    } else {
      setFormData({ number: '', model: '', type: '', fuelType: 'Diesel', status: 'Active', hourlyRate: 0 });
    }
  }, [initialData]);

  return (
    <form className="hire-form" onSubmit={(e) => {
      e.preventDefault();
      const finalData = { ...formData };
      if (finalData.type === 'Other' && finalData.customType) {
        finalData.type = finalData.customType;
      }
      onSubmit(finalData);
    }}>
      <div className="hire-form-scroll">

        <div className="form-section">
          <p className="form-section-title">Vehicle Identity</p>
          <div className="form-group">
            <label>Registration Number (Required) *</label>
            <input
              type="text"
              placeholder="e.g. WP-1234"
              required
              value={formData.number}
              onChange={e => setFormData({ ...formData, number: e.target.value.toUpperCase() })}
            />
          </div>
        </div>

        <div className="form-section">
          <p className="form-section-title">Specifications</p>
          <div className="form-grid-2">
            <div className="form-group">
              <label>Model / Variant</label>
              <input
                type="text"
                placeholder="e.g. Isuzu Elf"
                value={formData.model}
                onChange={e => setFormData({ ...formData, model: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Body Type</label>
              <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}>
                <option value="">Select Type</option>
                <option value="Truck">Truck</option>
                <option value="Mini Truck">Mini Truck</option>
                <option value="Van">Van</option>
                <option value="Mini Van">Mini Van</option>
                <option value="Prime Mover">Prime Mover</option>
                <option value="Crane">Crane</option>
                <option value="Tipper">Tipper</option>
                <option value="Flatbed">Flatbed</option>
                <option value="Pickup">Pickup</option>
                <option value="Bus">Bus</option>
                <option value="Other">Other</option>
              </select>
            </div>
            {formData.type === 'Other' && (
              <div className="form-group">
                <label>Specify Category</label>
                <input
                  type="text"
                  placeholder="e.g. Forklift, Excavator"
                  value={formData.customType || ''}
                  onChange={e => setFormData({ ...formData, customType: e.target.value })}
                  required
                />
              </div>
            )}
          </div>
          <div className="form-grid-2" style={{ marginTop: '16px' }}>
            <div className="form-group">
              <label>Fuel Type</label>
              <select value={formData.fuelType || 'Diesel'} onChange={e => setFormData({ ...formData, fuelType: e.target.value })}>
                <option value="Diesel">Diesel</option>
                <option value="Petrol">Petrol</option>
              </select>
            </div>
            <div className="form-group">
              <label>Current Status</label>
              <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                <option value="Active">Active</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div className="form-group" style={{ marginTop: '16px' }}>
            <label>One Hour Rate (LKR)</label>
            <input
              type="number"
              placeholder="0.00"
              value={formData.hourlyRate || ''}
              onChange={e => setFormData({ ...formData, hourlyRate: e.target.value })}
            />
          </div>
        </div>

        <div className="form-section">
          <p className="form-section-title">Leasing Status</p>
          <div className="form-group" style={{ marginBottom: '15px' }}>
            <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={formData.hasLeasing}
                onChange={e => setFormData({ ...formData, hasLeasing: e.target.checked })}
              />
              <span>This vehicle has an active lease</span>
            </label>
          </div>

          {formData.hasLeasing && (
            <div className="form-grid-2">
              <div className="form-group">
                <label>Leasing Company Name</label>
                <input
                  type="text"
                  placeholder="e.g. People's Leasing"
                  value={formData.leasingCompany || ''}
                  onChange={e => setFormData({ ...formData, leasingCompany: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Monthly Premium (LKR)</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={formData.monthlyPremium || ''}
                  onChange={e => setFormData({ ...formData, monthlyPremium: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Monthly Due Date (Day)</label>
                <input
                  type="number"
                  min="1" max="31"
                  placeholder="e.g. 20"
                  value={formData.leaseDueDate || ''}
                  onChange={e => setFormData({ ...formData, leaseDueDate: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Lease Start Date</label>
                <input
                  type="date"
                  value={formData.leaseStartDate ? formData.leaseStartDate.split('T')[0] : ''}
                  onChange={e => setFormData({ ...formData, leaseStartDate: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Final Premium Date</label>
                <input
                  type="date"
                  value={formData.leaseFinalDate ? formData.leaseFinalDate.split('T')[0] : ''}
                  onChange={e => setFormData({ ...formData, leaseFinalDate: e.target.value })}
                />
              </div>
            </div>
          )}
        </div>

        <div className="form-section">
          <p className="form-section-title">Speed Draft Status</p>
          <div className="form-group" style={{ marginBottom: '15px' }}>
            <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={formData.hasSpeedDraft || false}
                onChange={e => setFormData({ ...formData, hasSpeedDraft: e.target.checked })}
              />
              <span>This vehicle has an active Speed Draft</span>
            </label>
          </div>

          {formData.hasSpeedDraft && (
            <div className="form-grid-2">
              <div className="form-group">
                <label>Speed Draft Company</label>
                <input
                  type="text"
                  placeholder="e.g. Bank Name"
                  value={formData.speedDraftCompany || ''}
                  onChange={e => setFormData({ ...formData, speedDraftCompany: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Monthly Premium (LKR)</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={formData.speedDraftMonthlyPremium || ''}
                  onChange={e => setFormData({ ...formData, speedDraftMonthlyPremium: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Monthly Due Date (Day)</label>
                <input
                  type="number"
                  min="1" max="31"
                  placeholder="e.g. 15"
                  value={formData.speedDraftDueDate || ''}
                  onChange={e => setFormData({ ...formData, speedDraftDueDate: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Speed Draft Start Date</label>
                <input
                  type="date"
                  value={formData.speedDraftStartDate ? formData.speedDraftStartDate.split('T')[0] : ''}
                  onChange={e => setFormData({ ...formData, speedDraftStartDate: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Final Premium Date</label>
                <input
                  type="date"
                  value={formData.speedDraftFinalDate ? formData.speedDraftFinalDate.split('T')[0] : ''}
                  onChange={e => setFormData({ ...formData, speedDraftFinalDate: e.target.value })}
                />
              </div>
            </div>
          )}
        </div>

        <div className="form-section">
          <p className="form-section-title">Insurance Compliance</p>
          <div className="form-grid-2">
            <div className="form-group">
              <label>Effective Date</label>
              <input
                type="date"
                value={formData.insuranceEffectiveDate ? formData.insuranceEffectiveDate.split('T')[0] : ''}
                onChange={e => setFormData({ ...formData, insuranceEffectiveDate: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Expiration Date</label>
              <input
                type="date"
                value={formData.insuranceExpirationDate ? formData.insuranceExpirationDate.split('T')[0] : ''}
                onChange={e => setFormData({ ...formData, insuranceExpirationDate: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <p className="form-section-title">License & Safety Certificates</p>
          <div className="form-grid-2">
            <div className="form-group">
              <label>License Expiry Date</label>
              <input
                type="date"
                value={formData.licenseExpirationDate ? formData.licenseExpirationDate.split('T')[0] : ''}
                onChange={e => setFormData({ ...formData, licenseExpirationDate: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Safety Certificate Expiry</label>
              <input
                type="date"
                value={formData.safetyExpirationDate ? formData.safetyExpirationDate.split('T')[0] : ''}
                onChange={e => setFormData({ ...formData, safetyExpirationDate: e.target.value })}
              />
            </div>
          </div>
        </div>

      </div>

      <div className="hire-form-footer">
        <div className="total-display">
          <span>Type · Fuel</span>
          <strong>{formData.type || 'Fleet Item'} · {formData.fuelType || 'Diesel'}</strong>
        </div>
        <div className="modal-actions">
          <button type="button" className="cancel-btn" onClick={onCancel}>Cancel</button>
          <button type="submit" className="submit-btn">{initialData ? 'Update Vehicle' : 'Register Vehicle'}</button>
        </div>
      </div>
    </form>
  );
};

const Vehicles = () => {
  const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const userRole = localStorage.getItem('kt_user_role');
  const canManage = isDev || ['Admin', 'Manager'].includes(userRole);

  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [viewModalOpen, setViewModalOpen] = React.useState(false);
  const [selectedRecord, setSelectedRecord] = React.useState(null);
  const [vehicleRecords, setVehicleRecords] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [editingVehicle, setEditingVehicle] = React.useState(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [successMsg, setSuccessMsg] = React.useState('');
  const [errorMsg, setErrorMsg] = React.useState('');
  const [activeTab, setActiveTab] = React.useState('fleet');

  const columns = canManage
    ? ['VEHICLE NUMBER', 'MODEL', 'TYPE', 'FUEL TYPE', 'STATUS', 'ACTION']
    : ['VEHICLE NUMBER', 'MODEL', 'TYPE', 'FUEL TYPE', 'STATUS'];

  React.useEffect(() => { fetchVehicles(); }, []);

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const res = await vehicleAPI.get();
      const raw = Array.isArray(res.data) ? res.data : [];
      const formatted = raw.map(v => ({
        ...v,
        rawData: v, // Store original for Editing
        number: v.number || '—',
        model: v.model || '—',
        type: v.type || '—',
        fuelType_disp: (
          <span className={`status-badge ${(v.fuelType || 'Diesel') === 'Petrol' ? 'status-pending' : 'status-active'}`}
            style={(v.fuelType || 'Diesel') === 'Petrol'
              ? { background: '#EDE9FE', color: '#7C3AED', border: '1px solid #C4B5FD' }
              : { background: '#D1FAE5', color: '#065F46', border: '1px solid #6EE7B7' }}
          >
            {v.fuelType || 'Diesel'}
          </span>
        ),
        status_text: v.status || 'Active',
        status_disp: (
          <span className={`status-badge ${v.status === 'Active' ? 'status-active' : v.status === 'Maintenance' ? 'status-pending' : v.status === 'Inactive' ? 'status-inactive' : ''}`}>
            {v.status || 'Active'}
          </span>
        ),
        action: canManage ? (
          <div className="table-actions" onClick={e => e.stopPropagation()}>
            <button className="edit-btn" onClick={() => handleEdit(v)}>Edit</button>
            <button className="delete-btn" onClick={() => handleDelete(v._id)}>Delete</button>
          </div>
        ) : null
      }));
      setVehicleRecords(formatted);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const filteredRecords = React.useMemo(() => {
    return vehicleRecords.filter(r => {
      return !searchQuery ||
        (r.number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.model || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.type || '').toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [vehicleRecords, searchQuery]);

  const stats = React.useMemo(() => {
    return {
      total: vehicleRecords.length,
      active: vehicleRecords.filter(v => v.status_text === 'Active').length
    };
  }, [vehicleRecords]);

  const handleAdd = async (data) => {
    try {
      setErrorMsg('');
      const payload = { ...data, number: (data.number || '').trim() };

      if (editingVehicle) {
        await vehicleAPI.update(editingVehicle._id, payload);
        setSuccessMsg('Vehicle updated successfully!');
      } else {
        await vehicleAPI.create(payload);
        setSuccessMsg('Vehicle registered successfully!');
      }
      fetchVehicles();
      setIsModalOpen(false);
      setEditingVehicle(null);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || err.message || 'Error saving vehicle';
      setErrorMsg(msg);
    }
  };

  const handleEdit = (vehicle) => {
    const target = vehicle.rawData || vehicle;
    setEditingVehicle(target);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this vehicle from fleet?')) {
      try {
        await vehicleAPI.delete(id);
        setSuccessMsg('Vehicle deleted successfully');
        fetchVehicles();
        setTimeout(() => setSuccessMsg(''), 3000);
      } catch (err) { alert('Error deleting vehicle'); }
    }
  };

  const handleExportPDF = () => {
    const exportColumns = ['VEHICLE NUMBER', 'MODEL', 'TYPE', 'FUEL TYPE', 'STATUS'];
    const exportData = filteredRecords.map(v => [
      v.number || '—',
      v.model || '—',
      v.type || '—',
      v.fuelType || 'Diesel',
      v.status_text || '—'
    ]);

    generatePDFReport({
      title: 'Fleet Inventory Report',
      columns: exportColumns,
      data: exportData,
      filename: `Fleet_Report_${new Date().toISOString().split('T')[0]}.pdf`
    });
  };

  return (
    <div className="book-container">
      <div className="book-summary">
        <div className="summary-item">
          <label>TOTAL FLEET</label>
          <h3>{stats.total} Units</h3>
        </div>
        <div className="summary-item" style={{ borderRight: 'none' }}>
          <label>ACTIVE STAFF</label>
          <h3 style={{ color: '#10B981' }}>{stats.active} Operating</h3>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '8px', padding: '0 20px 16px', borderBottom: '1px solid #E2E8F0' }}>
        {[{id:'fleet',label:'Fleet List'},{id:'leasing',label:'Leasing Book'}].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '8px 20px', borderRadius: '10px', border: 'none', cursor: 'pointer',
              fontWeight: 700, fontSize: '0.82rem',
              background: activeTab === tab.id ? '#2563EB' : '#F1F5F9',
              color: activeTab === tab.id ? 'white' : '#64748B',
              transition: 'all 0.2s ease'
            }}>{tab.label}</button>
        ))}
      </div>

      <div className="book-filters">
        <div className="search-box">
          <Search className="search-icon" size={20} />
          <input
            type="text"
            placeholder="Search number, model, type..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="filter-actions">
          <button className="secondary-btn" onClick={fetchVehicles} title="Refresh">
            <RefreshCw size={18} className={loading ? 'spinner' : ''} />
          </button>
          <button className="secondary-btn" onClick={handleExportPDF}>
            <Download size={18} /> <span>PDF Report</span>
          </button>
          {canManage && (
            <button className="add-btn" onClick={() => { setEditingVehicle(null); setIsModalOpen(true); }}>
              <PlusCircle size={18} /> <span>Add Vehicle</span>
            </button>
          )}
        </div>
      </div>

      {successMsg && <div className="success-banner" style={{ margin: '0 20px 20px' }}>{successMsg}</div>}
      {errorMsg && <div className="error-banner" style={{ margin: '0 20px 20px' }}>{errorMsg}</div>}

      {activeTab === 'leasing' ? (
        <LeasingBook vehicles={vehicleRecords} />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={filteredRecords}
            loading={loading}
            onRowClick={(row) => { setSelectedRecord(row); setViewModalOpen(true); }}
            emptyMessage={loading ? "Loading fleet data..." : "No vehicles registered."}
          />

          <Modal
            isOpen={viewModalOpen}
            onClose={() => setViewModalOpen(false)}
            title="Vehicle Profile Details"
          >
            <RecordDetails data={selectedRecord} type="vehicle" />
            <div className="modal-footer" style={{ padding: '15px 24px', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', background: '#F8FAFC' }}>
              <button className="secondary-btn" onClick={() => setViewModalOpen(false)}>Close</button>
            </div>
          </Modal>
        </>
      )}


      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingVehicle(null); }}
        title={editingVehicle ? 'Edit Vehicle Profile' : 'Register New Vehicle'}
      >
        <VehicleForm
          onSubmit={handleAdd}
          onCancel={() => { setIsModalOpen(false); setEditingVehicle(null); }}
          initialData={editingVehicle}
        />
      </Modal>
    </div>
  );
};

export default Vehicles;
