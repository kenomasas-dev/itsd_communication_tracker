import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminLogin.css';
import '../User/Login.css';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [toast, setToast] = useState({ message: '', type: '' });
  const emailRef = useRef(null);
  const passwordRef = useRef(null);

  useEffect(() => {
    // Disable scrolling when component mounts
    document.body.style.overflow = 'hidden';

    // Clear any browser autofill values (ensure inputs render blank)
    const clearAutofill = () => {
      // Clear React state
      setEmail('');
      setPassword('');

      // Also clear DOM values in case browser injected them
      setTimeout(() => {
        if (emailRef.current) emailRef.current.value = '';
        if (passwordRef.current) passwordRef.current.value = '';
      }, 50);
    };

    clearAutofill();

    return () => {
      // Re-enable scrolling when component unmounts
      document.body.style.overflow = 'auto';
    };
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: '' }), 3000);
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
      const response = await fetch('/api/admin-auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (data.success) {
        // Check if user is active
        if (!data.user.is_active) {
          setError('Your account has been deactivated. Please contact the administrator.');
          setLoading(false);
          return;
        }

        // Check if user is admin
        if (data.user.role !== 'Admin') {
          setError('You do not have admin privileges.');
          setLoading(false);
          return;
        }

        // Store user info
        localStorage.setItem('adminUser', JSON.stringify(data.user));
        if (rememberMe) {
          localStorage.setItem('rememberEmail', email);
        }

        // show success toast
        showToast('Admin login successful — redirecting...', 'success');

        // Record login in audit logs (include admin username when available)
        try {
          const adminName = (data.user && data.user.name) ? data.user.name : email;
          const role = data.user?.role || 'Admin';
          await fetch('/api/auth/record-audit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'LOGIN',
              user_email: adminName,
              user_role: role,
              description: `Admin user ${adminName} (${email}) logged in from browser`
            })
          });
        } catch (err) {
          console.warn('Audit log failed:', err);
        }

        // Redirect to admin dashboard
        setTimeout(() => {
          navigate('/admin');
        }, 600);
      } else {
        setError(data.message || 'Invalid email or password');
      }
    } catch (err) {
      setError('Connection error. Make sure the backend server is running on port 5000');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="user-login-container">
      {toast.message && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: toast.type === 'success' ? '#10b981' : '#ef4444',
          color: 'white',
          padding: '12px 16px',
          borderRadius: '8px',
          boxShadow: '0 6px 18px rgba(0,0,0,0.12)',
          zIndex: 9999,
          fontWeight: 600
        }}>{toast.message}</div>
      )}

      <form className="user-login-box" onSubmit={handleSubmit} autoComplete="off">
        <div style={{textAlign: 'center', width: '100%', marginBottom: 8}}>
          <h2 style={{margin: 0}}>Admin Portal</h2>
          <p style={{margin: '6px 0 0 0'}}>Sign in to your admin account</p>
        </div>

        {error && <div className="error">{error}</div>}

        <label>Email</label>
        <input
          ref={emailRef}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
        />

        <label>Password</label>
        <input
          ref={passwordRef}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
        />

        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <label style={{display:'flex',alignItems:'center',gap:8}}>
            <input type="checkbox" checked={rememberMe} onChange={() => setRememberMe(!rememberMe)} /> Remember me
          </label>
        
        </div>

        <button type="submit" className="login-btn" disabled={loading}>{loading ? 'Signing in...' : 'Sign In'}</button>
      </form>
    </div>
  );
}
