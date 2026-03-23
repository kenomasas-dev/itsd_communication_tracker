import React from 'react';
import './Header.css';

export default function Header({ onRefresh, period = 'month', onPeriodChange }) {
  return (
    <header className="topbar">
      <div className="header-content">
        <h2 className="topbar-title">Analytics</h2>
        <p>View communication metrics and insights</p>
      </div>

      <div className="header-controls">
        <label>
          Show:
          <select value={period} onChange={(e) => onPeriodChange?.(e.target.value)}>
            <option value="day">Last 24h</option>
            <option value="week">Last 7 days</option>
            <option value="month">Last 30 days</option>
            <option value="year">Last 12 months</option>
          </select>
        </label>
        <button className="btn-refresh" onClick={onRefresh}>↻ Refresh</button>
      </div>
    </header>
  );
}
