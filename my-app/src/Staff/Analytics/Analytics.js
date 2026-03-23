import React from 'react';
import './Analytics.css';
import Header from './Header';
import { Doughnut, Line } from 'react-chartjs-2';
import { donutOptions, lineOptions } from './Chart.js';
import { useState, useEffect } from 'react';
import { loadAndApplyAdminColor } from '../themeColors';
import { ClockIcon, ExclamationTriangleIcon, ChatBubbleIcon, ArchiveIcon } from '@radix-ui/react-icons';

export default function Analytics() {
  const [total, setTotal] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [highPriorityCount, setHighPriorityCount] = useState(0);
  const [followUpCount, setFollowUpCount] = useState(0);
  const [completeRate, setCompleteRate] = useState(0);
  const [avgCompletionTime, setAvgCompletionTime] = useState(0);
  const [inProgressRate, setInProgressRate] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [period, setPeriod] = useState('month');
  const [rawData, setRawData] = useState([]);

  // Load and apply saved admin color theme
  useEffect(() => {
    loadAndApplyAdminColor();
  }, []);

  const [pendingData, setPendingData] = useState({ labels: ['Pending', 'Completed'], datasets: [{ data: [0, 0], backgroundColor: ['#8b5cf6', '#14b8a6'], borderWidth: 0 }] });
  const [priorityData, setPriorityData] = useState({ labels: ['High', 'Medium', 'Low'], datasets: [{ data: [0, 0, 0], backgroundColor: ['#f43f5e', '#f59e0b', '#0ea5e9'], borderWidth: 0 }] });
  const [directionData, setDirectionData] = useState({ labels: [], datasets: [] });
  const [tagsData, setTagsData] = useState({ labels: [], datasets: [{ data: [], backgroundColor: [], borderWidth: 0 }] });

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

  const fetchAndBuild = async () => {
    try {
      const res = await fetch('/api/communications');
      const data = await res.json();

      setRawData(data);
      const filteredData = filterByPeriod(data, period);

      setTotal(filteredData.length);

      // pending vs completed based on status field
      const pending = filteredData.filter(d => d.status === 'pending').length;
      const completed = filteredData.filter(d => d.status === 'approved').length;
      setPendingCount(pending);
      setPendingData({ labels: ['Pending', 'Completed'], datasets: [{ data: [pending, completed], backgroundColor: ['#8b5cf6', '#14b8a6'], borderWidth: 0 }] });

      // priority counts
      const pri = { high: 0, medium: 0, low: 0 };
      filteredData.forEach(d => {
        const p = (d.priority_level || '').toString().toLowerCase();
        if (p.includes('high')) pri.high += 1;
        else if (p.includes('low')) pri.low += 1;
        else pri.medium += 1;
      });
      setHighPriorityCount(pri.high);
      setPriorityData({ labels: ['High', 'Medium', 'Low'], datasets: [{ data: [pri.high, pri.medium, pri.low], backgroundColor: ['#f43f5e', '#f59e0b', '#0ea5e9'], borderWidth: 0 }] });

      // follow-up required count
      const followUp = filteredData.filter(d => d.follow_up_required).length;
      setFollowUpCount(followUp);

      // Calculate complete rate
      const completedByStatus = filteredData.filter(d => d.status === 'approved' || !d.follow_up_required).length;
      setCompletedCount(completedByStatus);
      const completePercentage = filteredData.length > 0 ? ((completedByStatus / filteredData.length) * 100).toFixed(1) : 0;
      setCompleteRate(completePercentage);

      // Calculate in progress rate
      const inProgress = filteredData.filter(d => d.status === 'pending' || d.follow_up_required).length;
      const inProgressPercentage = filteredData.length > 0 ? ((inProgress / filteredData.length) * 100).toFixed(1) : 0;
      setInProgressRate(inProgressPercentage);

      // Calculate average completion time
      const completedWithDates = filteredData.filter(d =>
        (d.status === 'approved' || !d.follow_up_required) &&
        d.created_at &&
        d.updated_at
      );
      let avgDays = 0;
      if (completedWithDates.length > 0) {
        const totalDays = completedWithDates.reduce((sum, d) => {
          const created = new Date(d.created_at);
          const updated = new Date(d.updated_at);
          const diffTime = Math.abs(updated - created);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return sum + diffDays;
        }, 0);
        avgDays = Math.round(totalDays / completedWithDates.length);
      }
      setAvgCompletionTime(avgDays);

      // Build chart axis based on selected period (day/week/month/year)
      const buildBuckets = (period) => {
        const now = new Date();
        if (period === 'day') {
          const hours = Array.from({ length: 24 }, (_, i) => i);
          return hours.map(h => `${h}:00`);
        }
        if (period === 'week') {
          const days = [];
          for (let i = 6; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(now.getDate() - i);
            days.push(d.toLocaleDateString('default', { weekday: 'short' }));
          }
          return days;
        }
        if (period === 'month') {
          const days = [];
          for (let i = 29; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(now.getDate() - i);
            days.push(d.toLocaleDateString('default', { month: 'short', day: 'numeric' }));
          }
          return days;
        }
        // year
        const months = [];
        for (let i = 11; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          months.push(d.toLocaleString('default', { month: 'short', year: 'numeric' }));
        }
        return months;
      };

      const buckets = buildBuckets(period);
      const incomingCounts = buckets.map(() => 0);
      const outgoingCounts = buckets.map(() => 0);

      const getLabel = (date) => {
        if (!date) return null;
        const dt = new Date(date);
        if (period === 'day') return `${dt.getHours()}:00`;
        if (period === 'week') return dt.toLocaleDateString('default', { weekday: 'short' });
        if (period === 'month') return dt.toLocaleDateString('default', { month: 'short', day: 'numeric' });
        return dt.toLocaleString('default', { month: 'short', year: 'numeric' });
      };

      filteredData.forEach(d => {
        const commDate = d.communication_date ? new Date(d.communication_date) : (d.created_at ? new Date(d.created_at) : null);
        if (!commDate) return;
        const label = getLabel(commDate);
        const idx = buckets.indexOf(label);
        if (idx === -1) return;
        const dir = (d.direction || d.direction_of_communication || d.kind_of_communication || '').toString().toLowerCase();
        if (dir.includes('out')) outgoingCounts[idx] += 1;
        else incomingCounts[idx] += 1;
      });

      setDirectionData({
        labels: buckets,
        datasets: [
          { label: 'Incoming', data: incomingCounts, borderColor: '#2b6ef6', backgroundColor: 'rgba(43,110,246,0.08)', tension: 0.3 },
          { label: 'Outgoing', data: outgoingCounts, borderColor: '#f6c94a', backgroundColor: 'rgba(246,201,74,0.08)', tension: 0.3 },
        ],
      });

      // Count tags
      const tagCounts = {};
      filteredData.forEach(d => {
        let tags = [];
        if (d.tags) {
          if (typeof d.tags === 'string') {
            try {
              tags = JSON.parse(d.tags);
            } catch {
              tags = d.tags.split(',').map(t => t.trim());
            }
          } else if (Array.isArray(d.tags)) {
            tags = d.tags;
          }
        }
        tags.forEach(tag => {
          const t = tag.toString().trim();
          if (t) tagCounts[t] = (tagCounts[t] || 0) + 1;
        });
      });
      const sortedTags = Object.entries(tagCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10); // Top 10 tags
      const tagLabels = sortedTags.map(([tag]) => tag);
      const tagChartData = sortedTags.map(([, count]) => count);
      const tagColors = ['#8b5cf6', '#f43f5e', '#f59e0b', '#0ea5e9', '#10b981', '#ec4899', '#6366f1', '#84cc16', '#f97316', '#06b6d4'];
      setTagsData({
        labels: tagLabels.length > 0 ? tagLabels : ['No Tags'],
        datasets: [{
          data: tagChartData.length > 0 ? tagChartData : [1],
          backgroundColor: tagColors.slice(0, tagLabels.length || 1),
          borderWidth: 0
        }]
      });

    } catch (err) {
      console.error('Failed to load analytics data', err);
    }
  };

  useEffect(() => {
    fetchAndBuild();
  }, []);

  useEffect(() => {
    if (rawData.length > 0) {
      // rebuild calculated values when period changes
      fetchAndBuild();
    }
  }, [period]);

  const handleRefresh = () => {
    fetchAndBuild();
  };

  // chart data and options are imported from ./chart

  return (
    <div className="analytics">
      <div className="main">
        <Header
          onRefresh={handleRefresh}
          period={period}
          onPeriodChange={(value) => setPeriod(value)}
        />

        <main className="container">
          <section className="stats-column">
            <div className="stats-grid">
              <div className="card stat">
                <div className="stat-head">
                  <div className="stat-left">
                    <div className="stat-icon" aria-hidden>
                      <ClockIcon style={{ width: '24px', height: '24px', color: '#f59e0b' }} />
                    </div>
                    <div className="stat-title">Pending</div>
                  </div>
                  <div className="stat-chip blue">Active</div>
                </div>
                <div className="stat-value">{pendingCount}</div>
              </div>

              <div className="card stat">
                <div className="stat-head">
                  <div className="stat-left">
                    <div className="stat-icon" aria-hidden>
                      <ExclamationTriangleIcon style={{ width: '24px', height: '24px', color: '#ef4444' }} />
                    </div>
                    <div className="stat-title">High Priority</div>
                  </div>
                  <div className="stat-chip red">Urgent</div>
                </div>
                <div className="stat-value">{highPriorityCount}</div>
              </div>

              <div className="card stat">
                <div className="stat-head">
                  <div className="stat-left">
                    <div className="stat-icon" aria-hidden>
                      <ChatBubbleIcon style={{ width: '24px', height: '24px', color: '#f59e0b' }} />
                    </div>
                    <div className="stat-title">Follow-up Required</div>
                  </div>
                  <div className="stat-chip amber">Actions</div>
                </div>
                <div className="stat-value">{followUpCount}</div>
              </div>

              <div className="card stat">
                <div className="stat-head">
                  <div className="stat-left">
                    <div className="stat-icon" aria-hidden>
                      <ArchiveIcon style={{ width: '24px', height: '24px', color: '#a78bfa' }} />
                    </div>
                    <div className="stat-title">Total Communications</div>
                  </div>
                  <div className="stat-chip purple">Total</div>
                </div>
                <div className="stat-value">{total}</div>
              </div>
            </div>

            <div className="card charts-row">
              <div className="chart-wrapper">
                <div className="chart-header">
                  <div className="chart-icon" aria-hidden>
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9" stroke="#2b6ef6" strokeWidth="2" /><circle cx="12" cy="12" r="4" fill="#2b6ef6" /></svg>
                  </div>
                  <div className="chart-title">Status Distribution
                    <div className="chart-sub">Communication status breakdown</div>
                  </div>
                </div>
                <div className="chart large">
                  <Doughnut data={pendingData} options={donutOptions} />
                </div>
              </div>

              <div className="chart-wrapper">
                <div className="chart-header">
                  <div className="chart-icon" aria-hidden>
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 3v7l5 2" stroke="#f6c94a" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </div>
                  <div className="chart-title">Priority Distribution
                    <div className="chart-sub">Priority level analysis</div>
                  </div>
                </div>
                <div className="chart large">
                  <Doughnut data={priorityData} options={donutOptions} />
                </div>
              </div>
            </div>

            <div className="card charts-row smalls">
              <div className="chart-wrapper small">
                <div className="chart-header">
                  <div className="chart-icon" aria-hidden>
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><polyline points="3 17 9 11 13 15 21 7" stroke="#2b6ef6" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </div>
                  <div className="chart-title">Communication Direction
                    <div className="chart-sub">Direction over time</div>
                  </div>
                </div>
                <div className="chart small">
                  <Line data={directionData} options={lineOptions} />
                </div>
              </div>

              <div className="chart-wrapper small">
                <div className="chart-header">
                  <div className="chart-icon" aria-hidden>
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="7" width="18" height="10" rx="2" fill="#8b5cf6" /><circle cx="9" cy="12" r="2" fill="#fff" /><path d="M15 10v4" stroke="#fff" strokeWidth="2" strokeLinecap="round" /></svg>
                  </div>
                  <div className="chart-title">Tags Distribution
                    <div className="chart-sub">Most used tags</div>
                  </div>
                </div>
                <div className="chart small">
                  <Doughnut data={tagsData} options={donutOptions} />
                </div>
              </div>
            </div>
            <div className="card summary-row">
              <div className="summary-grid">
                <div className="summary-card">
                  <div className="summary-icon" aria-hidden>
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9" stroke="#10b981" strokeWidth="1.5" fill="#ecfdf5" /></svg>
                  </div>
                  <div className="summary-body">
                    <div className="summary-title">Complete Rate</div>
                    <div className="summary-value">{completeRate}%</div>
                    <div className="summary-meta">{completedCount} out of {total} completed</div>
                  </div>
                </div>

                <div className="summary-card">
                  <div className="summary-icon" aria-hidden>
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="11" width="18" height="10" rx="2" fill="#fff7ed" stroke="#f59e0b" /></svg>
                  </div>
                  <div className="summary-body">
                    <div className="summary-title">Average completion time</div>
                    <div className="summary-value">{avgCompletionTime} days</div>
                    <div className="summary-meta">{completedCount > 0 ? `Based on ${completedCount} completed items` : 'No completed items'}</div>
                  </div>
                </div>

                <div className="summary-card">
                  <div className="summary-icon" aria-hidden>
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9" stroke="#f97316" strokeWidth="1.5" fill="#fff7ed" /></svg>
                  </div>
                  <div className="summary-body">
                    <div className="summary-title">In progress rate</div>
                    <div className="summary-value">{inProgressRate}%</div>
                    <div className="summary-meta">{followUpCount} of {total} in progress</div>
                  </div>
                </div>
              </div>
            </div>
          </section>


        </main>


      </div>
    </div>
  );
}
