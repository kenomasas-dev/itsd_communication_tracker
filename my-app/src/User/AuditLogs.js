import React, { useEffect, useState, useCallback } from 'react';
import '../Admin/Admin.css';
import './AuditLogs.css';
import UserSidebar from './sidebar';
import { ReloadIcon } from '@radix-ui/react-icons';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/audit-logs');
      if (!res.ok) throw new Error(`Server responded ${res.status}`);
      const data = await res.json();
      const all = Array.isArray(data) ? data : (data.logs || []);
      setLogs(all);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
      setError(err.message || 'Failed to load logs');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Filter logs to user role only (case-insensitive)
  const userLogs = logs.filter(l => {
    const role = (l.user_role || l.role || l.userRole || '').toString().toLowerCase();
    return role.includes('user');
  });

  // Toolbar / filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAction, setSelectedAction] = useState('All Actions');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const logsPerPage = 20;

  const getActionColor = (action) => {
    const colors = {
      'USER_CREATED': '#10b981',
      'USER_UPDATED': '#3b82f6',
      'USER_DELETED': '#ef4444',
      'LOGIN': '#8b5cf6',
      'LOGIN_FAILED': '#ef4444',
      'LOGOUT': '#6b7280',
      'ROLE_CHANGED': '#f59e0b',
      'PERMISSION_CHANGED': '#ec4899'
    };
    return colors[action] || '#6b7280';
  };

  const formatTime = (t) => {
    try {
      const d = new Date(t);
      if (isNaN(d)) return t || '';
      return d.toLocaleString();
    } catch (e) { return t || ''; }
  };

  const uniqueActions = [...new Set(logs.map(log => log.action))].filter(Boolean);
  
  const filteredLogs = userLogs.filter(log => {
    const matchesSearch = (log.user_email || log.user || '').toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (log.description || '').toString().toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAction = selectedAction === 'All Actions' || log.action === selectedAction;

    // Date filtering
    let matchesDate = true;
    if (startDate || endDate) {
      const logDate = new Date(log.created_at || log.timestamp || log.time);
      if (startDate) {
        const start = new Date(startDate);
        matchesDate = matchesDate && logDate >= start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        matchesDate = matchesDate && logDate <= end;
      }
    }

    return matchesSearch && matchesAction && matchesDate;
  });

  const pageCount = Math.ceil(filteredLogs.length / logsPerPage);
  const paginatedLogs = filteredLogs.slice((currentPage - 1) * logsPerPage, currentPage * logsPerPage);

  return (
    <div className="user-page audit-page" >
      <UserSidebar active="audit" onSelect={() => {}} />
      <main className="user-main">
        <div className="admin-header">
          <div className="header-content" >
            <h1>Audit Logs</h1>
            <p>View user activities and actions</p>
          </div>
          <button className="btn-add" onClick={fetchLogs} disabled={loading}><ReloadIcon style={{width:'18px', height:'18px', verticalAlign:'middle', marginRight:'4px'}} />Refresh</button>
        </div>

        <div className="admin-toolbar">
          <input
            type="text"
            placeholder="Search audit logs..."
            className="search-box"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            className="filter-select"
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
          >
            <option>All Actions</option>
            {uniqueActions.map(action => (
              <option key={action}>{action}</option>
            ))}
          </select>
          <input
            type="date"
            className="filter-select"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <input
            type="date"
            className="filter-select"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        <div className="users-table-container" style={{marginTop: '10px', marginLeft: '0px' , marginRight: '5px' }}>
          <div className="users-header">
            <span className="header-item">Audit Logs ({filteredLogs.length})</span>
          </div>
          <table className="users-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>ACTION</th>
                <th>USER</th>
                <th>ROLE</th>
                <th>DESCRIPTION</th>
                <th>TIMESTAMP</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length > 0 ? (
                paginatedLogs.map((log, idx) => (
                  <tr key={idx} className="user-row">
                    <td>{(currentPage - 1) * logsPerPage + idx + 1}</td>
                    <td>
                      <span className="role-badge" style={{ background: getActionColor(log.action) }}>{log.action}</span>
                    </td>
                    <td>{log.user_email || log.user || 'System'}</td>
                    <td>{log.user_role || log.role || '-'}</td>
                    <td>{log.description}</td>
                    <td><span className="timestamp">{formatTime(log.created_at || log.timestamp)}</span></td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>
                    {loading ? 'Loading audit logs...' : 'No audit logs found for user role'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {pageCount > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '12px 0', gap: 12 }}>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                style={{ padding: '6px 12px', borderRadius: 4, border: '1px solid #d1d5db', background: '#fff', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
              >Prev</button>
              <span style={{ fontSize: 14 }}>Page {currentPage} of {pageCount}</span>
              <button
                onClick={() => setCurrentPage(p => Math.min(pageCount, p + 1))}
                disabled={currentPage === pageCount}
                style={{ padding: '6px 12px', borderRadius: 4, border: '1px solid #d1d5db', background: '#fff', cursor: currentPage === pageCount ? 'not-allowed' : 'pointer' }}
              >Next</button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
