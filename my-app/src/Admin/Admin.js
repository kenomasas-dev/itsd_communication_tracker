import React, { useState, useEffect } from 'react';
import './Admin.css';
import AdminSidebar from './Admin_sidebar';
import { useNavigate } from 'react-router-dom';
import UserDetail, { AddUserModal } from './UserDetail';
import AuditLogs from './AuditLogs';
import Dashboard from './Dashboard';
import Roles from './Roles';
import Permissions from './Permissions';
import Groups from './Groups';
import Analytics from './Analytics';
import Settings from './Settings';
import Message from './Message';
import ProcessProjects from './Process/Projects';
import Lists from './Lists';

export default function Admin() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('lists');
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('All Roles');
  const [selectedDept, setSelectedDept] = useState('All Departments');
  const [selectedStatus, setSelectedStatus] = useState('All Status');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [toast, setToast] = useState({ message: '', type: '' });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmUser, setConfirmUser] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: '' }), 3000);
  };

  useEffect(() => {
    fetchUsersFromDatabase();
  }, []);

  const fetchUsersFromDatabase = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/auth/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      
      // Transform database response to match table format
      const transformedUsers = data.map(user => ({
        id: user.id,
        name: user.name || 'N/A',
        email: user.email,
        role: user.role || 'Viewer',
        department: user.department || 'N/A',
        permissions: user.permissions ? (typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions) : [],
        is_active: user.is_active !== undefined ? user.is_active : true,
        profile: user.profile || null
      }));
      setUsers(transformedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const getRoleColor = (role) => {
    const colors = {
      Admin: '#7c3aed',
      Manager: '#3b82f6',
      Developer: '#10b981',
      Viewer: '#6b7280'
    };
    return colors[role] || '#6b7280';
  };


  const getPermissionColor = (perm) => {
    if (perm === 'Full Access') return '#10b981';
    if (perm === 'Read Only') return '#f59e0b';
    if (typeof perm === 'object') return '#3b82f6';
    return '#6b7280';
  };

  const getStatusIcon = (isActive) => {
    return isActive ? '🟢' : '🔴';
  };

  const getStatusLabel = (isActive) => {
    return isActive ? 'Active' : 'Inactive';
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = selectedRole === 'All Roles' || user.role === selectedRole;
    const matchesDept = selectedDept === 'All Departments' || user.department === selectedDept;
    return matchesSearch && matchesRole && matchesDept;
  });

  if (loading) {
    return <div className="admin-layout"><p>Loading...</p></div>;
  }

  const handleAddUser = () => setShowAddModal(true);

  const goToUser = (id) => navigate(`/admin/users/${id}`);

  const toggleUserStatus = async (e, userId, currentStatus) => {
    if (e && e.stopPropagation) e.stopPropagation(); // Prevent row click when event provided
    
    console.log(`Starting toggle for user ${userId}, current status: ${currentStatus}`);
    
    try {
      const response = await fetch(`/api/auth/users/${userId}/toggle-status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      });
      
      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);
      
      if (response.ok && data.success) {
        // Update local state
        const updatedUsers = users.map(u => 
          u.id === userId ? { ...u, is_active: data.user.is_active } : u
        );
        console.log('Updated users:', updatedUsers);
        setUsers(updatedUsers);
        // Show green toast for activation, red for deactivation
        const toastType = data.user.is_active ? 'success' : 'deactivate';
        showToast(`User ${data.user.name} has been ${data.user.is_active ? 'activated' : 'deactivated'}`, toastType);
      } else {
        console.error('Failed to toggle status:', data.message);
        showToast('Failed: ' + (data.message || 'Unknown error'), 'error');
      }
    } catch (error) {
      console.error('Error toggling user status:', error);
      showToast('Error: ' + error.message, 'error');
    }
  };

  const openConfirm = (e, user) => {
    if (e && e.stopPropagation) e.stopPropagation();
    setConfirmUser(user);
    setConfirmOpen(true);
  };

  const cancelConfirm = () => {
    setConfirmOpen(false);
    setConfirmUser(null);
  };

  const confirmAndToggle = async () => {
    if (!confirmUser) return cancelConfirm();
    // call existing toggle logic without event
    await toggleUserStatus(null, confirmUser.id, confirmUser.is_active);
    setConfirmOpen(false);
    setConfirmUser(null);
  };

  return (
    <div className="admin-layout">
      {toast.message && (
        <div 
          className={`toast-notification ${toast.type}`}
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '16px 24px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
            zIndex: 9999,
            animation: 'slideIn 0.3s ease-out',
            background: toast.type === 'success' ? '#10b981' : toast.type === 'deactivate' ? '#ef4444' : '#ef4444',
            color: 'white',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
          }}
        >
          {toast.message}
        </div>
      )}
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
      <AdminSidebar activeSection={activeSection} onSectionChange={setActiveSection} />

      {confirmOpen && (
        <div className="modal-backdrop" onClick={cancelConfirm}>
          <div className="modal edit-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Confirmation status</h2>
              <button className="modal-close" onClick={cancelConfirm}>✕</button>
            </div>
            <div className="modal-body" style={{padding: '16px 20px'}}>
              <p>Do you want to <strong>{confirmUser?.is_active ? 'deactivate' : 'activate'}</strong> the user <strong>{confirmUser?.name}</strong>?</p>
            </div>
            <div style={{display:'flex',justifyContent:'flex-end',gap:10,padding:12}}>
              <button className="btn-secondary" onClick={cancelConfirm}>Cancel</button>
              <button className="btn-primary" onClick={confirmAndToggle}>Confirm</button>
            </div>
          </div>
        </div>
      )}
      {activeSection === 'users' && (
        <>
          {/** Add User Modal */}
          <AddUserModal
            open={showAddModal}
            onClose={() => setShowAddModal(false)}
            onCreate={() => {
              setShowAddModal(false);
              fetchUsersFromDatabase(); // Refresh from database
            }}
          />
      <div className="admin-main">
        <div className="admin-header">
          <div className="header-content">
            <h1>User Management</h1>
            <p>Manage users, roles, and permissions</p>
          </div>
          <button className="btn-add" onClick={handleAddUser}>+ Add User</button>
        </div>

        <div className="admin-toolbar">
          <input
            type="text"
            placeholder="Search users..."
            className="search-box"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            className="filter-select"
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
          >
            <option>All Roles</option>
            <option>Admin</option>
            
            <option>Staff</option>
           
          </select>
          <select
            className="filter-select"
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
          >
            <option>All Departments</option>
            <option>ITSD</option>
          
          </select>
          <select
            className="filter-select"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option>All Status</option>
            <option>Active</option>
            <option>Inactive</option>
          </select>
        </div>

        <div className="users-table-container">
          <div className="users-header">
            <span className="header-item">Users ({filteredUsers.length})</span>
            <span className="header-action">Actions</span>
          </div>
          <table className="users-table">
            <thead>
              <tr>
                <th><input type="checkbox" /></th>
                <th>USER</th>
                <th>ROLE</th>
                <th>DEPARTMENT</th>
                <th>STATUS</th>
                <th>PERMISSIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(user => (
                <tr key={user.id} className="user-row">
                  <td><input type="checkbox" /></td>
                  <td>
                    <div className="user-cell">
                      <div className="user-avatar-table" style={user.profile ? { background: 'transparent' } : {}}>
                        {user.profile ? (
                          <img src={user.profile} alt={user.name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          user.name.charAt(0)
                        )}
                      </div>
                      <div className="user-info-table">
                        <div className="user-name-table">{user.name}</div>
                        <div className="user-email-table">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="role-badge" style={{ background: getRoleColor(user.role) }}>
                      {user.role}
                    </span>
                  </td>
                  <td>{user.department}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <button
                        onClick={(e) => openConfirm(e, user)}
                        style={{
                          background: user.is_active ? '#10b981' : '#ef4444',
                          border: 'none',
                          borderRadius: '20px',
                          width: '54px',
                          height: '32px',
                          cursor: 'pointer',
                          position: 'relative',
                          padding: '2px',
                          transition: 'all 0.3s ease',
                          boxShadow: user.is_active ? '0 0 12px rgba(16, 185, 129, 0.5)' : '0 0 12px rgba(239, 68, 68, 0.5)',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                        onMouseEnter={(e) => e.target.style.transform = 'scale(1.08)'}
                        onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                        title={`Click to ${user.is_active ? 'deactivate' : 'activate'} user`}
                      >
                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            background: 'white',
                            transition: 'all 0.3s ease',
                            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.3)',
                            position: 'absolute',
                            left: user.is_active ? '26px' : '2px'
                          }}
                        />
                      </button>
                      <span className="status-label" style={{ color: user.is_active ? '#10b981' : '#ef4444', fontWeight: '600', minWidth: '80px' }}>
                        {getStatusLabel(user.is_active)}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className="permissions-cell">
                      {typeof user.permissions === 'string' ? (
                        <span
                          className="permission-badge"
                          style={{ background: getPermissionColor(user.permissions) }}
                        >
                          {user.permissions}
                        </span>
                      ) : (
                        user.permissions.map((perm, idx) => (
                          <span
                            key={idx}
                            className="permission-badge"
                            style={{ background: getPermissionColor(perm) }}
                          >
                            {perm}
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}
      {activeSection === 'dashboard' && <Dashboard />}
      {activeSection === 'roles' && <Roles />}
      {activeSection === 'process' && <ProcessProjects />}
      {activeSection === 'permissions' && <Permissions />}
      {activeSection === 'groups' && <Groups />}
      {activeSection === 'message' && <Message />}
      {activeSection === 'analytics' && <Analytics />}
      {activeSection === 'lists' && <Lists />}
      {activeSection === 'audit' && <AuditLogs />}
      {activeSection === 'settings' && <Settings />}
    </div>
  );
}
