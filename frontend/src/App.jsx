import React, { useState } from 'react';
import { LogOut } from 'lucide-react';
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
import Login from './components/Login';
import RoleSelection from './components/RoleSelection';
import './App.css';

const PAGE_TITLES = {
  dashboard: 'Dashboard',
  hires: 'Hire Book',
  salaries: 'Salary Book',
  diesel: 'Diesel Book',
  payments: 'Payment Book',
  clients: 'Clients',
  vehicles: 'Vehicles',
  employees: 'Employees',
  reports: 'Financial Report',
};

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('kt_auth_token'));
  const [selectedRole, setSelectedRole] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const userRole = localStorage.getItem('kt_user_role');
  const userName = localStorage.getItem('kt_user_name');

  const handleLogout = () => {
    localStorage.removeItem('kt_auth_token');
    localStorage.removeItem('kt_user_role');
    localStorage.removeItem('kt_user_name');
    setIsAuthenticated(false);
    setSelectedRole(null);
  };

  const renderContent = () => {
    const restrictedTabs = ['employees', 'reports', 'salaries', 'clients', 'payments'];
    if (userRole === 'Employee' && restrictedTabs.includes(activeTab)) {
      return <Dashboard role={userRole} name={userName} />;
    }

    switch(activeTab) {
      case 'dashboard': return <Dashboard role={userRole} name={userName} />;
      case 'hires':     return <HireBook />;
      case 'salaries':  return <SalaryBook />;
      case 'diesel':    return <DieselBook />;
      case 'payments':  return <PaymentBook />;
      case 'clients':   return <Clients />;
      case 'vehicles':  return <Vehicles />;
      case 'employees': return <Employees />;
      case 'reports':   return <FinancialReport />;
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
    <div className="app-layout">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        handleLogout={handleLogout} 
        role={userRole} 
        userName={userName}
      />
      <main className="main-content">
        <header className="main-header">
          <div className="header-info">
            <h2>{PAGE_TITLES[activeTab] || 'Dashboard'}</h2>
            {userRole === 'Employee' && <span className="user-context">Viewing as Employee</span>}
          </div>
          <div className="header-actions">
            <span className="user-name">Welcome, {userName || 'User'}</span>
            <button className="header-logout-btn" onClick={handleLogout} title="Sign Out">
              <LogOut size={18} />
            </button>
            <span className="current-date">{new Date().toDateString()}</span>
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
