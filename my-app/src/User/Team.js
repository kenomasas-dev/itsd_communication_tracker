import React, { useEffect, useMemo, useState } from 'react';
import './Team.css';
import UserSidebar from './sidebar';

export default function Team() {
  const [members, setMembers] = useState([]);
  const [query, setQuery] = useState('');
  const [viewGrid, setViewGrid] = useState(() => {
    const saved = localStorage.getItem('teamViewGrid');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);

  useEffect(() => {
    localStorage.setItem('teamViewGrid', JSON.stringify(viewGrid));
  }, [viewGrid]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        // Fetch groups data from the groups table
        const res = await fetch('/api/groups');
        if (!res.ok) throw new Error('Fetch failed');
        const data = await res.json();
        if (mounted) {
          // Map database fields to Team component fields
          const mappedMembers = data.groups.map(group => {
            // Parse members if it's a JSON string
            let membersStr = 'N/A';
            if (group.members) {
              if (typeof group.members === 'string') {
                try {
                  const membersArray = JSON.parse(group.members);
                  membersStr = Array.isArray(membersArray) ? membersArray.join(', ') : group.members;
                } catch {
                  membersStr = group.members;
                }
              } else if (Array.isArray(group.members)) {
                membersStr = group.members.join(', ');
              }
            }
            
            return {
              id: group.id,
              name: group.assigned_to || 'N/A',
              groupName: group.name || 'N/A',
              email: group.assigned_to || 'N/A',
              role: 'Group',
              office: 'Team Group',
              status: 'active',
              manager: group.assigned_to || 'N/A',
              skills: membersStr,
              phone: 'N/A',
              notes: 'N/A'
            };
          });
          setMembers(mappedMembers);
        }
      } catch (e) {
        console.warn('Could not fetch groups from API:', e);
        if (mounted) {
          setError('Failed to load team groups');
          setMembers([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  const filtered = useMemo(() => {
    const q = (query || '').toLowerCase().trim();
    if (!q) return members;
    return members.filter(m => (
      (m.name || '').toLowerCase().includes(q) ||
      (m.email || '').toLowerCase().includes(q) ||
      (m.role || '').toLowerCase().includes(q) ||
      (m.office || '').toLowerCase().includes(q)
    ));
  }, [members, query]);

  const getInitials = (name) => {
    return (name || '').split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
  };

  return (
    <div className="user-page team-page-wrapper">
      <UserSidebar active="team" onSelect={() => {}} />

      <main className="user-main">
        <div className="team-page">
      <header className="team-header">
        <div>
          <h2>Team</h2>
          <p className="muted">Manage and connect with your organisation members</p>
        </div>
      </header>

      <div className="team-controls">
        <input
          className="team-search"
          placeholder="Search name…"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />

        <div className="team-actions">
          <div className="view-toggle">
            <button className={`toggle-btn ${viewGrid ? 'active' : ''}`} onClick={() => setViewGrid(true)}>Grid</button>
            <button className={`toggle-btn ${!viewGrid ? 'active' : ''}`} onClick={() => setViewGrid(false)}>Table</button>
          </div>
        </div>
      </div>

      {error && <div className="team-error">{error}</div>}

      {loading ? (
        <div className="team-loading">Loading team members…</div>
      ) : (
        viewGrid ? (
          <div className="team-grid">
            {filtered.map(m => (
              <div key={m.id} className="member-card">
                <div className="member-top">
                  <div className="avatar">{getInitials(m.name)}</div>
                  <div className="member-main">
                    <div className="member-name">{m.name}</div>
                    <div className="member-sub">{m.role} • {m.office}</div>
                  </div>
                  <div className="status-indicator" style={{backgroundColor: m.status === 'online' ? '#10b981' : m.status === 'away' ? '#f59e0b' : '#9ca3af'}}></div>
                </div>

                <button 
                  className="view-member-btn"
                  onClick={() => setSelectedMember(selectedMember?.id === m.id ? null : m)}
                >
                  {selectedMember?.id === m.id ? 'Hide Details' : 'View Details'}
                </button>

                {selectedMember?.id === m.id && (
                  <div className="member-details">
                    <div className="detail-row"><strong>Members:</strong></div>
                    <div className="detail-row">{m.skills || '—'}</div>
                    <div className="detail-row"><strong>Assigned To:</strong> {m.manager || '—'}</div>
                    <div className="detail-row"><strong>Status:</strong> <span className={`status-badge ${m.status}`}>{m.status.toUpperCase()}</span></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="team-table-wrap">
            <table className="team-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Assignee</th>
                  <th>Members</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(m => (
                  <tr key={m.id}>
                    <td>{m.groupName}</td>
                    <td>{m.name}</td>
                    <td>{m.skills}</td>
                    <td><span className={`status-dot ${m.status}`}></span>{m.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
        </div>
      </main>
    </div>
  );
}
