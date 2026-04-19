import React from 'react';
import { ShieldCheck, Users, HardHat } from 'lucide-react';
import './RoleSelection.css';
import logo from '../logo.png';

const RoleSelection = ({ onRoleSelect }) => {
  const roles = [
    {
      id: 'Admin',
      title: 'Administrator',
      desc: 'Full system control, financial oversight, and user management.',
      icon: ShieldCheck,
      color: '#2563EB',
      bg: 'rgba(37, 99, 235, 0.08)'
    },
    {
      id: 'Manager',
      title: 'Manager',
      desc: 'Operational management, hire tracking, and team supervision.',
      icon: Users,
      color: '#10B981',
      bg: 'rgba(16, 185, 129, 0.08)'
    },
    {
      id: 'Employee',
      title: 'Employee',
      desc: 'Personal job logs, salary overview, and vehicle maintenance.',
      icon: HardHat,
      color: '#4B5563',
      bg: 'rgba(75, 85, 99, 0.08)'
    }
  ];

  return (
    <div className="landing-container">
      <div className="landing-overlay"></div>
      <div className="landing-content">
        <header className="landing-header">
          <img src={logo} alt="Krishan Transport Logo" className="landing-logo" />
          <h1>Krishan Transport</h1>
          <p>Management & Logistics Portal</p>
        </header>

        <div className="role-grid">
          {roles.map((role) => {
            const Icon = role.icon;
            return (
              <div 
                key={role.id} 
                className="role-card" 
                onClick={() => onRoleSelect(role.id)}
                style={{ '--accent': role.color, '--bg-subtle': role.bg }}
              >
                <div className="role-icon-wrapper">
                  <Icon size={32} />
                </div>
                <h3>{role.title}</h3>
                <p>{role.desc}</p>
                <div className="role-action">
                  <span>Enter Portal</span>
                  <div className="arrow">→</div>
                </div>
              </div>
            );
          })}
        </div>

        <footer className="landing-footer">
          <p>© {new Date().getFullYear()} Krishan Transport Management System. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
};

export default RoleSelection;
