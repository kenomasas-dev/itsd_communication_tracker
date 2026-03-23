import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import './Admin.css';

export default function Analytics() {
  const [analytics, setAnalytics] = useState({
    userGrowth: [],
    roleDistribution: [],
    activityByDay: [],
    systemMetrics: {},
    approvalSessions: []
  });
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('30days');
  const [exportOptions, setExportOptions] = useState({
    userGrowth: true,
    roleDistribution: true,
    activityByDay: true,
    systemMetrics: true,
    approvalSessions: true
  });
  const [showExportMenu, setShowExportMenu] = useState(false);

  const mockAnalytics = {
    userGrowth: [
      { month: 'Jan', users: 45, activeUsers: 32 },
      { month: 'Feb', users: 52, activeUsers: 38 },
      { month: 'Mar', users: 68, activeUsers: 51 },
      { month: 'Apr', users: 75, activeUsers: 62 },
      { month: 'May', users: 89, activeUsers: 74 },
      { month: 'Jun', users: 105, activeUsers: 88 }
    ],
    roleDistribution: [
      { role: 'Admin', count: 2, percentage: 2 },
      { role: 'Manager', count: 5, percentage: 5 },
      { role: 'Developer', count: 8, percentage: 8 },
      { role: 'Viewer', count: 15, percentage: 15 },
      { role: 'User', count: 10, percentage: 10 },
      { role: 'Others', count: 65, percentage: 60 }
    ],
    activityByDay: [
      { day: 'Mon', logins: 45, creations: 12, deletions: 2 },
      { day: 'Tue', logins: 52, creations: 18, deletions: 3 },
      { day: 'Wed', logins: 48, creations: 15, deletions: 1 },
      { day: 'Thu', logins: 61, creations: 22, deletions: 4 },
      { day: 'Fri', logins: 58, creations: 20, deletions: 2 },
      { day: 'Sat', logins: 32, creations: 8, deletions: 1 },
      { day: 'Sun', logins: 28, creations: 5, deletions: 0 }
    ],
    topPermissions: [
      { permission: 'Read', count: 95, trend: '+12%' },
      { permission: 'Write', count: 78, trend: '+8%' },
      { permission: 'View Reports', count: 62, trend: '+5%' },
      { permission: 'Manage Users', count: 35, trend: '+3%' },
      { permission: 'Delete', count: 15, trend: '-2%' }
    ],
    groupStats: [
      { group: 'Engineering', members: 21, active: 18 },
      { group: 'Sales', members: 8, active: 7 },
      { group: 'Marketing', members: 6, active: 5 },
      { group: 'Product', members: 7, active: 6 },
      { group: 'Support', members: 10, active: 8 }
    ],
    systemMetrics: {
      totalUsers: 105,
      activeToday: 78,
      newThisMonth: 18,
      avgSessionDuration: '2h 15m',
      uptime: '99.8%',
      avgResponseTime: '245ms'
    },
    approvalSessions: [
      { 'Communication ID': 1, 'Tracking ID': 'ITSD-2024-123456', 'Subject': 'Sample Communication', 'Organization': 'ABC Corp', 'Approver': 'user@example.com', 'Approval Date': '2024-01-15 10:30:00', 'Session Duration': '2h 15m', 'Submitted Date': '2024-01-15 08:15:00' }
    ]
  };

  useEffect(() => {
    fetchAnalytics();
  }, [selectedPeriod]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      // Fetch users
      const usersResponse = await fetch('/api/auth/users');
      const usersData = await usersResponse.json();

      // Fetch audit logs
      const logsResponse = await fetch('/api/auth/audit-logs');
      const logsData = await logsResponse.json();

      // Fetch communications for avg session duration
      const commsResponse = await fetch('/api/communications');
      const commsData = await commsResponse.json();

      // Calculate role distribution
      const roleCount = {};
      usersData.forEach(user => {
        const role = user.role || 'Unassigned';
        roleCount[role] = (roleCount[role] || 0) + 1;
      });

      const totalUsers = usersData.length;
      const roleDistribution = Object.entries(roleCount).map(([role, count]) => ({
        role,
        count,
        percentage: Math.round((count / totalUsers) * 100) || 0
      }));

      // Calculate activity by day (last 7 days)
      const activityByDay = [];
      const today = new Date();
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dayStr = date.toLocaleDateString('en-US', { weekday: 'short' });

        const dayLogs = logsData.filter(log => {
          const logDate = new Date(log.created_at);
          return logDate.toDateString() === date.toDateString();
        });

        const logins = dayLogs.filter(l => l.action === 'LOGIN').length;
        const creations = dayLogs.filter(l => l.action && l.action.includes('CREATED')).length;
        const deletions = dayLogs.filter(l => l.action && l.action.includes('DELETED')).length;

        activityByDay.push({
          day: dayStr,
          logins,
          creations,
          deletions
        });
      }

      // Calculate user growth (last 6 months)
      const userGrowth = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date(today);
        date.setMonth(date.getMonth() - i);
        const month = date.toLocaleDateString('en-US', { month: 'short' });

        const monthLogs = logsData.filter(log => {
          const logDate = new Date(log.created_at);
          return logDate.getMonth() === date.getMonth() && logDate.getFullYear() === date.getFullYear();
        });

        const monthUsers = [...new Set(monthLogs.map(l => l.user_email))].length;
        const totalMonthUsers = usersData.filter(u => {
          const createdDate = new Date(u.created_at || today);
          return createdDate <= date;
        }).length;

        userGrowth.push({
          month,
          users: totalMonthUsers || (i === 0 ? totalUsers : 0),
          activeUsers: monthUsers
        });
      }

      // Get active users today
      const todayLogs = logsData.filter(log => {
        const logDate = new Date(log.created_at);
        return logDate.toDateString() === today.toDateString();
      });
      const activeToday = [...new Set(todayLogs.map(l => l.user_email))].length;

      // Get new users this month
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const newThisMonth = usersData.filter(u => {
        const userDate = new Date(u.created_at || today);
        return userDate >= monthStart;
      }).length;

      // Calculate avg session duration (time from submit to approval)
      let avgSessionDuration = '0h 0m';
      const approvedComms = commsData.filter(c => c.status === 'approved' && c.created_at && c.updated_at);
      if (approvedComms.length > 0) {
        const totalMs = approvedComms.reduce((sum, c) => {
          const created = new Date(c.created_at);
          const updated = new Date(c.updated_at);
          return sum + (updated - created);
        }, 0);
        const avgMs = totalMs / approvedComms.length;
        const hours = Math.floor(avgMs / (1000 * 60 * 60));
        const minutes = Math.floor((avgMs % (1000 * 60 * 60)) / (1000 * 60));
        avgSessionDuration = `${hours}h ${minutes}m`;
      }

      // Calculate approval sessions data
      const approvalSessions = approvedComms.map(comm => {
        // Find the corresponding approval audit log
        const approvalLog = logsData.find(log => 
          log.action === 'PROJECT_APPROVED' && 
          log.description && 
          log.description.includes(`#${comm.id}`)
        );
        
        const approver = approvalLog ? approvalLog.user_email : 'Unknown';
        const approvalDate = approvalLog ? new Date(approvalLog.created_at).toLocaleString() : 'Unknown';
        
        // Calculate session duration
        const created = new Date(comm.created_at);
        const updated = new Date(comm.updated_at);
        const durationMs = updated - created;
        const hours = Math.floor(durationMs / (1000 * 60 * 60));
        const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
        const sessionDuration = `${hours}h ${minutes}m`;
        
        return {
          'Communication ID': comm.id,
          'Tracking ID': comm.tracking_id || '',
          'Subject': comm.subject || '',
          'Organization': comm.organization || '',
          'Approver': approver,
          'Approval Date': approvalDate,
          'Session Duration': sessionDuration,
          'Submitted Date': new Date(comm.created_at).toLocaleString()
        };
      });

      setAnalytics({
        userGrowth: userGrowth.length > 0 ? userGrowth : mockAnalytics.userGrowth,
        roleDistribution: roleDistribution.length > 0 ? roleDistribution : mockAnalytics.roleDistribution,
        activityByDay: activityByDay.length > 0 ? activityByDay : mockAnalytics.activityByDay,
        systemMetrics: {
          totalUsers,
          activeToday: activeToday > 0 ? activeToday : 0,
          newThisMonth,
          avgSessionDuration,
          uptime: '99.8%',
          avgResponseTime: '245ms'
        },
        approvalSessions
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setAnalytics({
        ...mockAnalytics,
        approvalSessions: []
      });
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    try {
      // Create workbook with multiple sheets
      const workbook = XLSX.utils.book_new();

      // Sheet 1: User Growth
      if (exportOptions.userGrowth) {
        const userGrowthSheet = XLSX.utils.json_to_sheet(analytics.userGrowth);
        userGrowthSheet['!cols'] = [{ wch: 12 }, { wch: 12 }, { wch: 12 }];
        XLSX.utils.book_append_sheet(workbook, userGrowthSheet, 'User Growth');
      }

      // Sheet 2: Role Distribution
      if (exportOptions.roleDistribution) {
        const roleDistributionSheet = XLSX.utils.json_to_sheet(analytics.roleDistribution);
        roleDistributionSheet['!cols'] = [{ wch: 15 }, { wch: 10 }, { wch: 12 }];
        XLSX.utils.book_append_sheet(workbook, roleDistributionSheet, 'Role Distribution');
      }

      // Sheet 3: Activity by Day
      if (exportOptions.activityByDay) {
        const activityByDaySheet = XLSX.utils.json_to_sheet(analytics.activityByDay);
        activityByDaySheet['!cols'] = [{ wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 12 }];
        XLSX.utils.book_append_sheet(workbook, activityByDaySheet, 'Activity by Day');
      }

      // Sheet 4: System Metrics
      if (exportOptions.systemMetrics) {
        const metricsData = [
          { metric: 'Total Users', value: analytics.systemMetrics.totalUsers },
          { metric: 'Active Today', value: analytics.systemMetrics.activeToday },
          { metric: 'New This Month', value: analytics.systemMetrics.newThisMonth },
          { metric: 'Avg Session Duration', value: analytics.systemMetrics.avgSessionDuration },
          { metric: 'Uptime', value: analytics.systemMetrics.uptime },
          { metric: 'Avg Response Time', value: analytics.systemMetrics.avgResponseTime }
        ];
        const metricsSheet = XLSX.utils.json_to_sheet(metricsData);
        metricsSheet['!cols'] = [{ wch: 25 }, { wch: 20 }];
        XLSX.utils.book_append_sheet(workbook, metricsSheet, 'System Metrics');
      }

      // Sheet 5: Approval Sessions
      if (exportOptions.approvalSessions) {
        const approvalSessionsSheet = XLSX.utils.json_to_sheet(analytics.approvalSessions);
        approvalSessionsSheet['!cols'] = [
          { wch: 15 }, // Communication ID
          { wch: 20 }, // Tracking ID
          { wch: 30 }, // Subject
          { wch: 25 }, // Organization
          { wch: 25 }, // Approver
          { wch: 20 }, // Approval Date
          { wch: 15 }, // Session Duration
          { wch: 20 }  // Submitted Date
        ];
        XLSX.utils.book_append_sheet(workbook, approvalSessionsSheet, 'Approval Sessions');
      }

      // Check if at least one sheet was added
      if (workbook.SheetNames.length === 0) {
        alert('Please select at least one data type to export');
        return;
      }

      // Generate filename with timestamp
      const timestamp = new Date().toLocaleDateString('en-US').replace(/\//g, '-');
      const filename = `Analytics_Report_${timestamp}.xlsx`;

      // Write the file
      XLSX.writeFile(workbook, filename);
      setShowExportMenu(false);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Failed to export data to Excel');
    }
  };

  const SimpleBarChart = ({ data, label, valueKey, barColor }) => {
    const maxValue = Math.max(...data.map(d => d[valueKey]));
    return (
      <div style={{ display: 'flex', alignItems: 'flex-end', height: '200px', gap: '8px', padding: '0 10px' }}>
        {data.map((item, idx) => (
          <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '100%',
                height: `${(item[valueKey] / maxValue) * 180}px`,
                background: barColor,
                borderRadius: '4px 4px 0 0',
                transition: 'all 0.3s ease'
              }}
              title={`${item[valueKey]}`}
            />
            <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: '500' }}>{item.month || item.day}</span>
          </div>
        ))}
      </div>
    );
  };

  const SimpleLineChart = ({ data, color }) => {
    const maxVal = Math.max(...data.map(d => d.logins + d.creations + d.deletions));
    const points = data.map((d, i) => ({
      x: (i / (data.length - 1)) * 100,
      y: 100 - ((d.logins + d.creations + d.deletions) / maxVal) * 100
    }));
    const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ');

    return (
      <svg width="100%" height="200" style={{ margin: '0 -10px' }} viewBox="0 0 100 100" preserveAspectRatio="none">
        <path d={pathData} stroke={color} strokeWidth="0.5" fill="none" vectorEffect="non-scaling-stroke" />
      </svg>
    );
  };

  if (loading) {
    return <div className="admin-layout"><p>Loading analytics...</p></div>;
  }

  return (
    <div className="admin-main">
      <div className="admin-header">
        <div className="header-content">
          <h1>Analytics & Reports</h1>
          <p>System analytics, user activity, and performance metrics</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', position: 'relative' }}>
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              style={{
                padding: '8px 16px',
                background: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '500',
                fontSize: '14px',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
              onMouseOver={(e) => e.target.style.background = '#059669'}
              onMouseOut={(e) => e.target.style.background = '#10b981'}
            >
              📊 Export to Excel
              <span style={{ fontSize: '12px' }}>▼</span>
            </button>

            {showExportMenu && (
              <div style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                background: 'white',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                minWidth: '250px',
                zIndex: 1000,
                marginTop: '4px'
              }}>
                <div style={{ padding: '12px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                    SELECT DATA TO EXPORT
                  </div>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', cursor: 'pointer', borderRadius: '4px' }}
                    onMouseOver={(e) => e.currentTarget.style.background = '#f3f4f6'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'white'}>
                    <input
                      type="checkbox"
                      checked={exportOptions.userGrowth}
                      onChange={(e) => setExportOptions({ ...exportOptions, userGrowth: e.target.checked })}
                      style={{ cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '14px', color: '#1f2937' }}>User Growth</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', cursor: 'pointer', borderRadius: '4px' }}
                    onMouseOver={(e) => e.currentTarget.style.background = '#f3f4f6'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'white'}>
                    <input
                      type="checkbox"
                      checked={exportOptions.roleDistribution}
                      onChange={(e) => setExportOptions({ ...exportOptions, roleDistribution: e.target.checked })}
                      style={{ cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '14px', color: '#1f2937' }}>Role Distribution</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', cursor: 'pointer', borderRadius: '4px' }}
                    onMouseOver={(e) => e.currentTarget.style.background = '#f3f4f6'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'white'}>
                    <input
                      type="checkbox"
                      checked={exportOptions.activityByDay}
                      onChange={(e) => setExportOptions({ ...exportOptions, activityByDay: e.target.checked })}
                      style={{ cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '14px', color: '#1f2937' }}>Activity by Day</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', cursor: 'pointer', borderRadius: '4px' }}
                    onMouseOver={(e) => e.currentTarget.style.background = '#f3f4f6'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'white'}>
                    <input
                      type="checkbox"
                      checked={exportOptions.systemMetrics}
                      onChange={(e) => setExportOptions({ ...exportOptions, systemMetrics: e.target.checked })}
                      style={{ cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '14px', color: '#1f2937' }}>System Metrics</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', cursor: 'pointer', borderRadius: '4px' }}
                    onMouseOver={(e) => e.currentTarget.style.background = '#f3f4f6'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'white'}>
                    <input
                      type="checkbox"
                      checked={exportOptions.approvalSessions}
                      onChange={(e) => setExportOptions({ ...exportOptions, approvalSessions: e.target.checked })}
                      style={{ cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '14px', color: '#1f2937' }}>Approval Sessions</span>
                  </label>

                  <div style={{ borderTop: '1px solid #e5e7eb', marginTop: '8px', paddingTop: '8px', display: 'flex', gap: '8px' }}>
                    <button
                      onClick={exportToExcel}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        background: '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '500'
                      }}
                    >
                      Export
                    </button>
                    <button
                      onClick={() => setShowExportMenu(false)}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        background: '#e5e7eb',
                        color: '#374151',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '500'
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              background: 'white',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="90days">Last 90 Days</option>
            <option value="1year">Last Year</option>
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="analytics-metrics" style={{ marginLeft: '23px' }}>
        <div className="metric-card">
          <div className="metric-icon" style={{ background: '#3b82f6' }}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" style={{ color: 'white' }}>
              <path d="M16 11c1.656 0 3-1.567 3-3.5S17.656 4 16 4s-3 1.567-3 3.5S14.344 11 16 11zM8 11c1.656 0 3-1.567 3-3.5S9.656 4 8 4 5 5.567 5 7.5 6.344 11 8 11z" />
              <path d="M2 20c0-3.314 2.686-6 6-6h8c3.314 0 6 2.686 6 6v1H2v-1z" />
            </svg>
          </div>
          <div className="metric-content">
            <div className="metric-value">{analytics.systemMetrics.totalUsers}</div>
            <div className="metric-label">Total Users</div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon" style={{ background: '#10b981' }}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'white' }}>
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <div className="metric-content">
            <div className="metric-value">{analytics.systemMetrics.activeToday}</div>
            <div className="metric-label">Active Today</div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon" style={{ background: '#8b5cf6' }}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'white' }}>
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 17" />
              <polyline points="17 6 23 6 23 12" />
            </svg>
          </div>
          <div className="metric-content">
            <div className="metric-value">+{analytics.systemMetrics.newThisMonth}</div>
            <div className="metric-label">New This Month</div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon" style={{ background: '#f59e0b' }}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'white' }}>
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
          </div>
          <div className="metric-content">
            <div className="metric-value">{analytics.systemMetrics.avgSessionDuration}</div>
            <div className="metric-label">Avg Session</div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="analytics-grid" style={{ marginLeft: '23px' }}>
        {/* User Growth Chart */}
        <div className="chart-card">
          <h3>User Growth</h3>
          <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '12px', height: '12px', background: '#3b82f6', borderRadius: '2px' }}></div>
              <span style={{ fontSize: '12px', color: '#6b7280' }}>Total Users</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '12px', height: '12px', background: '#10b981', borderRadius: '2px' }}></div>
              <span style={{ fontSize: '12px', color: '#6b7280' }}>Active Users</span>
            </div>
          </div>
          <SimpleBarChart data={analytics.userGrowth} valueKey="users" barColor="#3b82f6" />
        </div>

        {/* Activity Trend */}
        <div className="chart-card">
          <h3>Weekly Activity Trend</h3>
          <SimpleLineChart data={analytics.activityByDay} color="#8b5cf6" />
          <div style={{ marginTop: '16px', fontSize: '12px', color: '#6b7280', textAlign: 'center' }}>
            Logins • Creations • Deletions
          </div>
        </div>

        {/* Role Distribution */}
        <div className="chart-card">
          <h3>User Role Distribution</h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', height: '200px', gap: '8px', padding: '0 10px' }}>
            {analytics.roleDistribution.map((role, idx) => (
              <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '100%',
                    height: `${role.percentage * 1.5}px`,
                    background: ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#06b6d4', '#ec4899'][idx],
                    borderRadius: '4px 4px 0 0'
                  }}
                  title={`${role.role}: ${role.count} users (${role.percentage}%)`}
                />
                <span style={{ fontSize: '10px', color: '#6b7280', fontWeight: '500', textAlign: 'center' }}>
                  {role.role}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Activity by Day */}
        <div className="chart-card">
          <h3>Daily Activity</h3>
          <SimpleBarChart data={analytics.activityByDay} valueKey="logins" barColor="#3b82f6" />
        </div>


      </div>

      {/* System Performance */}
      <div className="performance-card" style={{ marginLeft: '23px' }}>
        <h3>System Performance</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '20px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#10b981', marginBottom: '8px' }}>
              {analytics.systemMetrics.uptime}
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Uptime
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#3b82f6', marginBottom: '8px' }}>
              {analytics.systemMetrics.avgResponseTime}
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Avg Response
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .analytics-metrics {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin: 20px 0;
        }

        .metric-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
        }

        .metric-icon {
          width: 56px;
          height: 56px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
          flex-shrink: 0;
        }

        .metric-content {
          flex: 1;
        }

        .metric-value {
          font-size: 24px;
          font-weight: 700;
          color: #1f2937;
          line-height: 1;
        }

        .metric-label {
          font-size: 12px;
          color: #6b7280;
          margin-top: 6px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .analytics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          gap: 20px;
          margin: 30px 0;
        }

        .chart-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 20px;
        }

        .chart-card h3 {
          margin: 0 0 16px;
          font-size: 15px;
          font-weight: 600;
          color: #1f2937;
        }

        .performance-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 20px;
        }

        .performance-card h3 {
          margin: 0 0 20px;
          font-size: 15px;
          font-weight: 600;
          color: #1f2937;
        }
      `}</style>
    </div>
  );
}
