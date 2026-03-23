import React, { useState, useEffect } from 'react';
import './Analytics.css';
import UserSidebar from './sidebar';
import { ReloadIcon } from '@radix-ui/react-icons';

// Simple Pie Chart Component
const PieChart = ({ data, colors, onHover, onLeave, donut = true }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let currentAngle = 0;
  
  const slices = data.map((item, i) => {
    const sliceAngle = (item.value / total) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sliceAngle;
    
    const x1 = 100 + 90 * Math.cos((startAngle - 90) * Math.PI / 180);
    const y1 = 100 + 90 * Math.sin((startAngle - 90) * Math.PI / 180);
    const x2 = 100 + 90 * Math.cos((endAngle - 90) * Math.PI / 180);
    const y2 = 100 + 90 * Math.sin((endAngle - 90) * Math.PI / 180);
    
    const largeArc = sliceAngle > 180 ? 1 : 0;
    const pathData = [
      `M 100 100`,
      `L ${x1} ${y1}`,
      `A 90 90 0 ${largeArc} 1 ${x2} ${y2}`,
      'Z'
    ].join(' ');
    
    currentAngle = endAngle;
    
    return (
      <path
        key={i}
        d={pathData}
        fill={colors[i % colors.length]}
        stroke="white"
        strokeWidth="2"
        onMouseEnter={(e) => onHover && onHover(e, `${item.label}: ${item.value}`)}
        onMouseMove={(e) => onHover && onHover(e, `${item.label}: ${item.value}`)}
        onMouseLeave={(e) => onLeave && onLeave(e)}
        style={{
          animation: `fillPie 0.6s ease-out ${i * 0.1}s backwards`,
          transformOrigin: '100px 100px',
          cursor: 'pointer'
        }}
      />
    );
  });
  
  return (
    <svg width="200" height="200" viewBox="0 0 200 200">
      {slices}
      {donut && (
        <>
          {/* Donut hole to create donut chart appearance */}
          <circle cx="100" cy="100" r="60" fill="#fff" className="donut-hole" />
          {/* Center total label */}
          <text x="100" y="106" textAnchor="middle" fontSize="16" fill="#374151" style={{ fontWeight: 700 }}>{total}</text>
        </>
      )}
    </svg>
  );
};

