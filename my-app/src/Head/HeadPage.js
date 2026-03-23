import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import './HeadPage.css';
import {
  LayoutDashboard,
  TrendingUp,
  Activity,
  Users,
  MessageCircle,
  Star,
  Settings,
  HelpCircle,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck
} from 'lucide-react';

export default function HeadPage() {
  const navigate = useNavigate();

  const user = {
    name: 'Anthony Alverizko',
    email: 'anthony.alve@gmail.com',
    avatar: null
  };

  const iconProps = { size: 16, strokeWidth: 2, style: { display: 'block' } };

  const navItems = [
    { label: 'Overview', active: true, icon: <LayoutDashboard {...iconProps} />, onClick: () => navigate('/head') },
    { label: 'Analytics', icon: <TrendingUp {...iconProps} />, onClick: () => navigate('/head/analytics') },
    { label: 'Process', icon: <Activity {...iconProps} />, onClick: () => navigate('/head/process') },
    { label: 'Approval', icon: <Users {...iconProps} />, onClick: () => navigate('/head/approval') },
    { label: 'Manage Roles', icon: <ShieldCheck {...iconProps} />, onClick: () => navigate('/head/manage-roles') }
  ];

  const settingsItems = [
    { label: 'Announcements', badge: 3, icon: <MessageCircle {...iconProps} />, onClick: () => navigate('/head/announcements') },
    { label: 'Settings', icon: <Settings {...iconProps} /> },

  ];

  const [stats, setStats] = useState({ pending: 0, urgent: 0, total: 0 });
  const [recentCommunications, setRecentCommunications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/communications/approvals/pending').then(res => res.json()),
      fetch('/api/communications').then(res => res.json())
    ]).then(([approvalsData, commsData]) => {
      const pendingArr = Array.isArray(approvalsData) ? approvalsData : (approvalsData.success ? approvalsData.data : []);
      const commsArr = Array.isArray(commsData) ? commsData : [];

      const pendingCount = pendingArr.length;
      const urgentCount = pendingArr.filter(d => d.priority_level === 'high').length
        + commsArr.filter(d => d.priority_level === 'high' && d.status === 'pending').length;
      const processedCount = commsArr.length;

      setStats({ pending: pendingCount, urgent: urgentCount, total: processedCount });

      const combined = [
        ...pendingArr.map(d => ({ ...d, table: 'Approval' })),
        ...commsArr.map(d => ({ ...d, table: 'Comm' }))
      ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5); // top 5 newest

      const formattedRecent = combined.map(item => ({
        id: item.tracking_id || item.id,
        subject: item.subject,
        sender: item.organization || item.received_by || 'Unknown',
        date: new Date(item.created_at || item.communication_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
        status: item.table === 'Approval' ? 'Pending Approval' : (item.status === 'approved' ? 'Approved' : 'In Process'),
        isUrgent: item.priority_level === 'high'
      }));

      setRecentCommunications(formattedRecent);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  return (
    <div className="head-page">
      <Sidebar navItems={navItems} settingsItems={settingsItems} />

      <main className="head-main">
        <Header
          title="Hello, Division Head!"
          subtitle="Here's the overview!"
          userName={user.name}
          userEmail={user.email}
          userAvatar={user.avatar}
          hideProfile={true}
        />

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading dynamic dashboard...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', margin: '24px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '20px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0, background: '#f59e0b' }}>
                <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '28px', fontWeight: 700, color: '#1f2937' }}>{stats.pending}</div>
                <div style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '4px', fontWeight: 600 }}>Requires Approval</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '20px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0, background: '#ef4444' }}>
                <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '28px', fontWeight: 700, color: '#1f2937' }}>{stats.urgent}</div>
                <div style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '4px', fontWeight: 600 }}>Urgent Action</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '20px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0, background: '#10b981' }}>
                <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M12 2L20 7v5c0 5-3.8 9.6-8 11-4.2-1.4-8-6-8-11V7l8-5z"></path></svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '28px', fontWeight: 700, color: '#1f2937' }}>{stats.total}</div>
                <div style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '4px', fontWeight: 600 }}>Total Processed</div>
              </div>
            </div>
          </div>
        )}

        <div className="main-grid" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          <section className="card card-table">
            <div className="card-header">
              <div className="card-title">Recent Communications</div>
              <a className="view-all" href="head/process">View All</a>
            </div>
            <table className="communications-table">
              <thead>
                <tr>
                  <th>Tracking ID</th>
                  <th>Subject</th>
                  <th>Sender</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentCommunications.length === 0 && !loading && (
                  <tr><td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>No recent items</td></tr>
                )}
                {recentCommunications.map((row, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600, color: '#2563eb' }}>{row.id}</td>
                    <td>
                      {row.subject}
                      {row.isUrgent && <span style={{ marginLeft: '8px', background: '#fee2e2', color: '#ef4444', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>URGENT</span>}
                    </td>
                    <td>{row.sender}</td>
                    <td>{row.date}</td>
                    <td>
                      <span style={{
                        padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
                        background: row.status.includes('Pending') ? '#fef3c7' : '#dcfce7',
                        color: row.status.includes('Pending') ? '#d97706' : '#16a34a'
                      }}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

        
        </div>
      </main>
    </div>
  );
}
