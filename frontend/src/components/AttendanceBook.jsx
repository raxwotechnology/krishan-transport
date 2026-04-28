import React, { useState, useEffect } from 'react';
import { attendanceAPI, employeeAPI } from '../services/api';
import { Calendar, CheckCircle2, XCircle, Clock, RefreshCw } from 'lucide-react';
import '../styles/books.css';

const AttendanceBook = () => {
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    fetchData();
  }, [date]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [eRes, aRes] = await Promise.all([
        employeeAPI.get(),
        attendanceAPI.get({ date })
      ]);
      setEmployees(Array.isArray(eRes.data) ? eRes.data : []);
      // Filter attendance for the selected date on frontend as well to be sure
      const dayRecords = (Array.isArray(aRes.data) ? aRes.data : []).filter(r => {
          return new Date(r.date).toISOString().split('T')[0] === date;
      });
      setAttendance(dayRecords);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleMark = async (employeeName, status) => {
    try {
      await attendanceAPI.create({
        employee: employeeName,
        date: date,
        status: status
      });
      setSuccess(`Attendance marked for ${employeeName}`);
      fetchData();
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const getStatus = (name) => {
    const record = attendance.find(a => a.employee === name);
    return record ? record.status : 'None';
  };

  return (
    <div className="book-container">
      <div className="book-summary">
        <div className="summary-item">
          <label>TOTAL STAFF</label>
          <h3>{employees.length}</h3>
        </div>
        <div className="summary-item" style={{ borderRight: 'none' }}>
          <label>PRESENT TODAY</label>
          <h3 style={{ color: '#10B981' }}>{attendance.filter(a => a.status === 'Present').length}</h3>
        </div>
      </div>

      <div className="book-filters">
        <div className="search-box">
          <Calendar size={18} style={{ marginRight: '8px', color: '#64748B' }} />
          <input 
            type="date" 
            value={date} 
            onChange={(e) => setDate(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', fontWeight: '600' }}
          />
        </div>
        <div className="filter-actions">
           <button className="secondary-btn" onClick={fetchData}>
            <RefreshCw size={16} className={loading ? 'spinner' : ''} />
          </button>
        </div>
      </div>

      {success && <div className="success-banner">{success}</div>}

      <div className="attendance-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px', marginTop: '20px' }}>
        {employees.filter(e => e.status === 'Active').map(emp => {
          const status = getStatus(emp.name);
          return (
            <div key={emp._id} className="form-section" style={{ margin: 0, padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontWeight: '700', margin: 0 }}>{emp.name}</p>
                <p style={{ fontSize: '0.8rem', color: '#64748B', margin: 0 }}>{emp.role}</p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={() => handleMark(emp.name, 'Present')}
                  style={{ 
                    padding: '8px', 
                    borderRadius: '10px', 
                    border: '1px solid ' + (status === 'Present' ? '#059669' : '#E2E8F0'), 
                    background: status === 'Present' ? '#D1FAE5' : 'white',
                    color: status === 'Present' ? '#059669' : '#64748B',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  title="Present"
                >
                  <CheckCircle2 size={22} />
                </button>
                <button 
                  onClick={() => handleMark(emp.name, 'Absent')}
                  style={{ 
                    padding: '8px', 
                    borderRadius: '10px', 
                    border: '1px solid ' + (status === 'Absent' ? '#DC2626' : '#E2E8F0'), 
                    background: status === 'Absent' ? '#FEE2E2' : 'white',
                    color: status === 'Absent' ? '#DC2626' : '#64748B',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  title="Absent"
                >
                  <XCircle size={22} />
                </button>
                <button 
                  onClick={() => handleMark(emp.name, 'Leave')}
                  style={{ 
                    padding: '8px', 
                    borderRadius: '10px', 
                    border: '1px solid ' + (status === 'Leave' ? '#D97706' : '#E2E8F0'), 
                    background: status === 'Leave' ? '#FEF3C7' : 'white',
                    color: status === 'Leave' ? '#D97706' : '#64748B',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  title="Leave"
                >
                  <Clock size={22} />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  );
};

export default AttendanceBook;
