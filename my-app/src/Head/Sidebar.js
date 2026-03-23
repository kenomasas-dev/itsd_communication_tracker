import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import './Sidebar.css';

export default function Sidebar({
  brand = { icon: 'D', title: 'ITSD Communication Valencia city' },
  navItems = [],
  settingsItems = []
}) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('headUser');
    navigate('/head/login');
  };

  return (
    <aside className="head-sidebar">
      <div className="head-sidebar-brand">
        <img src="/logo.png" alt="ITSD Logo" className="brand-icon" />
        <div className="brand-title">{brand.title}</div>
      </div>

      <div className="head-section">
        <div className="section-title">MAIN MENU</div>
        <nav className="nav-list">
          {navItems.map((item) => (
            <button key={item.label} className={`nav-item ${item.active ? 'active' : ''}`} onClick={item.onClick}>
              <span className="nav-icon" aria-hidden>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="head-section">
        <div className="section-title">SETTINGS</div>
        <nav className="nav-list">
          {settingsItems.map((item) => (
            <button key={item.label} className={`nav-item ${item.active ? 'active' : ''}`} onClick={item.onClick}>
              <span className="nav-icon" aria-hidden>{item.icon}</span>
              <span>{item.label}</span>
              {item.badge ? <span className="badge">{item.badge}</span> : null}
            </button>
          ))}
          <button className="nav-item" onClick={handleLogout} style={{ color: '#ef4444' }}>
            <span className="nav-icon" aria-hidden><LogOut size={16} strokeWidth={2} /></span>
            <span>Logout</span>
          </button>
        </nav>
      </div>

    </aside>
  );
}
