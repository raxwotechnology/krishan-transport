import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, 
  Wallet, 
  Fuel, 
  ArrowDown, 
  BarChart,
  Calendar
} from 'lucide-react';
import { hireAPI, dieselAPI, salaryAPI, paymentAPI } from '../services/api';
import './Dashboard.css';

const StatCard = ({ title, value, subtext, icon: Icon, color }) => (
  <div className="stat-card" style={{ '--accent': color }}>
    <div className="stat-icon">
      <Icon size={24} />
    </div>
    <div className="stat-info">
      <p className="stat-title">{title}</p>
      <h3 className="stat-value">{value}</h3>
      <p className="stat-subtext">{subtext}</p>
    </div>
  </div>
);

const Dashboard = ({ role, name }) => {
  const [data, setData] = useState({ hires: [], diesel: [], salaries: [], payments: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [h, d, s, p] = await Promise.all([
          hireAPI.get(),
          dieselAPI.get(),
          salaryAPI.get(),
          paymentAPI.get()
        ]);
        setData({ 
          hires: h.data || [], 
          diesel: d.data || [], 
          salaries: s.data || [], 
          payments: p.data || [] 
        });
      } catch (err) {
        console.error('Dashboard data fetch failed');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const stats = useMemo(() => {
    const totalHire = data.hires.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
    const totalDiesel = data.diesel.reduce((s, r) => s + (parseFloat(r.total) || 0), 0);
    const totalSalary = data.salaries.reduce((s, r) => s + (parseFloat(r.netPay) || 0), 0);
    const totalPayments = data.payments.reduce((s, r) => s + (parseFloat(r.paidAmount) || 0), 0);
    const net = totalHire - totalSalary - totalDiesel;

    if (role !== 'Admin' && role !== 'Manager') {
      return [
        { id: 1, title: 'My Jobs', value: `${data.hires.length}`, subtext: 'Total completed', icon: TrendingUp, color: '#2563EB' },
        { id: 2, title: 'Earnings', value: `LKR ${totalSalary.toLocaleString()}`, subtext: 'Total net pay', icon: Wallet, color: '#10B981' },
        { id: 3, title: 'Fuel Logs', value: `${data.diesel.length}`, subtext: 'Entries made', icon: Fuel, color: '#F59E0B' },
        { id: 4, title: 'My Efficiency', value: 'High', subtext: 'Performance tracking', icon: BarChart, color: '#EC4899' }
      ];
    }

    return [
      { id: 1, title: 'Hire Revenue', value: `LKR ${totalHire.toLocaleString()}`, subtext: `${data.hires.length} jobs`, icon: TrendingUp, color: '#2563EB' },
      { id: 2, title: 'Salary Paid', value: `LKR ${totalSalary.toLocaleString()}`, subtext: `${data.salaries.length} records`, icon: Wallet, color: '#10B981' },
      { id: 3, title: 'Diesel Cost', value: `LKR ${totalDiesel.toLocaleString()}`, subtext: `${data.diesel.length} entries`, icon: Fuel, color: '#F59E0B' },
      { id: 4, title: 'Payments Received', value: `LKR ${totalPayments.toLocaleString()}`, subtext: `${data.payments.length} transactions`, icon: ArrowDown, color: '#8B5CF6' },
      { id: 5, title: 'Net Profit (Est.)', value: `LKR ${net.toLocaleString()}`, subtext: 'Revenue - Costs', icon: BarChart, color: '#EC4899' }
    ];
  }, [data, role]);

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>{(role !== 'Admin' && role !== 'Manager') ? `Hello, ${name}` : 'Business Overview'} · {new Date().toLocaleString('default', { month: 'long' })} {new Date().getFullYear()}</h1>
      </div>
      
      <div className="stats-grid">
        {stats.map(stat => (
          <StatCard key={stat.id} {...stat} />
        ))}
      </div>

      <div className="recent-activity">
        <div className="section-header">
          <h3>{role === 'Employee' ? 'My Recent Assignments' : 'Recent Highlights'}</h3>
        </div>
        <div className="activity-card">
          {loading ? (
            <div className="loading-state">Loading logs...</div>
          ) : data.hires.length > 0 ? (
            <div className="recent-list">
              {data.hires.slice(0, 5).map((h, i) => (
                <div key={i} className="activity-item">
                  <div className={`activity-indicator ${role === 'Employee' ? 'green' : 'blue'}`}></div>
                  <div className="activity-details">
                    <p>{role === 'Employee' ? `Completed: ${h.client}` : `New Hire: ${h.client}`} for {h.vehicle}</p>
                    <span>{new Date(h.date).toLocaleDateString()}</span>
                  </div>
                  <div className="activity-value">LKR {h.amount}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon"></div>
              <p>No activity yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
