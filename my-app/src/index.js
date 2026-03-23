import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import App from './Staff/Comm/Communication';
import Admin from './Admin/Admin';
import User from './User/User';
import Projects from './User/Projects';
import Analytics from './User/Analytics';
import Calendar from './User/Calendar';
import Messages from './User/Messages';
import Settings from './User/Settings';
import Team from './User/Team';
import Lists from './User/Lists';
import AuditLogsUser from './User/AuditLogs';
import AddUser from './Admin/AddUser';
import UserDetail from './Admin/UserDetail';
import HeadPage from './Head/HeadPage';
import HeadProcess from './Head/Process';
import HeadAnnouncements from './Head/Announcements';
import HeadApproval from './Head/Approval';
import HeadAnalytics from './Head/Analytics';
import HeadLogin from './Head/Login';
import HeadManageRoles from './Head/ManageRoles';
import reportWebVitals from './reportWebVitals';
import UnifiedLogin from './UnifiedLogin';
import { loadAndApplyAdminColor } from './Staff/themeColors';

// Apply saved admin display theme before React renders, but only for admin routes
try {
  const saved = JSON.parse(localStorage.getItem('adminDisplay') || 'null');
  const isAdminPath = /^\/admin(\/|$)/.test(window.location.pathname || '/');
  if (isAdminPath && saved && saved.primaryColor) {
    // apply to .admin-layout when present; fallback to :root
    const adminRoot = document.querySelector('.admin-layout') || document.documentElement;
    adminRoot.style.setProperty('--admin-primary', saved.primaryColor);
    if (saved.accentColor) adminRoot.style.setProperty('--admin-accent', saved.accentColor);
    try {
      const hex = String(saved.primaryColor || '').replace('#', '');
      if (hex.length === 6) {
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        adminRoot.style.setProperty('--admin-primary-rgb', `${r},${g},${b}`);
      }
    } catch (e) { }
    try {
      const ev = new CustomEvent('theme-changed', { detail: saved });
      window.dispatchEvent(ev);
    } catch (e) {
      window.themeChanged = saved;
    }
  }
} catch (e) {
  // ignore parse errors
}

// Apply saved staff admin color theme so accent is present across Staff pages
try {
  loadAndApplyAdminColor();
} catch (e) {
  // ignore
}


const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/login" element={<UnifiedLogin />} />
        <Route path="/staff/login" element={<Navigate to="/login" replace />} />
        <Route path="/user/login" element={<Navigate to="/login" replace />} />
        <Route path="/admin/login" element={<Navigate to="/login" replace />} />
        <Route path="/head/login" element={<HeadLogin />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/admin/add-user" element={<AddUser />} />
        <Route path="/User" element={<Lists />} />
        <Route path="/user/projects" element={<Projects />} />
        <Route path="/user/analytics" element={<Analytics />} />
        <Route path="/user/audit" element={<AuditLogsUser />} />
        <Route path="/user/calendar" element={<Calendar />} />
        <Route path="/user/messages" element={<Messages />} />
        <Route path="/user/settings" element={<Settings />} />
        <Route path="/user/team" element={<Team />} />
        <Route path="/user/lists" element={<Lists />} />
        <Route path="/head" element={<HeadPage />} />
        <Route path="/head/process" element={<HeadProcess />} />
        <Route path="/head/analytics" element={<HeadAnalytics />} />
        <Route path="/head/announcements" element={<HeadAnnouncements />} />
        <Route path="/head/approval" element={<HeadApproval />} />
        <Route path="/head/manage-roles" element={<HeadManageRoles />} />
        <Route path="/admin/users/:id" element={<UserDetail />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);


reportWebVitals();


