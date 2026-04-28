import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp, Wallet, Fuel, ArrowDown,
  BarChart, RefreshCw, CheckCircle, Clock, Users,
  ShieldCheck, FileText, CreditCard
} from 'lucide-react';
import { hireAPI, dieselAPI, salaryAPI, paymentAPI, invoiceAPI, vehicleAPI, expenseAPI, extraIncomeAPI } from '../services/api';
import Modal from './Modal';
import RecordDetails from './RecordDetails';
import { AlertTriangle, Bell, Info } from 'lucide-react';
import './Dashboard.css';

/* ── Helpers ────────────────────────────────────────────── */
const fmt = (n) => `LKR ${Number(n || 0).toLocaleString()}`;

const getUrgencyColor = (date) => {
  if (!date) return '#64748B';
  const targetDate = new Date(date);
  const today = new Date();
  const diffTime = targetDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays <= 1) return '#EF4444'; // Red for today/tomorrow
  if (diffDays <= 3) return '#F59E0B'; // Orange for < 3 days
  return '#3B82F6'; // Blue for others
};

const isExpiringSoon = (date, daysThreshold = 1) => {
  if (!date) return false;
  const targetDate = new Date(date);
  const today = new Date();
  const diffTime = targetDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays <= daysThreshold;
};

