import React, { useState } from 'react';
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
  const [activeTab, setActiveTab] = useState('dashboard');

  const handleLogout = () => {
    localStorage.removeItem('kt_auth_token');
    setIsAuthenticated(false);
  };

  const renderContent = () => {
    switch(activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'hires':     return <HireBook />;
      case 'salaries':  return <SalaryBook />;
      case 'diesel':    return <DieselBook />;
      case 'payments':  return <PaymentBook />;
      case 'clients':   return <Clients />;
      case 'vehicles':  return <Vehicles />;
      case 'employees': return <Employees />;
      case 'reports':   return <FinancialReport />;
      default:          return <Dashboard />;
    }
  };

  if (!isAuthenticated) {
    return <Login onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="app-layout">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} handleLogout={handleLogout} />
      <main className="main-content">
        <header className="main-header">
          <div className="header-info">
            <h2>{PAGE_TITLES[activeTab] || 'Dashboard'}</h2>
          </div>
          <div className="header-actions">
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
