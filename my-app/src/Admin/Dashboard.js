import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import './Admin.css';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalAuditLogs: 0,
    activeUsers: 0,
    totalRoles: 0,
    totalPermissions: 0
  });
  const [loading, setLoading] = useState(true);
  const [recentLogs, setRecentLogs] = useState([]);
  const [userActivityData, setUserActivityData] = useState([]);
  const [roleDistributionData, setRoleDistributionData] = useState([]);
  const [rolesData, setRolesData] = useState([]);
  const [permissionsData, setPermissionsData] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch users
      const usersResponse = await fetch('/api/auth/users');
      const usersData = await usersResponse.json();

      // Fetch audit logs
      const logsResponse = await fetch('/api/auth/audit-logs');
      const logsData = await logsResponse.json();

      // Fetch roles
      const rolesResponse = await fetch('/api/roles');
      const rolesDataFromAPI = await rolesResponse.json();

      // Fetch permissions
      const permissionsResponse = await fetch('/api/permissions');
      const permissionsDataFromAPI = await permissionsResponse.json();

      // Calculate stats
      const roles = [...new Set(usersData.map(u => u.role))];
      const loginLogs = logsData.filter(log => log.action === 'LOGIN');

      setStats({
        totalUsers: usersData.length,
        totalAuditLogs: logsData.length,
        activeUsers: loginLogs.length > 0 ? [...new Set(loginLogs.map(log => log.user_email))].length : 0,
        totalRoles: rolesDataFromAPI.length,
        totalPermissions: permissionsDataFromAPI.length
      });

      // Get recent logs (last 5)
      setRecentLogs(logsData.slice(0, 5));

      // Prepare user activity data for line chart (last 7 days simulation)
      const activityData = [];
      const today = new Date();
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dayLogins = logsData.filter(log => {
          const logDate = new Date(log.created_at);
          return logDate.toDateString() === date.toDateString() && log.action === 'LOGIN';
        }).length;

        activityData.push({
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          logins: dayLogins,
          activities: logsData.filter(log => {
            const logDate = new Date(log.created_at);
            return logDate.toDateString() === date.toDateString();
          }).length
        });
      }
      setUserActivityData(activityData);

      // Prepare role distribution data for pie chart
      const roleCount = {};
      usersData.forEach(user => {
        const role = user.role || 'Unassigned';
        roleCount[role] = (roleCount[role] || 0) + 1;
      });

      const roleDistribution = Object.entries(roleCount).map(([role, count]) => ({
        name: role,
        value: count
      }));
      setRoleDistributionData(roleDistribution);

      // Prepare roles data for chart
      setRolesData(rolesDataFromAPI.slice(0, 5));

      // Prepare permissions data by risk level
      const permissionsByRisk = {};
      permissionsDataFromAPI.forEach(perm => {
        const riskLevel = perm.risk_level || 'Low';
        permissionsByRisk[riskLevel] = (permissionsByRisk[riskLevel] || 0) + 1;
      });

      const permissionsChart = Object.entries(permissionsByRisk).map(([riskLevel, count]) => ({
        name: riskLevel,
        value: count
      }));
      setPermissionsData(permissionsChart);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
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
      'LOGOUT': '#6b7280',
      'ROLE_CHANGED': '#f59e0b',
      'PERMISSION_CHANGED': '#ec4899'
    };
    return colors[action] || '#6b7280';
  };

  if (loading) {
    return <div className="admin-layout"><p>Loading dashboard...</p></div>;
  }

  return (
    <div className="admin-main">
      <div className="admin-header">
        <div className="header-content">
          <h1>Dashboard</h1>
          <p>Overview of your system and recent activities</p>
        </div>
        <button className="btn-add" onClick={fetchDashboardData}>↻ Refresh</button>
      </div>

      {/* Stats Grid */}
      <div className="dashboard-grid">
        <div className="stat-card" style={{ marginLeft: '23px' }}>
          <div className="stat-icon" style={{ background: '#7c3aed' }}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M16 11c1.656 0 3-1.567 3-3.5S17.656 4 16 4s-3 1.567-3 3.5S14.344 11 16 11zM8 11c1.656 0 3-1.567 3-3.5S9.656 4 8 4 5 5.567 5 7.5 6.344 11 8 11z" />
              <path d="M2 20c0-3.314 2.686-6 6-6h8c3.314 0 6 2.686 6 6v1H2v-1z" />
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-number">{stats.totalUsers}</div>
            <div className="stat-label">Total Users</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#3b82f6' }}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-number">{stats.activeUsers}</div>
            <div className="stat-label">Active Users</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#10b981' }}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M12 2L20 7v5c0 5-3.8 9.6-8 11-4.2-1.4-8-6-8-11V7l8-5z" />
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-number">{stats.totalRoles}</div>
            <div className="stat-label">Total Roles</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#f59e0b' }}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <rect x="7" y="3" width="10" height="18" rx="2" />
              <path d="M9 7h6M9 11h6M9 15h4" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-number">{stats.totalAuditLogs}</div>
            <div className="stat-label">Audit Logs</div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="dashboard-charts">
        {/* User Activity Chart */}
        <div className="chart-container" style={{ marginLeft: '23px' }}>
          <h2>User Activity (Last 7 Days)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={userActivityData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="logins" fill="#3b82f6" name="Logins" />
              <Bar dataKey="activities" fill="#8b5cf6" name="Total Activities" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Role Distribution Chart */}
        <div className="chart-container">
          <h2>User Distribution by Role</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={roleDistributionData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {roleDistributionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={['#7c3aed', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'][index % 5]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Roles Chart removed per request */}

        {/* Permissions by Risk Level Chart */}
        <div className="chart-container" style={{ marginLeft: '23px' }}>
          <h2>Permissions by Risk Level</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={permissionsData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {permissionsData.map((entry, index) => {
                  const colors = {
                    'Low': '#10b981',
                    'Medium': '#f59e0b',
                    'High': '#ef4444',
                    'Critical': '#dc2626'
                  };
                  return <Cell key={`cell-${index}`} fill={colors[entry.name] || '#6b7280'} />;
                })}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="dashboard-section">
        <h2 style={{ marginLeft: '23px' }}>Recent Activity</h2>
        <div className="recent-activity" style={{ marginLeft: '23px' }}>
          {recentLogs.length > 0 ? (
            <table className="users-table">
              <thead>
                <tr>
                  <th>ACTION</th>
                  <th>USER</th>
                  <th>DESCRIPTION</th>
                  <th>TIME</th>
                </tr>
              </thead>
              <tbody>
                {recentLogs.map((log, idx) => (
                  <tr key={idx} className="user-row">
                    <td>
                      <span
                        className="role-badge"
                        style={{ background: getActionColor(log.action) }}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td>{log.user_email || 'System'}</td>
                    <td>{log.description}</td>
                    <td>
                      <span className="timestamp">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>
              No recent activity
            </p>
          )}
        </div>
      </div>

      {/* Quick Stats Info */}
      <div className="dashboard-info">
        <div className="info-card">
          <h3>System Health</h3>
          <p>All systems operational</p>
          <span className="status-badge" style={{ background: '#10b981' }}>✓ Healthy</span>
        </div>
        <div className="info-card">
          <h3>Last Sync</h3>
          <p>Database synced</p>
          <span className="status-badge" style={{ background: '#3b82f6' }}>Just Now</span>
        </div>
      </div>

      <style>{`
        .dashboard-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          margin: 30px 0;
        }

        .stat-card {
          display: flex;
          align-items: center;
          gap: 20px;
          padding: 20px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }

        .stat-icon {
          width: 60px;
          height: 60px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          flex-shrink: 0;
        }

        .stat-content {
          flex: 1;
        }

        .stat-number {
          font-size: 28px;
          font-weight: 700;
          color: #1f2937;
        }

        .stat-label {
          font-size: 12px;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-top: 4px;
        }

        .dashboard-charts {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 20px;
          margin: 40px 0;
        }

        .chart-container {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }

        .chart-container h2 {
          font-size: 16px;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 20px;
          margin-top: 0;
        }

        .dashboard-section {
          margin: 40px 0;
        }

        .dashboard-section h2 {
          font-size: 18px;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 20px;
        }

        .recent-activity {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          overflow: hidden;
        }

        .dashboard-info {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin: 30px 0;
        }

        .info-card {
          padding: 20px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          text-align: center;
        }

        .info-card h3 {
          margin: 0 0 10px;
          font-size: 14px;
          font-weight: 600;
          color: #1f2937;
        }

        .info-card p {
          margin: 0 0 15px;
          font-size: 13px;
          color: #6b7280;
        }

        .status-badge {
          display: inline-block;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
          color: white;
        }

        .timestamp {
          font-size: 12px;
          color: #6b7280;
        }
      `}</style>
    </div>
  );
}
