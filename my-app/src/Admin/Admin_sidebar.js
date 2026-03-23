import React, { useState } from 'react';
import './Admin_sidebar.css';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Activity,
  MessageSquare,
  ClipboardList,
  TrendingUp,
  List,
  Settings,
  LogOut
} from 'lucide-react';

export default function AdminSidebar({ activeSection = 'users', onSectionChange }) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [adminUser, setAdminUser] = useState({ name: 'Administrator', email: 'admin@itsd.com' });
  const navigate = useNavigate();
  const [processPendingCount, setProcessPendingCount] = useState(0);

  // Load admin from localStorage
  React.useEffect(() => {
    const stored = localStorage.getItem('adminUser');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setAdminUser({
          name: parsed.name || 'Administrator',
          email: parsed.email || 'admin@itsd.com'
        });
      } catch (e) {
        console.error('Failed to parse admin user:', e);
      }
    }
  }, []);

  // Fetch pending count for Process (communications with status 'pending')
  React.useEffect(() => {
    let mounted = true;
    const fetchPending = async () => {
      try {
        const res = await fetch('/api/communications');
        if (!res.ok) throw new Error('failed');
        const data = await res.json();
        const pending = Array.isArray(data) ? data.filter(d => d.status && d.status.toLowerCase() === 'pending').length : 0;
        if (mounted) setProcessPendingCount(pending);
      } catch (e) {
        if (mounted) setProcessPendingCount(0);
      }
    };
    fetchPending();
    const interval = setInterval(fetchPending, 30000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);



  // Get admin initials
  const getInitials = () => {
    const name = adminUser.name || 'Admin';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'AD';
  };
  const navItems = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'users', label: 'Users' },
    { id: 'roles', label: 'Roles' },
    { id: 'process', label: 'Process' },

    { id: 'groups', label: 'Groups' },
    { id: 'message', label: 'Announcements' },
    { id: 'audit', label: 'Audit Logs' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'lists', label: 'Lists' },
    { id: 'settings', label: 'Settings' }
  ];

  const handleLogout = async () => {
    // Read stored user first so we can include the username/email in the audit record
    const stored = localStorage.getItem('adminUser');
    let userEmail = 'Unknown';
    let userName = 'Unknown';
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        userEmail = parsed.email || userEmail;
        userName = parsed.name || parsed.email || userName;
      } catch (e) {
        console.warn('Failed to parse stored user on logout:', e);
      }
    }

    // Clear local storage
    localStorage.removeItem('adminUser');
    localStorage.removeItem('authToken');
    localStorage.removeItem('rememberEmail');

    // Record logout in audit logs with the user's email/name
    try {
      // Store the username in the `user_email` column so the audit shows who logged out
      await fetch('/api/auth/record-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'LOGOUT',
          user_email: userName || userEmail || 'Unknown',
          user_role: 'Admin',
          description: `Admin user ${userName} (${userEmail}) logged out`
        })
      });
    } catch (err) {
      console.warn('Audit log failed:', err);
    }

    setShowProfileMenu(false);
    navigate('/admin/login');
  };

  const getIcon = (id) => {
    const iconProps = { size: 18, strokeWidth: 2, style: { display: 'block' } };
    switch (id) {
      case 'dashboard':
        return <LayoutDashboard {...iconProps} />;
      case 'users':
        return <Users {...iconProps} />;
      case 'roles':
        return <UserCheck {...iconProps} />;
      case 'process':
        return <Activity {...iconProps} />;
      case 'groups':
        return <Users {...iconProps} />;
      case 'message':
        return <MessageSquare {...iconProps} />;
      case 'audit':
        return <ClipboardList {...iconProps} />;
      case 'analytics':
        return <TrendingUp {...iconProps} />;
      case 'lists':
        return <List {...iconProps} />;
      case 'settings':
        return <Settings {...iconProps} />;
      default:
        return null;
    }
  };

  return (
    <div className="admin-sidebar">
      <div className="sidebar-header">
        <div className="logo-container">
          <div className="logo-icon">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2l7 4v5c0 5-3.8 9.6-7 11-3.2-1.4-7-6-7-11V6l7-4z" fill="currentColor" />
              <path d="M12 8.5l1.9 3.8L18 13l-3 2.1L14 19l-2-1.1L10 19l-.9-3.9L6 13l4.1-.7L12 8.5z" fill="rgba(255,255,255,0.95)" />
            </svg>
          </div>
          <h1 className="logo-text">AccessControl</h1>
        </div>
      </div>



      <nav className="sidebar-nav">
        {navItems.map(item => (
          <button
            key={item.id}
            className={`nav-item ${activeSection === item.id ? 'active' : ''}`}
            onClick={() => onSectionChange?.(item.id)}
          >
            <span className="nav-icon" aria-hidden>{getIcon(item.id)}</span>
            <span className="nav-label">{item.label}</span>
            {item.id === 'process' && processPendingCount > 0 ? (
              <span className="notif">{processPendingCount}</span>
            ) : null}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div
          className="user-profile"
          onClick={() => setShowProfileMenu(!showProfileMenu)}
        >
          <div className="user-avatar">{getInitials()}</div>
          <div className="user-details">
            <div className="user-name">{adminUser.name}</div>
            <div className="user-role">Administrator</div>
          </div>
          <div style={{ marginLeft: 'auto', fontSize: '12px', opacity: 0.7 }}>
            ▼
          </div>
        </div>

        {showProfileMenu && (
          <div className="profile-menu">
            <div className="profile-menu-item profile-header">
              <div className="menu-avatar">{getInitials()}</div>
              <div>
                <div className="menu-name">{adminUser.name}</div>
                <div className="menu-email">{adminUser.email}</div>
              </div>
            </div>
            <div className="profile-menu-divider"></div>
            <button
              className="profile-menu-item"
              onClick={() => {
                navigate('/admin?section=settings');
                setShowProfileMenu(false);
              }}
            >
              <span><Settings size={16} strokeWidth={2} /></span>
              <span>View Profile</span>
            </button>

            <div className="profile-menu-divider"></div>
            <button
              className="profile-menu-item logout"
              onClick={handleLogout}
            >
              <span><LogOut size={16} strokeWidth={2} /></span>
              <span>Logout</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
