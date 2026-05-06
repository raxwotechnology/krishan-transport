import React from 'react';
import DataTable from './DataTable';
import Modal from './Modal';
import SalaryForm from './SalaryForm';
import { salaryAPI, vehicleAPI, employeeAPI, hireAPI, attendanceAPI, advanceAPI, dayPaymentAPI } from '../services/api';
import { generatePDFReport } from '../utils/reportGenerator';
import { Download, Search, RefreshCw, Calendar } from 'lucide-react';
import '../styles/forms.css';
import '../styles/books.css';
import RecordDetails from './RecordDetails';
import SalaryGeneratorModal from './SalaryGeneratorModal';
import AdvanceForm from './AdvanceForm';
import { useMonthFilter } from '../context/MonthFilterContext';

const SalaryBook = () => {
  const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const userRole = localStorage.getItem('kt_user_role');
  const canManage = isDev || ['Admin', 'Manager'].includes(userRole);

  const { selectedMonth, selectedYear, isFilterActive, monthYear, setSelectedMonth, setSelectedYear, months, years } = useMonthFilter();
  
  const [activeTab, setActiveTab] = React.useState('Driver');
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [success, setSuccess] = React.useState(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [targetDate, setTargetDate] = React.useState(new Date().toISOString().split('T')[0]);

  const [employees, setEmployees] = React.useState([]);
  const [hires, setHires] = React.useState([]);
  const [attendance, setAttendance] = React.useState([]);
  const [dbSalaries, setDbSalaries] = React.useState([]);
  const [advances, setAdvances] = React.useState([]);
  const [vehicles, setVehicles] = React.useState([]);
  const [dayPayments, setDayPayments] = React.useState([]);

  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [viewModalOpen, setViewModalOpen] = React.useState(false);
  const [advanceModalOpen, setAdvanceModalOpen] = React.useState(false);
  const [genModalOpen, setGenModalOpen] = React.useState(false);
  
  const [selectedRecord, setSelectedRecord] = React.useState(null);
  const [editingItem, setEditingItem] = React.useState(null);

  React.useEffect(() => {
    fetchBaseData();
  }, [monthYear, isFilterActive]);

  const fetchBaseData = async () => {
    setLoading(true);
    try {
      const [eRes, hRes, aRes, sRes, vRes, advRes, dpRes] = await Promise.all([
        employeeAPI.get(),
        hireAPI.get(),
        attendanceAPI.get(),
        salaryAPI.get(),
        vehicleAPI.get(),
        advanceAPI.get(),
        dayPaymentAPI.get()
      ]);
      setEmployees((eRes.data || []).filter(e => e.status === 'Active'));
      setHires(hRes.data || []);
      setAttendance(aRes.data || []);
      setDbSalaries(sRes.data || []);
      setVehicles(vRes.data || []);
      setAdvances(advRes.data || []);
      setDayPayments(dpRes.data || []);
      setError(null);
    } catch (err) {
      console.error('FETCH ERROR:', err);
      setError(`Connection issue: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const processedSalaries = React.useMemo(() => {
    const tMonthIdx = selectedMonth;
    const tYear = selectedYear;

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

      const uniqueHireDates = new Set(monthHires.map(h => new Date(h.date).toDateString())).size;
      const effectiveWorkDays = Math.max(empAtt, uniqueHireDates);

      // Determine Base Pay: Fixed Basic OR Daily Wage
      if (emp.salaryType === 'Daily') {
        basic = effectiveWorkDays * (emp.dailyWage || 0);
      } else {
        basic = emp.basicSalary || 0;
      }

      if (activeTab === 'Driver' || activeTab === 'Manager') {
        if (empAtt > 25) attendanceBonus = (empAtt - 25) * 1000;

        if (activeTab === 'Driver') {
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
        
        // A helper might also have an hourly rate if they do extra tasks, though usually they do shifts
        totalHours = monthHires.reduce((sum, j) => sum + (parseFloat(j.workingHours) || 0), 0);
        const extraHourly = totalHours * (emp.hourlyRate || 0);
        
        hourlyEarnings = helperShiftEarnings + extraHourly;
        totalHours = monthHires.length; // Keeping backwards compatibility for 'Jobs' count display
        helperShifts = shifts;
      }

      const empAdvances = advances
        .filter(a => a.employee === emp.name && a.month === monthYear)
        .reduce((sum, a) => sum + (a.amount || 0), 0);

      const dbRecord = dbSalaries.find(s => s.employee === emp.name && s.month === monthYear);
      
      // Real-time link: Use latest advance from book even if record is saved, 
      // or prioritize saved record's fields if they were manually edited.
      const currentAdvance = empAdvances; 
      const currentIncentive = (dbRecord ? (dbRecord.incentive || 0) : 0) + attendanceBonus;
      const currentPenalty = attendancePenalty;

      const netPay = (basic + hourlyEarnings + dailyAllowance + currentIncentive) - (currentAdvance + currentPenalty);

      return {
        _id: dbRecord ? dbRecord._id : `live-${emp.name}`,
        month: monthYear,
        employee: emp.name,
        role: emp.role,
        basic: `LKR ${basic.toLocaleString()}`,
        hourlyEarnings: (activeTab === 'Manager') ? '—' : `LKR ${hourlyEarnings.toLocaleString()}`,
        dailyAllowance: activeTab === 'Driver' ? `LKR ${dailyAllowance.toLocaleString()}` : '—',
        totalHours: activeTab === 'Driver' ? `${totalHours}h` : (activeTab === 'Helper' ? `${monthHires.length} Jobs` : '—'),
        netPay: `LKR ${netPay.toLocaleString()}`,
        netPay_val: netPay,
        incentive: currentIncentive,
        advance: currentAdvance,
        attendancePenalty: currentPenalty,
        attendanceBonus: attendanceBonus,
        jobsCount: (dbRecord && dbRecord.jobsCount !== undefined) ? dbRecord.jobsCount : monthHires.length,
        workingDays: (dbRecord && dbRecord.workingDays !== undefined) ? dbRecord.workingDays : empAtt,
        rawData: dbRecord ? { ...dbRecord, advance: currentAdvance, netPay } : { 
            employee: emp.name, month: monthYear, basic, hourlyEarnings, dailyAllowance, 
            totalHours, jobsCount: monthHires.length, workingDays: empAtt, role: emp.role, 
            advance: currentAdvance, incentive: currentIncentive, attendanceBonus, attendancePenalty,
            shifts: helperShifts, netPay
        },
        isLive: !dbRecord,
        action: canManage ? (
          <div className="table-actions">
            <button className="edit-btn" onClick={() => handleEdit(dbRecord ? { ...dbRecord, advance: currentAdvance, netPay } : { employee: emp.name, month: monthYear, basic, hourlyEarnings, dailyAllowance, totalHours, jobsCount: monthHires.length, workingDays: empAtt, role: emp.role, advance: currentAdvance, incentive: currentIncentive, attendanceBonus, attendancePenalty, netPay })}>
              {dbRecord ? 'Edit' : 'Finalize'}
            </button>
            {dbRecord && <button className="delete-btn" onClick={() => handleDelete(dbRecord._id)}>Delete</button>}
          </div>
        ) : null
      };
    });
  }, [employees, hires, attendance, dbSalaries, advances, monthYear, selectedMonth, selectedYear, canManage, activeTab]);

  const helperShiftSheet = React.useMemo(() => {
    const tMonthIdx = selectedMonth;
    const tYear = selectedYear;

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
  }, [hires, selectedMonth, selectedYear]);

  const dailyWageEmployees = React.useMemo(() => {
    const dailyEmp = employees.filter(e => e.salaryType === 'Daily');
    
    return dailyEmp.map(emp => {
      // 1. Did they attend on targetDate?
      const att = attendance.find(a => a.employee === emp.name && a.date.startsWith(targetDate) && a.status === 'Present');
      const attended = !!att;

      // 2. Did they have jobs on targetDate?
      const jobs = hires.filter(h => h.date.startsWith(targetDate) && (h.driverName === emp.name || h.helperName === emp.name));
      const hasJob = jobs.length > 0;
      
      const effectiveWork = (attended || hasJob);
      const basic = effectiveWork ? (emp.dailyWage || 0) : 0;
      
      const totalHours = jobs.reduce((sum, j) => sum + (parseFloat(j.workingHours) || 0), 0);
      const hourlyEarnings = totalHours * (emp.hourlyRate || 0);
      
      const totalAmount = basic + hourlyEarnings;

      const existingRecord = dayPayments.find(dp => dp.employee === emp.name && dp.date.startsWith(targetDate));

      return {
        _id: existingRecord ? existingRecord._id : null,
        date: targetDate,
        employee: emp.name,
        role: emp.role,
        'daily wage': `LKR ${basic.toLocaleString()}`,
        hourlyEarnings: `LKR ${hourlyEarnings.toLocaleString()}`,
        totalAmount_disp: `LKR ${totalAmount.toLocaleString()}`,
        totalAmount_val: totalAmount,
        status: existingRecord ? 'Paid' : (totalAmount > 0 ? 'Pending' : 'No Earnings'),
        action: canManage && !existingRecord && totalAmount > 0 ? (
          <button className="add-btn" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={async () => {
             try {
                await dayPaymentAPI.create({ date: targetDate, employee: emp.name, role: emp.role, dailyWage: basic, hourlyEarnings, totalAmount });
                fetchBaseData();
             } catch(err) { setError("Failed to save day payment"); }
          }}>Pay Now</button>
        ) : (existingRecord && canManage ? <button className="delete-btn" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={async () => {
             try {
                await dayPaymentAPI.delete(existingRecord._id);
                fetchBaseData();
             } catch(err) { setError("Failed to delete day payment"); }
        }}>Reverse</button> : null)
      };
    });
  }, [employees, attendance, hires, targetDate, dayPayments, canManage]);

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
    if (activeTab === 'Day Payment') {
        return dailyWageEmployees.filter(s => 
            !searchQuery || s.employee.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }
    return processedSalaries.filter(r => {
      return !searchQuery || (r.employee || '').toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [processedSalaries, helperShiftSheet, dailyWageEmployees, searchQuery, activeTab]);

  const stats = React.useMemo(() => {
    const totalPotential = filteredRecords.reduce((sum, r) => sum + (activeTab === 'Day Payment' ? (r.totalAmount_val || 0) : (r.netPay_val || 0)), 0);
    return { totalPotential, count: filteredRecords.length };
  }, [filteredRecords, activeTab]);

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
    generatePDFReport({ title: `Salary Overview - ${monthYear}`, columns, data, filename: `Salary_Live_${monthYear.replace(' ', '_')}.pdf` });
  };

  return (
    <div className="book-container">
      {/* Global Month/Year Picker */}
      <div className="book-filters" style={{ marginBottom: '0px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Calendar size={20} color="#2563EB" />
          <h3 style={{ margin: 0, fontSize: '1rem', color: '#1E293B' }}>{activeTab === 'Day Payment' ? 'Target Date:' : 'Target Payroll Period:'}</h3>
        </div>
        <div className="filter-actions">
          {activeTab === 'Day Payment' ? (
            <input 
              type="date"
              value={targetDate}
              onChange={e => setTargetDate(e.target.value)}
              className="secondary-btn"
              style={{ height: '38px', minWidth: '150px', fontWeight: '700' }}
            />
          ) : (
            <>
              <select 
                value={selectedMonth} 
                onChange={e => setSelectedMonth(parseInt(e.target.value))}
                className="secondary-btn"
                style={{ height: '38px', minWidth: '130px', fontWeight: '700' }}
              >
                {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
              <select 
                value={selectedYear} 
                onChange={e => setSelectedYear(parseInt(e.target.value))}
                className="secondary-btn"
                style={{ height: '38px', minWidth: '100px', fontWeight: '700' }}
              >
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </>
          )}
          <button className="secondary-btn" onClick={fetchBaseData}><RefreshCw size={16} className={loading ? 'spinner' : ''} /></button>
        </div>
      </div>

      <div className="tab-switcher">
        {['Driver', 'Helper', 'Manager', 'Day Payment', 'Advances', 'Shift Sheet'].map(tab => (
          <button 
            key={tab}
            className={activeTab === tab ? 'active-tab' : ''} 
            onClick={() => setActiveTab(tab)}
          >
            {tab.toUpperCase()} {tab === 'Advances' || tab === 'Shift Sheet' || tab === 'Day Payment' ? '' : 'SALARY BOOK'}
          </button>
        ))}
      </div>

      {activeTab !== 'Advances' ? (
        <>
          <div className="book-summary">
            <div className="summary-item">
              <label>{activeTab === 'Shift Sheet' || activeTab === 'Day Payment' ? 'TOTAL EARNINGS' : `TOTAL POTENTIAL ${activeTab.toUpperCase()} PAYROLL`}</label>
              <h3 style={{ color: '#2563EB' }}>LKR {stats.totalPotential.toLocaleString()}</h3>
            </div>
            <div className="summary-item" style={{ borderRight: 'none' }}>
              <label>{activeTab === 'Shift Sheet' ? 'SHIFT COUNT' : (activeTab === 'Day Payment' ? 'EMPLOYEES' : `ACTIVE ${activeTab.toUpperCase()} COUNT`)}</label>
              <h3>{stats.count}</h3>
            </div>
          </div>

          <div className="book-filters">
            <div className="search-box">
              <Search className="search-icon" size={16} />
              <input type="text" placeholder={activeTab === 'Shift Sheet' ? "Search helper or date..." : (activeTab === 'Day Payment' ? 'Search employee...' : "Search employee...")} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            <div className="filter-actions">
              <button className="secondary-btn" onClick={handleExportPDF}><Download size={16} /> Export PDF</button>
              {activeTab !== 'Advances' && activeTab !== 'Shift Sheet' && activeTab !== 'Day Payment' && canManage && (
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
                : activeTab === 'Day Payment'
                ? ['DATE', 'EMPLOYEE', 'ROLE', 'DAILY WAGE', 'HOURLY', 'TOTAL', 'STATUS', 'ACTION']
                : (canManage ? ['MONTH', 'EMPLOYEE', 'BASIC', 'HOURLY', 'DAILY', 'TOTAL HRS', 'NET PAY', 'ACTION'] : ['MONTH', 'EMPLOYEE', 'BASIC', 'HOURLY', 'DAILY', 'TOTAL HRS', 'NET PAY'])
            } 
            data={filteredRecords} 
            loading={loading}
            onRowClick={activeTab === 'Shift Sheet' || activeTab === 'Day Payment' ? null : handleRowClick}
            emptyMessage={loading ? "Loading..." : "No records found."} 
          />
        </>
      ) : (
        <>
          <div className="book-filters">
            <h3 style={{ margin: 0, color: '#1E293B', fontSize: '0.9rem' }}>Monthly Advance Payments ({monthYear})</h3>
            <div className="filter-actions">
              <button className="add-btn" onClick={() => setAdvanceModalOpen(true)}>+ Record Advance</button>
            </div>
          </div>
          <DataTable 
             columns={['DATE', 'EMPLOYEE', 'AMOUNT', 'REMARKS', 'ACTION']}
             data={advances.filter(a => a.month === monthYear).map(a => ({
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
        <AdvanceForm employees={employees} currentMonth={monthYear} onSubmit={handleAddAdvance} onCancel={() => setAdvanceModalOpen(false)} />
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
