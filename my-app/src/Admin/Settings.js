import React, { useState, useEffect } from 'react';
import './Admin.css';

// memoized helpers moved outside of Settings to avoid re-creation on each render
const SettingRow = React.memo(({ label, description, children }) => (
  <div style={{ borderBottom: '1px solid #f3f4f6', paddingBottom: '16px', marginBottom: '16px' }}>
    <div style={{ marginBottom: '8px' }}>
      <label style={{ fontSize: '14px', fontWeight: '500', color: '#1f2937', display: 'block' }}>
        {label}
      </label>
      {description && (
        <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0 0' }}>
          {description}
        </p>
      )}
    </div>
    {children}
  </div>
));

const DisplayOnlyRow = React.memo(({ label, description, value }) => (
  <div style={{ borderBottom: 'var(--admin-border)', paddingBottom: '16px', marginBottom: '16px', borderBottomWidth: '1px', borderBottomStyle: 'solid' }}>
    <div style={{ marginBottom: '8px' }}>
      <label style={{ fontSize: '14px', fontWeight: '500', color: 'var(--admin-text-primary)', display: 'block' }}>
        {label}
      </label>
      {description && (
        <p style={{ fontSize: '12px', color: 'var(--admin-text-secondary)', margin: '4px 0 0' }}>
          {description}
        </p>

      )}
    </div>
    <div style={{
      width: '100%',
      padding: '8px 12px',
      border: '1px solid var(--admin-border)',
      borderRadius: '6px',
      background: 'var(--admin-bg-primary)',
      color: 'var(--admin-text-primary)',
      fontSize: '14px',
      cursor: 'default'
    }}>
      {value}
    </div>
  </div>
));

