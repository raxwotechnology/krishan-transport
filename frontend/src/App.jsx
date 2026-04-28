import React, { useState } from 'react';
import { LogOut, Menu, X } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import DieselBook from './components/DieselBook';
import HireBook from './components/HireBook';
import SalaryBook from './components/SalaryBook';
import PaymentBook from './components/PaymentBook';
import Clients from './components/Clients';
import Vehicles from './components/Vehicles';
import Employees from './components/Employees';
import FinancialReport from './components/FinancialReport';
import InvoiceBook from './components/InvoiceBook';
import QuotationBook from './components/QuotationBook';
import AttendanceBook from './components/AttendanceBook';
import ExtraIncome from './components/ExtraIncome';
import Expenses from './components/Expenses';
import ComplianceBook from './components/ComplianceBook';
import Login from './components/Login';
import RoleSelection from './components/RoleSelection';
import './App.css';

const PAGE_TITLES = {
  dashboard: 'Dashboard',
  hires: 'Hire Book',
  salaries: 'Salary Book',
  diesel: 'Fuel Book',
  payments: 'Payment Book',
  clients: 'Clients',
  vehicles: 'Vehicles',
  compliance: 'Compliance & Leasing',
  employees: 'Employees',
  reports: 'Financial Report',
  invoices: 'Professional Invoices',
  quotations: 'Service Quotations',
  attendance: 'Staff Attendance',
  extraIncome: 'Extra Income Book',
  expenses: 'Expense Book',
};

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('kt_auth_token'));
  const [selectedRole, setSelectedRole] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const userRole = localStorage.getItem('kt_user_role');
  const userName = localStorage.getItem('kt_user_name');

  const handleLogout = () => {
    localStorage.removeItem('kt_auth_token');
    localStorage.removeItem('kt_user_role');
    localStorage.removeItem('kt_user_name');
    setIsAuthenticated(false);
    setSelectedRole(null);
  };

  // ── Session Timeout Logic (15 Minutes) ──
  React.useEffect(() => {
    if (!isAuthenticated) return;

    let timeout;
    const TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

    const resetTimer = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        handleLogout();
        alert('Your session has expired due to inactivity. Please log in again.');
      }, TIMEOUT_MS);
    };

    // Events to track activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(e => document.addEventListener(e, resetTimer));

    resetTimer(); // Start timer on mount

    return () => {
      clearTimeout(timeout);
      events.forEach(e => document.removeEventListener(e, resetTimer));
    };
  }, [isAuthenticated]);

  const renderContent = () => {
    const restrictedTabs = ['employees', 'reports', 'salaries', 'clients', 'payments', 'invoices', 'quotations', 'extraIncome', 'expenses', 'attendance'];
    if (userRole === 'Employee' && restrictedTabs.includes(activeTab)) {
      return <Dashboard key={activeTab} role={userRole} name={userName} />;
    }

    switch(activeTab) {
      case 'dashboard': return <Dashboard key="dashboard" role={userRole} name={userName} />;
      case 'hires':     return <HireBook />;
      case 'salaries':  return <SalaryBook />;
      case 'diesel':    return <DieselBook />;
      case 'payments':  return <PaymentBook />;
      case 'clients':   return <Clients />;
      case 'vehicles':  return <Vehicles />;
      case 'compliance': return <ComplianceBook />;
      case 'employees': return <Employees />;
      case 'reports':   return <FinancialReport />;
      case 'invoices':   return <InvoiceBook />;
      case 'quotations': return <QuotationBook />;
      case 'attendance': return <AttendanceBook />;
      case 'extraIncome': return <ExtraIncome />;
      case 'expenses': return <Expenses />;
      default:          return <Dashboard role={userRole} name={userName} />;
    }
  };

  if (!isAuthenticated) {
    if (!selectedRole) {
      return <RoleSelection onRoleSelect={(role) => setSelectedRole(role)} />;
    }
    return (
      <Login 
        roleContext={selectedRole} 
        onLoginSuccess={() => setIsAuthenticated(true)} 
        onBack={() => setSelectedRole(null)} 
      />
    );
  }

  return (
    <div className={`app-layout ${isSidebarOpen ? 'sidebar-open' : ''}`}>
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="sidebar-overlay" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setIsSidebarOpen(false); // Close sidebar on mobile after selection
        }} 
        handleLogout={handleLogout} 
        role={userRole} 
        userName={userName}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      <main className="main-content">
        <header className="main-header">
          <div className="header-left">
            <button 
              className="mobile-menu-btn" 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              title="Toggle Menu"
            >
              {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <h2>{PAGE_TITLES[activeTab] || 'Dashboard'}</h2>
          </div>
          <div className="header-right">
            <div className="user-nav-info">
              <div className="nav-avatar">
                {(userName || userRole || 'U')[0].toUpperCase()}
              </div>
              <div className="user-details">
                <p>{userName || 'User'}</p>
                <span>{userRole || 'Role'}</span>
              </div>
            </div>
            <span className="current-date">{new Date().toDateString()}</span>
            <button className="header-logout-btn" onClick={handleLogout} title="Sign Out" style={{
              background: '#FEF2F2',
              color: '#EF4444',
              border: '1px solid #FEE2E2',
              padding: '8px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer'
            }}>
              <LogOut size={18} />
            </button>
          </div>
        </header>
        <div className="content-area">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;
