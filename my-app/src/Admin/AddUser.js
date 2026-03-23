import React, { useState } from 'react';
import './Admin.css';
import './AddUser.css';

export default function AddUser() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    department: '',
    role: 'user',
    password: '',
    confirmPassword: ''
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [focusedField, setFocusedField] = useState(null);

  const departments = [''];
  const roles = [
    { value: 'user', label: 'User', icon: '👤', description: 'Regular user' },
    { value: 'moderator', label: 'Moderator', icon: '⚙️', description: 'Can manage content' },
    { value: 'admin', label: 'Administrator', icon: '🔐', description: 'Full system access' }
  ];

  const validateForm = () => {
    const newErrors = {};

    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Invalid email format';
    if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
    if (!formData.department) newErrors.department = 'Department is required';
    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 8) newErrors.password = 'Password must be at least 8 characters';
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      // Build payload with combined `name` field expected by the backend
      const payload = {
        name: `${formData.firstName.trim()} ${formData.lastName.trim()}`.trim(),
        email: formData.email,
        password: formData.password,
        role: formData.role,
        department: formData.department,
        phone: formData.phone,
        notes: formData.notes || null,
        permissions: []
      };

      const response = await fetch('/api/auth/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.success) {
        setSuccessMessage('User created successfully!');
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          department: '',
          role: 'user',
          password: '',
          confirmPassword: ''
        });
        setTimeout(() => {
          setSuccessMessage('');
        }, 4000);
      } else {
        setErrors({ submit: data.message || 'Failed to create user' });
      }
    } catch (err) {
      setErrors({ submit: 'Connection error. Please try again.' });
      console.error('Error creating user:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      department: '',
      role: 'user',
      password: '',
      confirmPassword: ''
    });
    setErrors({});
    setFocusedField(null);
  };

  return (
    <div className="admin-layout">
      <div className="admin-main">
        <div className="admin-header gradient-header">
          <div className="header-content">
            <div className="header-icon">👥</div>
            <div>
              <h1>Add New User</h1>
              <p>Create and set up a new user account in the system</p>
            </div>
          </div>
        </div>

        <div className="add-user-container">
          <div className="form-wrapper">
            <div className="form-card modern-card">
              {successMessage && (
                <div className="success-banner animated-success">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>{successMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="add-user-form modern-form">
                {errors.submit && (
                  <div className="error-banner animated-error">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span>{errors.submit}</span>
                  </div>
                )}

                {/* Personal Information Section */}
                <div className="form-section modern-section">
                  <div className="section-header">
                    <h3 className="section-title">👤 Personal Information</h3>
                    <p className="section-subtitle">Basic details about the user</p>
                  </div>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="firstName">First Name *</label>
                      <div className="input-wrapper">
                        <input
                          type="text"
                          id="firstName"
                          name="firstName"
                          placeholder="John"
                          value={formData.firstName}
                          onChange={handleInputChange}
                          onFocus={() => setFocusedField('firstName')}
                          onBlur={() => setFocusedField(null)}
                          disabled={loading}
                          className={`modern-input ${errors.firstName ? 'error' : ''} ${focusedField === 'firstName' ? 'focused' : ''}`}
                        />
                      </div>
                      {errors.firstName && <span className="error-text">{errors.firstName}</span>}
                    </div>

                    <div className="form-group">
                      <label htmlFor="lastName">Last Name *</label>
                      <div className="input-wrapper">
                        <input
                          type="text"
                          id="lastName"
                          name="lastName"
                          placeholder="Doe"
                          value={formData.lastName}
                          onChange={handleInputChange}
                          onFocus={() => setFocusedField('lastName')}
                          onBlur={() => setFocusedField(null)}
                          disabled={loading}
                          className={`modern-input ${errors.lastName ? 'error' : ''} ${focusedField === 'lastName' ? 'focused' : ''}`}
                        />
                      </div>
                      {errors.lastName && <span className="error-text">{errors.lastName}</span>}
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group full-width">
                      <label htmlFor="email">Email Address *</label>
                      <div className="input-wrapper">
                        <span className="input-icon">📧</span>
                        <input
                          type="email"
                          id="email"
                          name="email"
                          placeholder="john.doe@company.com"
                          value={formData.email}
                          onChange={handleInputChange}
                          onFocus={() => setFocusedField('email')}
                          onBlur={() => setFocusedField(null)}
                          disabled={loading}
                          className={`modern-input with-icon ${errors.email ? 'error' : ''} ${focusedField === 'email' ? 'focused' : ''}`}
                        />
                      </div>
                      {errors.email && <span className="error-text">{errors.email}</span>}
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="phone">Phone Number *</label>
                      <div className="input-wrapper">
                        <span className="input-icon">📱</span>
                        <input
                          type="tel"
                          id="phone"
                          name="phone"
                          placeholder="+1 (555) 000-0000"
                          value={formData.phone}
                          onChange={handleInputChange}
                          onFocus={() => setFocusedField('phone')}
                          onBlur={() => setFocusedField(null)}
                          disabled={loading}
                          className={`modern-input with-icon ${errors.phone ? 'error' : ''} ${focusedField === 'phone' ? 'focused' : ''}`}
                        />
                      </div>
                      {errors.phone && <span className="error-text">{errors.phone}</span>}
                    </div>

                    <div className="form-group">
                      <label htmlFor="department">Department *</label>
                      <div className="input-wrapper">
                        <span className="input-icon">🏢</span>
                        <select
                          id="department"
                          name="department"
                          value={formData.department}
                          onChange={handleInputChange}
                          onFocus={() => setFocusedField('department')}
                          onBlur={() => setFocusedField(null)}
                          disabled={loading}
                          className={`modern-select with-icon ${errors.department ? 'error' : ''} ${focusedField === 'department' ? 'focused' : ''}`}
                        >
                          <option value="">Select Department</option>
                          {departments.map(dept => (
                            <option key={dept} value={dept}>{dept}</option>
                          ))}
                        </select>
                      </div>
                      {errors.department && <span className="error-text">{errors.department}</span>}
                    </div>
                  </div>
                </div>

                {/* Account Information Section */}
                <div className="form-section modern-section">
                  <div className="section-header">
                    <h3 className="section-title">🔑 Account Information</h3>
                    <p className="section-subtitle">Role and access permissions</p>
                  </div>

                  <div className="role-selector">
                    {roles.map(roleOption => (
                      <label key={roleOption.value} className={`role-card ${formData.role === roleOption.value ? 'selected' : ''}`}>
                        <input
                          type="radio"
                          name="role"
                          value={roleOption.value}
                          checked={formData.role === roleOption.value}
                          onChange={handleInputChange}
                          disabled={loading}
                          className="hidden-input"
                        />
                        <div className="role-card-content">
                          <span className="role-icon">{roleOption.icon}</span>
                          <div className="role-info">
                            <strong>{roleOption.label}</strong>
                            <small>{roleOption.description}</small>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Security Section */}
                <div className="form-section modern-section">
                  <div className="section-header">
                    <h3 className="section-title">🔐 Security</h3>
                    <p className="section-subtitle">Set up authentication credentials</p>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="password">Password *</label>
                      <div className="input-wrapper">
                        <span className="input-icon">🔒</span>
                        <input
                          type="password"
                          id="password"
                          name="password"
                          placeholder="Min 8 characters"
                          value={formData.password}
                          onChange={handleInputChange}
                          onFocus={() => setFocusedField('password')}
                          onBlur={() => setFocusedField(null)}
                          disabled={loading}
                          className={`modern-input with-icon ${errors.password ? 'error' : ''} ${focusedField === 'password' ? 'focused' : ''}`}
                        />
                      </div>
                      {errors.password && <span className="error-text">{errors.password}</span>}
                    </div>

                    <div className="form-group">
                      <label htmlFor="confirmPassword">Confirm Password *</label>
                      <div className="input-wrapper">
                        <span className="input-icon">🔒</span>
                        <input
                          type="password"
                          id="confirmPassword"
                          name="confirmPassword"
                          placeholder="Confirm password"
                          value={formData.confirmPassword}
                          onChange={handleInputChange}
                          onFocus={() => setFocusedField('confirmPassword')}
                          onBlur={() => setFocusedField(null)}
                          disabled={loading}
                          className={`modern-input with-icon ${errors.confirmPassword ? 'error' : ''} ${focusedField === 'confirmPassword' ? 'focused' : ''}`}
                        />
                      </div>
                      {errors.confirmPassword && <span className="error-text">{errors.confirmPassword}</span>}
                    </div>
                  </div>
                </div>

                {/* Form Actions */}
                <div className="form-actions modern-actions">
                  <button 
                    type="button" 
                    className="btn-secondary modern-btn" 
                    onClick={handleReset}
                    disabled={loading}
                  >
                    <span>↺</span> Reset
                  </button>
                  <button 
                    type="submit" 
                    className="btn-primary modern-btn" 
                    disabled={loading}
                  >
                    <span>✓</span> {loading ? 'Creating User...' : 'Create User'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
