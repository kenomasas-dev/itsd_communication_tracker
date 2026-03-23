import React, { useState } from 'react';
import './Login.css';

function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMessage, setForgotMessage] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  // Function to record audit log when user logs in
  const recordAuditLog = async (userEmail, action, description, userRole = null) => {
    try {
      const auditData = {
        action: action,
        user_email: userEmail,
        user_role: userRole,
        description: description
      };

      console.log('Recording audit log:', auditData);

      const response = await fetch('/api/auth/record-audit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(auditData)
      });

      const result = await response.json();
      if (result.success) {
        console.log('Audit log recorded successfully:', result.auditLog);
      } else {
        console.warn('Audit log failed:', result.message);
      }
    } catch (err) {
      console.error('Error recording audit log:', err);
      // Don't throw error - audit logging shouldn't block login
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
     
    try {
      // Call backend API to authenticate against database
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (data.success) {
        // Only allow accounts with role 'staff' to sign in via the staff portal
        if (!(data.user && data.user.role && data.user.role.toString().toLowerCase() === 'staff')) {
          // Record blocked attempt for non-staff (includes Admin and User roles)
          const blockedUserName = data.user?.name || email;
          await recordAuditLog(
            blockedUserName,
            'LOGIN_BLOCKED',
            `Non-staff user ${blockedUserName} (${email}) tried to sign in using the staff login; redirected appropriately`,
            data.user?.role || null
          );
          setError('Staff Credentials are invalid.');
          setLoading(false);
          return;
        }
        // Store user info (optional)
        localStorage.setItem('staffUser', JSON.stringify(data.user));
        
        // Record successful login in audit logs (include user's name and role)
        const staffName = data.user?.name || email;
        await recordAuditLog(
          staffName,
          'LOGIN',
          `Staff ${staffName} (${email}) logged in from browser (host: ${window.location.hostname})`,
          data.user?.role || 'Staff'
        );
        
        setSuccess('Login successful — redirecting...');
        // brief delay so user sees success message
        setTimeout(() => {
          onLoginSuccess?.();
        }, 800);
      } else {
        // Record failed login attempt in audit logs
        await recordAuditLog(
          email,
          'LOGIN_FAILED',
          `Failed login attempt for ${email} - Invalid credentials`,
          null
        );
        setError(data.message || 'Invalid email or password');
      }
    } catch (err) {
      setError('Connection error. Make sure the backend server is running on port 5000');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendReset = async () => {
    if (forgotLoading) return;
    setForgotError('');
    setForgotMessage('');
    setForgotLoading(true);
    const emailToSend = (forgotEmail || email || '').trim();
    if (!emailToSend) { setForgotLoading(false); return setForgotError('Please enter your email address'); }
    try {
      // Ensure the email belongs to a Staff account before allowing a reset request
      try {
        const usersRes = await fetch('/api/auth/users');
        if (usersRes && usersRes.ok) {
          const usersBody = await usersRes.json();
          let users = [];
          if (Array.isArray(usersBody)) users = usersBody;
          else if (usersBody && usersBody.success && Array.isArray(usersBody.data)) users = usersBody.data;

          const found = (users || []).find(u => {
            const e = (u.email || u.user_email || u.username || '').toString().toLowerCase();
            return e === emailToSend.toString().toLowerCase();
          });

          if (!found || !(found.role || found.user_role || '').toString().toLowerCase().includes('staff')) {
            // Do not proceed with non-staff requests. Show neutral message to avoid account enumeration.
            setForgotMessage('Only staff accounts may request password resets via this form. If you are staff, please confirm your email and try again.');
            setTimeout(() => setShowForgotModal(false), 2000);
            setForgotLoading(false);
            return;
          }
        }
      } catch (e) {
        // If the users lookup fails, fall back to previous flow so staff aren't blocked by service issues
        console.warn('User lookup failed, continuing with reset flow', e);
      }

      // Prevent more than one request per email per 24 hours by checking audit logs
      try {
        const logsRes = await fetch('/api/auth/audit-logs');
        if (logsRes && logsRes.ok) {
          const logsBody = await logsRes.json();
          let rows = [];
          if (Array.isArray(logsBody)) rows = logsBody;
          else if (logsBody && logsBody.success && Array.isArray(logsBody.data)) rows = logsBody.data;

          const now = Date.now();
          const oneDay = 24 * 60 * 60 * 1000;
          const recent = (rows || []).some(r => {
            const action = (r.action || r.type || '').toString().toUpperCase();
            const emailField = (r.user_email || r.email || (r.meta && r.meta.email) || '').toString().toLowerCase();
            if (action !== 'REQUEST_ADMIN_RESET') return false;
            if (!emailField) return false;
            if (emailField !== emailToSend.toLowerCase()) return false;
            const ts = Date.parse(r.created_at || r.timestamp || r.time || r.date || r.logged_at || '');
            if (!ts || Number.isNaN(ts)) return false;
            return (now - ts) < oneDay;
          });

          if (recent) {
            setForgotMessage('A reset request for this email was already sent within the last 24 hours. Administrators will follow up if needed.');
            // still record an audit entry to note attempted duplicate (optional)
            try { await recordAuditLog(emailToSend, 'REQUEST_ADMIN_RESET_BLOCKED', 'Duplicate reset request blocked by frontend (24h limit)'); } catch (e) {}
            // close modal after brief pause
            setTimeout(() => setShowForgotModal(false), 2000);
            setForgotLoading(false);
            return;
          }
        }
      } catch (e) {
        // if audit-log check fails, fall back to allowing request so users aren't locked out by monitoring failures
        console.warn('Audit log check failed, allowing request', e);
      }
      // Primary attempt: notify backend to create an admin reset request (if supported)
      const res = await fetch('/api/auth/request-admin-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailToSend, source: 'staff-login' })
      }).catch(() => null);

      // Always record an audit entry so admins see the request in audit logs
      try {
        await recordAuditLog(emailToSend, 'REQUEST_ADMIN_RESET', 'User requested admin password reset via staff login');
      } catch (e) { /* ignore */ }

      // Show neutral confirmation to avoid leaking account existence
      setForgotMessage('A request has been sent to administrators. They will follow up if needed.');

      // Close modal after a short delay
      setTimeout(() => setShowForgotModal(false), 2000);
    } catch (err) {
      console.error('Request admin reset error', err);
      setForgotError('Unable to reach server. Try again later.');
    }
    finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <h1>ITSD Online Communication Tracker</h1>
          <p>Sign in to your staff account</p>
        </div>

        {success && <div className="success-message toast">{success}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>
          <div style={{ textAlign: 'right', marginTop: 8 }}>
            <button type="button" onClick={() => { setForgotEmail(email); setShowForgotModal(true); setForgotMessage(''); setForgotError(''); }} style={{ background: 'transparent', border: 'none', color: '#0b3a66', fontWeight: 600, cursor: 'pointer' }}>Forgot password?</button>
          </div>
          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
      {/* Forgot password modal */}
      {showForgotModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
          <div style={{ width: 360, background: '#fff', padding: 18, borderRadius: 8 }}>
            <h3 style={{ margin: 0, marginBottom: 8 }}>Forgot Password</h3>
            <p style={{ margin: 0, marginBottom: 12, color: '#6b7280', fontSize: 13 }}>Enter your email and we'll send password reset instructions.</p>
            <div style={{ marginTop: 8 }}>
              <input type="email" placeholder="Email address" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid #dfe7ee', borderRadius: 6 }} />
            </div>
            {forgotError && <div style={{ color: '#b91c1c', marginTop: 8 }}>{forgotError}</div>}
            {forgotMessage && <div style={{ color: '#065f46', marginTop: 8 }}>{forgotMessage}</div>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
              <button onClick={() => setShowForgotModal(false)} style={{ padding: '8px 12px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 6 }}>Close</button>
              <button onClick={handleSendReset} disabled={forgotLoading} style={{ padding: '8px 12px', background: forgotLoading ? '#94a3b8' : '#0b3a66', color: '#fff', border: 'none', borderRadius: 6, cursor: forgotLoading ? 'not-allowed' : 'pointer' }}>{forgotLoading ? 'Sending...' : 'Send'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Login;
