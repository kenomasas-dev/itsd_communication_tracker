import React, { useState, useEffect } from 'react';
import './sidebar.css';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Activity,
  Calendar,
  MessageSquare,
  ClipboardList,
  TrendingUp,
  List,
  Settings,
  LogOut
} from 'lucide-react';

export default function UserSidebar({ active = 'overview', onSelect }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);
  const [user, setUser] = useState(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [pendingProjectsCount, setPendingProjectsCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

  // Load user from localStorage
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (e) {
        console.error('Failed to parse user data:', e);
      }
    }
  }, []);

  // Fetch pending projects count
  useEffect(() => {
    async function fetchPendingProjectsCount() {
      try {
        const res = await fetch('/api/communications');
        const data = await res.json();
        const pending = data.filter(d => d.status && d.status.toLowerCase() === 'pending').length;
        setPendingProjectsCount(pending);
      } catch (err) {
        console.error('Failed to fetch pending projects count:', err);
        setPendingProjectsCount(0);
      }
    }
    fetchPendingProjectsCount();
    // Refresh every 30 seconds
    const interval = setInterval(fetchPendingProjectsCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch unread messages count
  useEffect(() => {
    async function fetchUnreadCount() {
      try {
        const res = await fetch('/api/message');
        const data = await res.json();
        const arr = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
        setUnreadMessagesCount(arr.filter(m => !m.is_read).length);
      } catch (err) {
        setUnreadMessagesCount(0);
      }
    }
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // Get user initials
  const getInitials = () => {
    if (!user) return 'U';
    let name;
    if (user.first_name && user.last_name) {
      name = `${user.first_name} ${user.last_name}`;
    } else if (user.name) {
      name = user.name;
    } else {
      name = user.email?.split('@')[0] || 'User';
    }
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'U';
  };

  // Get user display name
  const getUserName = () => {
    if (!user) return 'User';
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`;
    }
    // Fallback to full name if first_name/last_name not available
    if (user.name) {
      return user.name;
    }
    return user.email?.split('@')[0] || 'User';
  };

  // Get user email
  const getUserEmail = () => {
    return user?.email || 'user@example.com';
  };

  const mainItems = [
    { id: 'overview', label: 'Overview', iconId: 'dashboard' },
    { id: 'analytics', label: 'Analytics', iconId: 'analytics' },
    { id: 'projects', label: 'Process', iconId: 'activity', badge: pendingProjectsCount },
    { id: 'calendar', label: 'Calendar', iconId: 'calendar' },
    { id: 'messages', label: 'Announcements', iconId: 'messages', badge: unreadMessagesCount },
    { id: 'audit', label: 'Audit Logs', iconId: 'audit' },
    { id: 'settings', label: 'Settings', iconId: 'settings' }
  ];

  const workspaceItems = [
    { id: 'team', label: 'Team', iconId: 'users' },
    { id: 'lists', label: 'Lists', iconId: 'lists' }
  ];

  const getIcon = (id) => {
    const iconProps = { size: 18, strokeWidth: 2, style: { display: 'block' } };
    switch (id) {
      case 'dashboard':
        return <LayoutDashboard {...iconProps} />;
      case 'users':
        return <Users {...iconProps} />;
      case 'activity':
        return <Activity {...iconProps} />;
      case 'calendar':
        return <Calendar {...iconProps} />;
      case 'messages':
        return <MessageSquare {...iconProps} />;
      case 'audit':
        return <ClipboardList {...iconProps} />;
      case 'analytics':
        return <TrendingUp {...iconProps} />;
      case 'lists':
        return <List {...iconProps} />;
      case 'settings':
        return <Settings {...iconProps} />;
      case 'logout':
        return <LogOut {...iconProps} />;
      default:
        return null;
    }
  };

  const handleClick = (id) => {
    if (id === 'overview') {
      navigate('/user');
      return;
    }
    if (id === 'settings') {
      navigate('/user/settings');
      return;
    }
    if (id === 'analytics') {
      navigate('/user/analytics');
      return;
    }
    if (id === 'projects') {
      navigate('/user/projects');
      return;
    }
    if (id === 'calendar') {
      navigate('/user/calendar');
      return;
    }
    if (id === 'messages') {
      navigate('/user/messages');
      return;
    }
    if (id === 'audit') {
      navigate('/user/audit');
      return;
    }
    if (id === 'team') {
      navigate('/user/team');
      return;
    }
    if (id === 'lists') {
      navigate('/user/lists');
      return;
    }
    onSelect?.(id);
  };

  // Helper to record audit logs (fire-and-forget)
  const recordAuditLog = async (userEmail, action, description, userRole = null) => {
    try {
      const payload = { action, user_email: userEmail, user_role: userRole, description };
      await fetch('/api/auth/record-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (err) {
      console.warn('Audit log send failed:', err);
    }
  };

  const handleLogout = () => {
    setShowProfileMenu(false);
    try {
      const stored = localStorage.getItem('user');
      let email = null;
      let name = null;
      let role = null;
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          email = parsed.email || null;
          name = parsed.name || email;
          role = parsed.role || null;
        } catch (e) { /* ignore parse errors */ }
      }

      // send logout audit (non-blocking) with user's name
      const displayName = name || email || 'Unknown';
      recordAuditLog(displayName, 'LOGOUT', `User ${displayName} (${email}) logged out from browser (host: ${window.location.hostname})`, role);

      localStorage.removeItem('user');
      sessionStorage.clear();
    } catch (e) {
      // ignore
    }
    navigate('/user/login');
  };

  const handleProfileClick = () => {
    setShowProfileMenu(!showProfileMenu);
  };

  return (
    <aside className={`user-sidebar-component ${open ? 'open' : 'closed'}`}>
      <div className="sidebar-top">
        <div className="brand">
          <img src="/logo.png" alt="ITSD Logo" className="brand-icon" />
          <div className="brand-text">ITSD Communication Valencia city</div>
        </div>
      </div>

      <div className="menu-section">
        <div className="section-label">MAIN MENU</div>
        <nav className="menu-list">
          {mainItems.map(item => (
            <button
              key={item.id}
              className={`menu-item ${active === item.id ? 'active' : ''}`}
              onClick={() => handleClick(item.id)}
            >
              <span className="menu-icon" aria-hidden>{getIcon(item.iconId)}</span>
              <span className="menu-text">{item.label}</span>
              {item.count ? <span className="count">{item.count}</span> : null}
              {item.badge ? <span className="notif">{item.badge}</span> : null}
            </button>
          ))}
        </nav>
      </div>

      <div className="menu-section workspace">
        <div className="section-label">WORKSPACE</div>
        <nav className="menu-list">
          {workspaceItems.map(item => (
            <button
              key={item.id}
              className={`menu-item ${active === item.id ? 'active' : ''}`}
              onClick={() => handleClick(item.id)}
            >
              <span className="menu-icon" aria-hidden>{getIcon(item.iconId)}</span>
              <span className="menu-text">{item.label}</span>
            </button>
          ))}

          {/* Logout placed next to 'Lists' as requested */}
          <button
            className={`menu-item`}
            onClick={() => handleLogout()}
          >
            <span className="menu-icon" aria-hidden>{getIcon('logout')}</span>
            <span className="menu-text">Logout</span>
          </button>
        </nav>


      </div>

    </aside>
  );
}