/* ── Reminder Card ──────────────────────────────────────── */
const ReminderCard = ({ r }) => {
  const color = getUrgencyColor(r.date);
  const isToday = r.daysLeft <= 0;
  const isTomorrow = r.daysLeft === 1;

  return (
    <div className="reminder-card-premium" style={{ 
      background: 'white', 
      padding: '20px', 
      borderRadius: '16px', 
      border: `1px solid ${color}20`,
      borderLeft: `6px solid ${color}`,
      boxShadow: '0 4px 15px rgba(0,0,0,0.04)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', right: '-20px', top: '-20px', width: '100px', height: '100px', background: `${color}05`, borderRadius: '50%' }} />

      <div style={{ display: 'flex', gap: '15px', position: 'relative', zIndex: 1 }}>
        <div style={{ background: `${color}15`, padding: '12px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'fit-content' }}>
          <r.icon size={24} color={color} />
        </div>
        
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#1E293B' }}>{r.vehicle}</h4>
            <div style={{ 
              padding: '4px 10px', 
              borderRadius: '20px', 
              fontSize: '0.65rem', 
              fontWeight: 800, 
              background: isToday ? '#FEE2E2' : isTomorrow ? '#FEF3C7' : '#EFF6FF',
              color: isToday ? '#EF4444' : isTomorrow ? '#D97706' : '#2563EB',
              textTransform: 'uppercase'
            }}>
              {isToday ? 'Due Today' : isTomorrow ? 'Tomorrow' : `In ${r.daysLeft} Days`}
            </div>
          </div>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748B', fontWeight: 500 }}>{r.type}</p>
          
          {r.amount && (
            <div style={{ marginTop: '12px', padding: '8px 12px', background: '#F8FAFC', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 600 }}>PREMIUM</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1E293B' }}>{fmt(r.amount)}</span>
            </div>
          )}

          {!r.amount && (
            <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={12} color="#94A3B8" />
              <span style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600 }}>
                Expires on {new Date(r.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ── Stat Card ──────────────────────────────────────────── */
const StatCard = ({ title, value, subtext, icon: Icon, color }) => (
  <div className="stat-card" style={{ '--accent': color }}>
    <div className="stat-icon"><Icon size={24} /></div>
    <div className="stat-info">
      <p className="stat-title">{title}</p>
      <h3 className="stat-value">{value}</h3>
      <p className="stat-subtext">{subtext}</p>
    </div>
  </div>
);

const SalaryRow = ({ s, isEven, onClick }) => (
  <div className="salary-row clickable-row" style={{ background: isEven ? '#F8FAFF' : '#FFFFFF' }} onClick={() => onClick && onClick(s)}>
    <span className="salary-cell salary-month">{s.month}</span>
    <span className="salary-cell">{s.employee}</span>
    <span className="salary-cell salary-num">{fmt(s.basic)}</span>
    <span className="salary-cell salary-num" style={{ color: '#10B981' }}>
      +{fmt(s.incentive || 0)}
    </span>
    <span className="salary-cell salary-num" style={{ color: '#DC2626' }}>
      -{fmt(s.advance || 0)}
    </span>
    <span className="salary-cell salary-net">{fmt(s.netPay)}</span>
  </div>
);

/* ── Main Dashboard ─────────────────────────────────────── */
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - i);

const Dashboard = ({ role, name }) => {
  const isAdmin = role === 'Admin' || role === 'Manager';

  const [data, setData]       = useState({ hires: [], diesel: [], salaries: [], payments: [], invoices: [], vehicles: [], expenses: [], extraIncome: [] });
  const [loading, setLoading] = useState(true);
  const [lastFetch, setLastFetch] = useState(null);
  
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[new Date().getMonth()]);
  const [selectedYear, setSelectedYear] = useState(String(currentYear));

  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [viewType, setViewType] = useState('hire');

  const handleOpenDetail = (item, type) => {
    setSelectedRecord(item);
    setViewType(type);
    setViewModalOpen(true);
  };

  const fetchAll = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const [h, d, s, p, inv, v, ex, ei] = await Promise.all([
        hireAPI.get(), dieselAPI.get(), salaryAPI.get(),
        paymentAPI.get(), invoiceAPI.get(), vehicleAPI.get(),
        expenseAPI.get(), extraIncomeAPI.get()
      ]);
      setData({
        hires:    Array.isArray(h.data)   ? h.data   : [],
        diesel:   Array.isArray(d.data)   ? d.data   : [],
        salaries: Array.isArray(s.data)   ? s.data   : [],
        payments: Array.isArray(p.data)   ? p.data   : [],
        invoices: Array.isArray(inv.data) ? inv.data : [],
        vehicles: Array.isArray(v.data)   ? v.data   : [],
        expenses: Array.isArray(ex.data)  ? ex.data  : [],
        extraIncome: Array.isArray(ei.data) ? ei.data : [],
      });
      setLastFetch(new Date());
    } catch (err) {
      console.error('Dashboard fetch failed', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);
  useEffect(() => { 
    const t = setInterval(() => fetchAll(true), 15000); // Refresh every 15s silently
    return () => clearInterval(t); 
  }, []);

  useEffect(() => {
    const onV = () => { if (document.visibilityState === 'visible') fetchAll(true); };
    const onF = () => fetchAll(true);
    document.addEventListener('visibilitychange', onV);
    window.addEventListener('focus', onF);
    return () => { document.removeEventListener('visibilitychange', onV); window.removeEventListener('focus', onF); };
  }, []);

  // Helper to filter by selected period
  const filterByPeriod = (records, dateField = 'date') => {
    return records.filter(r => {
      const d = new Date(r[dateField] || r.createdAt);
      const yearMatch = d.getFullYear() === parseInt(selectedYear);
      const monthMatch = selectedMonth === 'All' || d.getMonth() === MONTHS.indexOf(selectedMonth);
      return yearMatch && monthMatch;
    });
  };

  const groupedReminders = useMemo(() => {
    if (!isAdmin) return { insurance: [], license: [], safety: [], leasing: [] };
    const groups = { insurance: [], license: [], safety: [], leasing: [] };
    const today = new Date();
    
    const getDaysLeft = (date) => {
      const d = new Date(date);
      const diff = d - today;
      return Math.ceil(diff / (1000 * 60 * 60 * 24));
    };

    data.vehicles.forEach(v => {
      if (isExpiringSoon(v.insuranceExpirationDate)) {
        groups.insurance.push({ vehicle: v.number, type: 'Insurance Expiring', date: v.insuranceExpirationDate, icon: ShieldCheck, daysLeft: getDaysLeft(v.insuranceExpirationDate) });
      }
      if (isExpiringSoon(v.licenseExpirationDate)) {
        groups.license.push({ vehicle: v.number, type: 'License Expiring', date: v.licenseExpirationDate, icon: FileText, daysLeft: getDaysLeft(v.licenseExpirationDate) });
      }
      if (isExpiringSoon(v.safetyExpirationDate)) {
        groups.safety.push({ vehicle: v.number, type: 'Safety Cert Expiring', date: v.safetyExpirationDate, icon: CheckCircle, daysLeft: getDaysLeft(v.safetyExpirationDate) });
      }
      if (v.hasLeasing && v.leaseDueDate) {
        const nextDue = new Date(today.getFullYear(), today.getMonth(), v.leaseDueDate);
        if (isExpiringSoon(nextDue)) {
           groups.leasing.push({ vehicle: v.number, type: 'Lease Payment Due', date: nextDue, icon: CreditCard, amount: v.monthlyPremium, daysLeft: getDaysLeft(nextDue) });
        }
      }
    });

    return groups;
  }, [data.vehicles, isAdmin]);

  const hasAnyReminders = useMemo(() => 
    Object.values(groupedReminders).some(g => g.length > 0),
  [groupedReminders]);

  /* ── Salary data filtered for Employee ── */
  const mySalaries = useMemo(() => {
    if (!name) return [];
    const n = name.trim().toLowerCase();
    return data.salaries
      .filter(s => {
        const en = s.employee?.trim().toLowerCase() || '';
        return en.includes(n) || n.includes(en);
      })
      .sort((a, b) => b.month?.localeCompare(a.month || '') || 0);
  }, [data.salaries, name]);

  const myTotalEarned = useMemo(() =>
    mySalaries.reduce((sum, s) => sum + (parseFloat(s.netPay) || 0), 0),
  [mySalaries]);

  /* ── Salary data for Manager ── */
  const allSalaries = useMemo(() =>
    [...data.salaries].sort((a, b) => b.month?.localeCompare(a.month || '') || 0),
  [data.salaries]);

  /* ── Unique employees with totals (Manager view) ── */
  const employeeSummary = useMemo(() => {
    const map = {};
    data.salaries.forEach(s => {
      const key = s.employee || 'Unknown';
      if (!map[key]) map[key] = { name: key, count: 0, total: 0 };
      map[key].count++;
      map[key].total += parseFloat(s.netPay) || 0;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [data.salaries]);

  /* ── Stats ── */
  const stats = useMemo(() => {
    const fPayments    = filterByPeriod(data.payments, 'date');
    const fDiesel      = filterByPeriod(data.diesel, 'date');
    const fSalaries    = filterByPeriod(data.salaries, 'createdAt'); // Salaries don't have a date field, using createdAt
    const fExpenses    = filterByPeriod(data.expenses, 'date');
    const fExtraIncome = filterByPeriod(data.extraIncome, 'date');

    const totalHireRevenue = fPayments.reduce((s, r) => s + (parseFloat(r.hireAmount)  || 0), 0);
    const totalCollected   = fPayments.reduce((s, r) => s + (parseFloat(r.takenAmount) || 0), 0);
    const totalBalance     = fPayments.reduce((s, r) => s + (parseFloat(r.balance)     || 0), 0);
    const paidCount        = fPayments.filter(r => r.status === 'Paid').length;
    const pendingCount     = fPayments.filter(r => r.status !== 'Paid').length;
    const totalDiesel      = fDiesel.reduce((s, r)   => s + (parseFloat(r.total)  || parseFloat(r.amount) || 0), 0);
    const totalSalary      = fSalaries.reduce((s, r) => s + (parseFloat(r.netPay) || 0), 0);
    const totalExpenses    = fExpenses.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
    const totalExtra       = fExtraIncome.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
    
    // Leasing Cost Calculation for current month
    const totalLeasing = data.vehicles
      .filter(v => v.hasLeasing && v.monthlyPremium)
      .reduce((s, v) => s + parseFloat(v.monthlyPremium), 0);

    const netProfit = (totalHireRevenue + totalExtra) - totalSalary - totalDiesel - totalLeasing - totalExpenses;

    if (!isAdmin) {
      const myJobs = data.hires.filter(h => h.driverName?.trim().toLowerCase() === name?.trim().toLowerCase() || h.helperName?.trim().toLowerCase() === name?.trim().toLowerCase());
      const myCompleted = myJobs.filter(h => h.status === 'Completed' || h.status === 'Paid').length;
      const myFuel = data.diesel.filter(d => d.vehicle && data.vehicles.find(v => v.number === d.vehicle && (v.driver?.trim().toLowerCase() === name?.trim().toLowerCase())));

      return [
        { id: 1, title: 'My Jobs',      value: `${myJobs.length}`,         subtext: 'Total assigned',             icon: TrendingUp,  color: '#2563EB' },
        { id: 2, title: 'My Earnings',  value: fmt(myTotalEarned),             subtext: `${mySalaries.length} salary records`, icon: Wallet, color: '#10B981' },
        { id: 3, title: 'Completed',    value: `${myCompleted}`, subtext: 'Completed jobs', icon: CheckCircle, color: '#059669' },
        { id: 4, title: 'Fuel Logs',    value: `${myFuel.length}`,        subtext: 'Entries for my vehicle',     icon: Fuel,        color: '#F59E0B' },
      ];
    }

    return [
      { id: 1, title: 'Hire Revenue',        value: fmt(totalHireRevenue), subtext: `${data.payments.length} payment records`,         icon: TrendingUp, color: '#2563EB' },
      { id: 2, title: 'Collected',           value: fmt(totalCollected),   subtext: `${paidCount} paid · ${pendingCount} outstanding`, icon: ArrowDown,  color: '#10B981' },
      { id: 3, title: 'Outstanding Balance', value: fmt(totalBalance),     subtext: 'Receivable from clients',                        icon: Clock,      color: totalBalance > 0 ? '#DC2626' : '#10B981' },
      { id: 4, title: 'Fuel Cost',           value: fmt(totalDiesel),      subtext: `${data.diesel.length} fuel entries`,             icon: Fuel,       color: '#F59E0B' },
      { id: 5, title: 'Total Salaries',      value: fmt(totalSalary),      subtext: `${data.salaries.length} salary records`,        icon: Users,      color: '#8B5CF6' },
      { id: 6, title: 'Net Profit (Est.)',   value: fmt(netProfit),        subtext: 'Revenue − Salaries − Diesel',                   icon: BarChart,   color: netProfit >= 0 ? '#10B981' : '#DC2626' },
    ];
  }, [data, isAdmin, myTotalEarned, mySalaries.length, name]);

  const recentPayments = useMemo(() =>
    [...data.payments].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5),
  [data.payments]);

  const recentHires = useMemo(() => {
    let filtered = [...data.hires];
    if (!isAdmin) {
      filtered = filtered.filter(h => h.driverName?.trim() === name?.trim() || h.helperName?.trim() === name?.trim());
    }
    return filtered.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
  }, [data.hires, isAdmin, name]);

  return (
    <div className="dashboard-container">

      {/* ── Urgent Reminders Section ── */}
      {isAdmin && hasAnyReminders && (
        <div className="urgent-reminders-section" style={{ marginBottom: '36px', animation: 'fadeIn 0.5s ease' }}>
          <div className="section-header" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <div style={{ background: '#FEE2E2', padding: '8px', borderRadius: '10px' }}>
              <Bell size={20} color="#EF4444" />
            </div>
            <h3 style={{ margin: 0, color: '#1E293B', fontSize: '1.25rem', letterSpacing: '-0.02em', fontWeight: 800 }}>Urgent Compliance Status</h3>
          </div>

          <div className="reminders-columns-grid" style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', 
            gap: '20px' 
          }}>
            
            {/* 1. Insurance Section */}
            <div className="reminder-column" style={{ background: '#F8FAFC', padding: '20px', borderRadius: '20px', border: '1px solid #E2E8F0' }}>
              <h4 style={{ fontSize: '0.85rem', color: '#3B82F6', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={18} /> Insurance Expirations
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {groupedReminders.insurance.length > 0 ? (
                  groupedReminders.insurance.map((r, i) => <ReminderCard key={i} r={r} />)
                ) : (
                  <div style={{ padding: '15px', textAlign: 'center', background: 'white', borderRadius: '14px', color: '#94A3B8', fontSize: '0.85rem', border: '1px dashed #CBD5E1' }}>
                    <CheckCircle size={16} style={{ marginBottom: '4px', color: '#10B981' }} /><br/>
                    All Insurances up to date
                  </div>
                )}
              </div>
            </div>

            {/* 2. License Section */}
            <div className="reminder-column" style={{ background: '#F8FAFC', padding: '20px', borderRadius: '20px', border: '1px solid #E2E8F0' }}>
              <h4 style={{ fontSize: '0.85rem', color: '#10B981', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={18} /> License Expirations
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {groupedReminders.license.length > 0 ? (
                  groupedReminders.license.map((r, i) => <ReminderCard key={i} r={r} />)
                ) : (
                  <div style={{ padding: '15px', textAlign: 'center', background: 'white', borderRadius: '14px', color: '#94A3B8', fontSize: '0.85rem', border: '1px dashed #CBD5E1' }}>
                    <CheckCircle size={16} style={{ marginBottom: '4px', color: '#10B981' }} /><br/>
                    All Licenses up to date
                  </div>
                )}
              </div>
            </div>

            {/* 3. Leasing Section */}
            <div className="reminder-column" style={{ background: '#F8FAFC', padding: '20px', borderRadius: '20px', border: '1px solid #E2E8F0' }}>
              <h4 style={{ fontSize: '0.85rem', color: '#8B5CF6', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CreditCard size={18} /> Lease Payments
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {groupedReminders.leasing.length > 0 ? (
                  groupedReminders.leasing.map((r, i) => <ReminderCard key={i} r={r} />)
                ) : (
                  <div style={{ padding: '15px', textAlign: 'center', background: 'white', borderRadius: '14px', color: '#94A3B8', fontSize: '0.85rem', border: '1px dashed #CBD5E1' }}>
                    <CheckCircle size={16} style={{ marginBottom: '4px', color: '#10B981' }} /><br/>
                    No payments due today
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className="dashboard-header">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <h1 style={{ margin: 0 }}>
            {!isAdmin ? `Hello, ${name}` : 'Business Overview'}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
            <select 
              value={selectedMonth} 
              onChange={e => setSelectedMonth(e.target.value)}
              className="period-select"
            >
              <option value="All">All Months</option>
              {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <select 
              value={selectedYear} 
              onChange={e => setSelectedYear(e.target.value)}
              className="period-select"
            >
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            {lastFetch && (
              <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 500, marginLeft: '8px' }}>
                Refreshed: {lastFetch.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => fetchAll(false)}
          style={{
            display: 'flex', alignItems: 'center', gap: '7px',
            background: 'linear-gradient(135deg, #EFF6FF, #DBEAFE)',
            border: '1px solid #BFDBFE', borderRadius: '10px', padding: '8px 16px',
            color: '#2563EB', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
            boxShadow: '0 1px 4px rgba(37,99,235,0.12)', transition: 'all 0.2s ease',
          }}
          onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(37,99,235,0.2)'}
          onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 4px rgba(37,99,235,0.12)'}
        >
          <RefreshCw size={14} className={loading ? 'spinner' : ''} />
          {loading ? 'Updating…' : 'Refresh'}
        </button>
      </div>

      {/* ── Stat Cards — dynamic grid class ── */}
      <div className={isAdmin ? 'stats-grid' : 'stats-grid stats-grid--2col'}>
        {stats.map(stat => <StatCard key={stat.id} {...stat} />)}
      </div>

      {/* ══════════════════════════════════════════════
          EMPLOYEE VIEW — My Salary History
          ══════════════════════════════════════════════ */}
      {!isAdmin && (
        <div className="recent-activity">
          <div className="section-header">
            <h3>My Salary History</h3>
            <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}>
              Total Earned: <strong style={{ color: '#10B981' }}>{fmt(myTotalEarned)}</strong>
            </span>
          </div>

          {loading ? (
            <div className="loading-state">Loading salary records…</div>
          ) : mySalaries.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon" />
              <p>No salary records found for your account.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              {/* Table header */}
              <div className="salary-header">
                <span className="salary-cell salary-month">Month</span>
                <span className="salary-cell">Employee</span>
                <span className="salary-cell salary-num">Basic</span>
                <span className="salary-cell salary-num">Incentive</span>
                <span className="salary-cell salary-num">Advance</span>
                <span className="salary-cell salary-net">Net Pay</span>
              </div>
              <div className="salary-body">
                {mySalaries.map((s, i) => (
                  <SalaryRow key={s._id || i} s={s} isEven={i % 2 === 0} onClick={(item) => handleOpenDetail(item, 'salary')} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════
          MANAGER VIEW — Employee Salary Summary
          ══════════════════════════════════════════════ */}
      {isAdmin && (
        <>
          {/* Summary per employee */}
          <div className="recent-activity">
            <div className="section-header">
              <h3>Employee Salary Summary</h3>
              <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}>
                {employeeSummary.length} employees
              </span>
            </div>
            {loading ? (
              <div className="loading-state">Loading…</div>
            ) : employeeSummary.length === 0 ? (
              <div className="empty-state"><div className="empty-icon" /><p>No salary data yet.</p></div>
            ) : (
              <div className="recent-list">
                {employeeSummary.map((e, i) => (
                  <div key={i} className="activity-item">
                    <div className="emp-avatar">
                      {(e.name[0] || '?').toUpperCase()}
                    </div>
                    <div className="activity-details">
                      <p><strong>{e.name}</strong></p>
                      <span>{e.count} salary record{e.count !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="activity-value">
                      <div style={{ fontWeight: 700, color: '#1E3A5F', fontSize: '0.9rem' }}>
                        {fmt(e.total)}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#8B5CF6', fontWeight: 600, textAlign: 'right' }}>
                        Total net pay
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Full salary records */}
          <div className="recent-activity">
            <div className="section-header">
              <h3>All Salary Records</h3>
              <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}>
                {allSalaries.length} records
              </span>
            </div>
            {loading ? (
              <div className="loading-state">Loading…</div>
            ) : allSalaries.length === 0 ? (
              <div className="empty-state"><div className="empty-icon" /><p>No salary records yet.</p></div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <div className="salary-header">
                  <span className="salary-cell salary-month">Month</span>
                  <span className="salary-cell">Employee</span>
                  <span className="salary-cell salary-num">Basic</span>
                  <span className="salary-cell salary-num">Incentive</span>
                  <span className="salary-cell salary-num">Advance</span>
                  <span className="salary-cell salary-net">Net Pay</span>
                </div>
                <div className="salary-body">
                  {allSalaries.map((s, i) => (
                    <SalaryRow key={s._id || i} s={s} isEven={i % 2 === 0} onClick={(item) => handleOpenDetail(item, 'salary')} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Recent Payments activity */}
          <div className="recent-activity">
            <div className="section-header">
              <h3>Recent Payments</h3>
              <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}>Last 5 records</span>
            </div>
            <div className="activity-card">
              {loading ? (
                <div className="loading-state">Loading data…</div>
              ) : recentPayments.length > 0 ? (
                <div className="recent-list">
                  {recentPayments.map((p, i) => (
                    <div key={i} className="activity-item clickable-row" onClick={() => handleOpenDetail(p, 'payment')}>
                      <div className={`activity-indicator ${p.status === 'Paid' ? 'green' : 'blue'}`} />
                      <div className="activity-details">
                        <p><strong>{p.client}</strong>{p.vehicle ? ` · ${p.vehicle}` : ''}{p.city ? ` — ${p.city}` : ''}</p>
                        <span>{new Date(p.date).toLocaleDateString()}</span>
                      </div>
                      <div className="activity-value">
                        <div style={{ fontWeight: 700, color: '#1E3A5F', fontSize: '0.85rem' }}>
                          LKR {Number(p.hireAmount || 0).toLocaleString()}
                        </div>
                        <div style={{
                          fontSize: '0.68rem', fontWeight: 700, textAlign: 'right', marginTop: '2px',
                          color: p.status === 'Paid' ? '#059669' : p.status === 'Partial' ? '#D97706' : '#DC2626',
                        }}>
                          {p.status}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentHires.length > 0 ? (
                <div className="recent-list">
                  {recentHires.map((h, i) => (
                    <div key={i} className="activity-item clickable-row" onClick={() => handleOpenDetail(h, 'hire')}>
                      <div className="activity-indicator blue" />
                      <div className="activity-details">
                        <p><strong>{h.client}</strong> · {h.vehicle}</p>
                        <span>{new Date(h.date).toLocaleDateString()}</span>
                      </div>
                      <div className="activity-value">
                        LKR {Number(h.billAmount || h.totalAmount || 0).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state"><div className="empty-icon" /><p>No activity yet.</p></div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Employee recent assignments */}
      {!isAdmin && (
        <div className="recent-activity">
          <div className="section-header">
            <h3>My Recent Assignments</h3>
            <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}>Last 5 records</span>
          </div>
          <div className="activity-card">
            {loading ? (
              <div className="loading-state">Loading…</div>
            ) : recentHires.length > 0 ? (
              <div className="recent-list">
                {recentHires.map((h, i) => (
                  <div key={i} className="activity-item clickable-row" onClick={() => handleOpenDetail(h, 'hire')}>
                    <div className="activity-indicator blue" />
                    <div className="activity-details">
                      <p><strong>{h.client}</strong> · {h.vehicle}</p>
                      <span>{new Date(h.date).toLocaleDateString()}</span>
                    </div>
                    <div className="activity-value">
                      <span style={{ fontWeight: 700, color: '#334155' }}>
                        {h.status || 'Pending'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state"><div className="empty-icon" /><p>No assignments yet.</p></div>
            )}
          </div>
        </div>
      )}

      <Modal isOpen={viewModalOpen} onClose={() => setViewModalOpen(false)} title="Record Details">
        <RecordDetails data={selectedRecord} type={viewType} />
        <div className="modal-footer" style={{ padding: '15px 24px', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', background: '#F8FAFC' }}>
            <button className="secondary-btn" onClick={() => setViewModalOpen(false)}>Close</button>
        </div>
      </Modal>

    </div>
  );
};

export default Dashboard;
