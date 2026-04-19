import React from 'react';
import { 
  LayoutDashboard, 
  Truck, 
  Users, 
  Fuel, 
  CreditCard, 
  Contact,
  LogOut,
  UserCircle,
  FileBarChart,
  Car
} from 'lucide-react';
import './Sidebar.css';
import logo from '../logo.png';

const Sidebar = ({ activeTab, setActiveTab, handleLogout }) => {
  const menuItems = [
    { id: 'dashboard',  label: 'Dashboard',        icon: LayoutDashboard },
    { id: 'hires',      label: 'Hire Book',         icon: Truck },
    { id: 'salaries',   label: 'Salary Book',       icon: Contact },
    { id: 'diesel',     label: 'Diesel Book',        icon: Fuel },
    { id: 'payments',   label: 'Payment Book',       icon: CreditCard },
    { id: 'clients',    label: 'Clients',            icon: Users },
    { id: 'vehicles',   label: 'Vehicles',           icon: Car },
    { id: 'employees',  label: 'Employees',          icon: UserCircle },
    { id: 'reports',    label: 'Financial Report',   icon: FileBarChart },
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <img src={logo} alt="Krishan Transport Logo" className="app-logo" />
        <div className="logo-text">
          <span className="logo-subtitle">MANAGEMENT SYSTEM</span>
        </div>
      </div>
      
      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
      
      <div className="sidebar-footer">
        <button className="logout-btn" onClick={handleLogout}>
          <LogOut size={18} />
          <span>Logout</span>
        </button>
        <div className="status-indicator">
          <span className="dot"></span>
          <span>System Online</span>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
