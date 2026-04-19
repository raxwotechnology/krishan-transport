import React from 'react';
import DataTable from './DataTable';
import Modal from './Modal';
import PaymentForm from './PaymentForm';
import { paymentAPI, vehicleAPI } from '../services/api';
import { generatePDFReport } from '../utils/reportGenerator';
import { Download } from 'lucide-react';
import '../styles/forms.css';
import VehicleFilter from './VehicleFilter';

const PaymentBook = () => {
  const userRole = localStorage.getItem('kt_user_role');
  const canManage = ['Admin', 'Manager'].includes(userRole);

  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [paymentRecords, setPaymentRecords] = React.useState([]);
  const [vehicles, setVehicles] = React.useState([]);
  const [selectedVehicle, setSelectedVehicle] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [editingItem, setEditingItem] = React.useState(null);

  const columns = canManage
    ? ['DATE', 'CLIENT', 'VEHICLE', 'HIRE AMT', 'PAID AMT', 'BALANCE', 'STATUS', 'ACTION']
    : ['DATE', 'CLIENT', 'VEHICLE', 'HIRE AMT', 'PAID AMT', 'BALANCE', 'STATUS'];
  
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
      const response = await paymentAPI.get();
      const rawData = Array.isArray(response.data) ? response.data : [];
      const formatted = rawData.map(item => ({
        ...item,
        date: new Date(item.date).toLocaleDateString(),
        hireAmount: `LKR ${item.hireAmount}`,
        paidAmount: `LKR ${item.paidAmount}`,
        balance: `LKR ${Number(item.balance).toFixed(2)}`,
        action: canManage ? (
          <div className="table-actions">
            <button className="edit-btn" onClick={() => handleEdit(item)}>Edit</button>
            <button className="delete-btn" onClick={() => handleDelete(item._id)}>Delete</button>
          </div>
        ) : null
      }));
      setPaymentRecords(formatted);
      setError(null);
    } catch (err) {
      console.error('Error fetching payments:', err);
      setError('Using offline payment records.');
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = React.useMemo(() => {
    if (!selectedVehicle) return paymentRecords;
    return paymentRecords.filter(r => r.vehicle === selectedVehicle);
  }, [paymentRecords, selectedVehicle]);

  const stats = React.useMemo(() => {
    const totalReceived = filteredRecords.reduce((sum, r) => sum + (parseFloat(r.paidAmount?.replace('LKR ', '')) || 0), 0);
    const outstanding = filteredRecords.reduce((sum, r) => sum + (parseFloat(r.balance?.replace('LKR ', '')) || 0), 0);
    return { totalReceived, outstanding, count: filteredRecords.length };
  }, [filteredRecords]);

  const handleAddPayment = async (data) => {
    try {
      if (editingItem) {
        await paymentAPI.update(editingItem._id, data);
      } else {
        await paymentAPI.create(data);
      }
      fetchRecords();
      setIsModalOpen(false);
      setEditingItem(null);
    } catch (err) {
      alert('Error saving payment: ' + err.message);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this payment record?')) {
      try {
        await paymentAPI.delete(id);
        fetchRecords();
      } catch (err) { alert('Error deleting record'); }
    }
  };

  const handleExportPDF = () => {
    const exportColumns = ['DATE', 'CLIENT', 'VEHICLE', 'HIRE AMT', 'PAID AMT', 'BALANCE', 'STATUS'];
    const exportData = filteredRecords.map(r => [
      r.date || '—',
      r.client || '—',
      r.vehicle || '—',
      r.hireAmount || '—',
      r.paidAmount || '—',
      r.balance || '—',
      r.status || '—'
    ]);
    
    generatePDFReport({
      title: 'Payment Book Report',
      columns: exportColumns,
      data: exportData,
      filename: `PaymentBook_Report_${new Date().toISOString().split('T')[0]}.pdf`
    });
  };

  return (
    <div className="book-container">
      <div className="book-summary">
        <div className="summary-item">
          <label>TOTAL RECEIVED</label>
          <h3>LKR {stats.totalReceived.toLocaleString()}</h3>
        </div>
        <div className="summary-item">
          <label>OUTSTANDING</label>
          <h3>LKR {stats.outstanding.toLocaleString()}</h3>
        </div>
        <div className="summary-item">
          <label>RECORDS</label>
          <h3>{stats.count}</h3>
        </div>
      </div>

      <VehicleFilter 
        vehicles={vehicles} 
        selectedVehicle={selectedVehicle} 
        onSelect={setSelectedVehicle} 
      />

      <div className="book-filters">
        <div className="search-box">
          <input type="text" placeholder="Search client..." />
        </div>
        <div className="filter-actions">
          <select>
            <option>All Months</option>
          </select>
          <select>
            <option>All Status</option>
            <option>Pending</option>
            <option>Paid</option>
          </select>
          <button className="secondary-btn" onClick={handleExportPDF} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Download size={16} /> Export PDF
          </button>
          {canManage && (
            <button className="add-btn" onClick={() => setIsModalOpen(true)}>+ Add Payment</button>
          )}
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <DataTable 
        columns={columns} 
        data={filteredRecords} 
        loading={loading}
        emptyMessage={loading ? "Loading..." : "No payment records found."} 
      />

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setEditingItem(null); }} 
        title={editingItem ? 'Edit Payment Record' : 'Add Payment Record'}
      >
        <PaymentForm 
          onSubmit={handleAddPayment} 
          onCancel={() => { setIsModalOpen(false); setEditingItem(null); }} 
          initialData={editingItem}
        />
      </Modal>
    </div>
  );
};

export default PaymentBook;
