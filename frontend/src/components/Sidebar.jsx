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
  Car,
  FileText,
  FileCheck,
  Wallet,
  TrendingDown,
  Wrench,
  X
} from 'lucide-react';
import './Sidebar.css';
import logo from '../logo.png';
import { useMonthFilter } from '../context/MonthFilterContext';
import { Calendar } from 'lucide-react';

const Sidebar = ({ activeTab, setActiveTab, handleLogout, role, userName, isOpen, isCollapsed, onClose }) => {
  const { 
    selectedMonth, setSelectedMonth, 
    selectedYear, setSelectedYear,
    isFilterActive, setIsFilterActive,
    months, years
  } = useMonthFilter();

  const allMenuItems = [
    { id: 'dashboard',  label: 'Dashboard',        icon: LayoutDashboard },
    { id: 'hires',      label: 'Hire Book',         icon: Truck },
    { id: 'salaries',   label: 'Salary Book',       icon: Contact },
    { id: 'attendance', label: 'Attendance',        icon: Users },
    { id: 'diesel',     label: 'Fuel Book',          icon: Fuel },
    { id: 'payments',   label: 'Payment Book',       icon: CreditCard },
    { id: 'invoices',   label: 'Invoices',           icon: FileText },
    { id: 'quotations', label: 'Quotations',         icon: FileCheck },
    { id: 'extraIncome', label: 'Extra Income',      icon: Wallet },
    { id: 'expenses',    label: 'Expenses',          icon: TrendingDown },
    { id: 'clients',    label: 'Clients',            icon: Users },
    { id: 'vehicles',   label: 'Vehicles',           icon: Car },
    { id: 'compliance', label: 'Compliance Book',    icon: FileCheck },
    { id: 'employees',  label: 'Employees',          icon: UserCircle },
    { id: 'maintenance', label: 'Maintenance Book',   icon: Wrench },
    { id: 'services',    label: 'Service Book',       icon: Wrench },
    { id: 'reports',    label: 'Financial Report',   icon: FileBarChart },
  ];

  const menuItems = allMenuItems.filter(item => {
    // Treat everyone EXCEPT Admin and Manager as restricted employees
    if (role !== 'Admin' && role !== 'Manager') {
      return ['dashboard', 'hires', 'diesel', 'vehicles', 'compliance', 'maintenance', 'services'].includes(item.id);
    }
    return true; // Manager and Admin see all
  });

  return (
    <div className={`sidebar ${isOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-logo">
        <div className="logo-row">
          <img src={logo} alt="Krishan Transport Logo" className="app-logo" />
          <button className="sidebar-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="logo-text">
          {!isCollapsed && <span className="logo-subtitle">MANAGEMENT SYSTEM</span>}
        </div>
      </div>
      
      <div className="user-profile-simple">
        <div className="profile-initials">{(userName || role || 'U')[0].toUpperCase()}</div>
        {!isCollapsed && (
          <div className="profile-info">
            <p className="profile-name">{userName || 'User'}</p>
            <p className="profile-role">{role || 'Role'}</p>
          </div>
        )}
      </div>

      <div className="month-filter-section">
        <div className="filter-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={16} />
            {!isCollapsed && <span>Monthly Reset</span>}
          </div>
          {!isCollapsed && (
            <label className="toggle-switch">
              <input 
                type="checkbox" 
                checked={isFilterActive} 
                onChange={e => setIsFilterActive(e.target.checked)} 
              />
              <span className="slider round"></span>
            </label>
          )}
        </div>
        {isFilterActive && !isCollapsed && (
          <div className="filter-controls">
            <select 
              value={selectedMonth} 
              onChange={e => setSelectedMonth(parseInt(e.target.value))}
            >
              {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
            <select 
              value={selectedYear} 
              onChange={e => setSelectedYear(parseInt(e.target.value))}
            >
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        )}
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
              title={isCollapsed ? item.label : ''}
            >
              <Icon size={20} />
              {!isCollapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>
      
      <div className="sidebar-footer">
        <button className="logout-btn" onClick={handleLogout} title={isCollapsed ? 'Logout' : ''}>
          <LogOut size={18} />
          {!isCollapsed && <span>Logout</span>}
        </button>
        {!isCollapsed && (
          <div className="status-indicator">
            <span className="dot"></span>
            <span>System Online</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
