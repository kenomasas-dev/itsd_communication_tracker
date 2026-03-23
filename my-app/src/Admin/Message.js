
import React, { useState, useEffect } from 'react';
import './Message.css';

/* ── helpers ──────────────────────────────────────────────────────── */
function getStatusMeta(status) {
  switch (status) {
    case 'sent':
      return { label: 'Sent', icon: '', cls: 'ac-sent', stripe: '#22c55e', iconBg: '#dcfce7', iconColor: '#16a34a' };
    case 'scheduled':
      return { label: 'Scheduled', icon: '', cls: 'ac-scheduled', stripe: '#f59e0b', iconBg: '#fef9c3', iconColor: '#ca8a04' };
    default:
      return { label: 'Draft', icon: '', cls: 'ac-draft', stripe: '#94a3b8', iconBg: '#f1f5f9', iconColor: '#64748b' };
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

/* ── component ────────────────────────────────────────────────────── */
export default function Message() {
  const [showModal, setShowModal] = useState(false);
  const [messages, setMessages] = useState([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [toast, setToast] = useState('');
  const [status, setStatus] = useState('draft');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetch('/api/message')
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.data)) setMessages(data.data);
      });
  }, []);

  async function handleAddMessage() {
    if (!title.trim() && !body.trim()) return;
    try {
      const res = await fetch('/api/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), body: body.trim(), status }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setMessages([data.data, ...messages]);
        setTitle(''); setBody(''); setStatus('draft');
        setShowModal(false);
        setToast('Announcement published successfully!');
        setTimeout(() => setToast(''), 2500);
      }
    } catch {
      alert('Failed to submit announcement.');
    }
  }

  const filtered = messages.filter(msg => {
    if (filterStatus !== 'all' && msg.status !== filterStatus) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (msg.title || '').toLowerCase().includes(q) || (msg.body || '').toLowerCase().includes(q);
  });

  return (
    <div className="admin-message-ui">

      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position: 'fixed', top: 28, right: 28,
          background: '#16a34a', color: '#fff',
          padding: '12px 24px', borderRadius: 10,
          fontSize: 15, fontWeight: 600,
          boxShadow: '0 4px 18px rgba(22,163,74,0.25)',
          zIndex: 2000,
        }}>
          ✔ {toast}
        </div>
      )}

      {/* ── Header bar ── */}
      <div className="admin-message-headerbar">
        <h2>Admin Announcements</h2>
        <button
          className="admin-message-btn"
          style={{ marginLeft: 'auto' }}
          onClick={() => setShowModal(true)}
        >
          ＋ New Announcement
        </button>
      </div>

      {/* ── Filter bar ── */}
      <div className="admin-message-filterbar">
        <input
          type="text"
          placeholder="Search announcements…"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{ minWidth: 240 }}
        />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="all">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="scheduled">Scheduled</option>
        </select>
      </div>

      {/* ── Card list ── */}
      <div className="admin-message-list">

        {/* Welcome banner */}
        <div className="admin-message-welcome">
          <div>
            <div className="welcome-title">Welcome to Admin Announcements</div>
            <div className="welcome-body">
              Compose and publish announcements, updates, or reminders to your entire team from here.
            </div>
          </div>
        </div>

        {/* Announcement cards */}
        {filtered.length === 0 ? (
          <div className="announcement-empty">
            <p>No announcements found. Create your first one!</p>
          </div>
        ) : (
          filtered.map(msg => {
            const meta = getStatusMeta(msg.status);
            return (
              <div className="announcement-card" key={msg.id}>
                <div className="ac-inner">
                  {/* coloured left stripe */}
                  <div className="ac-stripe" style={{ background: meta.stripe }} />

                  <div className="ac-body">
                    {/* title + badge row */}
                    <div className="ac-header">
                      <div className="ac-title">
                        {msg.title || <i style={{ color: '#94a3b8' }}>(No Title)</i>}
                      </div>
                      <span className={`ac-badge ${meta.cls}`}>
                        {meta.label}
                      </span>
                    </div>

                    {/* body text */}
                    <div className="ac-content">{msg.body}</div>

                    {/* footer */}
                    <div className="ac-footer">
                      <span>📅</span>
                      <span>{formatDate(msg.created_at) || 'No date'}</span>
                      <span className="ac-dot" />
                      <span>By Admin</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Add / New announcement modal ── */}
      {showModal && (
        <div className="admin-message-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="admin-message-modal" onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0, color: '#2563eb' }}>
              New Announcement
            </h3>

            <label style={{ fontWeight: 600, fontSize: 13, color: '#374151', display: 'block', marginBottom: 6 }}>
              Title
            </label>
            <input
              className="admin-message-title-input"
              type="text"
              placeholder="Announcement title…"
              value={title}
              onChange={e => setTitle(e.target.value)}
              autoFocus
              style={{ marginBottom: 14 }}
            />

            <label style={{ fontWeight: 600, fontSize: 13, color: '#374151', display: 'block', marginBottom: 6 }}>
              Message
            </label>
            <textarea
              className="admin-message-textarea"
              placeholder="Write your announcement here…"
              value={body}
              onChange={e => setBody(e.target.value)}
              style={{ marginBottom: 16 }}
            />

            <label htmlFor="status-select" style={{ fontWeight: 600, fontSize: 13, color: '#374151', display: 'block', marginBottom: 6 }}>
              Status
            </label>
            <select
              id="status-select"
              value={status}
              onChange={e => setStatus(e.target.value)}
              style={{ width: '100%', borderRadius: 8, border: '1.5px solid #e5e7eb', padding: '10px 12px', fontSize: 15, marginBottom: 20, fontFamily: 'inherit' }}
            >
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="scheduled">Scheduled</option>
            </select>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="admin-message-btn clear" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="admin-message-btn" onClick={handleAddMessage}>Publish</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
