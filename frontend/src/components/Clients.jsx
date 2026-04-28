import React from 'react';
import DataTable from './DataTable';
import Modal from './Modal';
import ClientForm from './ClientForm';
import { clientAPI } from '../services/api';
import { generatePDFReport } from '../utils/reportGenerator';
import { Download, Search } from 'lucide-react';
import '../styles/forms.css';
import '../styles/books.css';
import RecordDetails from './RecordDetails';

const Clients = () => {
  const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const userRole = localStorage.getItem('kt_user_role');
  const canManage = isDev || ['Admin', 'Manager'].includes(userRole);

  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [viewModalOpen, setViewModalOpen] = React.useState(false);
  const [selectedRecord, setSelectedRecord] = React.useState(null);
  const [clientRecords, setClientRecords] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [editingItem, setEditingItem] = React.useState(null);
  const [searchQuery, setSearchQuery] = React.useState('');

  const columns = canManage
    ? ['CLIENT NAME', 'CONTACT', 'TOTAL HIRES', 'OUTSTANDING', 'STATUS', 'ACTION']
    : ['CLIENT NAME', 'CONTACT', 'TOTAL HIRES', 'OUTSTANDING', 'STATUS'];
  
  React.useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const response = await clientAPI.get();
      const formatted = (response.data || []).map(item => ({
        ...item,
        rawData: item, // Store original for Editing
        name: item.name || '—',
        contact: item.contact || '—',
        outstanding_val: item.outstanding || 0,
        outstanding: `LKR ${(item.outstanding || 0).toLocaleString()}`,
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
      setClientRecords(formatted);
      setError(null);
    } catch (err) {
      console.error('Error fetching clients:', err);
      setError('Could not load client records.');
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = React.useMemo(() => {
    return clientRecords.filter(r => {
      return !searchQuery || 
        (r.name    || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.contact || '').toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [clientRecords, searchQuery]);

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
    const target = item.rawData || item;
    setEditingItem(target);
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
    const exportData = filteredRecords.map(r => [
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
    const totalClients = filteredRecords.length;
    const activeClients = filteredRecords.filter(c => c.status === 'Active').length;
    return { totalClients, activeClients };
  }, [filteredRecords]);

  return (
    <div className="book-container">
      <div className="book-summary">
        <div className="summary-item">
          <label>TOTAL CLIENTS</label>
          <h3>{stats.totalClients}</h3>
        </div>
        <div className="summary-item" style={{ borderRight: 'none' }}>
          <label>ACTIVE CLIENTS</label>
          <h3 style={{ color: '#10B981' }}>{stats.activeClients}</h3>
        </div>
      </div>

      <div className="book-filters">
        <div className="search-box">
          <Search className="search-icon" size={16} />
          <input 
            type="text" 
            placeholder="Search by name or contact..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="filter-actions" style={{ marginLeft: 'auto', display: 'flex', gap: '1rem' }}>
          <button className="secondary-btn" onClick={handleExportPDF} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Download size={16} /> Export PDF
          </button>
          {canManage && (
            <button className="add-btn" onClick={() => { setEditingItem(null); setIsModalOpen(true); }}>
              + Add New Client
            </button>
          )}
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <DataTable 
        columns={columns} 
        data={filteredRecords} 
        loading={loading}
        onRowClick={(row) => { setSelectedRecord(row); setViewModalOpen(true); }}
        emptyMessage={loading ? "Loading..." : "No client records found."} 
      />

      <Modal 
        isOpen={viewModalOpen} 
        onClose={() => setViewModalOpen(false)} 
        title="Client Profile Details"
      >
        <RecordDetails data={selectedRecord} type="client" />
        <div className="modal-footer" style={{ padding: '15px 24px', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', background: '#F8FAFC' }}>
            <button className="secondary-btn" onClick={() => setViewModalOpen(false)}>Close</button>
        </div>
      </Modal>

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
