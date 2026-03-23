import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';

function Login({ onLoginSuccess }) {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!username || !password) {
            setError('Please fill in all fields');
            return;
        }

        setLoading(true);

        try {
            // Authenticate against database adminlogin table
            const response = await fetch('/api/admin-auth/admin-login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: username, // Using email as username
                    password: password
                })
            });

            const data = await response.json();

            if (data.success) {
                // Store user data in localStorage
                localStorage.setItem('headUser', JSON.stringify(data.user));
                setSuccess('Login successful — redirecting...');

                setTimeout(() => {
                    if (onLoginSuccess) {
                        onLoginSuccess();
                    } else {
                        navigate('/head');
                    }
                }, 800);
            } else {
                setError(data.message || 'Invalid credentials');
            }
        } catch (error) {
            console.error('Login error:', error);
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container head-theme">
            <div className="login-box">
                <div className="login-header">
                    <h1>ITSD Admin Portal</h1>
                    <p>Sign in to your admin account</p>
                </div>

                {success && <div className="success-message toast">{success}</div>}

                <form onSubmit={handleSubmit} className="login-form">
                    {error && <div className="error-message">{error}</div>}

                    <div className="form-group" style={{ marginTop: '16px' }}>
                        <label htmlFor="username">Email</label>
                        <input
                            type="email"
                            id="username"
                            placeholder="Enter your admin email"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            disabled={loading}
                        />
                    </div>

                    <div className="form-group" style={{ marginTop: '16px', marginBottom: '16px' }}>
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

                    <button type="submit" className="login-btn" disabled={loading}>
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default Login;