export default function Settings() {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('security');
  const [settings, setSettings] = useState({
    general: {
      appName: 'ITSD Communication Tracker',
      appVersion: '1.0.0',
      timezone: 'UTC',
      dateFormat: 'MM/DD/YYYY',
      language: 'English'
    },
    security: {
      passwordMinLength: 8,
      passwordExpiry: 90,
      sessionTimeout: 30,
      loginAttempts: 5
    },
    notifications: {
      emailNotifications: true,
      slackIntegration: false,
      auditLogAlerts: true,
      userActivityAlerts: true,
      securityAlerts: true
    },

    api: {
      apiEndpoint: '/api',
      apiTimeout: 30,
      rateLimit: 1000,
      logRequests: true
    },
    backup: {
      autoBackup: true,
      backupFrequency: 'daily',
      retentionDays: 30,
      lastBackup: '2024-02-03 14:30:00'
    }
    ,
    display: {
      primaryColor: '#7c3aed',
      accentColor: '#06b6d4',
      useSystemTheme: false,
      themeName: ''
    }
  });

  const [successMessage, setSuccessMessage] = useState('');
  const [themes, setThemes] = useState([]);
  const [newThemeName, setNewThemeName] = useState('');
  const [permissionsList, setPermissionsList] = useState([]);
  const [newPermissionName, setNewPermissionName] = useState('');
  const [newPermissionDesc, setNewPermissionDesc] = useState('');
  const [newPermissionRisk, setNewPermissionRisk] = useState('Low');
  const [addingPermission, setAddingPermission] = useState(false);
  // Password change fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [fetchingAdminPassword, setFetchingAdminPassword] = useState(false);
  // User passwords management
  const [usersList, setUsersList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showTempModal, setShowTempModal] = useState(false);
  const [tempUser, setTempUser] = useState(null);
  const [tempPasswordInput, setTempPasswordInput] = useState('');
  const [tempError, setTempError] = useState('');
  const [tempLoading, setTempLoading] = useState(false);
  const [addingTheme, setAddingTheme] = useState(false);
  const [deletingThemeId, setDeletingThemeId] = useState(null);
  const [requestResetLoading, setRequestResetLoading] = useState(null);
  const [pendingResets, setPendingResets] = useState({});
  const [showOnlyRequested, setShowOnlyRequested] = useState(false);
  const [confirmDeletePermId, setConfirmDeletePermId] = useState(null);
  const [editPermission, setEditPermission] = useState(null); // { id, name, description, risk_level }
  // Password strength testing modal
  const [showStrengthModal, setShowStrengthModal] = useState(false);
  const [strengthTestInput, setStrengthTestInput] = useState('');
  const [strengthScore, setStrengthScore] = useState(null);
  const [strengthMessage, setStrengthMessage] = useState('');



  const applyGeneralSettings = (general) => {
    if (!general) return;
    try {
      // Set document title to application name
      if (general.appName) document.title = general.appName;

      // Store general preferences on root for other components to read
      const html = document.documentElement;
      if (general.timezone) html.dataset.timezone = general.timezone;
      if (general.dateFormat) html.dataset.dateFormat = general.dateFormat;
      if (general.language) html.lang = general.language.toLowerCase();

      // Persist to localStorage
      localStorage.setItem('adminGeneral', JSON.stringify(general));
    } catch (err) {
      console.warn('Failed to apply general settings:', err);
    }
  };

  useEffect(() => {
    fetchSettings();
    const savedGeneral = JSON.parse(localStorage.getItem('adminGeneral') || 'null');

    if (savedGeneral) {
      // update state and apply general settings
      setSettings(prev => ({ ...prev, general: { ...prev.general, ...savedGeneral } }));
      applyGeneralSettings(savedGeneral);
    }
    const savedDisplay = JSON.parse(localStorage.getItem('adminDisplay') || 'null');
    if (savedDisplay) {
      setSettings(prev => ({ ...prev, display: { ...prev.display, ...savedDisplay } }));
      applyDisplaySettings(savedDisplay);
    }
    // fetch available themes
    fetchThemes();
    fetchPermissions();
    // fetch users for password management
    fetchUsers();
  }, []);

  // When pendingResets updates, default to showing only requested entries
  useEffect(() => {
    try {
      if (pendingResets && Object.keys(pendingResets).length > 0) setShowOnlyRequested(true);
    } catch (e) { }
  }, [pendingResets]);

  useEffect(() => {
    if (activeTab === 'password') {
      fetchAdminPassword();
    }
  }, [activeTab]);

  const fetchAdminPassword = async () => {
    setFetchingAdminPassword(true);
    try {
      // login stores admin data under 'adminUser'
      const adminStorage = JSON.parse(
        localStorage.getItem('adminUser') ||
        localStorage.getItem('admin') ||
        localStorage.getItem('user') ||
        '{}'
      );
      const email =
        adminStorage.email ||
        adminStorage.user_email ||
        adminStorage.username ||
        adminStorage.admin_email ||
        ''; // leave blank if not available
      if (!email) {
        console.warn('fetchAdminPassword: no email found in storage');
        setFetchingAdminPassword(false);
        return;
      }
      setAdminEmail(email);
      console.log('fetchAdminPassword: requesting password for', email);

      const response = await fetch(`/api/admin-auth/admin-password/${email}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      console.log('fetchAdminPassword response', data);

      if (data.success && data.password != null) {
        setAdminPassword(data.password);
        setCurrentPassword(data.password);
      } else {
        console.error('Failed to fetch admin password, response', data);
      }
    } catch (error) {
      console.error('Error fetching admin password:', error);
    } finally {
      setFetchingAdminPassword(false);
    }
  };

  const handleChangeAdminPassword = async () => {
    setPasswordError('');
    const minLen = settings.security && settings.security.passwordMinLength ? settings.security.passwordMinLength : 8;

    if (!currentPassword) return setPasswordError('Current password required');
    if (!newPassword) return setPasswordError('New password required');
    if (newPassword.length < minLen) return setPasswordError(`New password must be at least ${minLen} characters`);
    if (newPassword !== confirmPassword) return setPasswordError('New password and confirmation do not match');
    if (currentPassword !== adminPassword) return setPasswordError('Current password is incorrect');
    if (newPassword === currentPassword) return setPasswordError('New password must be different from current password');

    try {
      setLoading(true);
      const res = await fetch('/api/admin-auth/change-admin-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: adminEmail,
          currentPassword: currentPassword,
          newPassword: newPassword
        })
      });

      const data = await res.json();

      if (data.success) {
        setAdminPassword(newPassword);
        setCurrentPassword(newPassword);
        setNewPassword('');
        setConfirmPassword('');
        setSuccessMessage('Admin password changed successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);

        // Record audit log
        try {
          await fetch('/api/auth/record-audit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'ADMIN_PASSWORD_CHANGED',
              user_email: adminEmail,
              user_role: 'admin',
              description: `Admin ${adminEmail} changed their password`
            })
          });
        } catch (auditError) {
          console.error('Audit log error:', auditError);
        }
      } else {
        setPasswordError(data.message || 'Failed to change password');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      setPasswordError('Connection error: Make sure the backend server is running');
    } finally {
      setLoading(false);
    }
  };

  // load users when the passwords tab is opened
  useEffect(() => {
    if (activeTab === 'passwords') {
      fetchUsers();
    }
  }, [activeTab]);

  // reset-requests functionality removed (handled inline in users table)

  const fetchThemes = async () => {
    try {
      const res = await fetch('/api/themes');
      const body = await res.json();
      if (body && body.success) setThemes(body.data || []);
    } catch (err) {
      console.warn('Failed to fetch themes', err);
    }
  };

  const fetchPermissions = async () => {
    try {
      const res = await fetch('/api/permissions');
      const body = await res.json();
      // Expecting an array or { success, data }
      if (Array.isArray(body)) setPermissionsList(body);
      else if (body && body.success) setPermissionsList(body.data || []);
      else setPermissionsList([]);
    } catch (err) {
      console.warn('Failed to fetch permissions', err);
      setPermissionsList([]);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      // Fetch regular users and admin users in parallel
      const [usersRes, adminsRes] = await Promise.allSettled([
        fetch('/api/auth/users'),
        fetch('/api/admin-auth/admin-users')
      ]);

      let users = [];
      if (usersRes.status === 'fulfilled') {
        try {
          const body = await usersRes.value.json();
          if (Array.isArray(body)) users = body;
          else if (body && body.success) users = body.data || [];
        } catch (e) { /* ignore */ }
      }

      let admins = [];
      if (adminsRes.status === 'fulfilled') {
        try {
          const body = await adminsRes.value.json();
          if (Array.isArray(body)) admins = body;
          else if (body && body.success) admins = body.data || [];
        } catch (e) { /* ignore */ }
      }

      // Normalize and merge users and admins, avoid duplicates by email
      const map = new Map();
      const normalize = (u, src) => ({ id: u.id, email: u.email || u.user_email || u.username, role: u.role || u.user_role || (src === 'admin' ? 'Admin' : 'User'), last_password_change: u.last_password_change || u.updated_at || u.created_at || null });
      users.forEach(u => { const n = normalize(u, 'auth'); if (n.email) map.set(n.email, n); });
      admins.forEach(a => { const n = normalize(a, 'admin'); if (n.email) map.set(n.email, n); });

      setUsersList(Array.from(map.values()));
      // after loading users, fetch pending reset requests for these users
      try { fetchPendingResets(); } catch (e) { /* ignore */ }
    } catch (err) {
      console.warn('Failed to fetch users', err);
      setUsersList([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchPendingResets = async () => {
    try {
      const res = await fetch('/api/auth/audit-logs');
      if (!res.ok) return;
      const body = await res.json();
      let rows = [];
      if (Array.isArray(body)) rows = body;
      else if (body && body.success && Array.isArray(body.data)) rows = body.data;

      const requests = (rows || []).filter(r => (r.action || '').toString().toUpperCase() === 'REQUEST_ADMIN_RESET');
      const map = {};
      requests.forEach(r => {
        const email = (r.user_email || r.email || (r.meta && r.meta.email) || '').toString().toLowerCase();
        if (!email) return;
        const ts = Date.parse(r.created_at || r.timestamp || r.time || r.date || r.logged_at || '');
        if (!map[email] || (ts && ts > map[email].ts)) {
          map[email] = { ts: ts || Date.now(), note: r.description || r.message || '' };
        }
      });
      setPendingResets(map);
    } catch (e) {
      console.warn('Failed to fetch pending resets', e);
      setPendingResets({});
    }
  };

  const addPermissionToDB = async () => {
    if (addingPermission) return;
    const name = (newPermissionName || '').trim();
    if (!name) return setSuccessMessage('Permission name required');
    setAddingPermission(true);
    try {
      const res = await fetch('/api/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description: newPermissionDesc || null, risk_level: newPermissionRisk || 'Low', created_by: JSON.parse(localStorage.getItem('user') || '{}').email || 'admin' })
      });
      let body = null;
      try {
        body = await res.json();
      } catch (err) {
        console.warn('Permissions POST returned non-JSON response', err);
      }
      console.log('addPermissionToDB response', res.status, body);
      const ok = res.ok || (body && (body.success || body.id || body.permission));
      if (ok) {
        setNewPermissionName('');
        setNewPermissionDesc('');
        setNewPermissionRisk('Low');
        setSuccessMessage('Permission added');
        setTimeout(() => setSuccessMessage(''), 1800);
        fetchPermissions();
      } else {
        const msg = (body && (body.message || body.error)) || `Server responded ${res.status}`;
        console.error('Failed to add permission:', msg, body);
        setSuccessMessage('Failed to add permission: ' + msg);
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (err) {
      console.warn('Error adding permission', err);
      console.error('Error adding permission (network):', err);
      setSuccessMessage('Error adding permission: ' + (err.message || err));
      setTimeout(() => setSuccessMessage(''), 3000);
    } finally {
      setAddingPermission(false);
    }
  };

  const getRiskLevelColor = (riskLevel) => {
    const colors = { 'Low': '#10b981', 'Medium': '#f59e0b', 'High': '#ef4444', 'Critical': '#dc2626' };
    return colors[riskLevel] || '#6b7280';
  };

  const deletePermissionFromDB = async (id) => {
    try {
      const res = await fetch(`/api/permissions/${id}`, { method: 'DELETE' });
      const body = await res.json();
      if (res.ok || (body && body.success)) {
        setPermissionsList(prev => prev.filter(p => p.id !== id));
        setSuccessMessage('Permission deleted');
        setTimeout(() => setSuccessMessage(''), 1800);
      } else {
        setSuccessMessage('Failed to delete permission');
        setTimeout(() => setSuccessMessage(''), 2500);
      }
    } catch (err) {
      console.warn('Error deleting permission', err);
      setSuccessMessage('Error deleting permission');
      setTimeout(() => setSuccessMessage(''), 2500);
    } finally {
      setConfirmDeletePermId(null);
    }
  };

  const updatePermissionInDB = async () => {
    if (!editPermission || !editPermission.name.trim()) return;
    try {
      const res = await fetch(`/api/permissions/${editPermission.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editPermission.name.trim(),
          description: editPermission.description || null,
          risk_level: editPermission.risk_level
        })
      });
      const body = await res.json();
      if (res.ok || (body && body.success)) {
        setPermissionsList(prev => prev.map(p =>
          p.id === editPermission.id
            ? { ...p, name: editPermission.name, description: editPermission.description, risk_level: editPermission.risk_level }
            : p
        ));
        setSuccessMessage('Permission updated');
        setTimeout(() => setSuccessMessage(''), 1800);
      } else {
        setSuccessMessage('Failed to update permission');
        setTimeout(() => setSuccessMessage(''), 2500);
      }
    } catch (err) {
      console.warn('Error updating permission', err);
      setSuccessMessage('Error updating permission');
      setTimeout(() => setSuccessMessage(''), 2500);
    } finally {
      setEditPermission(null);
    }
  };

  const addThemeToDB = async () => {
    if (addingTheme) return;
    const name = newThemeName || settings.display.themeName || 'Custom Theme';
    const color_hex = settings.display.primaryColor;
    if (!color_hex) return;
    setAddingTheme(true);
    try {
      const res = await fetch('/api/themes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, color_hex, color_rgb: hexToRgb(color_hex), uploaded_by: 'admin' })
      });
      const body = await res.json();
      if (body && body.success) {
        setNewThemeName('');
        fetchThemes();
        setSuccessMessage('Theme added');
        setTimeout(() => setSuccessMessage(''), 2000);
      } else {
        console.warn('Failed to add theme', body);
      }
    } catch (err) {
      console.warn('Error adding theme', err);
    } finally {
      setAddingTheme(false);
    }
  };

  const deleteTheme = async (id) => {
    if (!id) return;
    const ok = window.confirm('Delete this theme? This action cannot be undone.');
    if (!ok) return;
    if (deletingThemeId) return;
    setDeletingThemeId(id);
    try {
      const res = await fetch(`/api/themes/${id}`, { method: 'DELETE' });
      const body = await res.json();
      if (body && body.success) {
        setSuccessMessage('Theme deleted');
        setTimeout(() => setSuccessMessage(''), 1800);
        fetchThemes();
      } else {
        console.warn('Failed to delete theme', body);
      }
    } catch (err) {
      console.warn('Error deleting theme', err);
    } finally {
      setDeletingThemeId(null);
    }
  };

  const fetchSettings = async () => {
    try {
      setLoading(true);
      // Simulate API call
      setTimeout(() => {
        setLoading(false);
      }, 500);
    } catch (error) {
      console.error('Error fetching settings:', error);
      setLoading(false);
    }
  };

  const handleSettingChange = (category, key, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
  };

  // ---------- security tab helpers ----------
  // security utilities
  const handleTestPasswordStrength = () => {
    setStrengthTestInput('');
    setStrengthScore(null);
    setStrengthMessage('');
    setShowStrengthModal(true);
  };

  const evaluatePasswordStrength = (pwd) => {
    if (!pwd) {
      setStrengthScore(null);
      setStrengthMessage('Enter a password to test');
      return;
    }
    let score = 0;
    let feedback = [];
    if (pwd.length >= 8) score++; else feedback.push('At least 8 characters');
    if (pwd.length >= 12) score++; else feedback.push('At least 12 characters (stronger)');
    if (/[a-z]/.test(pwd)) score++; else feedback.push('Add lowercase letters');
    if (/[A-Z]/.test(pwd)) score++; else feedback.push('Add uppercase letters');
    if (/[0-9]/.test(pwd)) score++; else feedback.push('Add numbers');
    if (/[!@#$%^&*]/.test(pwd)) score++; else feedback.push('Add special characters');
    setStrengthScore(score);
    const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
    setStrengthMessage(`${labels[score] || 'Invalid'} password. ${feedback.length > 0 ? 'Suggestions: ' + feedback.join(', ') : 'Excellent!'}`);
  };

  const handleForceLogout = async () => {
    if (!window.confirm('Force logout all active users?')) return;
    try {
      const res = await fetch('/api/security/force-logout', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert('All users have been logged out');
      } else {
        alert('Failed to force logout: ' + (data.message || ''));
      }
    } catch (err) {
      alert('Connection error');
    }
  };

  const handleResetSecuritySettings = () => {
    if (window.confirm('Reset security settings to default values?')) {
      const defaults = {
        passwordMinLength: 8,
        passwordExpiry: 90,
        sessionTimeout: 30,
        loginAttempts: 5,
        twoFactorAuth: false
      };
      setSettings(prev => ({
        ...prev,
        security: { ...prev.security, ...defaults }
      }));
      setSuccessMessage('Security settings reset');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  const handleSave = () => {
    setLoading(true);
    // Apply general settings
    if (settings.general) {
      applyGeneralSettings(settings.general);
    }
    // Apply display settings
    if (settings.display) {
      applyDisplaySettings(settings.display);
      // persist display settings
      try { localStorage.setItem('adminDisplay', JSON.stringify(settings.display)); } catch (e) { }
    }
    setTimeout(() => {
      setSuccessMessage('Settings saved successfully!');
      setLoading(false);
      setTimeout(() => setSuccessMessage(''), 3000);
    }, 500);
  };

  const handleCreateBackup = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/backup/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          frequency: settings.backup.backupFrequency
        })
      });
      const data = await response.json();
      if (data.success) {
        setSettings(prev => ({
          ...prev,
          backup: {
            ...prev.backup,
            lastBackup: new Date().toLocaleString()
          }
        }));
        setSuccessMessage('Backup created successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setSuccessMessage('Failed to create backup: ' + (data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error creating backup:', error);
      setSuccessMessage('Connection error: Make sure the backend server is running');
    } finally {
      setLoading(false);
    }
  };

  const handleSendTestNotification = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailNotifications: settings.notifications.emailNotifications,
          slackIntegration: settings.notifications.slackIntegration
        })
      });
      const data = await response.json();
      if (data.success) {
        setSuccessMessage('Test notification sent successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setSuccessMessage('Failed to send test notification: ' + (data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      setSuccessMessage('Connection error: Make sure the backend server is running');
    } finally {
      setLoading(false);
    }
  };

  const handleResetNotificationSettings = () => {
    if (window.confirm('Are you sure you want to reset all notification settings to defaults?')) {
      const defaultSettings = {
        emailNotifications: true,
        slackIntegration: false,
        auditLogAlerts: true,
        userActivityAlerts: true,
        securityAlerts: true
      };
      setSettings(prev => ({
        ...prev,
        notifications: defaultSettings
      }));
      setSuccessMessage('Notification settings reset to defaults');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  const handleConfigureEmail = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/notifications/configure-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailEnabled: settings.notifications.emailNotifications
        })
      });
      const data = await response.json();
      if (data.success) {
        setSuccessMessage('Email notification settings configured!');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setSuccessMessage('Failed to configure email: ' + (data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error configuring email:', error);
      setSuccessMessage('Connection error: Make sure the backend server is running');
    } finally {
      setLoading(false);
    }
  };

  const handleConfigureSlack = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/notifications/configure-slack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slackEnabled: settings.notifications.slackIntegration
        })
      });
      const data = await response.json();
      if (data.success) {
        setSuccessMessage('Slack notification settings configured!');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setSuccessMessage('Failed to configure Slack: ' + (data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error configuring Slack:', error);
      setSuccessMessage('Connection error: Make sure the backend server is running');
    } finally {
      setLoading(false);
    }
  };

  const hexToRgb = (hex) => {
    if (!hex) return null;
    const clean = hex.replace('#', '');
    if (clean.length !== 6) return null;
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    return `${r},${g},${b}`;
  };

  const applyDisplaySettings = (display) => {
    try {
      // Prefer applying the CSS variables to the admin container so only admin UI updates
      const adminRoot = document.querySelector('.admin-layout') || document.documentElement;
      if (display.primaryColor) adminRoot.style.setProperty('--admin-primary', display.primaryColor);
      if (display.accentColor) adminRoot.style.setProperty('--admin-accent', display.accentColor);
      const rgb = hexToRgb(display.primaryColor);
      if (rgb) adminRoot.style.setProperty('--admin-primary-rgb', rgb);
      // Broadcast an event so other components can react to the theme change
      try {
        const ev = new CustomEvent('theme-changed', { detail: { ...display } });
        window.dispatchEvent(ev);
      } catch (e) {
        try { window.themeChanged = display; } catch (_) { }
      }

      // Also apply equivalent vars for the Staff UI so admin changes affect Staff
      try {
        const staffRoot = document.documentElement;
        if (display.primaryColor) {
          // Apply to staff CSS variables used by Staff components
          staffRoot.style.setProperty('--admin-color-primary', display.primaryColor);
          // derive light/dark placeholders
          staffRoot.style.setProperty('--admin-color-light', display.accentColor || '#f3f4f6');
          staffRoot.style.setProperty('--admin-color-dark', display.primaryColor || '#111827');
          // persist for Staff loader
          try { localStorage.setItem('staffAdminColor', display.primaryColor); } catch (e) { }
          // also store full display settings for staff
          try { localStorage.setItem('staffDisplaySettings', JSON.stringify({ theme: display.themeName || 'light', sidebar: 'dark', adminColor: display.primaryColor })); } catch (e) { }
          // dispatch the same custom event Staff listens for
          try { window.dispatchEvent(new CustomEvent('adminColorChanged', { detail: { colorName: display.primaryColor, theme: { primary: display.primaryColor, light: display.accentColor || '#f3f4f6', dark: display.primaryColor } } })); } catch (e) { }
          // also apply to sidebar element if present
          try { const sidebar = document.querySelector('.sidebar'); if (sidebar) { sidebar.style.setProperty('--admin-color-primary', display.primaryColor); sidebar.style.setProperty('--admin-color-light', display.accentColor || '#f3f4f6'); sidebar.style.setProperty('--admin-color-dark', display.primaryColor || '#111827'); } } catch (e) { }
        }
      } catch (err) {
        // ignore staff apply errors
      }
    } catch (err) {
      console.warn('Failed to apply display settings:', err);
    }
  };


  if (loading) {
    return <div className="admin-layout"><p>Loading settings...</p></div>;
  }

  return (
    <div className="admin-main">
      <div className="admin-header">
        <div className="header-content">
          <h1>System Settings</h1>
          <p>Configure application and system preferences</p>
        </div>
        <button
          className="btn-add"
          onClick={handleSave}
          style={{ background: '#10b981' }}
        >
          💾 Save Changes
        </button>
      </div>

      {successMessage && (
        <div style={{
          background: '#d1fae5',
          color: '#065f46',
          padding: '12px 16px',
          borderRadius: '6px',
          marginBottom: '20px',
          fontSize: '13px'
        }}>
          ✓ {successMessage}
        </div>
      )}

      {/* Pending reset notification banner removed per request */}

      {/* Settings Tabs */}
      <div className="settings-tabs">
        {[
          { id: 'security', label: 'Security' },
          { id: 'password', label: 'Password' },
          { id: 'notifications', label: 'Notifications' },
          { id: 'display', label: 'Display' },
          { id: 'permissions', label: 'Permissions' },
          { id: 'api', label: 'API' },
          { id: 'backup', label: 'Backup' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); }}
            style={{
              padding: '12px 16px',
              border: 'none',
              background: activeTab === tab.id ? '#3b82f6' : 'transparent',
              color: activeTab === tab.id ? 'white' : '#6b7280',
              cursor: 'pointer',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '500',
              transition: 'all 0.2s ease'
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <span>{tab.label}</span>
            </span>
          </button>
        ))}
      </div>

      {/* Settings Content */}
      <div className="settings-content" style={{ position: 'relative' }}>
        {/* General Settings */}
        {activeTab === 'general' && (
          <div className="setting-section">
            <h3>General Settings</h3>
            <SettingRow label="Application Name" description="The name displayed throughout the system">
              <input
                type="text"
                value={settings.general.appName}
                onChange={(e) => handleSettingChange('general', 'appName', e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
              />
            </SettingRow>

            <DisplayOnlyRow
              label="Application Version"
              value={settings.general.appVersion}
            />

            <SettingRow label="Timezone" description="Set the default timezone for the system">
              <select
                value={settings.general.timezone}
                onChange={(e) => handleSettingChange('general', 'timezone', e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
              >
                <option>UTC</option>
                <option>EST</option>
                <option>CST</option>
                <option>MST</option>
                <option>PST</option>
              </select>
            </SettingRow>

            <SettingRow label="Date Format">
              <select
                value={settings.general.dateFormat}
                onChange={(e) => handleSettingChange('general', 'dateFormat', e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
              >
                <option>MM/DD/YYYY</option>
                <option>DD/MM/YYYY</option>
                <option>YYYY-MM-DD</option>
              </select>
            </SettingRow>

            <SettingRow label="Language">
              <select
                value={settings.general.language}
                onChange={(e) => handleSettingChange('general', 'language', e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
              >
                <option>English</option>
                <option>Spanish</option>
                <option>French</option>
                <option>German</option>
              </select>
            </SettingRow>
          </div>
        )}

        {/* Permissions Management */}
        {activeTab === 'permissions' && (
          <div className="setting-section">
            <h3>Permissions</h3>
            <SettingRow label="Add Permission" description="Create a new permission that can be assigned to roles">
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="Permission name (e.g., View Reports)"
                  value={newPermissionName}
                  onChange={(e) => setNewPermissionName(e.target.value)}
                  style={{ flex: 1, padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                />
                <select value={newPermissionRisk} onChange={(e) => setNewPermissionRisk(e.target.value)} style={{ padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6 }}>
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                  <option>Critical</option>
                </select>
                <button onClick={addPermissionToDB} disabled={addingPermission} style={{ padding: '8px 12px', background: addingPermission ? '#86efac' : '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: addingPermission ? 'not-allowed' : 'pointer' }}>{addingPermission ? 'Adding...' : 'Add'}</button>
              </div>
              <div style={{ marginTop: 8 }}>
                <input
                  type="text"
                  placeholder="Description (optional)"
                  value={newPermissionDesc}
                  onChange={(e) => setNewPermissionDesc(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                />
              </div>
            </SettingRow>

            <div style={{ marginTop: 10 }}>
              <strong style={{ fontSize: 14 }}>Existing Permissions</strong>
              <div style={{ marginTop: 8 }}>
                {permissionsList.length === 0 ? (
                  <div style={{ color: '#6b7280' }}>No permissions found.</div>
                ) : (
                  <div style={{ display: 'grid', gap: 8 }}>
                    {permissionsList.map(p => (
                      <div key={p.id || p.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', border: '1px solid #eef2ff', borderRadius: 8, background: '#fff' }}>
                        <div>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <div style={{ fontWeight: 700 }}>{p.name}</div>
                            {p.risk_level && (
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                                padding: '3px 10px',
                                borderRadius: 50,
                                fontSize: 12,
                                fontWeight: 700,
                                color: getRiskLevelColor(p.risk_level),
                                background: getRiskLevelColor(p.risk_level) + '1a',
                                border: `1.5px solid ${getRiskLevelColor(p.risk_level)}44`
                              }}>
                                <span style={{ width: 7, height: 7, borderRadius: '50%', background: getRiskLevelColor(p.risk_level), flexShrink: 0 }} />
                                {p.risk_level}
                              </span>
                            )}
                          </div>
                          {p.description && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{p.description}</div>}
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {/* Edit */}
                          <button
                            onClick={() => setEditPermission({ id: p.id, name: p.name, description: p.description || '', risk_level: p.risk_level || 'Low' })}
                            title="Edit permission"
                            style={{
                              background: '#eff6ff',
                              border: 'none', borderRadius: 6,
                              color: '#2563eb', cursor: 'pointer',
                              padding: '5px 8px', display: 'flex',
                              alignItems: 'center', justifyContent: 'center',
                              transition: 'background 0.18s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = '#dbeafe'}
                            onMouseLeave={e => e.currentTarget.style.background = '#eff6ff'}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          {/* Delete */}
                          <button
                            onClick={() => setConfirmDeletePermId(p.id)}
                            title="Delete permission"
                            style={{
                              background: '#fee2e2',
                              border: 'none', borderRadius: 6,
                              color: '#ef4444', cursor: 'pointer',
                              padding: '5px 8px', display: 'flex',
                              alignItems: 'center', justifyContent: 'center',
                              transition: 'background 0.18s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = '#fecaca'}
                            onMouseLeave={e => e.currentTarget.style.background = '#fee2e2'}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                              <path d="M10 11v6" />
                              <path d="M14 11v6" />
                              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Display Settings */}
        {activeTab === 'display' && (
          <div className="setting-section">
            <h3>Display Settings</h3>

            <SettingRow label="Primary Color" description="Main brand color used across the admin UI">
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <input
                  type="color"
                  value={settings.display.primaryColor}
                  onChange={(e) => handleSettingChange('display', 'primaryColor', e.target.value)}
                  style={{ width: '56px', height: '36px', padding: 0, border: 'none', background: 'transparent' }}
                />
                <input
                  type="text"
                  value={settings.display.primaryColor}
                  onChange={(e) => handleSettingChange('display', 'primaryColor', e.target.value)}
                  style={{ width: '160px', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                />
                <div style={{ width: '40px', height: '28px', borderRadius: '6px', background: settings.display.primaryColor, border: '1px solid #e5e7eb' }} />
              </div>
            </SettingRow>

            <SettingRow label="Accent Color" description="Accent color for highlights and badges">
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <input
                  type="color"
                  value={settings.display.accentColor}
                  onChange={(e) => handleSettingChange('display', 'accentColor', e.target.value)}
                  style={{ width: '56px', height: '36px', padding: 0, border: 'none', background: 'transparent' }}
                />
                <input
                  type="text"
                  value={settings.display.accentColor}
                  onChange={(e) => handleSettingChange('display', 'accentColor', e.target.value)}
                  style={{ width: '160px', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                />
                <div style={{ width: '40px', height: '28px', borderRadius: '6px', background: settings.display.accentColor, border: '1px solid #e5e7eb' }} />
              </div>
            </SettingRow>

            <SettingRow label="Use System Theme" description="Enable to automatically use system/app provided theme">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={settings.display.useSystemTheme}
                  onChange={(e) => handleSettingChange('display', 'useSystemTheme', e.target.checked)}
                />
                <span style={{ fontSize: '13px' }}>Allow the system to override custom display colors</span>
              </label>
            </SettingRow>

            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button onClick={() => applyDisplaySettings(settings.display)} style={{ padding: '8px 16px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                Apply Preview
              </button>
              <button onClick={handleSave} style={{ padding: '8px 16px', background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer' }}>
                Save Display Settings
              </button>
            </div>

            <div style={{ marginTop: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                placeholder="Theme name (optional)"
                value={newThemeName}
                onChange={(e) => setNewThemeName(e.target.value)}
                style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', width: '240px' }}
              />
              <button onClick={addThemeToDB} disabled={addingTheme} style={{ padding: '8px 12px', background: addingTheme ? '#86efac' : '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: addingTheme ? 'not-allowed' : 'pointer' }}>
                {addingTheme ? 'Adding...' : 'Add to Themes'}
              </button>
            </div>

            {/* Themes panel in the right corner - fetched from DB */}
            <div className="themes-panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <strong style={{ fontSize: 14 }}>Available Themes</strong>
                <button onClick={fetchThemes} style={{ fontSize: 12, padding: '4px 8px', borderRadius: 6, border: '1px solid #d1d5db', background: '#f9fafb', cursor: 'pointer' }}>Refresh</button>
              </div>
              <div className="themes-list">
                {themes.length === 0 && <div style={{ color: '#6b7280', fontSize: 13 }}>No themes found.</div>}
                {themes.map(t => (
                  <div key={t.id} className="theme-row">
                    <div className="theme-info">
                      <div className="theme-swatch" style={{ background: t.color_hex }} />
                      <div className="theme-name">{t.name}</div>
                    </div>
                    <div className="theme-actions">
                      <button onClick={() => {
                        // If theme metadata includes an accent color, use it; otherwise keep existing accent
                        const meta = t.metadata || {};
                        const metaAccent = meta.accentColor || meta.accent_color || null;
                        const newDisplay = {
                          ...settings.display,
                          primaryColor: t.color_hex,
                          accentColor: metaAccent || settings.display.accentColor,
                          themeName: t.name || settings.display.themeName
                        };
                        setSettings(prev => ({ ...prev, display: newDisplay }));
                        applyDisplaySettings(newDisplay);
                        try { localStorage.setItem('adminDisplay', JSON.stringify(newDisplay)); } catch (e) { }
                        setSuccessMessage('Theme applied');
                        setTimeout(() => setSuccessMessage(''), 1800);
                      }} style={{ padding: '6px 8px', fontSize: 12, borderRadius: 6, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer' }}>Apply</button>
                      <button onClick={() => deleteTheme(t.id)} disabled={deletingThemeId === t.id} style={{ padding: '6px 8px', fontSize: 12, borderRadius: 6, border: '1px solid #fca5a5', background: '#fff', cursor: deletingThemeId === t.id ? 'not-allowed' : 'pointer', color: '#b91c1c' }}>{deletingThemeId === t.id ? 'Deleting...' : 'Delete'}</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Security Settings */}
        {activeTab === 'security' && (
          <div className="setting-section">
            <h3>Security Settings</h3>
            <SettingRow label="Minimum Password Length" description="Minimum characters required for passwords">
              <input
                type="number"
                value={settings.security.passwordMinLength}
                onChange={(e) => handleSettingChange('security', 'passwordMinLength', parseInt(e.target.value))}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
              />
            </SettingRow>

            <SettingRow label="Password Expiry (Days)" description="Number of days before password expires">
              <input
                type="number"
                value={settings.security.passwordExpiry}
                onChange={(e) => handleSettingChange('security', 'passwordExpiry', parseInt(e.target.value))}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
              />
            </SettingRow>

            <SettingRow label="Two-Factor Authentication">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={settings.security.twoFactorAuth}
                  onChange={(e) => handleSettingChange('security', 'twoFactorAuth', e.target.checked)}
                />
                <span style={{ fontSize: '13px' }}>Enable 2FA for all users</span>
              </label>
            </SettingRow>

            <SettingRow label="Session Timeout (Minutes)" description="Automatically logout inactive users">
              <input
                type="number"
                value={settings.security.sessionTimeout}
                onChange={(e) => handleSettingChange('security', 'sessionTimeout', parseInt(e.target.value))}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
              />
            </SettingRow>

            <SettingRow label="Failed Login Attempts" description="Maximum failed attempts before lockout">
              <input
                type="number"
                value={settings.security.loginAttempts}
                onChange={(e) => handleSettingChange('security', 'loginAttempts', parseInt(e.target.value))}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
              />
            </SettingRow>

            {/* security actions */}
            <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #e5e7eb' }}>
              <h4 style={{ marginTop: 0, marginBottom: '16px', fontSize: '14px' }}>Security Utilities</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                <button
                  onClick={handleTestPasswordStrength}
                  style={{ padding: '8px 16px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}
                >
                  Test Password Strength
                </button>
                <button
                  onClick={handleForceLogout}
                  style={{ padding: '8px 16px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}
                >
                  Force Logout Users
                </button>
                <button
                  onClick={handleResetSecuritySettings}
                  style={{ padding: '8px 16px', background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}
                >
                  Reset to Defaults
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Password Change */}
        {activeTab === 'password' && (
          <div className="setting-section">
            <h3>Change Admin Password</h3>

            {fetchingAdminPassword && (
              <div style={{ padding: '12px', background: '#e0f2fe', color: '#0369a1', borderRadius: '6px', marginBottom: '16px', fontSize: '13px' }}>
                Loading admin password...
              </div>
            )}

            <SettingRow label="Current Password">
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input
                  type="password"
                  value={currentPassword}
                  readOnly
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', background: '#f3f4f6', cursor: 'default' }}
                />
                <button
                  onClick={fetchAdminPassword}
                  style={{ padding: '8px 12px', background: '#06b6d4', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '13px', fontWeight: 500 }}
                  disabled={fetchingAdminPassword}
                >
                  Refresh
                </button>
              </div>
              <p style={{ fontSize: '12px', color: '#6b7280', margin: '6px 0 0' }}>Current password is read-only for security</p>
            </SettingRow>

            <SettingRow label="New Password" description={`Minimum ${settings.security.passwordMinLength} characters`}>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                placeholder="Enter new password"
              />
            </SettingRow>

            <SettingRow label="Confirm New Password">
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                placeholder="Confirm new password"
              />
            </SettingRow>

            {passwordError && (
              <div style={{ color: '#b91c1c', marginBottom: 12, background: '#fee2e2', padding: '10px 12px', borderRadius: '6px', fontSize: '13px' }}>
                ⚠ {passwordError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button
                onClick={handleChangeAdminPassword}
                disabled={loading || fetchingAdminPassword}
                style={{ padding: '8px 16px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, fontWeight: 500 }}
              >
                {loading ? 'Changing...' : 'Change Password'}
              </button>
              <button
                onClick={() => {
                  setNewPassword('');
                  setConfirmPassword('');
                  setPasswordError('');
                  setCurrentPassword(adminPassword);
                }}
                style={{ padding: '8px 16px', background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}
              >
                Reset
              </button>
            </div>
          </div>
        )}


        {/* Notifications */}
        {activeTab === 'notifications' && (
          <div className="setting-section">
            <h3>Notification Settings</h3>
            <SettingRow label="Email Notifications">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={settings.notifications.emailNotifications}
                  onChange={(e) => handleSettingChange('notifications', 'emailNotifications', e.target.checked)}
                />
                <span style={{ fontSize: '13px' }}>Enable email notifications</span>
              </label>
            </SettingRow>

            <SettingRow label="Slack Integration">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={settings.notifications.slackIntegration}
                  onChange={(e) => handleSettingChange('notifications', 'slackIntegration', e.target.checked)}
                />
                <span style={{ fontSize: '13px' }}>Send alerts to Slack</span>
              </label>
            </SettingRow>

            <SettingRow label="Audit Log Alerts">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={settings.notifications.auditLogAlerts}
                  onChange={(e) => handleSettingChange('notifications', 'auditLogAlerts', e.target.checked)}
                />
                <span style={{ fontSize: '13px' }}>Alert on important audit events</span>
              </label>
            </SettingRow>

            <SettingRow label="User Activity Alerts">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={settings.notifications.userActivityAlerts}
                  onChange={(e) => handleSettingChange('notifications', 'userActivityAlerts', e.target.checked)}
                />
                <span style={{ fontSize: '13px' }}>Monitor user activity changes</span>
              </label>
            </SettingRow>

            <SettingRow label="Security Alerts">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={settings.notifications.securityAlerts}
                  onChange={(e) => handleSettingChange('notifications', 'securityAlerts', e.target.checked)}
                />
                <span style={{ fontSize: '13px' }}>Alert on security incidents</span>
              </label>
            </SettingRow>

            <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #e5e7eb' }}>
              <h4 style={{ marginTop: 0, marginBottom: '16px', fontSize: '14px' }}>Notification Actions</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                <button
                  onClick={handleSendTestNotification}
                  disabled={loading}
                  style={{ padding: '8px 16px', background: '#06b6d4', color: 'white', border: 'none', borderRadius: '6px', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, fontSize: '13px', fontWeight: 500 }}
                >
                  {loading ? 'Sending...' : 'Send Test Notification'}
                </button>
                <button
                  onClick={handleConfigureEmail}
                  disabled={loading}
                  style={{ padding: '8px 16px', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '6px', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, fontSize: '13px', fontWeight: 500 }}
                >
                  {loading ? 'Configuring...' : 'Configure Email'}
                </button>
                <button
                  onClick={handleConfigureSlack}
                  disabled={loading}
                  style={{ padding: '8px 16px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, fontSize: '13px', fontWeight: 500 }}
                >
                  {loading ? 'Configuring...' : 'Configure Slack'}
                </button>
                <button
                  onClick={handleResetNotificationSettings}
                  style={{ padding: '8px 16px', background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}
                >
                  Reset to Defaults
                </button>
              </div>
            </div>
          </div>
        )}

        {/* API Settings */}
        {activeTab === 'api' && (
          <div className="setting-section">
            <h3>API Settings</h3>
            <SettingRow label="API Endpoint" description="The base URL for API requests">
              <input
                type="text"
                value={settings.api.apiEndpoint}
                onChange={(e) => handleSettingChange('api', 'apiEndpoint', e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
              />
            </SettingRow>

            <SettingRow label="API Timeout (Seconds)" description="Maximum time to wait for API response">
              <input
                type="number"
                value={settings.api.apiTimeout}
                onChange={(e) => handleSettingChange('api', 'apiTimeout', parseInt(e.target.value))}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
              />
            </SettingRow>

            <SettingRow label="Rate Limit (Requests/Hour)" description="Maximum API requests allowed per hour">
              <input
                type="number"
                value={settings.api.rateLimit}
                onChange={(e) => handleSettingChange('api', 'rateLimit', parseInt(e.target.value))}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
              />
            </SettingRow>

            <SettingRow label="Log API Requests">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={settings.api.logRequests}
                  onChange={(e) => handleSettingChange('api', 'logRequests', e.target.checked)}
                />
                <span style={{ fontSize: '13px' }}>Log all API requests for debugging</span>
              </label>
            </SettingRow>
          </div>
        )}

        {/* Backup Settings */}
        {activeTab === 'backup' && (
          <div className="setting-section">
            <h3>Backup & Restore</h3>
            <SettingRow label="Auto Backup">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={settings.backup.autoBackup}
                  onChange={(e) => handleSettingChange('backup', 'autoBackup', e.target.checked)}
                />
                <span style={{ fontSize: '13px' }}>Enable automatic backups</span>
              </label>
            </SettingRow>

            <SettingRow label="Backup Frequency" description="How often to backup the database">
              <select
                value={settings.backup.backupFrequency}
                onChange={(e) => handleSettingChange('backup', 'backupFrequency', e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
              >
                <option>hourly</option>
                <option>daily</option>
                <option>weekly</option>
                <option>monthly</option>
              </select>
            </SettingRow>

            <SettingRow label="Backup Retention (Days)" description="Number of days to keep backups">
              <input
                type="number"
                value={settings.backup.retentionDays}
                onChange={(e) => handleSettingChange('backup', 'retentionDays', parseInt(e.target.value))}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
              />
            </SettingRow>

            <DisplayOnlyRow
              label="Last Backup"
              description="The timestamp of the most recent backup"
              value={settings.backup.lastBackup}
            />

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button
                onClick={handleCreateBackup}
                disabled={loading}
                style={{ padding: '8px 16px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}
              >
                {loading ? 'Creating...' : 'Create Backup Now'}
              </button>
              <button style={{ padding: '8px 16px', background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer' }}>
                Restore Backup
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .settings-tabs {
          display: flex;
          gap: 8px;
          margin: 20px 0;
          padding: 12px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          overflow-x: auto;
        }

        .settings-content {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 24px;
          margin-top: 20px;
        }

        .setting-section h3 {
          margin: 0 0 24px;
          font-size: 16px;
          font-weight: 600;
          color: #1f2937;
        }
        /* Themes panel styles */
        .themes-panel {
          position: absolute;
          top: 16px;
          right: 16px;
          width: min(320px, 28%);
          max-width: 320px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          background: white;
          padding: 12px;
          box-shadow: 0 8px 20px rgba(0,0,0,0.06);
          z-index: 30;
       
        }

        .themes-panel .themes-list { max-height: 260px; overflow-y: auto; display: grid; gap: 8px; }
        .themes-panel .theme-row { display:flex; align-items:center; justify-content:space-between; gap:8px; padding:6px 4px; }
        .themes-panel .theme-info { display:flex; align-items:center; gap:8px; }
        .themes-panel .theme-swatch { width:28px; height:20px; border-radius:4px; border:1px solid #e5e7eb; flex-shrink:0 }
        .themes-panel .theme-name { font-size:13px; color:#111827 }
        .themes-panel .theme-actions button { padding:6px 8px; font-size:12px; border-radius:6px; border:1px solid #d1d5db; background:#fff; cursor:pointer }

        @media (max-width: 1000px) {
          .themes-panel { display: none; }
        }
      `}</style>

      {/* ── Edit Permission Modal ── */}
      {editPermission && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(15,23,42,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 2000, backdropFilter: 'blur(2px)'
        }} onClick={() => setEditPermission(null)}>
          <div style={{
            background: '#fff', borderRadius: 14,
            boxShadow: '0 8px 32px rgba(37,99,235,0.15)',
            padding: '28px 28px 22px',
            width: 380, maxWidth: '92vw'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </div>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#1a2340' }}>Edit Permission</div>
            </div>

            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 5 }}>Name</label>
            <input
              value={editPermission.name}
              onChange={e => setEditPermission(prev => ({ ...prev, name: e.target.value }))}
              style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', border: '1.5px solid #e5e7eb', borderRadius: 7, fontSize: 14, marginBottom: 14, fontFamily: 'inherit', outline: 'none' }}
              onFocus={e => e.target.style.borderColor = '#2563eb'}
              onBlur={e => e.target.style.borderColor = '#e5e7eb'}
            />

            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 5 }}>Description</label>
            <textarea
              value={editPermission.description}
              onChange={e => setEditPermission(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', border: '1.5px solid #e5e7eb', borderRadius: 7, fontSize: 14, marginBottom: 14, fontFamily: 'inherit', resize: 'vertical', outline: 'none' }}
              onFocus={e => e.target.style.borderColor = '#2563eb'}
              onBlur={e => e.target.style.borderColor = '#e5e7eb'}
            />

            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 5 }}>Risk Level</label>
            <select
              value={editPermission.risk_level}
              onChange={e => setEditPermission(prev => ({ ...prev, risk_level: e.target.value }))}
              style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #e5e7eb', borderRadius: 7, fontSize: 14, marginBottom: 22, fontFamily: 'inherit', outline: 'none' }}
            >
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
              <option>Critical</option>
            </select>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                onClick={() => setEditPermission(null)}
                style={{ padding: '7px 16px', borderRadius: 7, border: '1.5px solid #e5e7eb', background: '#f9fafb', color: '#374151', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}
              >Cancel</button>
              <button
                onClick={updatePermissionInDB}
                style={{ padding: '7px 16px', borderRadius: 7, border: 'none', background: '#2563eb', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}
              >Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Permission Confirmation Modal ── */}
      {confirmDeletePermId !== null && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(15,23,42,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 2000, backdropFilter: 'blur(2px)'
        }}>
          <div style={{
            background: '#fff', borderRadius: 14,
            boxShadow: '0 8px 32px rgba(37,99,235,0.15)',
            padding: '28px 28px 22px',
            width: 340, maxWidth: '90vw'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  <path d="M10 11v6" /><path d="M14 11v6" />
                  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                </svg>
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#1a2340' }}>Delete Permission</div>
                <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>This action cannot be undone.</div>
              </div>
            </div>
            <p style={{ fontSize: 13, color: '#4b5563', margin: '0 0 20px' }}>
              Are you sure you want to delete this permission?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                onClick={() => setConfirmDeletePermId(null)}
                style={{ padding: '7px 16px', borderRadius: 7, border: '1.5px solid #e5e7eb', background: '#f9fafb', color: '#374151', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}
              >Cancel</button>
              <button
                onClick={() => deletePermissionFromDB(confirmDeletePermId)}
                style={{ padding: '7px 16px', borderRadius: 7, border: 'none', background: '#ef4444', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}
              >Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Password Strength Test Modal */}
      {showStrengthModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 70 }}>
          <div style={{ width: '450px', background: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#1f2937' }}>Test Password Strength</h3>
              <button
                onClick={() => setShowStrengthModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#6b7280', padding: 0 }}
              >
                ×
              </button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>Enter password to test:</label>
              <input
                type="password"
                placeholder="Type a password..."
                value={strengthTestInput}
                onChange={(e) => {
                  setStrengthTestInput(e.target.value);
                  evaluatePasswordStrength(e.target.value);
                }}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>

            {strengthScore !== null && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      style={{
                        flex: 1,
                        height: '6px',
                        background: i <= strengthScore ? (
                          strengthScore <= 1 ? '#ef4444' : strengthScore <= 2 ? '#f97316' : strengthScore <= 3 ? '#eab308' : '#84cc16'
                        ) : '#e5e7eb',
                        borderRadius: '2px',
                        transition: 'background 0.2s'
                      }}
                    />
                  ))}
                </div>
                <p style={{ margin: 0, fontSize: '13px', color: '#6b7280', lineHeight: 1.5 }}>
                  {strengthMessage}
                </p>
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowStrengthModal(false)}
                style={{ padding: '8px 16px', background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
