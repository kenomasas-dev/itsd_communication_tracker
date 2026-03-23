import React, { useState, useEffect } from 'react';
import './Settings.css';
import { applyAdminColorTheme, loadAndApplyAdminColor } from './themeColors';
import { EyeOpenIcon, EyeClosedIcon } from '@radix-ui/react-icons';

export default function Settings() {
  const [staffUser, setStaffUser] = useState(null);
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [profileImage, setProfileImage] = useState(null);
  const [profileImagePreview, setProfileImagePreview] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    department: ''
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);

  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    activityUpdates: true,
    weeklyReport: false,
    darkMode: true
  });

  const [displaySettings, setDisplaySettings] = useState({
    theme: 'light',
    sidebar: 'dark',
    adminColor: 'purple'
  });

  // Load user data and apply saved color theme
  useEffect(() => {
    // Load and apply saved admin color theme
    const savedColor = loadAndApplyAdminColor();
    setDisplaySettings(prev => ({
      ...prev,
      adminColor: savedColor
    }));

    const userData = localStorage.getItem('staffUser');
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setStaffUser(parsedUser);

        // Our backend stores full name in `name`, while this form uses `first_name`/`last_name`
        const fullName = (parsedUser.name || '').toString().trim();
        const nameParts = fullName ? fullName.split(/\s+/).filter(Boolean) : [];
        const derivedFirstName = nameParts.length > 0 ? nameParts[0] : '';
        const derivedLastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

        setFormData({
          first_name: parsedUser.first_name || derivedFirstName || '',
          last_name: parsedUser.last_name || derivedLastName || '',
          email: parsedUser.email || '',
          phone: parsedUser.phone || '',
          department: parsedUser.department || ''
        });

        // Pre-fill current password if it exists on the stored staff user object
        setPasswordData(prev => ({
          ...prev,
          currentPassword: '' // Do not pre-fill for security - staff must type current password
        }));

        // Set profile image preview if available
        if (parsedUser.profile) {
          setProfileImagePreview(parsedUser.profile);
        }
      } catch (e) {
        console.error('Failed to parse user data:', e);
      }
    }
  }, []);

  const handleRefresh = () => {
    setMessage({ type: '', text: '' });
    setSaving(true);
    const userData = localStorage.getItem('staffUser');
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setStaffUser(parsedUser);
        const fullName = (parsedUser.name || '').toString().trim();
        const nameParts = fullName ? fullName.split(/\s+/).filter(Boolean) : [];
        const derivedFirstName = nameParts.length > 0 ? nameParts[0] : '';
        const derivedLastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
        setFormData({
          first_name: parsedUser.first_name || derivedFirstName || '',
          last_name: parsedUser.last_name || derivedLastName || '',
          email: parsedUser.email || '',
          phone: parsedUser.phone || '',
          department: parsedUser.department || ''
        });
        setPasswordData(prev => ({ ...prev, currentPassword: parsedUser.password || prev.currentPassword }));
      } catch (e) {
        console.error('Failed to parse staff user data:', e);
      }
    }
    setTimeout(() => setSaving(false), 300);
  };

  // Handle profile form change
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle profile image selection
  const handleProfileImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfileImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Upload profile image
  const handleUploadProfileImage = async () => {
    if (!profileImage) {
      setMessage({ type: 'error', text: 'Please select a profile image' });
      return;
    }

    if (!staffUser?.id) {
      setMessage({ type: 'error', text: 'User session missing. Please log in again.' });
      return;
    }

    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('profileImage', profileImage);
      formDataToSend.append('userId', staffUser.id);

      const res = await fetch('/api/auth/upload-profile', {
        method: 'POST',
        body: formDataToSend
      });

      const data = await res.json();

      if (data.success && data.user) {
        const updatedUser = { ...staffUser, ...data.user };
        localStorage.setItem('staffUser', JSON.stringify(updatedUser));
        setStaffUser(updatedUser);
        setProfileImage(null);
        setMessage({ type: 'success', text: '✓ Profile image uploaded successfully' });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to upload profile image' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to upload profile image. Check your connection.' });
      console.error('Profile upload error:', err);
    } finally {
      setSaving(false);
    }
  };

  // Handle password form change
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Save profile to database (login table)
  const handleSaveProfile = async () => {
    if (!formData.first_name || !formData.last_name || !formData.email) {
      setMessage({ type: 'error', text: 'Please fill in all required fields' });
      return;
    }
    if (!staffUser?.id) {
      setMessage({ type: 'error', text: 'User session missing. Please log in again.' });
      return;
    }

    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const fullName = [formData.first_name, formData.last_name].filter(Boolean).join(' ').trim();
      const res = await fetch('/api/auth/update-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: staffUser.id,
          name: fullName,
          email: formData.email.trim(),
          phone: formData.phone?.trim() || '',
          department: formData.department?.trim() || ''
        })
      });
      const text = await res.text();
      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch (parseErr) {
        const preview = text.slice(0, 120).replace(/\s+/g, ' ').trim();
        setMessage({
          type: 'error',
          text: `Server returned non-JSON (status ${res.status}). Restart the backend server and try again.${preview ? ` Response: ${preview}…` : ''}`
        });
        setSaving(false);
        return;
      }

      if (data.success && data.user) {
        const updatedUser = { ...staffUser, ...formData, name: fullName, ...data.user };
        localStorage.setItem('staffUser', JSON.stringify(updatedUser));
        setStaffUser(updatedUser);
        setMessage({ type: 'success', text: '✓ Profile updated successfully' });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to update profile' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to update profile. Check your connection.' });
      console.error('Update error:', err);
    } finally {
      setSaving(false);
    }
  };

  // Change password
  const handleChangePassword = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'Please fill in all password fields' });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      return;
    }

    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: staffUser.id,
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });

      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: '✓ Password changed successfully' });
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to change password' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error changing password' });
      console.error('Password change error:', err);
    } finally {
      setSaving(false);
    }
  };

  // Save preferences
  const handleSavePreferences = async () => {
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const updatedUser = { ...staffUser, preferences };
      localStorage.setItem('staffUser', JSON.stringify(updatedUser));
      setStaffUser(updatedUser);
      setMessage({ type: 'success', text: '✓ Preferences saved successfully' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to save preferences' });
      console.error('Preferences error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handlePreferenceToggle = (key) => {
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSaveAll = async () => {
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      if (staffUser?.id && formData.first_name && formData.last_name && formData.email) {
        const fullName = [formData.first_name, formData.last_name].filter(Boolean).join(' ').trim();
        const res = await fetch('/api/auth/update-profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: staffUser.id,
            name: fullName,
            email: formData.email.trim(),
            phone: formData.phone?.trim() || '',
            department: formData.department?.trim() || ''
          })
        });
        const data = await res.json();
        if (!data.success) {
          setMessage({ type: 'error', text: data.message || 'Failed to update profile' });
          setSaving(false);
          return;
        }
        if (data.user) {
          const updatedFromDb = { ...staffUser, ...formData, name: fullName, ...data.user };
          localStorage.setItem('staffUser', JSON.stringify({ ...updatedFromDb, preferences }));
          setStaffUser(prev => ({ ...prev, ...updatedFromDb, preferences }));
        }
      } else {
        const updatedUser = { ...staffUser, ...formData, preferences, name: [formData.first_name, formData.last_name].filter(Boolean).join(' ').trim() || staffUser?.name };
        localStorage.setItem('staffUser', JSON.stringify(updatedUser));
        setStaffUser(updatedUser);
      }
      setMessage({ type: 'success', text: '✓ All settings saved successfully' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to save settings' });
      console.error('Save error:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="staff-settings-page">
      <main className="staff-settings-main">
        <div className="settings-header">
          <div className="settings-header-content">
            <h1>Settings</h1>
            <p className="settings-subtitle">Manage your account and preferences</p>
          </div>
          <button
            className="btn-save-header"
            onClick={handleRefresh}
            disabled={saving}
          >
            {saving ? '⟳ Refreshing...' : '⟳ Refresh'}
          </button>
        </div>

        {message.text && (
          <div className={`settings-message ${message.type}`}>
            {message.text}
          </div>
        )}

        {/* Horizontal Tabs */}
        <div className="settings-tabs">
          <button
            className={`settings-tab-button ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            👤 Profile
          </button>
          <button
            className={`settings-tab-button ${activeTab === 'password' ? 'active' : ''}`}
            onClick={() => setActiveTab('password')}
          >
            🔒 Password
          </button>
        </div>

        {/* Tab Content */}
        <div className="settings-content">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="settings-section">
              <h2>Profile Information</h2>
              <p className="section-description">Update your personal information</p>

              <div className="logged-in-as">
                Logged in as: <strong>{(staffUser?.name || `${formData.first_name} ${formData.last_name}`.trim() || staffUser?.email || 'Unknown')}</strong>
              </div>

              {/* Profile Image Section */}
              <div className="profile-image-section">
                <label>Profile Picture</label>
                <div className="profile-image-container">
                  {profileImagePreview ? (
                    <div className="profile-image-preview">
                      <img src={profileImagePreview} alt="Profile preview" />
                    </div>
                  ) : (
                    <div className="profile-image-placeholder">
                      <div className="placeholder-icon">📷</div>
                      <p>No profile picture</p>
                    </div>
                  )}
                </div>
                <div className="profile-image-upload">
                  <input
                    type="file"
                    id="profileImageInput"
                    onChange={handleProfileImageChange}
                    accept="image/*"
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    className="btn-upload-image"
                    onClick={() => document.getElementById('profileImageInput').click()}
                  >
                    📁 Choose Image
                  </button>
                  {profileImage && (
                    <button
                      type="button"
                      className="btn-upload-submit"
                      onClick={handleUploadProfileImage}
                      disabled={saving}
                    >
                      {saving ? '⬆️ Uploading...' : '⬆️ Upload Profile'}
                    </button>
                  )}
                </div>
                <p className="upload-info">Supported formats: JPG, PNG, GIF (Max 5MB)</p>
              </div>

              <div className="form-group">
                <label>First Name *</label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleFormChange}
                  placeholder="Enter first name"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Last Name *</label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleFormChange}
                  placeholder="Enter last name"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleFormChange}
                  placeholder="Enter email"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleFormChange}
                  placeholder="Enter phone number"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Department</label>
                <input
                  type="text"
                  name="department"
                  value={formData.department}
                  onChange={handleFormChange}
                  placeholder="Enter department"
                  className="form-input"
                />
              </div>

              <button
                type="button"
                className="btn-save-section"
                onClick={handleSaveProfile}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save profile to account'}
              </button>
            </div>
          )}

          {/* Password Tab */}
          {activeTab === 'password' && (
            <div className="settings-section">
              <h2>Change Password</h2>
              <p className="section-description">Update your password regularly for better security</p>

              <div className="form-group">
                <label>Current Password *</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    name="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    placeholder="Enter current password"
                    className="form-input"
                    style={{ paddingRight: '40px', width: '100%' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      background: 'none',
                      border: 'none',
                      color: '#64748b',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '4px'
                    }}
                    title={showCurrentPassword ? "Hide password" : "Show password"}
                  >
                    {showCurrentPassword ? <EyeClosedIcon width="20" height="20" /> : <EyeOpenIcon width="20" height="20" />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>New Password *</label>
                <input
                  type="password"
                  name="newPassword"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  placeholder="Enter new password"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Confirm New Password *</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  placeholder="Confirm new password"
                  className="form-input"
                />
              </div>

              <div className="password-requirements">
                <p className="requirements-title">Password requirements:</p>
                <ul>
                  <li>At least 6 characters long</li>
                  <li>Use a mix of uppercase and lowercase letters</li>
                  <li>Include numbers and special characters</li>
                </ul>
              </div>

              <button
                type="button"
                className="btn-save-section"
                onClick={handleChangePassword}
                disabled={saving}
              >
                {saving ? 'Updating...' : 'Update password'}
              </button>
            </div>
          )}

          {/* Display tab removed */}

          {/* Preferences tab removed */}
        </div>
      </main>
    </div>
  );
}
