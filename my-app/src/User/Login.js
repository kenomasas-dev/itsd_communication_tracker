import React, { useState } from 'react';
import './Login.css';
import { useNavigate } from 'react-router-dom';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Helper to record audit logs
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
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (data.success) {
        // allow only role 'User' (case-insensitive) and ensure account is active
        const role = data.user && data.user.role ? data.user.role.toString().toLowerCase() : '';
        if (role !== 'user') {
          // record blocked login attempt
          const blockedName = data.user?.name || email;
          await recordAuditLog(blockedName, 'LOGIN_BLOCKED', `Non-user ${blockedName} (${email}) tried to sign in using the user login`, data.user?.role || null);
          setError('User Credentials are invalid.');
        } else if (data.user.is_active === false) {
          // record blocked login for deactivated account
          const userName = data.user?.name || email;
          await recordAuditLog(userName, 'LOGIN_BLOCKED', `Deactivated user account ${userName} (${email}) attempted to sign in`, 'User');
          setError('This account has been deactivated. Please contact administrator.');
        } else {
          localStorage.setItem('user', JSON.stringify(data.user));
          // record successful login with user's name and role
          const userName = data.user?.name || email;
          await recordAuditLog(userName, 'LOGIN', `User ${userName} (${email}) logged in from browser (host: ${window.location.hostname})`, 'User');
          navigate('/user');
        }
      } else {
        // record failed login attempt
        await recordAuditLog(email, 'LOGIN_FAILED', `Failed login attempt for ${email} - ${data.message || 'Invalid credentials'}`);
        setError(data.message || 'Invalid credentials');
      }
    } catch (err) {
      console.error(err);
      setError('Unable to connect to server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="user-login-container">
      <form className="user-login-box" onSubmit={handleSubmit}>
        <h2>ITSD Online Communication Tracker</h2>
        <p>Sign in to your user account</p>
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

export default Login;
