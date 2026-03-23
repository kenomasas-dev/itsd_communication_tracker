import React, { useState, useRef, useEffect } from 'react';
import './Dashboard.css';
import { loadAndApplyAdminColor } from '../themeColors';

export default function Dashboard() {
  const [expanded, setExpanded] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAttachmentModal, setShowAttachmentModal] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState(null);
  const [attachmentsList, setAttachmentsList] = useState([]);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailItem, setDetailItem] = useState(null);
  const [showCombinedModal, setShowCombinedModal] = useState(false);
  const [combinedItem, setCombinedItem] = useState(null);
  const [selectedInlineIdx, setSelectedInlineIdx] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [pageSize, setPageSize] = useState(1000);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('All');
  const [approvalFilter, setApprovalFilter] = useState('All');

  // Load and apply saved admin color theme
  useEffect(() => {
    loadAndApplyAdminColor();
  }, []);

  // Backend serves uploads on port 5000; frontend may be on another port — resolve so view/download works
  const API_BASE = 'http://localhost:5000';
  const getAttachmentUrl = (href) => {
    if (!href) return '';
    const s = typeof href === 'string' ? href : String(href);
    if (s.startsWith('http://') || s.startsWith('https://')) return s;
    const path = s.startsWith('/') ? s : '/' + s;
    const encodedPath = path.split('/').map(seg => seg ? encodeURIComponent(seg) : '').join('/') || '/';
    return API_BASE + encodedPath;
  };

  const getFilenameFromPath = (path) => {
    if (!path || typeof path !== 'string') return null;
    try {
      const decoded = decodeURIComponent(path);
      const segment = decoded.split('/').filter(Boolean).pop();
      return segment || null;
    } catch (e) { return null; }
  };

  const stripVersionFromName = (name) => {
    if (!name || typeof name !== 'string') return name;
    return name.replace(/(_V\d+)(?=\.[^.]+$)/i, '');
  };

  const isV2Attachment = (att) => {
    if (!att) return false;
    const url = att.url || att.path || att.filePath || (typeof att === 'string' ? att : '');
    const rawName = att.name || att.originalName || att.attachment_name || att.attachment_filename || att.filename || getFilenameFromPath(url) || '';
    if (!rawName) return false;
    return /_V2(?=\.[^.]+$)/i.test(rawName);
  };

  const normalizeAttachment = (att) => {
    if (!att) return { name: 'Attachment', url: '', size: null, displayName: 'Attachment' };
    const url = att.url || att.path || att.filePath || (typeof att === 'string' ? att : '');
    const rawName = att.name || att.originalName || att.attachment_name || att.attachment_filename || att.filename || getFilenameFromPath(url) || 'Attachment';
    const displayName = stripVersionFromName(rawName);
    const size = att.size != null ? att.size : null;
    return { name: rawName, displayName, url, size };
  };

  // Fetch communications from database
  const fetchCommunications = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/communications');
      const data = await response.json();

      // Transform database data to dashboard format
      const transformedItems = data.map((comm) => {
        return {
          id: comm.id,
          tracking: comm.tracking_id || `ITSD-${new Date(comm.communication_date || Date.now()).getFullYear()}-${String(comm.id).padStart(6, '0')}`,
          title: comm.subject,
          excerpt: comm.details.substring(0, 100) + (comm.details.length > 100 ? '...' : ''),
          date: new Date(comm.communication_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
          office: comm.organization,
          author: comm.received_by || 'Unassigned',
          kind: comm.kind_of_communication,
          tags: comm.tags ? comm.tags.split(',') : [],
          badges: [comm.priority_level ? comm.priority_level.charAt(0).toUpperCase() + comm.priority_level.slice(1) : 'Medium',
          comm.follow_up_required ? 'Follow-up: Required' : 'Follow-up: Completed'],
          assigned: comm.assigned_to ? [comm.assigned_to] : [],
          // Keep only V2 attachments for grid and modal display per feature request
          attachmentFiles: (() => {
            const allAttachments = comm.attachments ? (typeof comm.attachments === 'string' ? JSON.parse(comm.attachments) : comm.attachments) : [];
            if (!Array.isArray(allAttachments)) return [];
            return allAttachments.filter(isV2Attachment);
          })(),
          // Count only non-V2 attachments (do not count V2)
          attachmentCount: (() => {
            const files = comm.attachments ? (typeof comm.attachments === 'string' ? JSON.parse(comm.attachments) : comm.attachments) : [];
            if (!Array.isArray(files)) return 0;
            return files.filter((att) => !isV2Attachment(att)).length;
          })(),
          status: [comm.direction ? comm.direction.charAt(0).toUpperCase() + comm.direction.slice(1) : 'Incoming', comm.status ? comm.status.charAt(0).toUpperCase() + comm.status.slice(1) : 'Pending'],
          created: new Date(comm.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
          updated: new Date(comm.updated_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        };
      });

      setItems(transformedItems);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching communications:', err);
      setError('Failed to load communications');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommunications();
  }, []);

  // derive filtered and paged items
  const q = searchQuery.trim().toLowerCase();
  const filteredItems = items.filter((it) => {
    // approval filter (Pending/Approved)
    if (approvalFilter && approvalFilter !== 'All') {
      const af = approvalFilter.toLowerCase();
      const finalStatus = (it.status && it.status[1] ? it.status[1].toLowerCase() : '');
      if (!finalStatus.includes(af)) return false;
    }

    // status filter (Incoming/Outgoing/ITSD)
    if (statusFilter && statusFilter !== 'All') {
      const sf = statusFilter.toLowerCase();
      if (sf === 'itsd') {
        if (!(it.tracking && it.tracking.toLowerCase().includes('itsd'))) return false;
      } else {
        // check direction inside status array (e.g., 'Incoming' / 'Outgoing')
        const directions = (it.status || []).map(s => s.toLowerCase());
        if (!directions.some(d => d.includes(sf))) return false;
      }
    }

    // search query filter
    if (!q) return true;
    const inTitle = it.title && it.title.toLowerCase().includes(q);
    const inTracking = it.tracking && it.tracking.toLowerCase().includes(q);
    const inOffice = it.office && it.office.toLowerCase().includes(q);
    const inDetails = it.details && it.details.toLowerCase().includes(q);
    const inTags = (it.tags || []).join(' ').toLowerCase().includes(q);
    return inTitle || inTracking || inOffice || inDetails || inTags;
  }).sort((a, b) => {
    // Sort: pending items first, then approved items sorted by created_at descending
    const aPending = a.status && a.status[1] ? a.status[1].toLowerCase() === 'pending' : false;
    const bPending = b.status && b.status[1] ? b.status[1].toLowerCase() === 'pending' : false;
    
    if (aPending !== bPending) {
      return aPending ? -1 : 1; // pending first
    }
    
    // Both are same status, sort by created_at or communication_date descending (newest first)
    const aDate = new Date(a.created_at || a.communication_date || 0);
    const bDate = new Date(b.created_at || b.communication_date || 0);
    return bDate - aDate;
  });

  const totalItems = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // keep currentPage within bounds when filters/pageSize change
  useEffect(() => {
    const tp = Math.max(1, Math.ceil(filteredItems.length / pageSize));
    if (currentPage > tp) setCurrentPage(tp);
  }, [filteredItems.length, pageSize, currentPage]);
  const startIndex = (currentPage - 1) * pageSize;
  const pagedItems = filteredItems.slice(startIndex, startIndex + pageSize);

  function toggle(id) {
    setExpanded(prev => (prev === id ? null : id));
  }

  const openRef = useRef(null);

  useEffect(() => {
    function handleDown(e) {
      if (!openRef.current) return;
      if (!openRef.current.contains(e.target)) {
        setExpanded(null);
      }
    }

    function handleKey(e) {
      if (e.key === 'Escape') setExpanded(null);
    }

    document.addEventListener('mousedown', handleDown);
    document.addEventListener('touchstart', handleDown);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleDown);
      document.removeEventListener('touchstart', handleDown);
      document.removeEventListener('keydown', handleKey);
    };
  }, []);

  return (
    <div className="dashboard-page">
      <div className="main">
        <div className="topbar">
          <div className="header-content">
            <h1 className="topbar-title">Communications</h1>
            <p>Manage and track communications</p>
          </div>
          <button
            className="btn-refresh"
            onClick={fetchCommunications}
            title="Refresh communications"
          >
            ↻ Refresh
          </button>
        </div>

        <main className="container">
          <div className="dashboard-toolbar">
            <input
              type="text"
              placeholder="Search communications..."
              className="search-box"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            />
            <select
              className="filter-select"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            >
              <option value="All">All Directions</option>
              <option value="Incoming">Incoming</option>
              <option value="Outgoing">Outgoing</option>
              <option value="ITSD">ITSD</option>
            </select>
            <select
              className="filter-select"
              value={approvalFilter}
              onChange={(e) => { setApprovalFilter(e.target.value); setCurrentPage(1); }}
            >
              <option value="All">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
            <select
              className="filter-select"
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
            >
              <option value={5}>Show 5</option>
              <option value={10}>Show 10</option>
              <option value={15}>Show 15</option>
              <option value={20}>Show 20</option>
              <option value={30}>Show 30</option>
              <option value={50}>Show 50</option>
              <option value={1000}>Show All</option>
            </select>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                className="pagination-btn"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                ← Prev
              </button>
              <span style={{ color: '#6b7280', fontSize: '14px', fontWeight: '500', minWidth: '100px', textAlign: 'center' }}>
                Page {currentPage} of {totalPages}
              </span>
              <button
                className="pagination-btn"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                Next →
              </button>
            </div>
          </div>
          <div className="top-pagination"></div>
          {loading && <div style={{ textAlign: 'center', padding: '40px' }}>Loading communications...</div>}
          {error && <div style={{ textAlign: 'center', padding: '40px', color: 'red' }}>{error}</div>}
          {!loading && !error && items.length === 0 && <div style={{ textAlign: 'center', padding: '40px' }}>No communications found</div>}

          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>#</th>
                  <th>Tracking_ID</th>
                  <th>Communications</th>
                  <th>Direction</th>
                  <th>Assigned</th>
                  <th>Status</th>
                  <th style={{ width: '40px' }}></th>
                </tr>
              </thead>
              <tbody>
                {pagedItems.map((it, idx) => {
                  const displayIndex = startIndex + idx + 1;
                  const isApproved = it.status && it.status[1] && it.status[1].toLowerCase() === 'approved';
                  return (
                    <tr key={it.id} className="data-row" style={isApproved ? { backgroundColor: '#f0fdf4' } : {}}>
                      <td>{displayIndex}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <span style={{ color: '#2563eb', fontWeight: 600 }}>{it.tracking}</span>
                        {it.status && it.status[1] && it.status[1].toLowerCase() === 'approved' && (
                          <span style={{ marginLeft: '8px', color: '#059669', fontWeight: 600, fontSize: '12px' }}>✓ Done</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'left', paddingLeft: '40px' }}>
                        <div>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>{it.title}</div>
                        </div>
                      </td>
                      <td>
                        {it.status && it.status[0] ? (
                          <span style={{
                            color: it.status[0].toLowerCase() === 'incoming'
                              ? '#059669'
                              : it.status[0].toLowerCase() === 'outgoing'
                                ? '#2563eb'
                                : 'inherit',
                            fontWeight: 600,
                          }}>
                            {it.status[0]}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>{(it.assigned && it.assigned.length > 0) ? it.assigned.join(', ') : '—'}</td>
                      <td>
                        {it.status && it.status[1] ? (
                          <span style={{
                            color: it.status[1].toLowerCase() === 'pending'
                              ? '#f59e0b'
                              : it.status[1].toLowerCase() === 'rejected'
                                ? '#dc2626'
                                : it.status[1].toLowerCase() === 'approved'
                                  ? '#059669'
                                  : 'inherit',
                            fontWeight: it.status[1].toLowerCase() === 'pending' || it.status[1].toLowerCase() === 'rejected' ? 600 : it.status[1].toLowerCase() === 'approved' ? 600 : 500,
                          }}>
                            {it.status[1]}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center' }}>
                          <button
                            className="icon-btn ghost"
                            onClick={() => { setCombinedItem(it); setSelectedInlineIdx(0); setShowCombinedModal(true); }}
                            title="View details & attachments"
                            aria-label="View details and attachments"
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </main>
      </div>

      {/* Combined View + Attachments Modal */}
      {showCombinedModal && combinedItem && (
        <div className="modal-overlay" onClick={() => setShowCombinedModal(false)}>
          <div className="combined-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="combined-modal-header">
              <div>
                <h2>Communication Details</h2>
                <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>{combinedItem.title}</p>
              </div>
              <button className="modal-close" onClick={() => setShowCombinedModal(false)}>✕</button>
            </div>
            <div className="combined-modal-body">

              {/* LEFT — Details Panel */}
              <div className="combined-panel details-panel" style={{ overflowY: 'auto' }}>
                <div className="combined-panel-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>📋 Details</span>
                  {(() => {
                    const daysInQueue = combinedItem.created ? Math.max(0, Math.floor((new Date() - new Date(combinedItem.created)) / (1000 * 60 * 60 * 24))) : 0;
                    const combinedStatus = combinedItem.status && combinedItem.status[1] ? combinedItem.status[1].toLowerCase() : 'pending';
                    if (combinedStatus === 'pending') {
                      if (daysInQueue >= 3) {
                        return <span style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>⚠️ {daysInQueue} Days in Queue (Bottleneck)</span>;
                      } else {
                        return <span style={{ backgroundColor: '#fef3c7', color: '#92400e', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '600' }}>⏱️ {daysInQueue} Days in Queue</span>;
                      }
                    }
                    return null;
                  })()}
                </div>

                {/* Visual Progress Timeline ("Pizza Tracker") */}
                <div className="workflow-timeline" style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', marginBottom: '24px', marginTop: '16px', padding: '0 10px' }}>
                  <div style={{ position: 'absolute', top: '12px', left: '10%', right: '10%', height: '3px', backgroundColor: '#e5e7eb', zIndex: 0 }}>
                    {(() => {
                      const combinedStatus = combinedItem.status && combinedItem.status[1] ? combinedItem.status[1].toLowerCase() : 'pending';
                      const width = combinedStatus === 'approved' ? '100%' : (combinedStatus === 'rejected' ? '50%' : '50%');
                      const bg = combinedStatus === 'approved' ? '#10b981' : (combinedStatus === 'rejected' ? '#ef4444' : '#3b82f6');
                      return <div style={{ height: '100%', backgroundColor: bg, width: width, transition: 'width 0.5s ease-in-out', borderRadius: '3px' }}></div>;
                    })()}
                  </div>
                  {[
                    { label: 'Submitted', done: true },
                    { label: 'In Review', done: (combinedItem.status && combinedItem.status[1]) ? (combinedItem.status[1].toLowerCase() === 'approved' || combinedItem.status[1].toLowerCase() === 'rejected') : false, current: (combinedItem.status && combinedItem.status[1] ? combinedItem.status[1].toLowerCase() === 'pending' : true) },
                    { label: (combinedItem.status && combinedItem.status[1] && combinedItem.status[1].toLowerCase() === 'rejected') ? 'Rejected' : 'Marked As Done', done: (combinedItem.status && combinedItem.status[1]) ? (combinedItem.status[1].toLowerCase() === 'approved' || combinedItem.status[1].toLowerCase() === 'rejected') : false, current: (combinedItem.status && combinedItem.status[1]) ? (combinedItem.status[1].toLowerCase() === 'approved' || combinedItem.status[1].toLowerCase() === 'rejected') : false }
                  ].map((step, idx) => {
                    const combinedStatus = combinedItem.status && combinedItem.status[1] ? combinedItem.status[1].toLowerCase() : 'pending';
                    const isRejected = combinedStatus === 'rejected';
                    const isDoneColor = isRejected && idx === 2 ? '#ef4444' : '#10b981';
                    return (
                      <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1, position: 'relative', width: '33%' }}>
                        <div style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: step.done ? isDoneColor : (step.current ? '#3b82f6' : '#fff'), border: `2px solid ${step.done ? isDoneColor : (step.current ? '#3b82f6' : '#e5e7eb')}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: step.done || step.current ? '#fff' : '#9ca3af', fontWeight: 'bold', fontSize: '11px', marginBottom: '6px', boxShadow: step.current ? '0 0 0 3px rgba(59, 130, 246, 0.2)' : 'none' }}>
                          {step.done ? '✓' : idx + 1}
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: step.current ? '700' : '500', color: step.current ? '#111827' : '#6b7280', textAlign: 'center', whiteSpace: 'nowrap' }}>{step.label}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="detail-row">
                  <div className="detail-label">Subject</div>
                  <div className="detail-value" style={{ fontWeight: 700 }}>{combinedItem.title}</div>
                </div>
                <div className="detail-row">
                  <div className="detail-label">Tracking</div>
                  <div className="detail-value">{combinedItem.tracking}</div>
                </div>
                <div className="detail-row">
                  <div className="detail-label">Organization</div>
                  <div className="detail-value">{combinedItem.office || '—'}</div>
                </div>
                <div className="detail-row">
                  <div className="detail-label">Received / Released</div>
                  <div className="detail-value">{combinedItem.author || '—'}</div>
                </div>
                <div className="detail-row">
                  <div className="detail-label">Assigned</div>
                  <div className="detail-value">{(combinedItem.assigned && combinedItem.assigned.length > 0) ? combinedItem.assigned.join(', ') : '—'}</div>
                </div>
                <div className="detail-row">
                  <div className="detail-label">Direction</div>
                  <div className="detail-value">{combinedItem.status && combinedItem.status[0] ? combinedItem.status[0] : '—'}</div>
                </div>
                <div className="detail-row">
                  <div className="detail-label">Status</div>
                  <div className="detail-value">{combinedItem.status && combinedItem.status[1] ? combinedItem.status[1] : '—'}</div>
                </div>
                <div className="detail-row">
                  <div className="detail-label">Details</div>
                  <div className="detail-value">{combinedItem.excerpt}</div>
                </div>
                {combinedItem.tags && combinedItem.tags.length > 0 && (
                  <div className="detail-row">
                    <div className="detail-label">Tags</div>
                    <div className="detail-value" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {combinedItem.tags.map(t => <span key={t} className="tag">{t}</span>)}
                    </div>
                  </div>
                )}
                <div className="detail-timestamps">
                  <span>Created: {combinedItem.created || '—'}</span>
                  <span>Updated: {combinedItem.updated || '—'}</span>
                </div>
              </div>

              {/* RIGHT — Inline Attachment Preview Panel */}
              <div className="combined-panel attachments-panel">
                <div className="combined-panel-title">📎 Attachments</div>
                {combinedItem.attachmentFiles && combinedItem.attachmentFiles.length > 0 ? (() => {
                  const v2AttachmentFiles = (combinedItem.attachmentFiles || []).filter(isV2Attachment);
                  const attFiles = v2AttachmentFiles;

                  if (attFiles.length === 0) {
                    return (
                      <div className="no-attachments">
                        <div style={{ fontSize: 36, marginBottom: 8 }}>📭</div>
                        <div style={{ color: '#94a3b8', fontSize: 14 }}>
                          No version 2 attachments found for this communication.
                        </div>
                      </div>
                    );
                  }

                  const activeIndex = selectedInlineIdx >= attFiles.length ? 0 : selectedInlineIdx;
                  const activeNorm = normalizeAttachment(attFiles[activeIndex]);
                  const activeUrl = getAttachmentUrl(activeNorm.url);
                  const nameLower = (activeNorm.name || '').toLowerCase();
                  const urlLower = (activeNorm.url || '').toLowerCase();
                  const isImage = /\.(png|jpe?g|gif|webp|bmp)$/i.test(nameLower) || /\.(png|jpe?g|gif|webp|bmp)$/i.test(urlLower);
                  const isViewable = /\.(pdf|docx?|txt|csv|json|xml|html)$/i.test(nameLower) || /\.(pdf|docx?|txt|csv|json|xml|html)$/i.test(urlLower);
                  return (
                    <div className="inline-attachment-viewer">
                      {/* File tabs — only show if more than 1 attachment */}
                      {attFiles.length > 1 && (
                        <div className="inline-att-tabs">
                          {attFiles.map((att, idx) => {
                            const n = normalizeAttachment(att);
                            const tabLabel = n.displayName || n.name;
                            return (
                              <button
                                key={idx}
                                className={`inline-att-tab${activeIndex === idx ? ' active' : ''}`}
                                onClick={() => setSelectedInlineIdx(idx)}
                                title={n.name}
                              >
                                📄 {tabLabel.length > 16 ? tabLabel.substring(0, 14) + '…' : tabLabel}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* File name bar */}
                      <div className="inline-att-bar">
                        <span className="inline-att-name">📎 {activeNorm.displayName || activeNorm.name}</span>
                        <a href={activeUrl} target="_blank" rel="noopener noreferrer" className="inline-att-open">Open ↗</a>
                      </div>

                      {/* Inline preview */}
                      <div className="inline-att-preview">
                        {isImage && (
                          <img src={activeUrl} alt={activeNorm.name} className="inline-att-img" />
                        )}
                        {!isImage && isViewable && (
                          <iframe src={activeUrl} title={activeNorm.name} className="inline-att-iframe" />
                        )}
                        {!isImage && !isViewable && (
                          <div className="inline-att-unsupported">
                            <div style={{ fontSize: 40, marginBottom: 12 }}>📄</div>
                            <div style={{ fontWeight: 600, color: '#334155', marginBottom: 6 }}>{activeNorm.name}</div>
                            <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 16 }}>Preview not available for this file type.</div>
                            <a href={activeUrl} target="_blank" rel="noopener noreferrer" className="btn">Open in new tab</a>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })() : (
                  <div className="no-attachments">
                    <div style={{ fontSize: 36, marginBottom: 8 }}>📭</div>
                    <div style={{ color: '#94a3b8', fontSize: 14 }}>No attachments</div>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Attachment Preview Modal - view attachment inside (image / PDF-docs iframe) */}
      {showPreviewModal && previewAttachment && (() => {
        const displayUrl = getAttachmentUrl(previewAttachment.url);
        const name = (previewAttachment.name || '').toLowerCase();
        const urlLower = (previewAttachment.url || '').toLowerCase();
        const isImage = /\.(png|jpe?g|gif|webp|bmp)$/i.test(name) || /\.(png|jpe?g|gif|webp|bmp)$/i.test(urlLower);
        const isViewableInIframe = /\.(pdf|docx?|txt|csv|json|xml|html)$/i.test(name) || /\.(pdf|docx?|txt|csv|json|xml|html)$/i.test(urlLower);
        return (
          <div className="modal-overlay" onClick={() => setShowPreviewModal(false)}>
            <div className="preview-modal-content preview-modal-view" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>View Attachment</h2>
                <button className="modal-close" onClick={() => setShowPreviewModal(false)}>✕</button>
              </div>
              <div className="preview-modal-bar">
                <span className="preview-modal-filename">📎 {previewAttachment.name}</span>
                <a href={displayUrl} target="_blank" rel="noopener noreferrer" className="preview-modal-open-tab">Open in new tab</a>
              </div>
              <div className="preview-modal-body">
                {isImage && (
                  <div className="preview-container">
                    <img src={displayUrl} alt={previewAttachment.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 8 }} />
                  </div>
                )}
                {!isImage && isViewableInIframe && (
                  <div className="preview-container preview-iframe-wrap">
                    <iframe src={displayUrl} title={previewAttachment.name} className="preview-iframe" />
                  </div>
                )}
                {!isImage && !isViewableInIframe && (
                  <div className="preview-container">
                    <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280', fontSize: 14 }}>
                      <p style={{ marginBottom: 8 }}>Preview not available for this file type.</p>
                      <p style={{ marginBottom: 16 }}>Use &quot;Open in new tab&quot; above to view or download.</p>
                      <a href={displayUrl} target="_blank" rel="noopener noreferrer" className="btn">Open in new tab</a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
