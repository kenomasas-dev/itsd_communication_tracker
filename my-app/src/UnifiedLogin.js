import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './User/Login.css';

export default function UnifiedLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const recordAuditLog = async (userEmail, action, description, userRole = null) => {
    try {
      const payload = { action, user_email: userEmail, user_role: userRole, description };
      await fetch('/api/auth/record-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (err) {
      console.warn('Failed to record audit log:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Please fill in both fields');
      return;
    }

    setLoading(true);

    try {
      const attemptLogin = async (url, payload) => {
        try {
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          return await res.json();
        } catch (err) {
          return { success: false, message: 'Unable to connect to server' };
        }
      };

      // First try the shared auth endpoint (preferred)
      let data = await attemptLogin('/api/auth/login', { email, password });

      // If shared auth fails and we got no role, attempt admin login endpoint as a fallback
      if (!data.success && data.message && data.message.toLowerCase().includes('admin') === false) {
        // avoid unnecessary second call if we already got a reason like invalid credentials
        const adminAttempt = await attemptLogin('/api/admin-auth/admin-login', { email, password });
        if (adminAttempt.success) {
          data = adminAttempt;
        }
      }

      if (!data.success) {
        setError(data.message || 'Invalid credentials');
        await recordAuditLog(email, 'LOGIN_FAILED', `Failed login attempt for ${email} - ${data.message || 'Invalid credentials'}`);
        setLoading(false);
        return;
      }

      const user = data.user || {};
      const role = (user.role || '').toString().toLowerCase();

      // Ensure active accounts
      if (user.is_active === false) {
        setError('This account has been deactivated. Please contact the administrator.');
        await recordAuditLog(user.name || email, 'LOGIN_BLOCKED', `Attempt to log in with deactivated account ${email}`, role || null);
        setLoading(false);
        return;
      }

      // Determine destination and localStorage key based on role
      let destination = '/';
      let storageKey = 'staffUser';
      let roleLabel = 'Staff';

      if (role === 'admin' || role === 'administrator') {
        destination = '/admin';
        storageKey = 'adminUser';
        roleLabel = 'Admin';
      } else if (role === 'user') {
        destination = '/User';
        storageKey = 'user';
        roleLabel = 'User';
      } else {
        // default to staff if unrecognized
        destination = '/';
        storageKey = 'staffUser';
        roleLabel = 'Staff';
      }

      localStorage.setItem(storageKey, JSON.stringify(user));

      // Record successful login
      await recordAuditLog(user.name || email, 'LOGIN', `${roleLabel} ${user.name || email} (${email}) logged in from browser (host: ${window.location.hostname})`, roleLabel);

      setLoading(false);
      navigate(destination);
    } catch (err) {
      setError('Connection error. Make sure the backend server is running on port 5001');
      console.error('Login error:', err);
      setLoading(false);
    }
  };

  return (
    <div className="user-login-container">
      <form className="user-login-box" onSubmit={handleSubmit}>
        <h2>ITSD Online Communication Tracker</h2>
        <p>Sign in to your account</p>
        {error && <div className="error">{error}</div>}
        <label>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} />
        <label>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} />
        <button type="submit" className="login-btn" disabled={loading}>{loading ? 'Signing in...' : 'Sign In'}</button>
      </form>
    </div>
  );
}
