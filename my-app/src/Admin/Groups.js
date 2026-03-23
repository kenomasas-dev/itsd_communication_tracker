import React, { useState, useEffect } from 'react';
import './Groups.css';
import { STORAGE_KEYS, DEFAULT_KIND, DEFAULT_TYPE, DEFAULT_INTERNAL_OFFICE, loadOptions, saveOptions } from '../communicationOptions';

export default function Groups() {
  const [showModal, setShowModal] = useState(false);
  const [showBlankModal, setShowBlankModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [newMember, setNewMember] = useState('');
  const [members, setMembers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [toast, setToast] = useState({ show: false, message: '' });
  const [editGroup, setEditGroup] = useState(null); // { index, name, assigned_to, members }
  const [editMembers, setEditMembers] = useState([]);
  const [editNewMember, setEditNewMember] = useState('');

  // Org chart modal state
  const [orgChartGroup, setOrgChartGroup] = useState(null);

  // Communication options (for Actions modal)
  const [kindOptions, setKindOptions] = useState(() => loadOptions(STORAGE_KEYS.kind, DEFAULT_KIND));
  const [typeOptions, setTypeOptions] = useState(() => loadOptions(STORAGE_KEYS.type, DEFAULT_TYPE));
  const [internalOfficeOptions, setInternalOfficeOptions] = useState(() => loadOptions(STORAGE_KEYS.internalOffice, DEFAULT_INTERNAL_OFFICE));
  const [newKind, setNewKind] = useState('');
  const [newType, setNewType] = useState('');
  const [newInternalOffice, setNewInternalOffice] = useState('');

  function addMember() {
    const v = newMember.trim();
    if (!v) return;
    if (!members.includes(v)) setMembers(prev => [...prev, v]);
    setNewMember('');
  }

  function removeMember(name) {
    setMembers(prev => prev.filter(m => m !== name));
  }

  function openEditGroup(g, i) {
    const mems = Array.isArray(g.members) ? [...g.members] : [];
    setEditGroup({ index: i, id: g.id, name: g.name || '', assigned_to: g.assigned_to || '' });
    setEditMembers(mems);
    setEditNewMember('');
  }

  function openOrgChart(g) {
    setOrgChartGroup(g);
  }

  function addEditMember() {
    const v = editNewMember.trim();
    if (!v || editMembers.includes(v)) return;
    setEditMembers(prev => [...prev, v]);
    setEditNewMember('');
  }

  function removeEditMember(name) {
    setEditMembers(prev => prev.filter(m => m !== name));
  }

  function saveEditGroup() {
    if (!editGroup) return;
    const name = editGroup.name.trim();
    const assigned_to = editGroup.assigned_to.trim();
    if (!name) { alert('Group Name is required'); return; }
    if (!assigned_to) { alert('Assigned To is required'); return; }

    if (!editGroup.id) {
      setToast({ show: true, message: 'Cannot update: group has no ID.' });
      setTimeout(() => setToast({ show: false, message: '' }), 3000);
      return;
    }

    const updated = { name, assigned_to, members: editMembers };

    fetch(`/api/groups/${editGroup.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    })
      .then(r => r.json())
      .then(body => {
        if (body && body.success) {
          setGroups(prev => prev.map((g, i) =>
            i === editGroup.index ? { ...g, ...updated } : g
          ));
          setToast({ show: true, message: `Group "${name}" updated successfully!` });
        } else {
          setToast({ show: true, message: body.message || 'Failed to update group.' });
        }
        setTimeout(() => setToast({ show: false, message: '' }), 3000);
        setEditGroup(null);
      })
      .catch(err => {
        console.error('Error updating group:', err);
        setToast({ show: true, message: 'Error connecting to server.' });
        setTimeout(() => setToast({ show: false, message: '' }), 3000);
        setEditGroup(null);
      });
  }

  // Sync communication options from storage when opening Actions modal
  useEffect(() => {
    if (showBlankModal) {
      setKindOptions(loadOptions(STORAGE_KEYS.kind, DEFAULT_KIND));
      setTypeOptions(loadOptions(STORAGE_KEYS.type, DEFAULT_TYPE));
      setInternalOfficeOptions(loadOptions(STORAGE_KEYS.internalOffice, DEFAULT_INTERNAL_OFFICE));
    }
  }, [showBlankModal]);

  function addKindOption() {
    const v = newKind.trim();
    if (!v || kindOptions.includes(v)) return;
    const next = [...kindOptions, v];
    setKindOptions(next);
    saveOptions(STORAGE_KEYS.kind, next);
    setNewKind('');
  }
  function removeKindOption(item) {
    const next = kindOptions.filter(k => k !== item);
    setKindOptions(next);
    saveOptions(STORAGE_KEYS.kind, next);
  }
  function addTypeOption() {
    const v = newType.trim();
    if (!v || typeOptions.includes(v)) return;
    const next = [...typeOptions, v];
    setTypeOptions(next);
    saveOptions(STORAGE_KEYS.type, next);
    setNewType('');
  }
  function removeTypeOption(item) {
    const next = typeOptions.filter(t => t !== item);
    setTypeOptions(next);
    saveOptions(STORAGE_KEYS.type, next);
  }
  function addInternalOfficeOption() {
    const v = newInternalOffice.trim();
    if (!v || internalOfficeOptions.includes(v)) return;
    const next = [...internalOfficeOptions, v];
    setInternalOfficeOptions(next);
    saveOptions(STORAGE_KEYS.internalOffice, next);
    setNewInternalOffice('');
  }
  function removeInternalOfficeOption(item) {
    const next = internalOfficeOptions.filter(o => o !== item);
    setInternalOfficeOptions(next);
    saveOptions(STORAGE_KEYS.internalOffice, next);
  }

  function saveGroup() {
    const gn = groupName.trim();
    const at = assignedTo.trim();
    if (!gn) {
      alert('Group Name is required');
      return;
    }
    if (!at) {
      alert('Assigned To is required');
      return;
    }

    // send to backend
    fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: gn, assignedTo: at, members, createdBy: null })
    })
      .then(r => {
        console.log('Response status:', r.status);
        return r.json();
      })
      .then(data => {
        console.log('Server returned:', data);
        // data should be the inserted group row
        const newGroup = {
          name: data.name || gn,
          assigned_to: data.assigned_to || at,
          members: data.members || members
        };
        setGroups(prev => [newGroup, ...prev]);
        setToast({ show: true, message: `Group "${gn}" saved successfully!` });
        setTimeout(() => setToast({ show: false, message: '' }), 3000);

        // Reset form
        setGroupName('');
        setAssignedTo('');
        setMembers([]);
        setNewMember('');
        setShowModal(false);
      })
      .catch(err => {
        console.error('Failed to save group:', err);
        setToast({ show: true, message: 'Error saving group!' });
        setTimeout(() => setToast({ show: false, message: '' }), 3000);
      });
  }

  useEffect(() => {
    // load existing groups
    fetch('/api/groups')
      .then(r => r.json())
      .then(data => {
        console.log('Loaded groups from API:', data);
        // Handle both array format and { groups: [...] } format
        const groupsList = Array.isArray(data) ? data : (data.groups || []);
        console.log('Parsed groups list:', groupsList);
        setGroups(groupsList);
      })
      .catch(err => {
        console.error('Failed to load groups', err);
        setGroups([]);
      });
  }, []);

  return (
    <div className="admin-main">
      <div className="admin-header">
        <div className="header-content">
          <h1>Assigned Management</h1>
          <p>Manage assignments and members</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn-add" onClick={() => setShowBlankModal(true)}>Options</button>
          <button className="btn-add" onClick={() => setShowModal(true)}>+ Add Group</button>

        </div>
      </div>

      <div className="groups-container">
        {groups.length === 0 && <p className="groups-empty-state">No groups created yet.</p>}
        <div className="groups-card-grid">
          {groups.map((g, i) => (
            <div key={i} className="groups-card" onClick={() => openOrgChart(g)}>
              <div className="groups-card-header">
                <div>
                  <div className="groups-card-title">{g.name || g.assigned_to}</div>
                  {g.assigned_to && (
                    <div className="groups-card-assigned-badge">
                      {g.assigned_to}
                    </div>
                  )}
                </div>
                {/* Edit icon */}
                <button
                  onClick={e => {
                    e.stopPropagation();
                    openEditGroup(g, i);
                  }}
                  title="Edit group"
                  style={{
                    background: '#eff6ff', border: 'none', borderRadius: 7,
                    color: '#2563eb', cursor: 'pointer',
                    padding: '5px 7px', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    transition: 'background 0.18s', flexShrink: 0
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#dbeafe'}
                  onMouseLeave={e => e.currentTarget.style.background = '#eff6ff'}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
              </div>

              <div className="groups-card-details">
                <label className="groups-card-members-label">
                  Members
                </label>
                <ul className="groups-members-list">
                  {(Array.isArray(g.members) ? g.members : []).length === 0 ? (
                    <li className="groups-members-empty">No members added</li>
                  ) : (
                    (Array.isArray(g.members) ? g.members : []).map((m, idx) => (
                      <li key={idx}>{m}</li>
                    ))
                  )}
                </ul>
              </div>

              <div className="groups-card-footer">
                <span className="groups-card-count">
                  {(Array.isArray(g.members) ? g.members : []).length} members
                </span>
                <span style={{ fontSize: '11px', color: '#d1d5db' }}>✓ Created</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showBlankModal && (
        <div className="modal-backdrop" onClick={() => setShowBlankModal(false)}>
          <div className="modal modal--actions" onClick={e => e.stopPropagation()}>
            <div className="modal-header modal--actions-header">
              <h2>Actions — Manage Communication Options</h2>
              <button className="modal-close" onClick={() => setShowBlankModal(false)}>✕</button>
            </div>
            <div className="modal-body modal--actions-body">
              <div className="actions-section">
                <label className="actions-label">Kind of Communication</label>
                <div className="actions-row">
                  <input value={newKind} onChange={e => setNewKind(e.target.value)} placeholder="Add option..." className="actions-input" />
                  <button type="button" onClick={addKindOption} className="actions-add-btn">Add</button>
                </div>
                <ul className="actions-list">
                  {kindOptions.map((item, i) => (
                    <li key={i} className="actions-list-item">
                      <span>{item}</span>
                      <button type="button" onClick={() => removeKindOption(item)} className="actions-remove">Delete</button>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="actions-section">
                <label className="actions-label">Type of Communication</label>
                <div className="actions-row">
                  <input value={newType} onChange={e => setNewType(e.target.value)} placeholder="Add option..." className="actions-input" />
                  <button type="button" onClick={addTypeOption} className="actions-add-btn">Add</button>
                </div>
                <ul className="actions-list">
                  {typeOptions.map((item, i) => (
                    <li key={i} className="actions-list-item">
                      <span>{item}</span>
                      <button type="button" onClick={() => removeTypeOption(item)} className="actions-remove">Delete</button>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="actions-section">
                <label className="actions-label">Internal Office</label>
                <div className="actions-row">
                  <input value={newInternalOffice} onChange={e => setNewInternalOffice(e.target.value)} placeholder="Add option..." className="actions-input" />
                  <button type="button" onClick={addInternalOfficeOption} className="actions-add-btn">Add</button>
                </div>
                <ul className="actions-list actions-list--tall">
                  {internalOfficeOptions.map((item, i) => (
                    <li key={i} className="actions-list-item">
                      <span>{item}</span>
                      <button type="button" onClick={() => removeInternalOfficeOption(item)} className="actions-remove">Delete</button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="modal--actions-footer">
              <button type="button" onClick={() => setShowBlankModal(false)} className="actions-close-btn">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Group Modal */}
      {editGroup && (
        <div className="modal-backdrop" onClick={() => setEditGroup(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Group</h2>
              <button className="modal-close" onClick={() => setEditGroup(null)}>✕</button>
            </div>
            <div className="modal-body">
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Group Name</label>
              <input
                value={editGroup.name}
                onChange={e => setEditGroup(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Software Team"
                style={{ width: '100%', padding: 8, border: '1px solid #d1d5db', borderRadius: 6, marginBottom: 12, boxSizing: 'border-box' }}
              />

              <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Assigned To</label>
              <input
                value={editGroup.assigned_to}
                onChange={e => setEditGroup(prev => ({ ...prev, assigned_to: e.target.value }))}
                placeholder="Assigned person or team"
                style={{ width: '100%', padding: 8, border: '1px solid #d1d5db', borderRadius: 6, boxSizing: 'border-box' }}
              />

              <div style={{ marginTop: 12 }}>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Members</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    value={editNewMember}
                    onChange={e => setEditNewMember(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addEditMember()}
                    placeholder="Member name"
                    style={{ flex: 1, padding: 8, border: '1px solid #d1d5db', borderRadius: 6 }}
                  />
                  <button type="button" onClick={addEditMember} style={{ padding: '8px 12px', borderRadius: 6, background: '#3b82f6', color: 'white', border: 'none' }}>Add</button>
                </div>
                <div style={{ maxHeight: 160, overflow: 'auto', marginTop: 10 }}>
                  {editMembers.length === 0 && <p style={{ color: '#6b7280' }}>No members added yet.</p>}
                  {editMembers.map((m, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f3f4f6' }}>
                      <div>{m}</div>
                      <button onClick={() => removeEditMember(m)} style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: '#fee2e2', color: '#b91c1c', cursor: 'pointer' }}>Remove</button>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
                <button onClick={() => setEditGroup(null)} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#f3f4f6', cursor: 'pointer' }}>Cancel</button>
                <button onClick={saveEditGroup} style={{ padding: '8px 12px', borderRadius: 6, background: '#2563eb', color: 'white', border: 'none', cursor: 'pointer' }}>Save Changes</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {orgChartGroup && (
        <div className="modal-backdrop" onClick={() => setOrgChartGroup(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Organizational Chart</h2>
              <button className="modal-close" onClick={() => setOrgChartGroup(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="org-chart">
                {/* Assignee at top */}
                <div className="org-node org-node--assignee">
                  <div className="org-node-avatar"></div>
                  <div className="org-node-title">{orgChartGroup.assigned_to || 'Unassigned'}</div>
                  <div className="org-node-role">Assignee</div>
                </div>
                <div className="org-connector org-connector--vertical"></div>
                {/* Members at bottom */}
                <div className="org-members">
                  {(Array.isArray(orgChartGroup.members) ? orgChartGroup.members : []).length === 0 ? (
                    <div className="org-node org-node--member org-node--empty">
                      <div className="org-node-avatar"></div>
                      <div className="org-node-title">No members</div>
                    </div>
                  ) : (
                    (Array.isArray(orgChartGroup.members) ? orgChartGroup.members : []).map((m, idx) => (
                      <div key={idx} className="org-node org-node--member">
                        <div className="org-node-avatar"></div>
                        <div className="org-node-title">{m}</div>
                        <div className="org-node-role">Member</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
            <div className="modal--actions-footer">
              <button type="button" onClick={() => setOrgChartGroup(null)} className="actions-close-btn">Close</button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Assigned Group</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Group Name</label>
              <input value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="e.g. Software Team" style={{ width: '100%', padding: 8, border: '1px solid #d1d5db', borderRadius: 6, marginBottom: 12 }} />

              <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Assigned To</label>
              <input value={assignedTo} onChange={e => setAssignedTo(e.target.value)} placeholder="Assigned person or team" style={{ width: '100%', padding: 8, border: '1px solid #d1d5db', borderRadius: 6 }} />

              <div style={{ marginTop: 12 }}>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Add Members</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input value={newMember} onChange={e => setNewMember(e.target.value)} placeholder="Member name" style={{ flex: 1, padding: 8, border: '1px solid #d1d5db', borderRadius: 6 }} />
                  <button type="button" onClick={addMember} style={{ padding: '8px 12px', borderRadius: 6, background: '#3b82f6', color: 'white', border: 'none' }}>Add</button>
                </div>

                <div style={{ maxHeight: 180, overflow: 'auto', marginTop: 10 }}>
                  {members.length === 0 && <p style={{ color: '#6b7280' }}>No members added yet.</p>}
                  {members.map((m, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f3f4f6' }}>
                      <div>{m}</div>
                      <div><button onClick={() => removeMember(m)} style={{ padding: '6px 10px', borderRadius: 6, border: 'none', background: '#fee2e2', color: '#b91c1c' }}>Delete</button></div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
                <button onClick={() => setShowModal(false)} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#f3f4f6' }}>Cancel</button>
                <button onClick={saveGroup} style={{ padding: '8px 12px', borderRadius: 6, background: '#10b981', color: 'white', border: 'none' }}>Save Group</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast.show && (
        <div style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          background: '#10b981',
          color: 'white',
          padding: '14px 20px',
          borderRadius: 8,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          zIndex: 9999,
          fontSize: 14,
          fontWeight: 500,
          animation: 'slideIn 0.3s ease-out'
        }}>
          ✓ {toast.message}
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
    </div>
  );
}
