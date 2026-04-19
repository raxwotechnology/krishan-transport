import React from 'react';
import DataTable from './DataTable';
import Modal from './Modal';
import DieselForm from './DieselForm';
import { dieselAPI, vehicleAPI } from '../services/api';
import { generatePDFReport } from '../utils/reportGenerator';
import { Download } from 'lucide-react';
import '../styles/forms.css';
import './DieselBook.css';
import VehicleFilter from './VehicleFilter';

const DieselBook = () => {
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [dieselRecords, setDieselRecords] = React.useState([]);
  const [vehicles, setVehicles] = React.useState([]);
  const [selectedVehicle, setSelectedVehicle] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [editingItem, setEditingItem] = React.useState(null);

  const columns = ['DATE', 'VEHICLE', 'LITERS', 'PRICE/L', 'TOTAL', 'ODOMETER', 'NOTE', 'ACTION'];

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
      const response = await dieselAPI.get();
      const rawData = Array.isArray(response.data) ? response.data : [];
      
      const formatted = rawData.map(item => ({
        ...item,
        date: new Date(item.date).toLocaleDateString(),
        total: `LKR ${Number(item.total).toFixed(2)}`,
        action: (
          <div className="table-actions">
            <button className="edit-btn" onClick={() => handleEdit(item)}>Edit</button>
            <button className="delete-btn" onClick={() => handleDelete(item._id)}>Delete</button>
          </div>
        )
      }));
      setDieselRecords(formatted);
      setError(null);
    } catch (err) {
      console.error('Error fetching diesel records:', err);
      setError('Could not load records. Using offline data.');
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = React.useMemo(() => {
    if (!selectedVehicle) return dieselRecords;
    return dieselRecords.filter(r => r.vehicle === selectedVehicle);
  }, [dieselRecords, selectedVehicle]);

  // Summary Calculations
  const stats = React.useMemo(() => {
    const totalLiters = filteredRecords.reduce((sum, r) => sum + (parseFloat(r.liters) || 0), 0);
    const totalCost = filteredRecords.reduce((sum, r) => sum + (parseFloat(r.total?.replace('LKR ', '')) || 0), 0);
    const avgPrice = totalLiters > 0 ? totalCost / totalLiters : 0;
    return { totalLiters, totalCost, avgPrice };
  }, [filteredRecords]);

  const handleAddEntry = async (data) => {
    try {
      if (editingItem) {
        await dieselAPI.update(editingItem._id, data);
      } else {
        await dieselAPI.create(data);
      }
      fetchRecords();
      setIsModalOpen(false);
      setEditingItem(null);
    } catch (err) {
      alert('Error saving record: ' + err.message);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this diesel record?')) {
      try {
        await dieselAPI.delete(id);
        fetchRecords();
      } catch (err) { alert('Error deleting record'); }
    }
  };

  const handleExportPDF = () => {
    const exportColumns = ['DATE', 'VEHICLE', 'LITERS', 'PRICE/L', 'TOTAL', 'ODOMETER', 'NOTE'];
    const exportData = filteredRecords.map(r => [
      r.date || '—',
      r.vehicle || '—',
      r.liters || '—',
      r.pricePerLiter ? `LKR ${r.pricePerLiter}` : '—',
      r.total || '—',
      r.odometer || '—',
      r.note || '—'
    ]);
    
    generatePDFReport({
      title: 'Diesel Book Report',
      columns: exportColumns,
      data: exportData,
      filename: `DieselBook_Report_${new Date().toISOString().split('T')[0]}.pdf`
    });
  };

  return (
    <div className="book-container">
      <div className="book-summary">
        <div className="summary-item">
          <label>TOTAL LITERS</label>
          <h3>{stats.totalLiters.toFixed(1)} L</h3>
        </div>
        <div className="summary-item">
          <label>TOTAL COST</label>
          <h3>LKR {stats.totalCost.toLocaleString()}</h3>
        </div>
        <div className="summary-item">
          <label>AVG/LITER</label>
          <h3>LKR {stats.avgPrice.toFixed(2)}</h3>
        </div>
      </div>

      <VehicleFilter 
        vehicles={vehicles} 
        selectedVehicle={selectedVehicle} 
        onSelect={setSelectedVehicle} 
      />

      <div className="book-filters">
        <div className="search-box">
          <input type="text" placeholder="Search vehicle..." />
        </div>
        <div className="filter-actions">
          <select>
            <option>All Months</option>
          </select>
          <button className="secondary-btn" onClick={handleExportPDF} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Download size={16} /> Export PDF
          </button>
          <button className="add-btn" onClick={() => setIsModalOpen(true)}>+ Add Entry</button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <DataTable 
        columns={columns} 
        data={filteredRecords} 
        loading={loading}
        emptyMessage={loading ? "Loading..." : "No diesel records found."} 
      />

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setEditingItem(null); }} 
        title={editingItem ? 'Edit Diesel Entry' : 'Add Diesel Entry'}
      >
        <DieselForm 
          onSubmit={handleAddEntry} 
          onCancel={() => { setIsModalOpen(false); setEditingItem(null); }} 
          initialData={editingItem}
        />
      </Modal>
    </div>
  );
};

export default DieselBook;
