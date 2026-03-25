import React, { useEffect, useState } from 'react';
import './Messages.css';
import UserSidebar from './sidebar';
import { useNavigate } from 'react-router-dom';
import { ReloadIcon } from '@radix-ui/react-icons';




export default function Messages() {
  const navigate = useNavigate();
  const goOverview = () => navigate('/user');

  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedThreadId, setSelectedThreadId] = useState(null);
  const [composerBody, setComposerBody] = useState('');
  const [debugData, setDebugData] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await fetch('/api/message');
        if (!res.ok) throw new Error('Fetch failed');
        const data = await res.json();
        setDebugData(data);
        if (!mounted) return;
        // Support API response: { success: true, data: [...] }
        const arr = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
        // Flatten messages; each message tracks its own is_read
        const msgs = arr.map(msg => ({
          id: msg.id,
          subject: msg.subject || msg.title || 'No Subject',
          from: msg.from || '',
          body: msg.body || '',
          created_at: msg.created_at || msg.updated_at,
          is_read: !!msg.is_read,
        }));
        setThreads(msgs);
      } catch (e) {
        if (mounted) setThreads([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  // toggle read/unread state on a message; pass `makeUnread` when you want to flip back to unread
  async function toggleRead(id, makeUnread = false) {
    // Optimistically update UI
    setThreads(prev => prev.map(m => m.id === id ? { ...m, is_read: !makeUnread } : m));
    try {
      await fetch(`/api/message/${id}/${makeUnread ? 'unread' : 'read'}`, { method: 'PATCH' });
    } catch (e) {
      // silently ignore network errors; UI already updated
    }
  }

  const [expandedId, setExpandedId] = useState(null);

  function toggleExpand(id) {
    setExpandedId(prev => {
      const opening = prev !== id;
      if (opening) {
        // if user opens an announcement that's currently unread, mark it read
        const msg = threads.find(m => m.id === id);
        if (msg && !msg.is_read) {
          toggleRead(id);
        }
      }
      return opening ? id : null;
    });
  }

  const ACCENT_COLORS = ['#6366f1','#0ea5e9','#f59e0b','#10b981','#ef4444','#8b5cf6'];

  function formatDateTime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
      + '  ·  '
      + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function getInitial(name) {
    return (name || '?')[0].toUpperCase();
  }

  // threads is now a flat array of messages
  const announcements = threads.map((m, i) => ({
    ...m,
    accent: ACCENT_COLORS[i % ACCENT_COLORS.length]
  }));

  return (
    <div className="user-page messages-page">
      <UserSidebar active={'messages'} />
      <main className="user-main messages-main">

        {/* ── Header ── */}
        <div className="ann-page-header">
          <div className="ann-header-left">
            <div>
              <h1>Announcements</h1>
              <p>Official messages &amp; notifications</p>
            </div>
          </div>
          <button className="btn-secondary btn-refresh" onClick={() => window.location.reload()}>
            <ReloadIcon style={{width:'16px', height:'16px', verticalAlign:'middle', marginRight:'4px'}} /> Refresh
          </button>
        </div>

        {/* ── Stats bar ── */}
        {!loading && announcements.length > 0 && (
          <div className="ann-stats-bar">
            <div className="ann-stat">
              <span className="ann-stat-num">{announcements.length}</span>
              <span className="ann-stat-lbl">Total</span>
            </div>
            <div className="ann-stat">
              <span className="ann-stat-num" style={{color:'#6366f1'}}>{announcements.filter(a => !a.is_read).length}</span>
              <span className="ann-stat-lbl">Unread</span>
            </div>
            <div className="ann-stat">
              <span className="ann-stat-num" style={{color:'#10b981'}}>{announcements.filter(a => a.is_read).length}</span>
              <span className="ann-stat-lbl">Read</span>
            </div>
          </div>
        )}

        {/* ── Content ── */}
        {loading ? (
          <div className="ann-loading">
            <div className="ann-loading-dot" /><div className="ann-loading-dot" /><div className="ann-loading-dot" />
          </div>
        ) : announcements.length === 0 ? (
          <div className="ann-empty">
            <span className="ann-empty-icon">📭</span>
            <p>No announcements</p>
            <span>You're all caught up!</span>
          </div>
        ) : (
          <div className="ann-feed">
            {announcements.map((a) => {
              const isExpanded = expandedId === a.id;
              return (
                <div
                  key={a.id}
                  className={`ann-card${!a.is_read ? ' ann-card-unread' : ''}${isExpanded ? ' ann-card-expanded' : ''}`}
                  style={{'--accent': a.accent}}
                  onClick={() => toggleExpand(a.id)}
                >
                  <div className="ann-card-accent" />
                  <div className="ann-card-body">
                    <div className="ann-card-top">
                      <div className="ann-avatar" style={{background: a.accent}}>{getInitial(a.subject)}</div>
                      <div className="ann-card-meta">
                        <div className="ann-card-subject">
                          {a.subject}
                          {!a.is_read && <span className="ann-new-badge">NEW</span>}
                        </div>
                        <div className="ann-card-from">
                          <span className="ann-from-label">From:</span> {a.from || 'Admin'}
                          <span className="ann-dot">·</span>
                          <span className="ann-card-date">{formatDateTime(a.created_at)}</span>
                        </div>
                      </div>
                      <div className="ann-card-right">
                        <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                          <span
                            className={`ann-read-icon${a.is_read ? ' read' : ' unread'}`}
                            title={a.is_read ? 'Read' : 'Unread'}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleRead(a.id, a.is_read);
                            }}
                            style={{ cursor: 'pointer' }}
                          >
                              {a.is_read
                              ? <svg viewBox="0 0 24 24" width="16" height="16" fill="none"><path d="M2 12l5 5L15 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/><path d="M9 12l5 5 7-9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                              : <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><circle cx="12" cy="12" r="5"/></svg>
                            }
                            <span>{a.is_read ? 'Read' : 'Unread'}</span>
                          </span>
                          <button 
                            className="ann-read-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleRead(a.id, a.is_read);
                            }}
                            title={a.is_read ? 'Mark unread' : 'Mark read'}
                            style={{
                              padding: '4px 8px',
                              background: a.is_read ? '#6b7280' : '#10b981',
                              color: 'white',
                              border: 'none',
                              borderRadius: '3px',
                              fontSize: '11px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              transition: 'background 0.2s',
                              whiteSpace: 'nowrap'
                            }}
                            onMouseOver={(e) => e.target.style.background = a.is_read ? '#4b5563' : '#059669'}
                            onMouseOut={(e) => e.target.style.background = a.is_read ? '#6b7280' : '#10b981'}
                          >
                            {a.is_read ? 'Mark Unread' : 'Mark Read'}
                          </button>
                        </div>
                        <div className={`ann-chevron${isExpanded ? ' ann-chevron-open' : ''}`}>▾</div>
                      </div>
                    </div>
                    <div className={`ann-card-text-wrap${isExpanded ? ' expanded' : ''}`}>
                      <p className="ann-card-text">{a.body}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
