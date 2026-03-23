import React, { useState, useEffect, useRef } from 'react';
import './User.css';
import './profile.css';
import UserSidebar from './sidebar';
import { useNavigate } from 'react-router-dom';
import { ReloadIcon, ClockIcon, CheckIcon, Cross2Icon, LightningBoltIcon } from '@radix-ui/react-icons';

const User = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchCommunications = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/communications');
      if (!res.ok) throw new Error(`Server responded ${res.status}`);
      const data = await res.json();
      setItems(data || []);
    } catch (err) {
      console.error('Failed to load communications:', err);
      setError('Unable to load overview data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommunications();
  }, []);

  // Load user info for in-page profile
  const [user, setUser] = useState(null);
  const [imgError, setImgError] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const profileRef = useRef(null);
  const navigate = useNavigate();
  useEffect(() => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) setUser(JSON.parse(stored));
    } catch (e) {
      // ignore
    }
  }, []);

  // reset image error when user/profile changes
  useEffect(() => {
    setImgError(false);
  }, [user?.profile]);

  const getInitials = () => {
    if (!user) return 'U';
    let name = user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : (user.name || user.email?.split('@')[0] || 'User');
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2) || 'U';
  };

  const getUserName = () => {
    if (!user) return 'User';
    if (user.first_name && user.last_name) return `${user.first_name} ${user.last_name}`;
    return user.name || user.email?.split('@')[0] || 'User';
  };

  const getUserRole = () => {
    return user?.role || 'User';
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem('user');
      sessionStorage.clear();
    } catch (e) {}
    setShowProfileModal(false);
    navigate('/user/login');
  };

  // close modal on outside click
  useEffect(() => {
    function handleDocClick(e) {
      if (!showProfileModal) return;
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfileModal(false);
      }
    }
    document.addEventListener('mousedown', handleDocClick);
    return () => document.removeEventListener('mousedown', handleDocClick);
  }, [showProfileModal]);

  // Calculate statistics
  const totalCount = items.length;
  const pendingCount = items.filter(item => item.status === 'pending').length;
  const approvedCount = items.filter(item => item.status === 'approved').length;
  const rejectedCount = items.filter(item => item.status === 'rejected').length;

  // Count by priority
  const priorityCounts = {
    high: items.filter(item => item.priority_level === 'high').length,
    medium: items.filter(item => item.priority_level === 'medium').length,
    low: items.filter(item => item.priority_level === 'low').length
  };

  // Upcoming items (pending, sorted by date)
  const upcomingItems = items
    .filter(item => item.status === 'pending')
    .sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return (priorityOrder[a.priority_level] || 3) - (priorityOrder[b.priority_level] || 3);
    })
    .slice(0, 5);

  // Stats by direction
  const directionCounts = {};
  items.forEach(item => {
    if (item.direction) {
      directionCounts[item.direction] = (directionCounts[item.direction] || 0) + 1;
    }
  });

  const healthScore = totalCount > 0 ? Math.round(((approvedCount / totalCount) * 100)) : 0;

  return (
    <div className="user-page overview-page">
      <UserSidebar active={'overview'} />
      <main className="user-main">
        <div className="overview-header">
          <div>
            <h1>Dashboard</h1>
            <p className="overview-subtitle">Your communications at a glance</p>
          </div>
          <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
            <button className="inpage-profile" title={getUserName()} onClick={() => setShowProfileModal(true)}>
              <div className="inpage-avatar">
                {user?.profile && !imgError ? (
                  <img
                    src={user.profile}
                    alt={getUserName()}
                    className="inpage-avatar-img"
                    onError={() => setImgError(true)}
                  />
                ) : (
                  getInitials()
                )}
              </div>
            </button>
          </div>
        </div>

        {error && <div style={{color:'#b00020',padding:'12px',background:'#ffebee',borderRadius:'4px',margin:'16px'}}>{error}</div>}

        {!loading && totalCount > 0 && (
          <>
            {/* Health Score Card */}
            <div className="health-card">
              <div className="health-content">
                <h2>Completion Status</h2>
                <p className="health-description">{approvedCount} of {totalCount} communications approved</p>
              </div>
              <div className="health-visual">
                <div className="health-circle">
                  <div className="health-percentage">{healthScore}%</div>
                  <svg viewBox="0 0 120 120" className="health-gauge">
                    <circle cx="60" cy="60" r="50" fill="none" stroke="#f0f0f0" strokeWidth="8" />
                    <circle 
                      cx="60" 
                      cy="60" 
                      r="50" 
                      fill="none" 
                      stroke="#66BB6A" 
                      strokeWidth="8"
                      strokeDasharray={Math.round((healthScore / 100) * 314)}
                      strokeDashoffset="0"
                      style={{animation: 'fillGauge 1.5s ease-out'}}
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="stats-grid">
              <div className="stat-box pending">
                <div className="stat-icon"><ClockIcon /></div>
                <div className="stat-info">
                  <div className="stat-number">{pendingCount}</div>
                  <div className="stat-label">Pending</div>
                </div>
              </div>
              <div className="stat-box approved">
                <div className="stat-icon"><CheckIcon /></div>
                <div className="stat-info">
                  <div className="stat-number">{approvedCount}</div>
                  <div className="stat-label">Approved</div>
                </div>
              </div>
              <div className="stat-box rejected">
                <div className="stat-icon"><Cross2Icon /></div>
                <div className="stat-info">
                  <div className="stat-number">{rejectedCount}</div>
                  <div className="stat-label">Rejected</div>
                </div>
              </div>
              <div className="stat-box priority-high">
                <div className="stat-icon"><LightningBoltIcon /></div>
                <div className="stat-info">
                  <div className="stat-number">{priorityCounts.high}</div>
                  <div className="stat-label">High Priority</div>
                </div>
              </div>
            </div>

            {/* Priority Breakdown Bars */}
            <div className="priority-breakdown">
              <h2>Priority Distribution</h2>
              <div className="priority-bars">
                <div className="priority-bar-item">
                  <div className="bar-label">
                    <span className="priority-tag high">High</span>
                    <span className="bar-count">{priorityCounts.high}</span>
                  </div>
                  <div className="bar-background">
                    <div 
                      className="bar-fill high"
                      style={{width: `${totalCount > 0 ? (priorityCounts.high / totalCount) * 100 : 0}%`, animation: 'slideIn 0.8s ease-out'}}
                    ></div>
                  </div>
                </div>
                <div className="priority-bar-item">
                  <div className="bar-label">
                    <span className="priority-tag medium">Medium</span>
                    <span className="bar-count">{priorityCounts.medium}</span>
                  </div>
                  <div className="bar-background">
                    <div 
                      className="bar-fill medium"
                      style={{width: `${totalCount > 0 ? (priorityCounts.medium / totalCount) * 100 : 0}%`, animation: 'slideIn 0.8s ease-out 0.1s backwards'}}
                    ></div>
                  </div>
                </div>
                <div className="priority-bar-item">
                  <div className="bar-label">
                    <span className="priority-tag low">Low</span>
                    <span className="bar-count">{priorityCounts.low}</span>
                  </div>
                  <div className="bar-background">
                    <div 
                      className="bar-fill low"
                      style={{width: `${totalCount > 0 ? (priorityCounts.low / totalCount) * 100 : 0}%`, animation: 'slideIn 0.8s ease-out 0.2s backwards'}}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Direction Summary */}
            <div className="direction-summary">
              <h2>By Direction</h2>
              <div className="direction-tags">
                {Object.entries(directionCounts).map(([direction, count]) => (
                  <div key={direction} className="direction-tag">
                    <span className="direction-name">{direction}</span>
                    <span className="direction-count">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Upcoming/Pending Items */}
            {upcomingItems.length > 0 && (
              <div className="upcoming-section">
                <h2>Pending Items</h2>
                <div className="upcoming-list">
                  {upcomingItems.map((item, index) => (
                    <div 
                      key={item.id} 
                      className={`upcoming-item priority-${item.priority_level}`}
                      style={{animation: `slideInUp 0.5s ease-out ${index * 0.1}s backwards`}}
                    >
                      <div className="upcoming-number">{index + 1}</div>
                      <div className="upcoming-content">
                        <h4>{item.subject || 'No Subject'}</h4>
                        <p>{item.organization || 'N/A'}</p>
                      </div>
                      <div className="upcoming-priority">
                        <span className={`priority-badge ${item.priority_level}`}>{item.priority_level.toUpperCase()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {loading && (
          <div style={{padding:'60px 32px',textAlign:'center',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'400px'}}>
            <ReloadIcon style={{width:'48px', height:'48px', animation:'spin 2s linear infinite', marginBottom:'24px'}} />
            <div style={{color:'#666',fontSize:'14px',fontWeight:'500'}}>Loading dashboard...</div>
            <div style={{color:'#999',fontSize:'12px',marginTop:'8px'}}>Fetching data from communications</div>
          </div>
        )}
        {!loading && totalCount === 0 && <div style={{padding:'32px',textAlign:'center',color:'#999'}}>No communications data available yet</div>}
      </main>
      {showProfileModal && (
        <div className="profile-modal-overlay">
          <div className="profile-modal" ref={profileRef} role="dialog" aria-modal="true">
            <div className="modal-top">
              <div className="modal-avatar">
                {user?.profile && !imgError ? (
                  <img src={user.profile} alt={getUserName()} className="modal-avatar-img" onError={() => setImgError(true)} />
                ) : (
                  getInitials()
                )}
              </div>
              <div className="modal-info">
                <div className="modal-name">{getUserName()}</div>
                <div className="modal-role">{getUserRole()}</div>
              </div>
            </div>
            <div className="modal-actions">
              <button className="modal-btn logout" onClick={handleLogout}>Logout</button>
              <button className="modal-btn" onClick={() => setShowProfileModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default User;
