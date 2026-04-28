import React, { useState, useEffect } from 'react';
import { vehicleAPI } from '../services/api';
import DataTable from './DataTable';
import { ShieldCheck, FileText, CreditCard, Calendar, Search, RefreshCw, AlertCircle } from 'lucide-react';
import '../styles/books.css';

const ComplianceBook = () => {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await vehicleAPI.get();
      setVehicles(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to fetch compliance data:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-CA').replace(/-/g, '.');
  };

  const isExpiringSoon = (date) => {
    if (!date) return false;
    const expDate = new Date(date);
    const today = new Date();
    const diffTime = expDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 30;
  };

  const filteredVehicles = vehicles.filter(v => 
    v.number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 1. Insurance Renewal Schedule
  const insuranceData = [...filteredVehicles]
    .filter(v => v.insuranceExpirationDate)
    .sort((a, b) => new Date(a.insuranceExpirationDate) - new Date(b.insuranceExpirationDate))
    .map(v => ({
      renewalDate: (
        <span style={{ fontWeight: 'bold', color: isExpiringSoon(v.insuranceExpirationDate) ? '#EF4444' : 'inherit' }}>
          {formatDate(v.insuranceExpirationDate)}
          {isExpiringSoon(v.insuranceExpirationDate) && <AlertCircle size={14} style={{ marginLeft: '5px', verticalAlign: 'middle' }} />}
        </span>
      ),
      vehicleNumber: v.number,
      number: v.number
    }));

  // 2. License Renewal Schedule
  const licenseData = [...filteredVehicles]
    .filter(v => v.licenseExpirationDate)
    .sort((a, b) => new Date(a.licenseExpirationDate) - new Date(b.licenseExpirationDate))
    .map(v => ({
      renewalDate: formatDate(v.licenseExpirationDate),
      number: v.number
    }));

  // 3. Safety Certificate Schedule
  const safetyData = [...filteredVehicles]
    .filter(v => v.safetyExpirationDate)
    .sort((a, b) => new Date(a.safetyExpirationDate) - new Date(b.safetyExpirationDate))
    .map(v => ({
      renewalDate: formatDate(v.safetyExpirationDate),
      number: v.number
    }));

  // 4. Monthly Leasing Plan
  const leasingPlan = [...filteredVehicles]
    .filter(v => v.hasLeasing && v.leaseDueDate)
    .sort((a, b) => a.leaseDueDate - b.leaseDueDate)
    .map(v => ({
      date: v.leaseDueDate,
      number: v.number,
      amount: `LKR ${(v.monthlyPremium || 0).toLocaleString()}`,
      finalDate: formatDate(v.leaseFinalDate)
    }));

  const [activeTab, setActiveTab] = useState('insurance');

  const tabs = [
    { id: 'insurance', label: 'Insurance', icon: ShieldCheck, color: '#3B82F6' },
    { id: 'licenses', label: 'Licenses', icon: FileText, color: '#10B981' },
    { id: 'safety', label: 'Safety Certs', icon: Calendar, color: '#F59E0B' },
    { id: 'leasing', label: 'Leasing Plan', icon: CreditCard, color: '#8B5CF6' },
  ];

  return (
    <div className="book-container">
      
      {/* Search and Global Actions */}
      <div className="book-filters" style={{ marginBottom: '20px' }}>
        <div className="search-box">
          <Search className="search-icon" size={20} />
          <input 
            type="text" 
            placeholder="Search by vehicle number..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="secondary-btn" onClick={fetchData} title="Refresh Data">
          <RefreshCw size={18} className={loading ? 'spinner' : ''} />
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="compliance-tabs" style={{ 
        display: 'flex', 
        gap: '10px', 
        marginBottom: '20px', 
        padding: '0 5px',
        overflowX: 'auto',
        paddingBottom: '5px'
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: '8px',
              border: '1px solid',
              borderColor: activeTab === tab.id ? tab.color : '#E2E8F0',
              background: activeTab === tab.id ? `${tab.color}10` : 'white',
              color: activeTab === tab.id ? tab.color : '#64748B',
              fontWeight: activeTab === tab.id ? 'bold' : 'normal',
              cursor: 'pointer',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap'
            }}
          >
            <tab.icon size={18} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Conditional Content Rendering */}
      <div className="compliance-content" style={{ padding: '0 5px' }}>
        
        {activeTab === 'insurance' && (
          <div className="compliance-card" style={{ background: 'white', borderRadius: '12px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
            <div style={{ padding: '15px 20px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ShieldCheck size={20} color="#3B82F6" />
                <h3 style={{ margin: 0, fontSize: '1rem', color: '#1E293B' }}>Insurance Renewal Schedule</h3>
              </div>
              <span style={{ fontSize: '0.85rem', color: '#64748B' }}>{insuranceData.length} Records</span>
            </div>
            <DataTable 
              columns={['RENEWAL DATE', 'VEHICLE NUMBER']}
              data={insuranceData}
              loading={loading}
            />
          </div>
        )}

        {activeTab === 'licenses' && (
          <div className="compliance-card" style={{ background: 'white', borderRadius: '12px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
            <div style={{ padding: '15px 20px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FileText size={20} color="#10B981" />
                <h3 style={{ margin: 0, fontSize: '1rem', color: '#1E293B' }}>Licenses Renewal Schedule</h3>
              </div>
              <span style={{ fontSize: '0.85rem', color: '#64748B' }}>{licenseData.length} Records</span>
            </div>
            <DataTable 
              columns={['RENEWAL DATE', 'VEHICLE NUMBER']}
              data={licenseData}
              loading={loading}
            />
          </div>
        )}

        {activeTab === 'safety' && (
          <div className="compliance-card" style={{ background: 'white', borderRadius: '12px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
            <div style={{ padding: '15px 20px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Calendar size={20} color="#F59E0B" />
                <h3 style={{ margin: 0, fontSize: '1rem', color: '#1E293B' }}>Safety Certificate Renewal</h3>
              </div>
              <span style={{ fontSize: '0.85rem', color: '#64748B' }}>{safetyData.length} Records</span>
            </div>
            <DataTable 
              columns={['RENEWAL DATE', 'VEHICLE NUMBER']}
              data={safetyData}
              loading={loading}
            />
          </div>
        )}

        {activeTab === 'leasing' && (
          <div className="compliance-card" style={{ background: 'white', borderRadius: '12px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
            <div style={{ padding: '15px 20px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CreditCard size={20} color="#8B5CF6" />
                <h3 style={{ margin: 0, fontSize: '1rem', color: '#1E293B' }}>Monthly Leasing Plan</h3>
              </div>
              <span style={{ fontSize: '0.85rem', color: '#64748B' }}>{leasingPlan.length} Active Leases</span>
            </div>
            <DataTable 
              columns={['DUE DATE', 'VEHICLE NUMBER', 'MONTHLY PREMIUM', 'FINAL DATE']}
              data={leasingPlan}
              loading={loading}
            />
          </div>
        )}

      </div>
    </div>
  );
};

export default ComplianceBook;