// Simple Bar Chart Component
const BarChart = ({ data, maxValue, color, height = '200px', onHover, onLeave }) => {
  const max = maxValue || Math.max(...data.map(d => d.value));
  const chartWidth = Math.max(400, data.length * 50);
  const chartHeight = 300;
  const barWidth = 30;
  const padding = 50;
  const innerHeight = chartHeight - padding * 2;
  
  return (
    <div style={{ overflowX: 'auto', width: '100%' }}>
      <svg width={chartWidth} height={chartHeight} style={{ minWidth: '100%' }}>
        {/* Y-axis */}
        <line x1={padding} y1={padding} x2={padding} y2={chartHeight - padding} stroke="#ccc" strokeWidth="1" />
        
        {/* X-axis */}
        <line x1={padding} y1={chartHeight - padding} x2={chartWidth} y2={chartHeight - padding} stroke="#ccc" strokeWidth="1" />
        
        {/* Y-axis labels */}
        {[0, 1, 2, 3, 4].map((i) => {
          const value = Math.round(max - (i * max) / 4);
          const y = padding + (i * innerHeight) / 4;
          return (
            <g key={`y-label-${i}`}>
              <text x={padding - 10} y={y + 4} textAnchor="end" fontSize="11" fill="#999">
                {value}
              </text>
              <line x1={padding - 5} y1={y} x2={chartWidth} y2={y} stroke="#f0f0f0" strokeWidth="1" />
            </g>
          );
        })}
        
        {/* Bars and labels */}
        {data.map((item, i) => {
          const barHeight = max > 0 ? (item.value / max) * innerHeight : 0;
          const x = padding + 20 + i * (chartWidth - padding * 2) / data.length;
          const y = chartHeight - padding - barHeight;
          
          return (
            <g key={i}>
              {/* Bar */}
              <rect
                x={x - barWidth / 2}
                y={y}
                width={barWidth}
                height={barHeight}
                fill={color || '#3b82f6'}
                onMouseEnter={(e) => onHover && onHover(e, `${item.label}: ${item.value}`)}
                onMouseMove={(e) => onHover && onHover(e, `${item.label}: ${item.value}`)}
                onMouseLeave={(e) => onLeave && onLeave(e)}
                style={{ cursor: 'pointer', animation: `fillBar 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 0.08}s backwards`, transformOrigin: `${x}px ${chartHeight - padding}px` }}
              />
              
              {/* Value on top of bar */}
              <text x={x} y={y - 5} textAnchor="middle" fontSize="11" fill="#374151" fontWeight="600">
                {item.value}
              </text>
              
              {/* X-axis label rotated */}
              <text
                x={x}
                y={chartHeight - padding + 10}
                textAnchor="start"
                fontSize="11"
                fill="#666"
                style={{
                  transform: `rotate(45deg)`,
                  transformOrigin: `${x}px ${chartHeight - padding + 10}px`,
                  animation: `fadeIn 0.4s ease-out ${0.3 + i * 0.06}s backwards`
                }}
              >
                {item.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// Line Chart Component
const LineChart = ({ data, onHover, onLeave }) => {
  const width = 600;
  const height = 250;
  const padding = 40;
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;
  
  const values = data.map(d => d.value);
  const maxValue = Math.max(...values);
  const minValue = 0;
  const range = maxValue - minValue;
  
  let pathData = `M`;
  
  data.forEach((item, i) => {
    const x = padding + (i / (data.length - 1 || 1)) * innerWidth;
    const y = height - padding - ((item.value - minValue) / (range || 1)) * innerHeight;
    pathData += ` ${x},${y}`;
  });
  
  const points = data.map((item, i) => {
    const x = padding + (i / (data.length - 1 || 1)) * innerWidth;
    const y = height - padding - ((item.value - minValue) / (range || 1)) * innerHeight;
    return { x, y, label: item.label, value: item.value };
  });
  
  const pathLength = 500; // Approximate path length for stroke animation
  
  return (
    <svg width={width} height={height} className="line-chart">
      <defs>
        <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#3b82f6', stopOpacity: 0.3 }} />
          <stop offset="100%" style={{ stopColor: '#3b82f6', stopOpacity: 0 }} />
        </linearGradient>
      </defs>
      
      {/* Grid lines */}
      {[0, 1, 2, 3, 4].map(i => (
        <line
          key={`grid-${i}`}
          x1={padding}
          y1={padding + (i * innerHeight) / 4}
          x2={width - padding}
          y2={padding + (i * innerHeight) / 4}
          stroke="#e5e7eb"
          strokeWidth="1"
        />
      ))}
      
      {/* Y-axis labels */}
      {[0, 1, 2, 3, 4].map(i => {
        const value = Math.round(maxValue - (i * maxValue) / 4);
        const y = padding + (i * innerHeight) / 4;
        return (
          <text
            key={`y-label-${i}`}
            x={padding - 15}
            y={y + 4}
            textAnchor="end"
            fontSize="11"
            fill="#999"
            style={{ animation: `fadeIn 0.4s ease-out ${0.2 + i * 0.05}s backwards` }}
          >
            {value}
          </text>
        );
      })}
      
      {/* Line */}
      <path
        d={pathData}
        stroke="#3b82f6"
        strokeWidth="2"
        fill="none"
        style={{
          animation: 'drawLine 1.2s ease-out forwards',
          strokeDasharray: pathLength,
          strokeDashoffset: pathLength
        }}
      />
      
      {/* Area under line */}
      <path
        d={pathData + ` L ${width - padding},${height - padding} L ${padding},${height - padding} Z`}
        fill="url(#areaGradient)"
        style={{
          animation: 'fillArea 1.2s ease-out forwards',
          opacity: 0
        }}
      />
      
      {/* Points */}
      {points.map((point, i) => (
        <circle
          key={i}
          cx={point.x}
          cy={point.y}
          r="4"
          fill="#3b82f6"
          onMouseEnter={(e) => onHover && onHover(e, `${point.label}: ${point.value}`)}
          onMouseMove={(e) => onHover && onHover(e, `${point.label}: ${point.value}`)}
          onMouseLeave={(e) => onLeave && onLeave(e)}
          style={{
            animation: `dotAppear 0.4s ease-out ${0.8 + i * 0.1}s backwards`,
            cursor: 'pointer'
          }}
        />
      ))}
      
      {/* Labels */}
      {points.map((point, i) => (
        <g key={`label-${i}`}>
          <text
            x={point.x}
            y={height - padding + 20}
            textAnchor="middle"
            fontSize="11"
            fill="#666"
            style={{
              animation: `fadeIn 0.4s ease-out ${0.9 + i * 0.08}s backwards`
            }}
          >
            {point.label}
          </text>
          <text
            x={point.x}
            y={height - padding + 32}
            textAnchor="middle"
            fontSize="10"
            fill="#999"
            style={{
              animation: `fadeIn 0.4s ease-out ${0.95 + i * 0.08}s backwards`,
              fontWeight: 600
            }}
          >
            {point.value}
          </text>
        </g>
      ))}
      
      {/* Y-axis title */}
      <text
        x={10}
        y={20}
        textAnchor="start"
        fontSize="12"
        fill="#666"
        style={{ fontWeight: 500, animation: `fadeIn 0.4s ease-out 0.3s backwards` }}
      >
        Count
      </text>
      
      {/* X-axis title */}
      <text
        x={width / 2}
        y={height - 5}
        textAnchor="middle"
        fontSize="12"
        fill="#666"
        style={{ fontWeight: 500, animation: `fadeIn 0.4s ease-out 0.35s backwards` }}
      >
        Staff
      </text>
    </svg>
  );
};

export default function Analytics() {
  const [items, setItems] = useState([]);
  const [period, setPeriod] = useState('month');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, content: '' });

  const handleChartHover = (e, content) => {
    const ev = e && e.nativeEvent ? e.nativeEvent : e || {};
    const clientX = ev.clientX || 0;
    const clientY = ev.clientY || 0;
    setTooltip({ visible: true, x: clientX + 12, y: clientY + 12, content });
  };

  const handleChartLeave = () => {
    setTooltip({ visible: false, x: 0, y: 0, content: '' });
  };

  const getPeriodStart = (period) => {
    const now = new Date();
    const start = new Date(now);
    switch (period) {
      case 'day':
        start.setHours(now.getHours() - 23, 0, 0, 0);
        break;
      case 'week':
        start.setDate(now.getDate() - 6);
        start.setHours(0, 0, 0, 0);
        break;
      case 'month':
        start.setDate(now.getDate() - 29);
        start.setHours(0, 0, 0, 0);
        break;
      case 'year':
        start.setFullYear(now.getFullYear() - 1);
        start.setHours(0, 0, 0, 0);
        break;
      default:
        start.setDate(now.getDate() - 29);
        start.setHours(0, 0, 0, 0);
    }
    return start;
  };

  const filterByPeriod = (data, period) => {
    const start = getPeriodStart(period);
    return data.filter((d) => {
      const commDate = d.communication_date ? new Date(d.communication_date) : (d.created_at ? new Date(d.created_at) : null);
      return commDate && commDate >= start;
    });
  };

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
      setError('Unable to load analytics data');
    } finally {
      setLoading(false);
    }
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
      // non-fatal
      console.warn('Audit log send failed:', err);
    }
  };

  // Export to Excel
  const exportToExcel = () => {
    if (items.length === 0) {
      alert('No data to export');
      return;
    }

    // Prepare CSV content
    const headers = ['ID', 'Direction', 'Date', 'Organization', 'Subject', 'Details', 'Received By', 'Assigned To', 'Tags', 'Priority', 'Status', 'Created At'];
    const rows = items.map(item => [
      item.id || '',
      item.direction || '',
      item.communication_date || '',
      item.organization || '',
      (item.subject || '').replace(/"/g, '""'),
      (item.details || '').replace(/"/g, '""'),
      item.received_by || '',
      item.assigned_to || '',
      item.tags || '',
      item.priority_level || '',
      item.status || '',
      item.created_at || ''
    ]);

    // Create CSV format
    const csvContent = [
      headers.map(h => `"${h}"`).join(','),
      ...rows.map(row => row.map(cell => typeof cell === 'string' && cell.includes(',') ? `"${cell}"` : cell).join(','))
    ].join('\n');

    // Create blob and trigger download
    const blob = new Blob([csvContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `analytics-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    // Record audit log for export
    try {
      const userObj = JSON.parse(localStorage.getItem('user') || '{}');
      const email = userObj.email || null;
      const role = userObj.role || 'User';
      recordAuditLog(email, 'EXPORT_ANALYTICS', `Exported analytics data (${rows.length} rows) as CSV`, role);
    } catch (e) {
      /* ignore audit errors */
    }
    setShowExportDropdown(false);
  };

  // Export Summary Statistics
  const exportSummary = () => {
    if (items.length === 0) {
      alert('No data to export');
      return;
    }

    const totalCount = items.length;
    const pendingCount = items.filter(item => item.status === 'pending').length;
    const approvedCount = items.filter(item => item.status === 'approved').length;
    const rejectedCount = items.filter(item => item.status === 'rejected').length;

    const csvContent = `Analytics Summary Report
${new Date().toLocaleString()}

Key Metrics
Metric,Value
Total Communications,${totalCount}
Pending,${pendingCount}
Approved,${approvedCount}
Rejected,${rejectedCount}
Pending %,${totalCount > 0 ? Math.round((pendingCount / totalCount) * 100) : 0}%
Approved %,${totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0}%
Rejected %,${totalCount > 0 ? Math.round((rejectedCount / totalCount) * 100) : 0}%`;

    const blob = new Blob([csvContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `analytics-summary-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    // Record audit log for summary export
    try {
      const userObj = JSON.parse(localStorage.getItem('user') || '{}');
      const email = userObj.email || null;
      const role = userObj.role || 'User';
      recordAuditLog(email, 'EXPORT_ANALYTICS_SUMMARY', `Exported analytics summary (total ${totalCount}) as CSV`, role);
    } catch (e) {
      /* ignore audit errors */
    }
    setShowExportDropdown(false);
  };

  useEffect(() => {
    fetchCommunications();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showExportDropdown && e.target.closest('.export-dropdown-container') === null) {
        setShowExportDropdown(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showExportDropdown]);

  // Calculate statistics
  const filteredItems = React.useMemo(() => filterByPeriod(items, period), [items, period]);

  const totalCount = filteredItems.length;
  const pendingCount = filteredItems.filter(item => item.status === 'pending').length;
  const approvedCount = filteredItems.filter(item => item.status === 'approved').length;
  const rejectedCount = filteredItems.filter(item => item.status === 'rejected').length;

  // Count by priority
  const priorityCounts = {
    high: filteredItems.filter(item => item.priority_level === 'high').length,
    medium: filteredItems.filter(item => item.priority_level === 'medium').length,
    low: filteredItems.filter(item => item.priority_level === 'low').length
  };

  // Count by direction
  const directionCounts = {};
  filteredItems.forEach(item => {
    if (item.direction) {
      directionCounts[item.direction] = (directionCounts[item.direction] || 0) + 1;
    }
  });

  // Count by assignee
  const assigneeCounts = {};
  filteredItems.forEach(item => {
    if (item.assigned_to) {
      assigneeCounts[item.assigned_to] = (assigneeCounts[item.assigned_to] || 0) + 1;
    }
  });

  // Count by received by
  const receivedByCounts = {};
  filteredItems.forEach(item => {
    if (item.received_by) {
      receivedByCounts[item.received_by] = (receivedByCounts[item.received_by] || 0) + 1;
    }
  });

  // Top organizations
  const orgCounts = {};
  items.forEach(item => {
    if (item.organization) {
      orgCounts[item.organization] = (orgCounts[item.organization] || 0) + 1;
    }
  });
  const topOrgs = Object.entries(orgCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  // Communications by month
  const monthCounts = {};
  filteredItems.forEach(item => {
    if (item.communication_date) {
      const date = new Date(item.communication_date);
      const monthKey = date.toISOString().slice(0, 7); // YYYY-MM
      monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1;
    }
  });
  const sortedMonths = Object.entries(monthCounts)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6); // Last 6 months

  const statusData = [
    { label: 'Pending', value: pendingCount },
    { label: 'Approved', value: approvedCount },
    { label: 'Rejected', value: rejectedCount }
  ];

  const priorityData = [
    { label: 'High', value: priorityCounts.high },
    { label: 'Medium', value: priorityCounts.medium },
    { label: 'Low', value: priorityCounts.low }
  ];

  const directionData = Object.entries(directionCounts).map(([k, v]) => ({
    label: k,
    value: v
  }));

  const assigneeData = Object.entries(assigneeCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([k, v]) => ({ label: k, value: v }));

  const receivedByData = Object.entries(receivedByCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([k, v]) => ({ label: k, value: v }));

  const orgData = topOrgs.map(([k, v]) => ({ label: k, value: v }));

  const trendData = sortedMonths.map(([month, count]) => ({
    label: month,
    value: count
  }));

  return (
    <div className="user-page analytics-page">
      <UserSidebar active={'analytics'} />
      <main className="user-main">
        <div className="page-header">
          <div>
            <h1>Analytics</h1>
            <p className="subtitle">Communications dashboard with visual charts</p>
          </div>
          <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#475569' }}>
              Show:
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                style={{
                  padding: '6px 10px',
                  borderRadius: '8px',
                  border: '1px solid rgba(148, 163, 184, 0.8)',
                  background: '#fff',
                  fontSize: '13px',
                  color: '#1f2937'
                }}
              >
                <option value="day">Last 24h</option>
                <option value="week">Last 7 days</option>
                <option value="month">Last 30 days</option>
                <option value="year">Last 12 months</option>
              </select>
            </label>
            <div className="export-dropdown-container">
              <button 
                onClick={() => setShowExportDropdown(!showExportDropdown)}
                className="export-btn"
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'opacity 0.2s'
                }}
              >
                Export Data
                <span style={{fontSize: '10px', marginLeft: '4px'}}>▼</span>
              </button>
              {showExportDropdown && (
                <div className="export-dropdown-menu">
                  <button 
                    onClick={exportToExcel}
                    className="export-menu-item"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      width: '100%',
                      padding: '10px 16px',
                      border: 'none',
                      background: 'none',
                      cursor: 'pointer',
                      fontSize: '13px',
                      color: '#333',
                      textAlign: 'left',
                      transition: 'background 0.2s'
                    }}
                  >
                    Export All Data to Excel
                  </button>
                  <button 
                    onClick={exportSummary}
                    className="export-menu-item"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      width: '100%',
                      padding: '10px 16px',
                      border: 'none',
                      background: 'none',
                      cursor: 'pointer',
                      fontSize: '13px',
                      color: '#333',
                      textAlign: 'left',
                      transition: 'background 0.2s'
                    }}
                  >
                    Export Summary Stats
                  </button>
                </div>
              )}
            </div>
            <button 
              onClick={fetchCommunications}
              disabled={loading}
              className="refresh-btn"
              style={{
                padding: '8px 16px',
                backgroundColor: '#0066cc',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '13px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                opacity: loading ? 0.6 : 1,
                transition: 'opacity 0.2s'
              }}
            >
              <svg
                className={"refresh-icon" + (loading ? ' spinning' : '')}
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
                focusable="false"
              >
                <path fillRule="evenodd" clipRule="evenodd" d="M12 4V1L7 6l5 5V7c3.31 0 6 2.69 6 6a6 6 0 11-6-6z" fill="currentColor" />
              </svg>
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>

        {error && <div style={{color:'#b00020',padding:'12px',background:'#ffebee',borderRadius:'4px',margin:'16px'}}>{error}</div>}

        {!loading && totalCount > 0 && (
          <>
            {/* Key Metrics */}
            <section className="analytics-grid">
              <div className="metric-card total">
                <div className="metric-label">Total Communications</div>
                <div className="metric-value">{totalCount}</div>
              </div>
              <div className="metric-card pending">
                <div className="metric-label">Pending</div>
                <div className="metric-value">{pendingCount}</div>
                <div className="metric-percent">{totalCount > 0 ? Math.round((pendingCount / totalCount) * 100) : 0}%</div>
                {totalCount > 0 && (
                  <div className="metric-progress">
                    <div
                      className="metric-progress-fill"
                      style={{ width: `${Math.round((pendingCount / totalCount) * 100)}%` }}
                    ></div>
                  </div>
                )}
              </div>
              <div className="metric-card approved">
                <div className="metric-label">Approved</div>
                <div className="metric-value">{approvedCount}</div>
                <div className="metric-percent">{totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0}%</div>
                {totalCount > 0 && (
                  <div className="metric-progress">
                    <div
                      className="metric-progress-fill"
                      style={{ width: `${Math.round((approvedCount / totalCount) * 100)}%` }}
                    ></div>
                  </div>
                )}
              </div>
              <div className="metric-card rejected">
                <div className="metric-label">Rejected</div>
                <div className="metric-value">{rejectedCount}</div>
                <div className="metric-percent">{totalCount > 0 ? Math.round((rejectedCount / totalCount) * 100) : 0}%</div>
                {totalCount > 0 && (
                  <div className="metric-progress">
                    <div
                      className="metric-progress-fill"
                      style={{ width: `${Math.round((rejectedCount / totalCount) * 100)}%` }}
                    ></div>
                  </div>
                )}
              </div>
            </section>

            {/* Charts Section */}
            <section className="analytics-charts">
              {/* Status Distribution - Pie Chart */}
              <div className="chart-card">
                <h3>Status Distribution</h3>
                <div className="chart-content pie-chart-container">
                  <PieChart
                    data={statusData}
                    colors={['#FF9999', '#66BB6A', '#FFA726']}
                    donut={false}
                     onHover={handleChartHover}
                     onLeave={handleChartLeave}
                  />
                  <div className="pie-legend">
                    {statusData.map((item, i) => (
                      <div key={i} className="legend-item">
                        <span className="legend-color" style={{
                          backgroundColor: ['#FF9999', '#66BB6A', '#FFA726'][i]
                        }}></span>
                        <span>{item.label}: {item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Priority Distribution - Pie Chart */}
              <div className="chart-card">
                <h3>Priority Level</h3>
                <div className="chart-content pie-chart-container">
                  <PieChart
                    data={priorityData}
                    colors={['#ef4444', '#f59e0b', '#3b82f6']}
                    donut={false}
                     onHover={handleChartHover}
                     onLeave={handleChartLeave}
                  />
                  <div className="pie-legend">
                    {priorityData.map((item, i) => (
                      <div key={i} className="legend-item">
                        <span className="legend-color" style={{
                          backgroundColor: ['#ef4444', '#f59e0b', '#3b82f6'][i]
                        }}></span>
                        <span>{item.label}: {item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Direction Distribution - Bar Chart */}
              <div className="chart-card">
                <h3>By Direction</h3>
                <div className="chart-content pie-chart-container">
                  {directionData.length > 0 ? (
                    <>
                      <PieChart data={directionData} colors={["#3b82f6", "#f59e0b", "#ef4444", "#10b981", "#8b5cf6", "#ec4899"]} onHover={handleChartHover} onLeave={handleChartLeave} />
                      <div className="pie-legend">
                        {directionData.map((item, i) => (
                          <div key={i} className="legend-item">
                            <span className="legend-color" style={{
                              backgroundColor: ["#3b82f6", "#f59e0b", "#ef4444", "#10b981", "#8b5cf6", "#ec4899"][i % 6]
                            }}></span>
                            <span>{item.label}: {item.value}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : <p style={{color:'#999'}}>No data available</p>}
                </div>
              </div>

              {/* Assignee Distribution - Bar Chart */}
              <div className="chart-card">
                <h3>Assignee</h3>
                <div className="chart-content pie-chart-container">
                  {assigneeData.length > 0 ? (
                    <>
                      <PieChart data={assigneeData} colors={["#8b5cf6", "#3b82f6", "#f59e0b", "#ef4444", "#10b981", "#ec4899"]} onHover={handleChartHover} onLeave={handleChartLeave} />
                      <div className="pie-legend">
                        {assigneeData.map((item, i) => (
                          <div key={i} className="legend-item">
                            <span className="legend-color" style={{
                              backgroundColor: ["#8b5cf6", "#3b82f6", "#f59e0b", "#ef4444", "#10b981", "#ec4899"][i % 6]
                            }}></span>
                            <span>{item.label}: {item.value}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : <p style={{color:'#999'}}>No assignments yet</p>}
                </div>
              </div>

              {/* Received/Released By Distribution - Bar Chart */}
              <div className="chart-card">
                <h3>Received/Released By</h3>
                <div className="chart-content">
                  {receivedByData.length > 0 ? (
                    <BarChart data={receivedByData} color="#ec4899" onHover={handleChartHover} onLeave={handleChartLeave} />
                  ) : <p style={{color:'#999'}}>No received by data yet</p>}
                </div>
              </div>

              {/* Top Organizations - Bar Chart */}
              <div className="chart-card">
                <h3>Top Organizations</h3>
                <div className="chart-content">
                  {orgData.length > 0 ? (
                    <BarChart data={orgData} color="#10b981" onHover={handleChartHover} onLeave={handleChartLeave} />
                  ) : <p style={{color:'#999'}}>No organizations found</p>}
                </div>
              </div>
            </section>
          </>
        )}

        {loading && (
          <div style={{padding:'60px 32px',textAlign:'center',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'400px'}}>
            <ReloadIcon style={{width:'48px', height:'48px', animation:'spin 2s linear infinite', marginBottom:'24px'}} />
            <div style={{color:'#666',fontSize:'14px',fontWeight:'500'}}>Loading analytics...</div>
            <div style={{color:'#999',fontSize:'12px',marginTop:'8px'}}>Fetching data from communications</div>
          </div>
        )}
        {!loading && totalCount === 0 && <div style={{padding:'32px',textAlign:'center',color:'#999'}}>No communications data available yet</div>}
      </main>
      {/* Tooltip for charts */}
      <div
        className="chart-tooltip"
        style={{
          display: tooltip.visible ? 'block' : 'none',
          left: tooltip.x,
          top: tooltip.y,
          position: 'fixed',
          pointerEvents: 'none'
        }}
      >
        {tooltip.content}
      </div>
    </div>
  );
}
