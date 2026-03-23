import React, { useState, useEffect } from 'react';
import './Admin.css';

export default function AuditLogs() {
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAction, setSelectedAction] = useState('All Actions');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const logsPerPage = 20; // could make configurable later

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/auth/audit-logs');
      if (!response.ok) throw new Error('Failed to fetch audit logs');
      const data = await response.json();
      setAuditLogs(data);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      setAuditLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action) => {
    const colors = {
      'USER_CREATED': '#10b981',
      'USER_UPDATED': '#3b82f6',
      'USER_DELETED': '#ef4444',
      'LOGIN': '#8b5cf6',
      'LOGIN_FAILED': '#ef4444',
      'LOGOUT': '#6b7280',
      'ROLE_CHANGED': '#f59e0b',
      'PERMISSION_CHANGED': '#ec4899',
      'PROJECT_APPROVED': '#10b981',
      'PROJECT_REJECTED': '#ef4444'
    };
    return colors[action] || '#6b7280';
  };

  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = log.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          log.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAction = selectedAction === 'All Actions' || log.action === selectedAction;
    
    // Date filtering
    let matchesDate = true;
    if (startDate || endDate) {
      const logDate = new Date(log.created_at);
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

  if (loading) {
    return <div className="admin-layout"><p>Loading audit logs...</p></div>;
  }

  const uniqueActions = [...new Set(auditLogs.map(log => log.action))].filter(Boolean);

  // pagination calculations
  const pageCount = Math.ceil(filteredLogs.length / logsPerPage);
  const paginatedLogs = filteredLogs.slice((currentPage - 1) * logsPerPage, currentPage * logsPerPage);

  return (
    <div className="admin-main">
      <div className="admin-header">
        <div className="header-content">
          <h1>Audit Logs</h1>
          <p>View all system activities and user actions</p>
        </div>
        <button className="btn-add" onClick={fetchAuditLogs}>↻ Refresh</button>
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
          placeholder="Start Date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          title="Start Date"
        />
        <input
          type="date"
          className="filter-select"
          placeholder="End Date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          title="End Date"
        />
      </div>

      <div className="users-table-container" style={{marginLeft: '0px', marginRight: '0px'}}>
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
                  <td>{(currentPage-1)*logsPerPage + idx + 1}</td>
                  <td>
                    <span 
                      className="role-badge" 
                      style={{ background: getActionColor(log.action) }}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td>{log.user_email || 'System'}</td>
                  <td>{log.user_role || '-'}</td>
                  <td>{log.description}</td>
                  <td>
                    <span className="timestamp">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>
                  No audit logs found
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {/* pagination controls */}
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
    </div>
  );
}
