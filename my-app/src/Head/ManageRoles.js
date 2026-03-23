import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import './HeadPage.css';
import { LayoutDashboard, TrendingUp, Activity, Users, MessageCircle, Settings, ShieldCheck, X } from 'lucide-react';

export default function ManageRoles() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [feedback, setFeedback] = useState({ msg: '', type: '' });
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'Admin', department: '', phone: '', notes: '' });

  const iconProps = { size: 16, strokeWidth: 2, style: { display: 'block' } };
  const navItems = [
    { label: 'Overview', icon: <LayoutDashboard {...iconProps} />, onClick: () => navigate('/head') },
    { label: 'Analytics', icon: <TrendingUp {...iconProps} />, onClick: () => navigate('/head/analytics') },
    { label: 'Process', icon: <Activity {...iconProps} />, onClick: () => navigate('/head/process') },
    { label: 'Approval', icon: <Users {...iconProps} />, onClick: () => navigate('/head/approval') },
    { label: 'Manage Roles', active: true, icon: <ShieldCheck {...iconProps} />, onClick: () => navigate('/head/manage-roles') }
  ];
  const settingsItems = [
    { label: 'Announcements', badge: 3, icon: <MessageCircle {...iconProps} />, onClick: () => navigate('/head/announcements') },
    { label: 'Settings', icon: <Settings {...iconProps} /> }
  ];

  useEffect(() => {
    const currentUser = (() => {
      try {
        return JSON.parse(localStorage.getItem('headUser') || 'null');
      } catch (e) {
        return null;
      }
    })();

    if (!currentUser || !currentUser.role || currentUser.role.toLowerCase() !== 'admin') {
      setIsAdmin(false);
      setFeedback({ msg: 'Only admin can manage roles.', type: 'error' });
      setLoading(false);
      return;
    }

    setIsAdmin(true);

    const loadUsers = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/auth/users?role=Admin');
        if (!res.ok) throw new Error('Fetch users failed');
        const json = await res.json();
        setUsers(Array.isArray(json) ? json : json.data || []);
      } catch (err) {
        console.error(err);
        setFeedback({ msg: 'Failed to load user list', type: 'error' });
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const submitForm = async (e) => {
    e.preventDefault();
    setFeedback({ msg: '', type: '' });

    if (!isAdmin) {
      setFeedback({ msg: 'Only admin users may create accounts.', type: 'error' });
      return;
    }

    if (!form.name.trim() || !form.email.trim() || !form.role.trim()) {
      setFeedback({ msg: 'Name, email, and role are required.', type: 'error' });
      return;
    }

    try {
      const res = await fetch('/api/auth/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password || null,
          role: form.role,
          department: form.department || null,
          phone: form.phone || null,
          notes: form.notes || '',
          permissions: [],
          manager_id: null,
          skills: []
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to save user');
      }

      setFeedback({ msg: 'User created successfully.', type: 'success' });
      setForm({ name: '', email: '', password: '', role: 'Admin', department: '', phone: '', notes: '' });
      setShowModal(false);

      // success toast style auto fade
      setTimeout(() => setFeedback({ msg: '', type: '' }), 3200);

      // Refresh grid
      const newUsers = await fetch('/api/auth/users?role=Admin').then(r => r.ok ? r.json() : []).catch(() => []);
      setUsers(Array.isArray(newUsers) ? newUsers : newUsers.data || []);
    } catch (err) {
      console.error(err);
      setFeedback({ msg: err.message || 'Error creating user.', type: 'error' });
    }
  };

  return (
    <div className="head-page">
      <Sidebar navItems={navItems} settingsItems={settingsItems} />
      <main className="head-main">
        <Header title="Manage Roles" subtitle="Create and assign User/Admin accounts" userName="Head User" userEmail="admin@example.com" />
        <div style={{ padding: '20px' }}>
          <div style={{ marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
            <h2 style={{ margin: 0 }}>Admin Accounts</h2>
            {feedback.msg && (
              <span style={{ color: feedback.type === 'error' ? '#dc2626' : '#16a34a' }}>{feedback.msg}</span>
            )}
          </div>

          {!isAdmin ? (
            <div style={{ padding: '18px', marginBottom: '20px', border: '1px solid #fecaca', borderRadius: '8px', backgroundColor: '#fef2f2', color: '#b91c1c' }}>
              Access denied: only admin role can add and view admin accounts.
            </div>
          ) : (
            <>
              <button 
                onClick={() => setShowModal(true)}
                style={{ 
                  marginBottom: '20px',
                  padding: '10px 16px', 
                  border: 'none', 
                  borderRadius: '6px', 
                  backgroundColor: '#2563eb', 
                  color: 'white', 
                  cursor: 'pointer', 
                  fontWeight: 600,
                  fontSize: '14px'
                }}
              >
                + Create New Admin
              </button>

              <section style={{ border: '1px solid #e5e7eb', borderRadius: '10px', background: 'white', overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', fontWeight: 700 }}>Existing Accounts</div>
                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  {loading ? (
                    <div style={{ padding: '20px', color: '#64748b' }}>Loading...</div>
                  ) : users.length === 0 ? (
                    <div style={{ padding: '20px', color: '#64748b' }}>No users found.</div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #e5e7eb' }}>Name</th>
                      <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #e5e7eb' }}>Email</th>
                      <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #e5e7eb' }}>Role</th>
                      <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #e5e7eb' }}>Department</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(user => (
                      <tr key={user.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px' }}>{user.name}</td>
                        <td style={{ padding: '8px' }}>{user.email}</td>
                        <td style={{ padding: '8px' }}>{user.role}</td>
                        <td style={{ padding: '8px' }}>{user.department || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>

              {/* Modal Overlay */}
              {showModal && (
                <div style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 1000
                }}>
                  <div style={{
                    backgroundColor: 'white',
                    borderRadius: '10px',
                    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
                    maxWidth: '500px',
                    width: '90%',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    padding: '24px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Create New Admin</h3>
                      <button 
                        onClick={() => {
                          setShowModal(false);
                          setFeedback({ msg: '', type: '' });
                        }}
                        style={{ 
                          background: 'none', 
                          border: 'none', 
                          cursor: 'pointer',
                          color: '#64748b'
                        }}
                      >
                        <X size={20} />
                      </button>
                    </div>

                    <form onSubmit={submitForm} style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                      <input 
                        name="name" 
                        value={form.name} 
                        onChange={handleChange} 
                        placeholder="Full Name" 
                        required 
                        style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }} 
                      />
                      <input 
                        name="email" 
                        type="email" 
                        value={form.email} 
                        onChange={handleChange} 
                        placeholder="Email" 
                        required 
                        style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }} 
                      />
                      <input 
                        name="password" 
                        type="password" 
                        value={form.password} 
                        onChange={handleChange} 
                        placeholder="Password (optional)" 
                        style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }} 
                      />
                      <select 
                        name="role" 
                        value={form.role} 
                        onChange={handleChange} 
                        style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
                      >
                        <option value="Admin">Admin</option>
                      </select>
                      <input 
                        name="department" 
                        value={form.department} 
                        onChange={handleChange} 
                        placeholder="Department" 
                        style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }} 
                      />
                      <input 
                        name="phone" 
                        value={form.phone} 
                        onChange={handleChange} 
                        placeholder="Phone" 
                        style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }} 
                      />
                      <input 
                        name="notes" 
                        value={form.notes} 
                        onChange={handleChange} 
                        placeholder="Notes" 
                        style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }} 
                      />
                      
                      <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                        <button 
                          type="submit" 
                          style={{ 
                            flex: 1,
                            padding: '10px 14px', 
                            border: 'none', 
                            borderRadius: '6px', 
                            backgroundColor: '#2563eb', 
                            color: 'white', 
                            cursor: 'pointer', 
                            fontWeight: 600,
                            fontSize: '14px'
                          }}
                        >
                          Create Admin
                        </button>
                        <button 
                          type="button"
                          onClick={() => {
                            setShowModal(false);
                            setFeedback({ msg: '', type: '' });
                          }}
                          style={{ 
                            flex: 1,
                            padding: '10px 14px', 
                            border: '1px solid #d1d5db', 
                            borderRadius: '6px', 
                            backgroundColor: 'white', 
                            color: '#374151', 
                            cursor: 'pointer', 
                            fontWeight: 600,
                            fontSize: '14px'
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
