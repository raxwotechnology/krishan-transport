import React, { useState, useEffect } from 'react';
import { vehicleAPI, markLeasePayment, renewVehicleDocument } from '../services/api';
import DataTable from './DataTable';
import Modal from './Modal';
import { ShieldCheck, FileText, CreditCard, Calendar, Search, RefreshCw, AlertCircle, CheckCircle, XCircle, Clock } from 'lucide-react';
import '../styles/books.css';

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const ComplianceBook = () => {
  const now = new Date();
  const userRole = localStorage.getItem('kt_user_role');
  const canManage = ['Admin', 'Manager'].includes(userRole);

  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [leasingYear, setLeasingYear] = useState(now.getFullYear());
  const [togglingId, setTogglingId] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Renewal Modal State
  const [renewalModal, setRenewalModal] = useState({
    isOpen: false,
    vehicleId: '',
    vehicleNumber: '',
    type: '', // 'insurance', 'license', 'safety'
    cost: '',
    newExpirationDate: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Payment Modal State
  const [paymentModal, setPaymentModal] = useState({
    isOpen: false,
    vehicleId: '',
    year: '',
    month: '',
    type: 'lease', // 'lease' or 'speed_draft'
    amountPaid: '',
    expectedAmount: 0,
    paidDate: new Date().toISOString().split('T')[0],
    isPaid: false
  });

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

  const handlePaymentClick = (vehicle, year, month, entry, type, expectedAmount) => {
    const isPaid = entry?.paid || false;
    setPaymentModal({
      isOpen: true,
      vehicleId: vehicle._id,
      year,
      month,
      type,
      expectedAmount,
      amountPaid: entry?.amountPaid ? entry.amountPaid : (isPaid ? expectedAmount : expectedAmount),
      paidDate: entry?.paidDate ? new Date(entry.paidDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      isPaid: isPaid
    });
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');

    const { vehicleId, year, month, type, amountPaid, paidDate } = paymentModal;
    const numericAmount = parseFloat(amountPaid) || 0;
    
    // Determine if it's fully paid (amount >= expected amount is a safe heuristic, but we'll consider any positive amount as "Paid" or "Partially Paid")
    const isPaidMark = numericAmount > 0;

    // Optimistic update
    setVehicles(prev => prev.map(v => {
      if (v._id !== vehicleId) return v;
      const targetArray = type === 'lease' ? 'leasePayments' : 'speedDraftPayments';
      const expected = type === 'lease' ? v.monthlyPremium : v.speedDraftMonthlyPremium;
      const balance = isPaidMark ? (expected - numericAmount) : 0;
      
      const existing = (v[targetArray] || []);
      const idx = existing.findIndex(lp => Number(lp.year) === year && Number(lp.month) === month);
      
      let updated;
      if (idx >= 0) {
        updated = existing.map((lp, i) => i === idx ? { ...lp, paid: isPaidMark, paidDate, amountPaid: numericAmount, balance } : lp);
      } else {
        updated = [...existing, { year, month, paid: isPaidMark, paidDate, amountPaid: numericAmount, balance }];
      }
      return { ...v, [targetArray]: updated };
    }));

    try {
      if (type === 'lease') {
        await markLeasePayment(vehicleId, year, month, isPaidMark, numericAmount, paidDate);
      } else {
        const { markSpeedDraftPayment } = await import('../services/api');
        await markSpeedDraftPayment(vehicleId, year, month, isPaidMark, numericAmount, paidDate);
      }
      setPaymentModal({ ...paymentModal, isOpen: false });
      await fetchData();
    } catch (err) {
      await fetchData();
      const msg = err?.response?.data?.message || err?.message || 'Failed to update payment';
      setErrorMsg(`Error: ${msg}`);
      console.error('Payment toggle failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRenewClick = (vehicle, type) => {
    let currentExpDate = '';
    if (type === 'insurance') currentExpDate = vehicle.insuranceExpirationDate;
    else if (type === 'license') currentExpDate = vehicle.licenseExpirationDate;
    else if (type === 'safety') currentExpDate = vehicle.safetyExpirationDate;

    // Default new expiration to 1 year from current or today
    const baseDate = currentExpDate ? new Date(currentExpDate) : new Date();
    const nextYear = new Date(baseDate);
    nextYear.setFullYear(nextYear.getFullYear() + 1);

    setRenewalModal({
      isOpen: true,
      vehicleId: vehicle._id,
      vehicleNumber: vehicle.number,
      type,
      cost: '',
      newExpirationDate: nextYear.toISOString().split('T')[0]
    });
  };

  const handleRenewSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      await renewVehicleDocument(
        renewalModal.vehicleId,
        renewalModal.type,
        renewalModal.newExpirationDate,
        parseFloat(renewalModal.cost) || 0
      );
      setRenewalModal({ ...renewalModal, isOpen: false });
      await fetchData();
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || 'Failed to renew document');
    } finally {
      setIsSubmitting(false);
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
      number: v.number,
      action: (
        <button 
          onClick={() => handleRenewClick(v, 'insurance')}
          className="action-btn-renew"
          title="Renew Insurance"
          style={{
            padding: '4px 8px',
            background: '#3B82F6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '0.75rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          <RefreshCw size={12} /> Renew
        </button>
      )
    }));

  // 2. License Renewal Schedule
  const licenseData = [...filteredVehicles]
    .filter(v => v.licenseExpirationDate)
    .sort((a, b) => new Date(a.licenseExpirationDate) - new Date(b.licenseExpirationDate))
    .map(v => ({
      renewalDate: (
        <span style={{ fontWeight: 'bold', color: isExpiringSoon(v.licenseExpirationDate) ? '#EF4444' : 'inherit' }}>
          {formatDate(v.licenseExpirationDate)}
          {isExpiringSoon(v.licenseExpirationDate) && <AlertCircle size={14} style={{ marginLeft: '5px', verticalAlign: 'middle' }} />}
        </span>
      ),
      number: v.number,
      action: (
        <button 
          onClick={() => handleRenewClick(v, 'license')}
          className="action-btn-renew"
          title="Renew License"
          style={{
            padding: '4px 8px',
            background: '#10B981',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '0.75rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          <RefreshCw size={12} /> Renew
        </button>
      )
    }));

  // 3. Safety Certificate Schedule
  const safetyData = [...filteredVehicles]
    .filter(v => v.safetyExpirationDate)
    .sort((a, b) => new Date(a.safetyExpirationDate) - new Date(b.safetyExpirationDate))
    .map(v => ({
      renewalDate: (
        <span style={{ fontWeight: 'bold', color: isExpiringSoon(v.safetyExpirationDate) ? '#EF4444' : 'inherit' }}>
          {formatDate(v.safetyExpirationDate)}
          {isExpiringSoon(v.safetyExpirationDate) && <AlertCircle size={14} style={{ marginLeft: '5px', verticalAlign: 'middle' }} />}
        </span>
      ),
      number: v.number,
      action: (
        <button 
          onClick={() => handleRenewClick(v, 'safety')}
          className="action-btn-renew"
          title="Renew Safety Cert"
          style={{
            padding: '4px 8px',
            background: '#F59E0B',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '0.75rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          <RefreshCw size={12} /> Renew
        </button>
      )
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
    { id: 'speed_draft', label: 'Speed Draft Plan', icon: CreditCard, color: '#EC4899' },
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

      {errorMsg && (
        <div style={{
          margin: '0 0 16px', padding: '12px 16px', borderRadius: '10px',
          background: '#FEE2E2', color: '#DC2626', fontWeight: 600, fontSize: '0.85rem',
          border: '1px solid #FCA5A5', display: 'flex', alignItems: 'center', gap: '8px'
        }}>
          <AlertCircle size={16} /> {errorMsg}
        </div>
      )}

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
              columns={['RENEWAL DATE', 'VEHICLE NUMBER', 'ACTION']}
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
              columns={['RENEWAL DATE', 'VEHICLE NUMBER', 'ACTION']}
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
              columns={['RENEWAL DATE', 'VEHICLE NUMBER', 'ACTION']}
              data={safetyData}
              loading={loading}
            />
          </div>
        )}

        {activeTab === 'leasing' && (() => {
          const leasingVehicles = filteredVehicles.filter(v => v.hasLeasing);
          const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);
          const currentMonth = now.getMonth() + 1;

          // Summary: how many paid this month
          const thisMonthPaid = leasingVehicles.filter(v => {
            const entry = (v.leasePayments || []).find(lp => lp.year === leasingYear && lp.month === currentMonth);
            return entry?.paid;
          }).length;
          const thisMonthTotal = leasingVehicles.length;
          const thisMonthAmount = leasingVehicles.reduce((s, v) => {
            const entry = (v.leasePayments || []).find(lp => lp.year === leasingYear && lp.month === currentMonth && lp.paid);
            return s + (entry ? parseFloat(v.monthlyPremium || 0) : 0);
          }, 0);
          const pendingAmount = leasingVehicles.reduce((s, v) => {
            const entry = (v.leasePayments || []).find(lp => lp.year === leasingYear && lp.month === currentMonth && lp.paid);
            return s + (!entry ? parseFloat(v.monthlyPremium || 0) : 0);
          }, 0);

          return (
            <div>
              {/* Header with year selector */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <CreditCard size={20} color="#8B5CF6" />
                  <h3 style={{ margin: 0, fontSize: '1rem', color: '#1E293B' }}>Monthly Leasing Payments</h3>
                </div>
                <select value={leasingYear} onChange={e => setLeasingYear(Number(e.target.value))}
                  style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>

              {/* Current Month Summary */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', padding: '16px 20px', borderBottom: '1px solid #E2E8F0' }}>
                <div style={{ background: '#EFF6FF', borderRadius: '12px', padding: '12px 16px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#1D4ED8', textTransform: 'uppercase', marginBottom: '4px' }}>This Month</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1E293B' }}>{MONTH_NAMES[currentMonth - 1]} {leasingYear}</div>
                </div>
                <div style={{ background: '#D1FAE5', borderRadius: '12px', padding: '12px 16px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#065F46', textTransform: 'uppercase', marginBottom: '4px' }}>Paid ({thisMonthPaid}/{thisMonthTotal})</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#059669' }}>LKR {thisMonthAmount.toLocaleString()}</div>
                </div>
                <div style={{ background: '#FEE2E2', borderRadius: '12px', padding: '12px 16px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#991B1B', textTransform: 'uppercase', marginBottom: '4px' }}>Pending</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#DC2626' }}>LKR {pendingAmount.toLocaleString()}</div>
                </div>
              </div>

              {/* Status Legend */}
              <div style={{ display: 'flex', gap: '15px', padding: '0 20px 15px', justifyContent: 'center', borderBottom: '1px solid #E2E8F0', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', fontWeight: 700, color: '#059669' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#D1FAE5' }}></div> Full Payment
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', fontWeight: 700, color: '#1E40AF' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#DBEAFE' }}></div> Extra Payment
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', fontWeight: 700, color: '#A16207' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#FEF08A' }}></div> Partial Payment
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', fontWeight: 700, color: '#DC2626' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#FEF2F2' }}></div> Unpaid
                </div>
              </div>

              {/* Per-vehicle monthly grid */}
              {leasingVehicles.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>
                  <CreditCard size={36} style={{ opacity: 0.3, marginBottom: '12px' }} />
                  <p style={{ fontWeight: 600 }}>No vehicles with active leasing.</p>
                </div>
              ) : (
                <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {leasingVehicles.map(v => {
                    const payments = v.leasePayments || [];
                    const paidThisYear = payments.filter(lp => lp.year === leasingYear && lp.paid).length;
                    return (
                      <div key={v._id} style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                        <div style={{ padding: '12px 16px', background: 'linear-gradient(135deg, #F5F3FF, #EDE9FE)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontWeight: 800, color: '#1E293B' }}>{v.number}</div>
                            <div style={{ fontSize: '0.72rem', color: '#7C3AED', fontWeight: 600 }}>{v.leasingCompany || '—'} · LKR {parseFloat(v.monthlyPremium || 0).toLocaleString()}/mo</div>
                          </div>
                          <div style={{ fontSize: '0.72rem', background: '#8B5CF620', color: '#6D28D9', fontWeight: 700, padding: '4px 10px', borderRadius: '20px' }}>
                            {paidThisYear}/12 paid {leasingYear}
                          </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '6px', padding: '12px' }}>
                          {MONTH_NAMES.map((mName, mIdx) => {
                            const month = mIdx + 1;
                            const isFuture = leasingYear === now.getFullYear() && month > currentMonth;
                            const entry = payments.find(lp => lp.year === leasingYear && lp.month === month);
                            const isPaid = entry?.paid || false;
                            const isCurrentMonth = leasingYear === now.getFullYear() && month === currentMonth;
                            const toggling = togglingId === `${v._id}-${leasingYear}-${month}`;
                            return (
                              <button key={month}
                                disabled={isFuture || !canManage}
                                onClick={() => handlePaymentClick(v, leasingYear, month, entry, 'lease', v.monthlyPremium)}
                                title={isPaid && entry?.paidDate ? `Paid on ${new Date(entry.paidDate).toLocaleDateString()}. Amount: LKR ${entry.amountPaid?.toLocaleString()} (Bal: LKR ${entry.balance?.toLocaleString()})` : isFuture ? 'Future month' : 'Click to enter payment'}
                                style={{
                                  padding: '8px 4px', borderRadius: '8px', border: isCurrentMonth ? '2px solid #8B5CF6' : 'none',
                                  cursor: (isFuture || !canManage) ? 'default' : 'pointer',
                                  background: isFuture ? '#F8FAFC' : isPaid ? (entry?.balance > 0 ? '#FEF08A' : entry?.balance < 0 ? '#DBEAFE' : '#D1FAE5') : '#FEF2F2',
                                  color: isFuture ? '#CBD5E1' : isPaid ? (entry?.balance > 0 ? '#A16207' : entry?.balance < 0 ? '#1E40AF' : '#059669') : '#DC2626',
                                  fontWeight: 700, fontSize: '0.68rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
                                  opacity: isFuture ? 0.4 : 1, transition: 'all 0.18s ease',
                                  boxShadow: isCurrentMonth ? '0 0 0 2px #8B5CF640' : 'none'
                                }}>
                                <span>{mName}</span>
                                {isFuture ? <span style={{ fontSize: '0.55rem' }}>—</span>
                                  : isPaid ? (entry?.balance > 0 ? <AlertCircle size={13} /> : entry?.balance < 0 ? <CheckCircle size={13} /> : <CheckCircle size={13} />) : <XCircle size={13} />}
                                {isPaid && entry?.balance > 0 && <span style={{ fontSize: '0.5rem', fontWeight: 800 }}>Bal: {entry.balance}</span>}
                                {isPaid && entry?.balance < 0 && <span style={{ fontSize: '0.5rem', fontWeight: 800 }}>Over: {Math.abs(entry.balance)}</span>}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        {activeTab === 'speed_draft' && (() => {
          const sdVehicles = filteredVehicles.filter(v => v.hasSpeedDraft);
          const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);
          const currentMonth = now.getMonth() + 1;

          const thisMonthPaid = sdVehicles.filter(v => {
            const entry = (v.speedDraftPayments || []).find(sp => sp.year === leasingYear && sp.month === currentMonth);
            return entry?.paid;
          }).length;
          const thisMonthTotal = sdVehicles.length;
          const thisMonthAmount = sdVehicles.reduce((s, v) => {
            const entry = (v.speedDraftPayments || []).find(sp => sp.year === leasingYear && sp.month === currentMonth && sp.paid);
            return s + (entry ? parseFloat(entry.amountPaid || 0) : 0);
          }, 0);
          const pendingAmount = sdVehicles.reduce((s, v) => {
            const entry = (v.speedDraftPayments || []).find(sp => sp.year === leasingYear && sp.month === currentMonth && sp.paid);
            return s + (!entry ? parseFloat(v.speedDraftMonthlyPremium || 0) : (entry.balance || 0));
          }, 0);

          return (
            <div>
              {/* Header with year selector */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <CreditCard size={20} color="#EC4899" />
                  <h3 style={{ margin: 0, fontSize: '1rem', color: '#1E293B' }}>Monthly Speed Draft Payments</h3>
                </div>
                <select value={leasingYear} onChange={e => setLeasingYear(Number(e.target.value))}
                  style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>

              {/* Current Month Summary */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', padding: '16px 20px', borderBottom: '1px solid #E2E8F0' }}>
                <div style={{ background: '#FDF2F8', borderRadius: '12px', padding: '12px 16px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#BE185D', textTransform: 'uppercase', marginBottom: '4px' }}>This Month</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1E293B' }}>{MONTH_NAMES[currentMonth - 1]} {leasingYear}</div>
                </div>
                <div style={{ background: '#D1FAE5', borderRadius: '12px', padding: '12px 16px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#065F46', textTransform: 'uppercase', marginBottom: '4px' }}>Paid ({thisMonthPaid}/{thisMonthTotal})</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#059669' }}>LKR {thisMonthAmount.toLocaleString()}</div>
                </div>
                <div style={{ background: '#FEE2E2', borderRadius: '12px', padding: '12px 16px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#991B1B', textTransform: 'uppercase', marginBottom: '4px' }}>Pending</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#DC2626' }}>LKR {pendingAmount.toLocaleString()}</div>
                </div>
              </div>

              {/* Status Legend */}
              <div style={{ display: 'flex', gap: '15px', padding: '0 20px 15px', justifyContent: 'center', borderBottom: '1px solid #E2E8F0', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', fontWeight: 700, color: '#059669' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#D1FAE5' }}></div> Full Payment
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', fontWeight: 700, color: '#1E40AF' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#DBEAFE' }}></div> Extra Payment
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', fontWeight: 700, color: '#A16207' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#FEF08A' }}></div> Partial Payment
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', fontWeight: 700, color: '#DC2626' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#FEF2F2' }}></div> Unpaid
                </div>
              </div>

              {/* Per-vehicle monthly grid */}
              {sdVehicles.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>
                  <CreditCard size={36} style={{ opacity: 0.3, marginBottom: '12px' }} />
                  <p style={{ fontWeight: 600 }}>No vehicles with active Speed Draft.</p>
                </div>
              ) : (
                <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {sdVehicles.map(v => {
                    const payments = v.speedDraftPayments || [];
                    const paidThisYear = payments.filter(sp => sp.year === leasingYear && sp.paid).length;
                    return (
                      <div key={v._id} style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                        <div style={{ padding: '12px 16px', background: 'linear-gradient(135deg, #FDF2F8, #FCE7F3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontWeight: 800, color: '#1E293B' }}>{v.number}</div>
                            <div style={{ fontSize: '0.72rem', color: '#BE185D', fontWeight: 600 }}>{v.speedDraftCompany || '—'} · LKR {parseFloat(v.speedDraftMonthlyPremium || 0).toLocaleString()}/mo</div>
                          </div>
                          <div style={{ fontSize: '0.72rem', background: '#F472B620', color: '#BE185D', fontWeight: 700, padding: '4px 10px', borderRadius: '20px' }}>
                            {paidThisYear}/12 paid {leasingYear}
                          </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '6px', padding: '12px' }}>
                          {MONTH_NAMES.map((mName, mIdx) => {
                            const month = mIdx + 1;
                            const isFuture = leasingYear === now.getFullYear() && month > currentMonth;
                            const entry = payments.find(sp => sp.year === leasingYear && sp.month === month);
                            const isPaid = entry?.paid || false;
                            const isCurrentMonth = leasingYear === now.getFullYear() && month === currentMonth;
                            return (
                              <button key={month}
                                disabled={isFuture || !canManage}
                                onClick={() => handlePaymentClick(v, leasingYear, month, entry, 'speed_draft', v.speedDraftMonthlyPremium)}
                                title={isPaid && entry?.paidDate ? `Paid on ${new Date(entry.paidDate).toLocaleDateString()}. Amount: LKR ${entry.amountPaid?.toLocaleString()} (Bal: LKR ${entry.balance?.toLocaleString()})` : isFuture ? 'Future month' : 'Click to enter payment'}
                                style={{
                                  padding: '8px 4px', borderRadius: '8px', border: isCurrentMonth ? '2px solid #EC4899' : 'none',
                                  cursor: (isFuture || !canManage) ? 'default' : 'pointer',
                                  background: isFuture ? '#F8FAFC' : isPaid ? (entry?.balance > 0 ? '#FEF08A' : entry?.balance < 0 ? '#DBEAFE' : '#D1FAE5') : '#FEF2F2',
                                  color: isFuture ? '#CBD5E1' : isPaid ? (entry?.balance > 0 ? '#A16207' : entry?.balance < 0 ? '#1E40AF' : '#059669') : '#DC2626',
                                  fontWeight: 700, fontSize: '0.68rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
                                  opacity: isFuture ? 0.4 : 1, transition: 'all 0.18s ease',
                                  boxShadow: isCurrentMonth ? '0 0 0 2px #FBCFE8' : 'none'
                                }}>
                                <span>{mName}</span>
                                {isFuture ? <span style={{ fontSize: '0.55rem' }}>—</span>
                                  : isPaid ? (entry?.balance > 0 ? <AlertCircle size={13} /> : entry?.balance < 0 ? <CheckCircle size={13} /> : <CheckCircle size={13} />) : <XCircle size={13} />}
                                {isPaid && entry?.balance > 0 && <span style={{ fontSize: '0.5rem', fontWeight: 800 }}>Bal: {entry.balance}</span>}
                                {isPaid && entry?.balance < 0 && <span style={{ fontSize: '0.5rem', fontWeight: 800 }}>Over: {Math.abs(entry.balance)}</span>}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

      </div>

      {/* Renewal Modal */}
      <Modal 
        isOpen={renewalModal.isOpen} 
        onClose={() => setRenewalModal({ ...renewalModal, isOpen: false })} 
        title={`Renew ${renewalModal.type.charAt(0).toUpperCase() + renewalModal.type.slice(1)}`}
      >
        <form onSubmit={handleRenewSubmit} className="hire-form">
          <div className="hire-form-scroll">
            <div className="form-section">
              <p className="form-section-title">Renewal Details</p>
              
              <div className="form-info-banner" style={{ 
                background: 'var(--primary-light)', 
                padding: '12px 16px', 
                borderRadius: 'var(--r-md)', 
                marginBottom: '20px', 
                fontSize: '0.85rem', 
                color: 'var(--primary-dark)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                border: '1px solid #BFDBFE'
              }}>
                <Clock size={18} />
                <span>Vehicle: <strong>{renewalModal.vehicleNumber}</strong></span>
              </div>
              
              <div className="form-grid-2">
                <div className="form-group">
                  <label>New Expiration Date *</label>
                  <input 
                    type="date" 
                    required 
                    value={renewalModal.newExpirationDate}
                    onChange={e => setRenewalModal({ ...renewalModal, newExpirationDate: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Renewal Cost (LKR)</label>
                  <input 
                    type="number" 
                    placeholder="Enter cost"
                    value={renewalModal.cost}
                    onChange={e => setRenewalModal({ ...renewalModal, cost: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ marginTop: '16px', padding: '10px', background: '#F8FAFC', borderRadius: '8px', border: '1px dashed #CBD5E1' }}>
                <p style={{ fontSize: '0.72rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertCircle size={12} />
                  This cost will be automatically added to vehicle expenses for financial reporting.
                </p>
              </div>
            </div>
          </div>

          <div className="hire-form-footer">
            <div className="total-display">
              <span>Total Cost</span>
              <strong>LKR {parseFloat(renewalModal.cost || 0).toLocaleString()}</strong>
            </div>
            <div className="modal-actions">
              <button type="button" className="cancel-btn" onClick={() => setRenewalModal({ ...renewalModal, isOpen: false })}>Cancel</button>
              <button type="submit" className="submit-btn" disabled={isSubmitting}>
                {isSubmitting ? 'Processing...' : 'Submit Renewal'}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Payment Modal */}
      <Modal 
        isOpen={paymentModal.isOpen} 
        onClose={() => setPaymentModal({ ...paymentModal, isOpen: false })} 
        title={`${paymentModal.type === 'lease' ? 'Lease' : 'Speed Draft'} Payment - ${MONTH_NAMES[paymentModal.month - 1]} ${paymentModal.year}`}
      >
        <form onSubmit={handlePaymentSubmit} className="hire-form">
          <div className="hire-form-scroll">
            <div className="form-section">
              <p className="form-section-title">Payment Details</p>
              
              <div className="form-grid-2">
                <div className="form-group">
                  <label>Amount Paid (LKR) *</label>
                  <input 
                    type="number" 
                    required 
                    value={paymentModal.amountPaid}
                    onChange={e => setPaymentModal({ ...paymentModal, amountPaid: e.target.value })}
                  />
                  <small style={{ color: '#64748B' }}>Expected: LKR {parseFloat(paymentModal.expectedAmount || 0).toLocaleString()}</small>
                </div>

                <div className="form-group">
                  <label>Payment Date *</label>
                  <input 
                    type="date" 
                    required 
                    value={paymentModal.paidDate}
                    onChange={e => setPaymentModal({ ...paymentModal, paidDate: e.target.value })}
                  />
                </div>
              </div>

              {paymentModal.isPaid && paymentModal.amountPaid > 0 && (
                <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                  <button type="button" onClick={() => setPaymentModal({ ...paymentModal, amountPaid: 0 })} 
                    style={{ background: '#FEE2E2', color: '#DC2626', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 'bold' }}>
                    Mark as Unpaid
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="hire-form-footer">
            <div className="total-display">
              <span>{(paymentModal.expectedAmount - paymentModal.amountPaid) < 0 ? 'Overpaid' : 'Balance'}</span>
              <strong style={{ color: (paymentModal.expectedAmount - paymentModal.amountPaid) > 0 ? '#DC2626' : (paymentModal.expectedAmount - paymentModal.amountPaid) < 0 ? '#1E40AF' : '#059669' }}>
                LKR {Math.abs(paymentModal.expectedAmount - paymentModal.amountPaid).toLocaleString()}
              </strong>
            </div>
            <div className="modal-actions">
              <button type="button" className="cancel-btn" onClick={() => setPaymentModal({ ...paymentModal, isOpen: false })}>Cancel</button>
              <button type="submit" className="submit-btn" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Payment'}
              </button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ComplianceBook;
