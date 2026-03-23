import React, { useState, useEffect } from 'react';
import './Admin.css';

export default function Permissions() {
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [showAddPermissionModal, setShowAddPermissionModal] = useState(false);
  const [newPermission, setNewPermission] = useState({
    name: '',
    description: '',
    category: 'User Management',
    riskLevel: 'Low'
  });
  const [toast, setToast] = useState({ message: '', type: '' });
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: '' }), 3000);
  };

  const defaultPermissions = [
    // User Management Permissions
    {
      id: 1,
      name: 'Read',
      description: 'View user information and data',
      category: 'User Management',
      riskLevel: 'Low',
      rolesCount: 9,
      color: '#10b981'
    },
    {
      id: 2,
      name: 'Write',
      description: 'Create and edit user data',
      category: 'User Management',
      riskLevel: 'Medium',
      rolesCount: 7,
      color: '#3b82f6'
    },
    {
      id: 3,
      name: 'Delete',
      description: 'Remove user data and accounts',
      category: 'User Management',
      riskLevel: 'High',
      rolesCount: 2,
      color: '#ef4444'
    },
    {
      id: 4,
      name: 'Manage Users',
      description: 'Full control over user management',
      category: 'User Management',
      riskLevel: 'High',
      rolesCount: 3,
      color: '#ef4444'
    },
    // Role & Permission Management
    {
      id: 5,
      name: 'Manage Roles',
      description: 'Create, edit, and delete roles',
      category: 'Role Management',
      riskLevel: 'Critical',
      rolesCount: 1,
      color: '#dc2626'
    },
    {
      id: 6,
      name: 'Manage Permissions',
      description: 'Assign and revoke permissions',
      category: 'Role Management',
      riskLevel: 'Critical',
      rolesCount: 1,
      color: '#dc2626'
    },
    // Reporting & Analytics
    {
      id: 7,
      name: 'View Reports',
      description: 'Access system reports and analytics',
      category: 'Reporting',
      riskLevel: 'Low',
      rolesCount: 5,
      color: '#8b5cf6'
    },
    {
      id: 8,
      name: 'Export Data',
      description: 'Export data to CSV or other formats',
      category: 'Reporting',
      riskLevel: 'Medium',
      rolesCount: 5,
      color: '#f59e0b'
    },
    // Audit & Compliance
    {
      id: 9,
      name: 'View Audit Logs',
      description: 'Access and view system audit logs',
      category: 'Audit',
      riskLevel: 'Low',
      rolesCount: 4,
      color: '#06b6d4'
    },
    {
      id: 10,
      name: 'Manage Permissions',
      description: 'Configure and manage system permissions',
      category: 'Role Management',
      riskLevel: 'Critical',
      rolesCount: 1,
      color: '#dc2626'
    },
    // Communication Management
    {
      id: 11,
      name: 'Create Communication',
      description: 'Create new communication records',
      category: 'Communication',
      riskLevel: 'Medium',
      rolesCount: 6,
      color: '#06b6d4'
    },
    {
      id: 12,
      name: 'Edit Communication',
      description: 'Modify existing communication records',
      category: 'Communication',
      riskLevel: 'Medium',
      rolesCount: 5,
      color: '#14b8a6'
    },
    {
      id: 13,
      name: 'Delete Communication',
      description: 'Remove communication records',
      category: 'Communication',
      riskLevel: 'High',
      rolesCount: 2,
      color: '#ef4444'
    },
    // System Configuration
    {
      id: 14,
      name: 'Configure Settings',
      description: 'Modify system configuration and settings',
      category: 'System',
      riskLevel: 'Critical',
      rolesCount: 1,
      color: '#dc2626'
    },
    {
      id: 15,
      name: 'Manage Integrations',
      description: 'Add and configure third-party integrations',
      category: 'System',
      riskLevel: 'High',
      rolesCount: 1,
      color: '#ef4444'
    }
  ];

  const categories = ['All Categories', 'User Management', 'Role Management', 'Reporting', 'Audit', 'Communication', 'System'];

  const getRiskLevelColor = (riskLevel) => {
    const colors = {
      'Low': '#10b981',
      'Medium': '#f59e0b',
      'High': '#ef4444',
      'Critical': '#dc2626'
    };
    return colors[riskLevel] || '#6b7280';
  };

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/permissions');
      const data = await response.json();

      // Map database fields to UI fields
      const enrichedPermissions = data.map(perm => ({
        ...perm,
        riskLevel: perm.risk_level || 'Low',
        rolesCount: 0,
        color: getRiskLevelColor(perm.risk_level || 'Low')
      }));

      setPermissions(enrichedPermissions);
    } catch (error) {
      console.error('Error fetching permissions:', error);
      // Fallback to default permissions if backend unavailable
      setPermissions(defaultPermissions);
    } finally {
      setLoading(false);
    }
  };

  const filteredPermissions = permissions.filter(perm => {
    const matchesSearch = perm.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      perm.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All Categories' || perm.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleAddPermission = () => {
    setNewPermission({
      name: '',
      description: '',
      category: 'User Management',
      riskLevel: 'Low'
    });
    setShowAddPermissionModal(true);
  };

  const handleCreatePermission = async () => {
    if (!newPermission.name.trim()) {
      showToast('Permission name is required', 'error');
      return;
    }

    try {
      const response = await fetch('/api/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newPermission.name.trim(),
          description: newPermission.description.trim() || null,
          category: newPermission.category,
          risk_level: newPermission.riskLevel,
          created_by: JSON.parse(localStorage.getItem('user') || '{}').email || 'unknown'
        })
      });

      const data = await response.json();

      if (data.success) {
        const permToAdd = {
          ...data.permission,
          riskLevel: data.permission.risk_level,
          rolesCount: 0,
          color: getRiskLevelColor(data.permission.risk_level)
        };
        setPermissions([...permissions, permToAdd]);
        setShowAddPermissionModal(false);
        setNewPermission({ name: '', description: '', category: 'User Management', riskLevel: 'Low' });
        showToast('Permission created successfully', 'success');
      } else {
        showToast(data.message || 'Failed to create permission', 'error');
      }
    } catch (error) {
      console.error('Error creating permission:', error);
      showToast('Connection error: Make sure the backend server is running on port 5000', 'error');
    }
  };

  const handleDeletePermission = async (id) => {
    try {
      const response = await fetch(`/api/permissions/${id}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (data.success) {
        setPermissions(permissions.filter(perm => perm.id !== id));
        showToast('Permission deleted successfully', 'success');
      } else {
        showToast(data.message || 'Failed to delete permission', 'error');
      }
    } catch (error) {
      console.error('Error deleting permission:', error);
      showToast('Connection error: Make sure the backend server is running on port 5000', 'error');
    } finally {
      setConfirmDeleteId(null);
    }
  };

  if (loading) {
    return <div className="admin-layout"><p>Loading permissions...</p></div>;
  }

  return (
    <div className="admin-main">
      {toast.message && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: toast.type === 'success' ? '#10b981' : '#ef4444',
          color: 'white',
          padding: '12px 16px',
          borderRadius: '8px',
          boxShadow: '0 6px 18px rgba(0,0,0,0.2)',
          zIndex: 9999,
          fontWeight: 600
        }}>{toast.message}</div>
      )}
      <div className="admin-header">
        <div className="header-content">
          <h1>Permission Management</h1>
          <p>Manage system permissions and access controls</p>
        </div>
        <button className="btn-add" onClick={handleAddPermission}>+ Add Permission</button>
      </div>

      {/* Add Permission Modal */}
      {showAddPermissionModal && (
        <div className="modal-backdrop" onClick={() => setShowAddPermissionModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New Permission</h2>
              <button className="modal-close" onClick={() => setShowAddPermissionModal(false)}>✕</button>
            </div>
            <form className="modal-body form-grid">
              <label>
                Permission Name
                <input
                  value={newPermission.name}
                  onChange={e => setNewPermission({ ...newPermission, name: e.target.value })}
                  placeholder="e.g., View Settings"
                  required
                />
              </label>
              <label>
                Risk Level
                <select
                  value={newPermission.riskLevel}
                  onChange={e => setNewPermission({ ...newPermission, riskLevel: e.target.value })}
                >
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                  <option>Critical</option>
                </select>
              </label>
              <label style={{ gridColumn: '1 / -1' }}>
                Description
                <textarea
                  value={newPermission.description}
                  onChange={e => setNewPermission({ ...newPermission, description: e.target.value })}
                  placeholder="Describe this permission..."
                  style={{ minHeight: '80px', fontFamily: 'inherit' }}
                />
              </label>
              <label>
                Category
                <select
                  value={newPermission.category}
                  onChange={e => setNewPermission({ ...newPermission, category: e.target.value })}
                >
                  {categories.slice(1).map(cat => (
                    <option key={cat}>{cat}</option>
                  ))}
                </select>
              </label>
              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddPermissionModal(false)}
                  style={{ padding: '8px 16px', background: '#e5e7eb', color: '#374151', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreatePermission}
                  style={{ padding: '8px 16px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                >
                  Create Permission
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Search and Filter */}
      <div className="admin-toolbar">
        <input
          type="text"
          placeholder="Search permissions..."
          className="search-box"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select
          className="filter-select"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          {categories.map(cat => (
            <option key={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Permissions Table */}
      <div className="users-table-container">
        <div className="users-header">
          <span className="header-item">Permissions ({filteredPermissions.length})</span>
        </div>
        <table className="users-table">
          <thead>
            <tr>
              <th>PERMISSION</th>
              <th>DESCRIPTION</th>
              <th>CATEGORY</th>
              <th>RISK LEVEL</th>
              <th>ROLES</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filteredPermissions.length > 0 ? (
              filteredPermissions.map(perm => (
                <tr key={perm.id} className="user-row">
                  <td>
                    <strong style={{ color: '#1f2937' }}>{perm.name}</strong>
                  </td>
                  <td>
                    <span style={{ fontSize: '13px', color: '#6b7280' }}>{perm.description}</span>
                  </td>
                  <td>
                    <span style={{ fontSize: '13px', color: '#6b7280' }}>{perm.category}</span>
                  </td>
                  <td>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 12px',
                        borderRadius: '50px',
                        fontSize: '12px',
                        fontWeight: '700',
                        letterSpacing: '0.03em',
                        color: getRiskLevelColor(perm.riskLevel),
                        background: getRiskLevelColor(perm.riskLevel) + '1a',
                        border: `1.5px solid ${getRiskLevelColor(perm.riskLevel)}44`
                      }}
                    >
                      <span style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: getRiskLevelColor(perm.riskLevel),
                        flexShrink: 0
                      }} />
                      {perm.riskLevel}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#1f2937' }}>
                      {perm.rolesCount} {perm.rolesCount === 1 ? 'role' : 'roles'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#3b82f6',
                          cursor: 'pointer',
                          fontSize: '18px',
                          padding: '4px 6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title="Edit"
                      >
                        ✎
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(perm.id)}
                        title="Delete permission"
                        style={{
                          background: '#fee2e2',
                          border: 'none',
                          borderRadius: '6px',
                          color: '#ef4444',
                          cursor: 'pointer',
                          padding: '5px 8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'background 0.18s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#fecaca'}
                        onMouseLeave={e => e.currentTarget.style.background = '#fee2e2'}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                          <path d="M10 11v6" />
                          <path d="M14 11v6" />
                          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                  No permissions found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Delete Confirmation Modal ── */}
      {confirmDeleteId !== null && (
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
                onClick={() => setConfirmDeleteId(null)}
                style={{ padding: '7px 16px', borderRadius: 7, border: '1.5px solid #e5e7eb', background: '#f9fafb', color: '#374151', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}
              >Cancel</button>
              <button
                onClick={() => handleDeletePermission(confirmDeleteId)}
                style={{ padding: '7px 16px', borderRadius: 7, border: 'none', background: '#ef4444', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}
              >Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Risk Level Legend */}
      <div style={{ marginTop: '40px', padding: '20px', background: 'white', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>Risk Level Guide</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          {['Low', 'Medium', 'High', 'Critical'].map(level => (
            <div key={level} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '3px',
                  background: getRiskLevelColor(level)
                }}
              ></div>
              <span style={{ fontSize: '13px', color: '#6b7280' }}>
                <strong>{level}:</strong> {level === 'Low' && 'Safe, minimal security impact'
                  || level === 'Medium' && 'Moderate risk, requires review'
                  || level === 'High' && 'High risk, grants significant access'
                  || level === 'Critical' && 'Critical, system-wide access control'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .form-grid label {
          display: flex;
          flex-direction: column;
          gap: 8px;
          font-weight: 500;
          color: #374151;
          font-size: 14px;
        }

        .form-grid input,
        .form-grid textarea,
        .form-grid select {
          padding: 10px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
          font-family: inherit;
        }

        .form-grid input:focus,
        .form-grid textarea:focus,
        .form-grid select:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
      `}</style>
    </div>
  );
}
