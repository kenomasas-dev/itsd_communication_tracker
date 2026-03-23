import React, { useState, useEffect } from 'react';
import './Admin.css';

export default function Roles() {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddRoleModal, setShowAddRoleModal] = useState(false);
  const [newRole, setNewRole] = useState({
    name: '',
    description: '',
    permissions: []
  });
  const [showEditRoleModal, setShowEditRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [editingPermissions, setEditingPermissions] = useState([]);
  const [toast, setToast] = useState({ message: '', type: '' });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: '' }), 3000);
  };

  const defaultRoles = [
    {
      id: 1,
      name: 'Admin',
      description: 'Full system access with all permissions',
      permissions: ['Read', 'Write', 'Delete', 'Manage Users', 'Manage Roles', 'View Audit Logs', 'Export Data', 'Manage Permissions'],
      userCount: 2,
      color: '#7c3aed'
    },
    
    {
      id: 5,
      name: 'User',
      description: 'Standard user with basic access',
      permissions: ['Read', 'Write'],
      userCount: 10,
      color: '#8b5cf6'
    },
   
  ];

  useEffect(() => {
    fetchRoles();
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    try {
      const response = await fetch('/api/permissions');
      const data = await response.json();
      setPermissions(data);
    } catch (error) {
      console.error('Error fetching permissions:', error);
      setPermissions([]);
    }
  };

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/roles');
      const data = await response.json();
      
      // Enrich roles with userCount and color for UI
      const enrichedRoles = data.map((role, index) => ({
        ...role,
        userCount: 0, // Can be fetched separately if needed
        color: `hsl(${(index * 60) % 360}, 70%, 50%)`
      }));
      
      setRoles(enrichedRoles);
    } catch (error) {
      console.error('Error fetching roles:', error);
      setRoles(defaultRoles);
    } finally {
      setLoading(false);
    }
  };

  const availablePermissions = [
    'Read',
    'Write',
    'Delete',
    'Manage Users',
    'Manage Roles',
    'Manage Permissions',
    'View Audit Logs',
    'View Reports',
    'Export Data'
  ];

  const filteredRoles = roles.filter(role =>
    role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddRole = () => {
    setNewRole({ name: '', description: '', permissions: [] });
    setShowAddRoleModal(true);
  };

  const handlePermissionToggle = (permissionName) => {
    setNewRole(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permissionName)
        ? prev.permissions.filter(p => p !== permissionName)
        : [...prev.permissions, permissionName]
    }));
  };

  const handleCreateRole = async () => {
    if (!newRole.name.trim()) {
      showToast('Role name is required', 'error');
      return;
    }

    try {
      // Send role data to backend
      const response = await fetch('/api/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newRole.name.trim(),
          description: newRole.description.trim() || null,
          permissions: newRole.permissions,
          created_by: JSON.parse(localStorage.getItem('user') || '{}').email || 'unknown'
        })
      });

      const data = await response.json();

      if (data.success) {
        // Add the new role to the list
        const roleToAdd = {
          id: data.role.id,
          name: data.role.name,
          description: data.role.description,
          permissions: data.role.permissions,
          userCount: 0,
          color: `hsl(${Math.random() * 360}, 70%, 50%)`
        };
        setRoles([...roles, roleToAdd]);
        setShowAddRoleModal(false);
        setNewRole({ name: '', description: '', permissions: [] });
        showToast('Role created successfully', 'success');
      } else {
        showToast(data.message || 'Failed to create role', 'error');
      }
    } catch (error) {
      console.error('Error creating role:', error);
      showToast('Connection error: Make sure the backend server is running on port 5000', 'error');
    }
  };

  const openEditRole = (role) => {
    setEditingRole(role);
    setEditingPermissions(Array.isArray(role.permissions) ? [...role.permissions] : []);
    setShowEditRoleModal(true);
  };

  const toggleEditingPermission = (permissionName) => {
    setEditingPermissions(prev => (
      prev.includes(permissionName) ? prev.filter(p => p !== permissionName) : [...prev, permissionName]
    ));
  };

  const handleSaveRolePermissions = async () => {
    if (!editingRole) return;
    try {
      const response = await fetch(`/api/roles/${editingRole.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editingRole,
          permissions: editingPermissions
        })
      });
      const data = await response.json();
      if (data.success) {
        setRoles(prev => prev.map(r => r.id === editingRole.id ? { ...r, permissions: editingPermissions } : r));
        setShowEditRoleModal(false);
        setEditingRole(null);
        showToast('Role permissions updated', 'success');
      } else {
        showToast(data.message || 'Failed to update role', 'error');
      }
    } catch (err) {
      console.error('Error updating role:', err);
      showToast('Connection error: make sure backend is running', 'error');
    }
  };

  const handleDeleteRole = async (id) => {
    if (window.confirm('Are you sure you want to delete this role?')) {
      try {
        const response = await fetch(`/api/roles/${id}`, {
          method: 'DELETE'
        });

        const data = await response.json();

        if (data.success) {
          setRoles(roles.filter(role => role.id !== id));
          showToast('Role deleted successfully', 'success');
        } else {
          showToast(data.message || 'Failed to delete role', 'error');
        }
      } catch (error) {
        console.error('Error deleting role:', error);
        showToast('Connection error: Make sure the backend server is running on port 5000', 'error');
      }
    }
  };

  if (loading) {
    return <div className="admin-layout"><p>Loading roles...</p></div>;
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
          <h1>Role Management</h1>
          <p>Create and manage user roles and permissions</p>
        </div>
        <button className="btn-add" onClick={handleAddRole}>+ Add Role</button>
      </div>

      {/* Add Role Modal */}
      {showAddRoleModal && (
        <div className="modal-backdrop" onClick={() => setShowAddRoleModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New Role</h2>
              <button className="modal-close" onClick={() => setShowAddRoleModal(false)}>✕</button>
            </div>
            <form className="modal-body form-grid">
              <label>
                Role Name
                <input
                  value={newRole.name}
                  onChange={e => setNewRole({ ...newRole, name: e.target.value })}
                  placeholder="e.g., Editor"
                  required
                />
              </label>
              <label>
                Description
                <textarea
                  value={newRole.description}
                  onChange={e => setNewRole({ ...newRole, description: e.target.value })}
                  placeholder="Describe this role..."
                  style={{ gridColumn: '1 / -1', minHeight: '80px', fontFamily: 'inherit' }}
                />
              </label>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', marginBottom: '10px' }}>Permissions</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px' }}>
                  {permissions.length > 0 ? (
                    permissions.map(perm => (
                      <label key={perm.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={newRole.permissions.includes(perm.name)}
                          onChange={() => handlePermissionToggle(perm.name)}
                        />
                        {perm.name}
                      </label>
                    ))
                  ) : (
                    <p style={{ color: '#6b7280', fontSize: '14px' }}>Loading permissions...</p>
                  )}
                </div>
              </div>
              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddRoleModal(false)}
                  style={{ padding: '8px 16px', background: '#e5e7eb', color: '#374151', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateRole}
                  style={{ padding: '8px 16px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                >
                  Create Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Role Modal (Permissions) */}
      {showEditRoleModal && editingRole && (
        <div className="modal-backdrop" onClick={() => setShowEditRoleModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Permissions - {editingRole.name}</h2>
              <button className="modal-close" onClick={() => setShowEditRoleModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ color: '#374151', marginBottom: 8 }}>Toggle permissions to add or remove them from the role.</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
                {permissions.length > 0 ? (
                  permissions.map(perm => (
                    <label key={perm.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={editingPermissions.includes(perm.name)}
                        onChange={() => toggleEditingPermission(perm.name)}
                      />
                      {perm.name}
                    </label>
                  ))
                ) : (
                  <p style={{ color: '#6b7280' }}>Loading permissions...</p>
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
                <button
                  className="role-action-btn"
                  onClick={() => { setShowEditRoleModal(false); setEditingRole(null); }}
                >
                  Cancel
                </button>
                <button
                  className="role-action-btn"
                  onClick={handleSaveRolePermissions}
                  style={{ background: '#3b82f6', color: 'white', borderColor: '#3b82f6' }}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="admin-toolbar">
        <input
          type="text"
          placeholder="Search roles..."
          className="search-box"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Roles Grid */}
      <div className="roles-grid">
        {filteredRoles.length > 0 ? (
          filteredRoles.map(role => (
            <div key={role.id} className="role-card">
              <div className="role-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                  <div className="role-icon" style={{ background: role.color }}>
                    {role.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="role-name">{role.name}</h3>
                    <p className="role-description">{role.description}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button
                    className="role-edit-btn"
                    onClick={() => openEditRole(role)}
                    title="Edit permissions"
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" fill="currentColor" opacity="0.9"/>
                      <path d="M20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor" opacity="0.95"/>
                    </svg>
                  </button>
                  <button
                    className="role-delete-btn"
                    onClick={() => handleDeleteRole(role.id)}
                    title="Delete role"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="role-stats">
                <div className="role-stat">
                  <span className="stat-value">{role.permissions.length}</span>
                  <span className="stat-label">Permissions</span>
                </div>
              </div>

              <div className="role-permissions">
                <h4>Permissions</h4>
                <div className="permissions-list">
                  {role.permissions.map((perm, idx) => (
                    <span key={idx} className="permission-badge" style={{ background: role.color }}>
                      {perm}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: '#6b7280' }}>
            <p>No roles found</p>
          </div>
        )}
      </div>

      <style>{`
        .roles-grid {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin: 20px 0;
        }

        /* List-style role card */
        .role-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 16px;
          display: flex;
          flex-direction: row;
          gap: 16px;
          align-items: center;
          transition: all 0.2s ease;
        }

        .role-card:hover {
          border-color: #3b82f6;
          box-shadow: 0 6px 18px rgba(59, 130, 246, 0.08);
        }

        .role-header {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
        }

        .role-icon {
          width: 48px;
          height: 48px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
          font-size: 16px;
          flex-shrink: 0;
        }

        .role-name {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: #1f2937;
        }

        .role-description {
          margin: 4px 0 0;
          font-size: 13px;
          color: #6b7280;
        }

        .role-delete-btn {
          background: none;
          border: none;
          color: #d1d5db;
          cursor: pointer;
          font-size: 20px;
          padding: 0;
          transition: color 0.2s ease;
        }

        .role-delete-btn:hover {
          color: #ef4444;
        }

        .role-edit-btn {
          background: none;
          border: none;
          color: #6b7280;
          cursor: pointer;
          padding: 4px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          transition: background 0.15s ease, color 0.15s ease;
        }

        .role-edit-btn:hover {
          background: rgba(59,130,246,0.08);
          color: #1f2937;
        }

        .role-stats {
          display: flex;
          gap: 16px;
          padding: 12px 0;
          border-top: 1px solid #f3f4f6;
          border-bottom: 1px solid #f3f4f6;
        }

        .role-stat {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .stat-value {
          font-size: 20px;
          font-weight: 700;
          color: #1f2937;
        }

        .stat-label {
          font-size: 11px;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .role-permissions {
          flex: 1;
        }

        .role-permissions h4 {
          margin: 0 0 10px;
          font-size: 13px;
          font-weight: 600;
          color: #1f2937;
          text-transform: uppercase;
        }

        .permissions-list {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .role-action-btn {
          padding: 8px 16px;
          background: #f3f4f6;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          color: #374151;
          transition: all 0.2s ease;
        }

        .role-action-btn:hover {
          background: #e5e7eb;
          border-color: #d1d5db;
        }

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
        .form-grid textarea {
          padding: 10px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
          font-family: inherit;
        }

        .form-grid input:focus,
        .form-grid textarea:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
      `}</style>
    </div>
  );
}
