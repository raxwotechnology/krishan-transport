import React from 'react';
import DataTable from './DataTable';
import Modal from './Modal';
import SalaryForm from './SalaryForm';
import { salaryAPI, vehicleAPI, employeeAPI, hireAPI, attendanceAPI, advanceAPI } from '../services/api';
import { generatePDFReport } from '../utils/reportGenerator';
import { Download, Search, RefreshCw, Calendar } from 'lucide-react';
import '../styles/forms.css';
import '../styles/books.css';
import RecordDetails from './RecordDetails';
import SalaryGeneratorModal from './SalaryGeneratorModal';
import AdvanceForm from './AdvanceForm';

const SalaryBook = () => {
  const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const userRole = localStorage.getItem('kt_user_role');
  const canManage = isDev || ['Admin', 'Manager'].includes(userRole);

  const [activeTab, setActiveTab] = React.useState('Driver');
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [success, setSuccess] = React.useState(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [targetMonth, setTargetMonth] = React.useState(new Date().toLocaleString('default', { month: 'long', year: 'numeric' }));

  const [employees, setEmployees] = React.useState([]);
  const [hires, setHires] = React.useState([]);
  const [attendance, setAttendance] = React.useState([]);
  const [dbSalaries, setDbSalaries] = React.useState([]);
  const [advances, setAdvances] = React.useState([]);
  const [vehicles, setVehicles] = React.useState([]);

  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [viewModalOpen, setViewModalOpen] = React.useState(false);
  const [advanceModalOpen, setAdvanceModalOpen] = React.useState(false);
  const [genModalOpen, setGenModalOpen] = React.useState(false);
  
  const [selectedRecord, setSelectedRecord] = React.useState(null);
  const [editingItem, setEditingItem] = React.useState(null);

  React.useEffect(() => {
    fetchBaseData();
  }, [targetMonth]);

  const fetchBaseData = async () => {
    setLoading(true);
    try {
      const [eRes, hRes, aRes, sRes, vRes, advRes] = await Promise.all([
        employeeAPI.get(),
        hireAPI.get(),
        attendanceAPI.get(),
        salaryAPI.get(),
        vehicleAPI.get(),
        advanceAPI.get()
      ]);
      setEmployees((eRes.data || []).filter(e => e.status === 'Active'));
      setHires(hRes.data || []);
      setAttendance(aRes.data || []);
      setDbSalaries(sRes.data || []);
      setVehicles(vRes.data || []);
      setAdvances(advRes.data || []);
      setError(null);
    } catch (err) {
      console.error('FETCH ERROR:', err);
      setError(`Connection issue: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const processedSalaries = React.useMemo(() => {
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const parts = targetMonth.replace(',', '').split(' ');
    let tMonthIdx = -1;
    let tYear = -1;
    parts.forEach(p => {
      const idx = monthNames.findIndex(m => p.toLowerCase().includes(m.toLowerCase()));
      if (idx !== -1) tMonthIdx = idx;
      if (p.match(/^\d{4}$/)) tYear = parseInt(p);
    });

    const filteredEmployees = employees.filter(e => {
        if (activeTab === 'Driver') return e.role === 'Driver';
        if (activeTab === 'Helper') return e.role === 'Helper';
        if (activeTab === 'Manager') return e.role === 'Manager';
        return false;
    });

    return filteredEmployees.map(emp => {
      const monthHires = hires.filter(h => {
        const d = new Date(h.date);
        return (d.getMonth() === tMonthIdx && d.getFullYear() === tYear) && 
               (h.driverName?.trim() === emp.name.trim() || h.helperName?.trim() === emp.name.trim());
      });

      const empAtt = attendance.filter(a => {
        const d = new Date(a.date);
        return a.employee?.trim() === emp.name.trim() && a.status === 'Present' && d.getMonth() === tMonthIdx && d.getFullYear() === tYear;
      }).length;

      let basic = 0;
      let hourlyEarnings = 0;
      let dailyAllowance = 0;
      let totalHours = 0;
      let helperShiftEarnings = 0;
      let attendanceBonus = 0;
      let attendancePenalty = 0;
      let helperShifts = [];

      if (activeTab === 'Driver' || activeTab === 'Manager') {
        basic = emp.basicSalary || 0;
        if (empAtt > 25) attendanceBonus = (empAtt - 25) * 1000;

        if (activeTab === 'Driver') {
            const uniqueHireDates = new Set(monthHires.map(h => new Date(h.date).toDateString())).size;
            // Use the maximum of attendance book or actual hire dates to ensure they get paid if they worked
            const effectiveWorkDays = Math.max(empAtt, uniqueHireDates);
            
            totalHours = monthHires.reduce((sum, j) => sum + (parseFloat(j.workingHours) || 0), 0);
            hourlyEarnings = totalHours * (emp.hourlyRate || 0);
            dailyAllowance = effectiveWorkDays * 500;
        }
      } else if (activeTab === 'Helper') {
        const days = {};
        const shifts = [];
        monthHires.forEach(h => {
            const dateStr = new Date(h.date).toDateString();
            if (!days[dateStr]) days[dateStr] = { morning: false, evening: false };
            const startHour = parseInt((h.startTime || '00:00').split(':')[0]);
            const endHour = parseInt((h.endTime || '23:59').split(':')[0]);
            if (startHour < 13) days[dateStr].morning = true;
            if (endHour >= 13 || startHour >= 13) days[dateStr].evening = true;
        });
        Object.keys(days).forEach(date => {
            if (days[date].morning) {
                helperShiftEarnings += 3000;
                shifts.push({ date, shift: 'Morning', amount: 3000 });
            }
            if (days[date].evening) {
                helperShiftEarnings += 3000;
                shifts.push({ date, shift: 'Evening', amount: 3000 });
            }
        });
        hourlyEarnings = helperShiftEarnings;
        totalHours = monthHires.length;
        helperShifts = shifts;
      }

      const empAdvances = advances
        .filter(a => a.employee === emp.name && a.month === targetMonth)
        .reduce((sum, a) => sum + (a.amount || 0), 0);

      const dbRecord = dbSalaries.find(s => s.employee === emp.name && s.month === targetMonth);
      
      // Real-time link: Use latest advance from book even if record is saved, 
      // or prioritize saved record's fields if they were manually edited.
      const currentAdvance = empAdvances; 
      const currentIncentive = (dbRecord ? (dbRecord.incentive || 0) : 0) + attendanceBonus;
      const currentPenalty = attendancePenalty;

      const netPay = (basic + hourlyEarnings + dailyAllowance + currentIncentive) - (currentAdvance + currentPenalty);

      return {
        _id: dbRecord ? dbRecord._id : `live-${emp.name}`,
        month: targetMonth,
        employee: emp.name,
        role: emp.role,
        basic: (activeTab === 'Driver' || activeTab === 'Manager') ? `LKR ${basic.toLocaleString()}` : '—',
        hourlyEarnings: (activeTab === 'Manager') ? '—' : `LKR ${hourlyEarnings.toLocaleString()}`,
        dailyAllowance: activeTab === 'Driver' ? `LKR ${dailyAllowance.toLocaleString()}` : '—',
        totalHours: activeTab === 'Driver' ? `${totalHours}h` : (activeTab === 'Helper' ? `${monthHires.length} Jobs` : '—'),
        netPay: `LKR ${netPay.toLocaleString()}`,
        netPay_val: netPay,
        incentive: currentIncentive,
        advance: currentAdvance,
        attendancePenalty: currentPenalty,
        rawData: dbRecord ? { ...dbRecord, advance: currentAdvance, netPay } : { 
            employee: emp.name, month: targetMonth, basic, hourlyEarnings, dailyAllowance, 
            totalHours, jobsCount: monthHires.length, workingDays: empAtt, role: emp.role, 
            advance: currentAdvance, incentive: currentIncentive, attendanceBonus, attendancePenalty,
            shifts: helperShifts, netPay
        },
        isLive: !dbRecord,
        action: canManage ? (
          <div className="table-actions">
            <button className="edit-btn" onClick={() => handleEdit(dbRecord ? { ...dbRecord, advance: currentAdvance, netPay } : { employee: emp.name, month: targetMonth, basic, hourlyEarnings, dailyAllowance, totalHours, jobsCount: monthHires.length, workingDays: empAtt, role: emp.role, advance: currentAdvance, incentive: currentIncentive, attendanceBonus, attendancePenalty, netPay })}>
              {dbRecord ? 'Edit' : 'Finalize'}
            </button>
            {dbRecord && <button className="delete-btn" onClick={() => handleDelete(dbRecord._id)}>Delete</button>}
          </div>
        ) : null
      };
    });
  }, [employees, hires, attendance, dbSalaries, advances, targetMonth, canManage, activeTab]);

  const helperShiftSheet = React.useMemo(() => {
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const parts = targetMonth.replace(',', '').split(' ');
    let tMonthIdx = -1;
    let tYear = -1;
    parts.forEach(p => {
      const idx = monthNames.findIndex(m => p.toLowerCase().includes(m.toLowerCase()));
      if (idx !== -1) tMonthIdx = idx;
      if (p.match(/^\d{4}$/)) tYear = parseInt(p);
    });

    const allShifts = [];
    hires.forEach(h => {
        const d = new Date(h.date);
        if (d.getMonth() === tMonthIdx && d.getFullYear() === tYear && h.helperName) {
            const startHour = parseInt((h.startTime || '00:00').split(':')[0]);
            const endHour = parseInt((h.endTime || '23:59').split(':')[0]);
            
            const dateStr = d.toLocaleDateString();
            const helper = h.helperName.trim();
            
            // Check if we already recorded this shift for this helper today
            const morningKey = `${dateStr}-${helper}-Morning`;
            const eveningKey = `${dateStr}-${helper}-Evening`;

            if (startHour < 13 && !allShifts.find(s => s.key === morningKey)) {
                allShifts.push({ 
                    key: morningKey,
                    date: d, 
                    dateStr: dateStr,
                    employee: helper, 
                    shift: 'Morning', 
                    amount: 3000,
                    hireRef: h.billNumber || h.vehicle
                });
            }
            if ((endHour >= 13 || startHour >= 13) && !allShifts.find(s => s.key === eveningKey)) {
                allShifts.push({ 
                    key: eveningKey,
                    date: d, 
                    dateStr: dateStr,
                    employee: helper, 
                    shift: 'Evening', 
                    amount: 3000,
                    hireRef: h.billNumber || h.vehicle
                });
            }
        }
    });

    return allShifts.sort((a, b) => b.date - a.date);
  }, [hires, targetMonth]);

  const filteredRecords = React.useMemo(() => {
    if (activeTab === 'Shift Sheet') {
        return helperShiftSheet.filter(s => 
            !searchQuery || s.employee.toLowerCase().includes(searchQuery.toLowerCase()) || s.dateStr.includes(searchQuery)
        ).map(s => ({
            ...s,
            date: s.dateStr,
            amount: `LKR ${s.amount.toLocaleString()}`,
            shift: <span style={{ 
                padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem',
                backgroundColor: s.shift === 'Morning' ? '#DBEAFE' : '#FEF3C7',
                color: s.shift === 'Morning' ? '#1E40AF' : '#92400E'
            }}>{s.shift}</span>
        }));
    }
    return processedSalaries.filter(r => {
      return !searchQuery || (r.employee || '').toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [processedSalaries, helperShiftSheet, searchQuery, activeTab]);

  const stats = React.useMemo(() => {
    const totalPotential = filteredRecords.reduce((sum, r) => sum + (r.netPay_val || 0), 0);
    return { totalPotential, count: filteredRecords.length };
  }, [filteredRecords]);

  const handleAddSalary = async (data) => {
    try {
      if (editingItem && editingItem._id && !editingItem._id.startsWith('live-')) {
        await salaryAPI.update(editingItem._id, data);
        setSuccess('Salary record updated!');
      } else {
        await salaryAPI.create(data);
        setSuccess('Salary record finalized!');
      }
      fetchBaseData();
      setIsModalOpen(false);
      setEditingItem(null);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Error saving salary.');
    }
  };

  const handleAddAdvance = async (data) => {
    try {
      await advanceAPI.create(data);
      setSuccess('Advance payment recorded!');
      fetchBaseData();
      setAdvanceModalOpen(false);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Error saving advance.');
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this saved record? It will return to live calculation.')) {
      await salaryAPI.delete(id);
      fetchBaseData();
    }
  };

  const handleDeleteAdvance = async (id) => {
    if (window.confirm('Delete this advance record?')) {
      await advanceAPI.delete(id);
      fetchBaseData();
    }
  };

  const handleRowClick = (record) => {
    setSelectedRecord(record);
    setViewModalOpen(true);
  };

  const handleExportPDF = () => {
    const columns = ['MONTH', 'EMPLOYEE', 'BASIC', 'HOURLY', 'DAILY', 'TOTAL HRS', 'NET PAY'];
    const data = filteredRecords.map(r => [r.month, r.employee, r.basic, r.hourlyEarnings, r.dailyAllowance, r.totalHours, r.netPay]);
    generatePDFReport({ title: `Salary Overview - ${targetMonth}`, columns, data, filename: `Salary_Live_${targetMonth.replace(' ', '_')}.pdf` });
  };

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const currentMonth = targetMonth.split(' ')[0];
  const currentYear = targetMonth.split(' ')[1];

  return (
    <div className="book-container">
      {/* Global Month/Year Picker */}
      <div className="book-filters" style={{ marginBottom: '0px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Calendar size={20} color="#2563EB" />
          <h3 style={{ margin: 0, fontSize: '1rem', color: '#1E293B' }}>Target Payroll Period:</h3>
        </div>
        <div className="filter-actions">
          <select 
            value={currentMonth} 
            onChange={e => setTargetMonth(`${e.target.value} ${currentYear}`)}
            className="secondary-btn"
            style={{ height: '38px', minWidth: '130px', fontWeight: '700' }}
          >
            {monthNames.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select 
            value={currentYear} 
            onChange={e => setTargetMonth(`${currentMonth} ${e.target.value}`)}
            className="secondary-btn"
            style={{ height: '38px', minWidth: '100px', fontWeight: '700' }}
          >
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button className="secondary-btn" onClick={fetchBaseData}><RefreshCw size={16} className={loading ? 'spinner' : ''} /></button>
        </div>
      </div>

      <div className="tab-switcher">
        {['Driver', 'Helper', 'Manager', 'Advances', 'Shift Sheet'].map(tab => (
          <button 
            key={tab}
            className={activeTab === tab ? 'active-tab' : ''} 
            onClick={() => setActiveTab(tab)}
          >
            {tab.toUpperCase()} {tab === 'Advances' || tab === 'Shift Sheet' ? '' : 'SALARY BOOK'}
          </button>
        ))}
      </div>

      {activeTab !== 'Advances' ? (
        <>
          <div className="book-summary">
            <div className="summary-item">
              <label>{activeTab === 'Shift Sheet' ? 'TOTAL SHIFT VALUE' : `TOTAL POTENTIAL ${activeTab.toUpperCase()} PAYROLL`}</label>
              <h3 style={{ color: '#2563EB' }}>LKR {stats.totalPotential.toLocaleString()}</h3>
            </div>
            <div className="summary-item" style={{ borderRight: 'none' }}>
              <label>{activeTab === 'Shift Sheet' ? 'SHIFT COUNT' : `ACTIVE ${activeTab.toUpperCase()} COUNT`}</label>
              <h3>{stats.count}</h3>
            </div>
          </div>

          <div className="book-filters">
            <div className="search-box">
              <Search className="search-icon" size={16} />
              <input type="text" placeholder={activeTab === 'Shift Sheet' ? "Search helper or date..." : "Search employee..."} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            <div className="filter-actions">
              <button className="secondary-btn" onClick={handleExportPDF}><Download size={16} /> Export PDF</button>
              {activeTab !== 'Advances' && activeTab !== 'Shift Sheet' && canManage && (
                <button className="add-btn" onClick={() => setGenModalOpen(true)} style={{ background: '#059669' }}>
                   ⚡ Auto-Generate Salaries
                </button>
              )}
            </div>
          </div>

          {success && <div className="success-banner">{success}</div>}
          {error && <div className="error-banner">{error}</div>}

          <DataTable 
            columns={activeTab === 'Shift Sheet' 
                ? ['DATE', 'EMPLOYEE', 'SHIFT', 'HIRE REF', 'AMOUNT']
                : (canManage ? ['MONTH', 'EMPLOYEE', 'BASIC', 'HOURLY', 'DAILY', 'TOTAL HRS', 'NET PAY', 'ACTION'] : ['MONTH', 'EMPLOYEE', 'BASIC', 'HOURLY', 'DAILY', 'TOTAL HRS', 'NET PAY'])
            } 
            data={filteredRecords} 
            loading={loading}
            onRowClick={activeTab === 'Shift Sheet' ? null : handleRowClick}
            emptyMessage={loading ? "Loading..." : "No records found."} 
          />
        </>
      ) : (
        <>
          <div className="book-filters">
            <h3 style={{ margin: 0, color: '#1E293B', fontSize: '0.9rem' }}>Monthly Advance Payments ({targetMonth})</h3>
            <div className="filter-actions">
              <button className="add-btn" onClick={() => setAdvanceModalOpen(true)}>+ Record Advance</button>
            </div>
          </div>
          <DataTable 
             columns={['DATE', 'EMPLOYEE', 'AMOUNT', 'REMARKS', 'ACTION']}
             data={advances.filter(a => a.month === targetMonth).map(a => ({
                ...a,
                date: new Date(a.date).toLocaleDateString(),
                amount: `LKR ${a.amount.toLocaleString()}`,
                action: <button className="delete-btn" onClick={() => handleDeleteAdvance(a._id)}>Delete</button>
             }))}
             emptyMessage="No advances recorded for this month."
          />
        </>
      )}

      {/* Modals */}
      <Modal isOpen={viewModalOpen} onClose={() => setViewModalOpen(false)} title="Salary Payment Details">
        <RecordDetails data={selectedRecord} type="salary" />
        <div className="modal-footer"><button className="secondary-btn" onClick={() => setViewModalOpen(false)}>Close</button></div>
      </Modal>

      <Modal isOpen={advanceModalOpen} onClose={() => setAdvanceModalOpen(false)} title="Record Salary Advance">
        <AdvanceForm employees={employees} currentMonth={targetMonth} onSubmit={handleAddAdvance} onCancel={() => setAdvanceModalOpen(false)} />
      </Modal>

      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingItem(null); }} title={editingItem ? 'Edit Salary' : 'Add Salary'}>
        <SalaryForm onSubmit={handleAddSalary} onCancel={() => { setIsModalOpen(false); setEditingItem(null); }} initialData={editingItem} />
      </Modal>

      <Modal isOpen={genModalOpen} onClose={() => setGenModalOpen(false)} title="⚡ Auto-Generate Monthly Salaries" wide>
        <SalaryGeneratorModal onClose={() => setGenModalOpen(false)} onComplete={fetchBaseData} />
      </Modal>
    </div>
  );
};

export default SalaryBook;
