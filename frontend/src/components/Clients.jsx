import React from 'react';
import DataTable from './DataTable';
import Modal from './Modal';
import ClientForm from './ClientForm';
import { clientAPI } from '../services/api';
import { generatePDFReport } from '../utils/reportGenerator';
import { Download } from 'lucide-react';
import '../styles/forms.css';

const Clients = () => {
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [clientRecords, setClientRecords] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [editingItem, setEditingItem] = React.useState(null);

  const columns = ['CLIENT NAME', 'CONTACT', 'TOTAL HIRES', 'OUTSTANDING', 'STATUS', 'ACTION'];
  
  React.useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      const response = await clientAPI.get();
      const formatted = response.data.map(item => ({
        ...item,
        outstanding: `LKR ${item.outstanding}`,
        action: (
          <div className="table-actions">
            <button className="edit-btn" onClick={() => handleEdit(item)}>Edit</button>
            <button className="delete-btn" onClick={() => handleDelete(item._id)}>Delete</button>
          </div>
        )
      }));
      setClientRecords(formatted);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching clients:', err);
      setLoading(false);
    }
  };

  const handleAddClient = async (data) => {
    try {
      if (editingItem) {
        await clientAPI.update(editingItem._id, data);
      } else {
        await clientAPI.create(data);
      }
      fetchRecords();
      setIsModalOpen(false);
      setEditingItem(null);
    } catch (err) {
      alert('Error saving client: ' + err.message);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this client?')) {
      try {
        await clientAPI.delete(id);
        fetchRecords();
      } catch (err) { alert('Error deleting client'); }
    }
  };

  const handleExportPDF = () => {
    const exportColumns = ['CLIENT NAME', 'CONTACT', 'TOTAL HIRES', 'OUTSTANDING', 'STATUS'];
    const exportData = clientRecords.map(r => [
      r.name || '—',
      r.contact || '—',
      r.totalHires?.toString() || '0',
      r.outstanding || '—',
      r.status || '—'
    ]);
    
    generatePDFReport({
      title: 'Clients Report',
      columns: exportColumns,
      data: exportData,
      filename: `Clients_Report_${new Date().toISOString().split('T')[0]}.pdf`
    });
  };

  const stats = React.useMemo(() => {
    const totalClients = clientRecords.length;
    const activeClients = clientRecords.filter(c => c.status === 'Active').length;
    return { totalClients, activeClients };
  }, [clientRecords]);
  return (
    <div className="book-container">
      <div className="book-summary">
        <div className="summary-item">
          <label>TOTAL CLIENTS</label>
          <h3>{stats.totalClients}</h3>
        </div>
        <div className="summary-item">
          <label>ACTIVE CLIENTS</label>
          <h3>{stats.activeClients}</h3>
        </div>
      </div>

      <div className="book-filters">
        <div className="search-box">
          <input type="text" placeholder="Search customer..." />
        </div>
        <div className="filter-actions">
          <button className="secondary-btn" onClick={handleExportPDF} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Download size={16} /> Export PDF
          </button>
          <button className="add-btn" onClick={() => setIsModalOpen(true)}>+ New Client</button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <DataTable 
        columns={columns} 
        data={clientRecords} 
        loading={loading}
        emptyMessage={loading ? "Loading..." : "No client records found."} 
      />

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setEditingItem(null); }} 
        title={editingItem ? 'Edit Client' : 'Add New Client'}
      >
        <ClientForm 
          onSubmit={handleAddClient} 
          onCancel={() => { setIsModalOpen(false); setEditingItem(null); }} 
          initialData={editingItem}
        />
      </Modal>
    </div>
  );
};

export default Clients;
