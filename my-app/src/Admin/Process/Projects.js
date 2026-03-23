import React, { useState, useEffect } from 'react';
import './Projects.css';
import { useNavigate } from 'react-router-dom';
import { LayoutGrid, List } from 'lucide-react';

export default function Projects() {
  const [active, setActive] = useState('projects');
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [viewingAttachment, setViewingAttachment] = useState(null);
  const [showAttachmentModal, setShowAttachmentModal] = useState(false);
  const [editingAttachmentIndex, setEditingAttachmentIndex] = useState(null);
  const [editText, setEditText] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [uploadAttachmentIndex, setUploadAttachmentIndex] = useState(null);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [completedDocumentUpload, setCompletedDocumentUpload] = useState(null);
  const [activeModalTab, setActiveModalTab] = useState('details');
  const [auditLogs, setAuditLogs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [receivedByList, setReceivedByList] = useState(() => {
    try {
      const raw = localStorage.getItem('received_list');
      return raw ? JSON.parse(raw) : ['Aldrin Constantino', 'Jenny Rose Navarra', 'Imelda Badili'];
    } catch (e) {
      return ['Aldrin Constantino', 'Jenny Rose Navarra', 'Imelda Badili'];
    }
  });
  const [receivedByFilter, setReceivedByFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const fileInputRef = React.useRef(null);

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
      return decoded.split('/').filter(Boolean).pop() || null;
    } catch (e) { return null; }
  };
  const getAttachmentDisplayName = (att, href) => {
    if (!att) return getFilenameFromPath(href) || 'Attachment';
    const name = att.name || att.originalName || att.attachment_name || att.attachment_filename || att.filename;
    return name || getFilenameFromPath(href) || 'Attachment';
  };

  const parseAttachments = (attachmentsData) => {
    if (!attachmentsData) return [];
    if (Array.isArray(attachmentsData)) return attachmentsData;
    if (typeof attachmentsData === 'string') {
      try {
        return JSON.parse(attachmentsData);
      } catch (e) {
        return [];
      }
    }
    return [];
  };

  const recordAuditLog = async (action, description, userRole = 'Admin') => {
    try {
      const storedAdmin = localStorage.getItem('adminUser');
      const storedUser = localStorage.getItem('user');
      let userEmail = 'Unknown';
      if (storedAdmin) {
        try { const parsed = JSON.parse(storedAdmin); userEmail = parsed.name || parsed.email || userEmail; } catch (e) { }
      } else if (storedUser) {
        try { const parsed = JSON.parse(storedUser); userEmail = parsed.name || parsed.email || userEmail; } catch (e) { }
      }
      await fetch('/api/auth/record-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, user_email: userEmail, user_role: userRole, description }),
      });
    } catch (err) {
      console.warn('Audit log failed:', err);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/communications');
        if (!response.ok) {
          throw new Error('Failed to fetch communications');
        }
        const data = await response.json();
        setItems(data);

        const uniqueReceivedBy = [...new Set(data.map(item => item.received_by).filter(Boolean))];
        if (uniqueReceivedBy.length > 0) {
          setReceivedByList(uniqueReceivedBy);
          localStorage.setItem('received_list', JSON.stringify(uniqueReceivedBy));
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load projects');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (showModal && selected) {
      setActiveModalTab('details');
      fetch('/api/auth/audit-logs')
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data)) {
            setAuditLogs(data.filter(log => log.description && log.description.includes(selected.tracking_id)));
          }
        })
        .catch(err => console.error(err));
      // Log view action directly using fetch instead of recordAuditLog wrapper since it doesn't exist here
      fetch('/api/auth/record-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'VIEW',
          user_email: 'Admin',
          user_role: 'Admin',
          description: `Viewed document details for ${selected.tracking_id}`
        })
      }).catch(e => console.error(e));
    }
  }, [showModal, selected]);

  const handleApprove = async () => {
    if (!selected) return;

    // Check if a completed document file has been uploaded
    if (!completedDocumentUpload) {
      setError('You must upload a completed document file before you can mark this communication as done.');
      return;
    }

    setIsApproving(true);
    try {
      const res = await fetch(`/api/communications/approve/${selected.id}`, { method: 'PUT' });
      if (!res.ok) throw new Error(`Approval failed: ${res.status}`);
      const updatedItem = await res.json();

      setItems(items.map(item => item.id === selected.id ? updatedItem : item));
      setSelected(updatedItem);
      setCompletedDocumentUpload(null);
      setError('');

      recordAuditLog('PROJECT_APPROVED', `Approved project/communication #${selected.id}${selected.subject ? `: "${selected.subject}"` : ''}`, 'Admin');
    } catch (err) {
      console.error('Approval error:', err);
      setError('Failed to approve communication: ' + err.message);
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    if (!selected) return;

    setIsRejecting(true);
    try {
      const res = await fetch(`/api/communications/reject/${selected.id}`, { method: 'PUT' });
      if (!res.ok) throw new Error(`Rejection failed: ${res.status}`);
      const updatedItem = await res.json();

      setItems(items.map(item => item.id === selected.id ? updatedItem : item));
      setSelected(updatedItem);
      setError('');

      recordAuditLog('PROJECT_REJECTED', `Rejected project/communication #${selected.id}${selected.subject ? `: "${selected.subject}"` : ''}`, 'Admin');
    } catch (err) {
      console.error('Rejection error:', err);
      setError('Failed to reject communication: ' + err.message);
    } finally {
      setIsRejecting(false);
    }
  };

  useEffect(() => {
    const fetchCommunications = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch('/api/communications');
        if (!res.ok) throw new Error(`Server responded ${res.status}`);
        const data = await res.json();
        setItems(data || []);
      } catch (err) {
        console.error('Failed to load communications:', err);
        setError('Unable to load communications');
      } finally {
        setLoading(false);
      }
    };

    fetchCommunications();
  }, []);

  const handleFileUpload = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file || !selected) {
      setUploadError('Please select a file');
      return;
    }

    setIsUploading(true);
    setUploadError('');
    setUploadSuccess('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('communicationId', selected.id);
      const index = viewingAttachment?.index !== undefined ? viewingAttachment.index : (uploadAttachmentIndex !== null ? uploadAttachmentIndex : 0);
      formData.append('attachmentIndex', index);

      const res = await fetch('/api/communications/upload', { method: 'POST', body: formData });
      if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
      const updatedItem = await res.json();

      setItems(items.map(item => item.id === selected.id ? updatedItem : item));
      setSelected(updatedItem);
      setUploadSuccess('File uploaded successfully!');
      setCompletedDocumentUpload(file); // Track the uploaded file for approval
      setUploadFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setUploadAttachmentIndex(null);

      setTimeout(() => setUploadSuccess(''), 3000);
    } catch (err) {
      console.error('Upload error:', err);
      setUploadError('Failed to upload file: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  // Reset page to 1 when filters or itemsPerPage change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, priorityFilter, dateFilter, assigneeFilter, receivedByFilter, itemsPerPage]);

  // Filter and search logic
  const filteredItems = items.filter(item => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = !query ||
      item.subject?.toLowerCase().includes(query) ||
      item.organization?.toLowerCase().includes(query) ||
      item.details?.toLowerCase().includes(query) ||
      item.tags?.toLowerCase().includes(query);

    const matchesStatus = statusFilter === 'all' || item.status?.toLowerCase() === statusFilter.toLowerCase();
    const matchesPriority = priorityFilter === 'all' || item.priority_level?.toLowerCase() === priorityFilter.toLowerCase();
    const matchesAssignee = assigneeFilter === 'all' || item.assigned_to === assigneeFilter;
    const matchesReceivedBy = receivedByFilter === 'all' || item.received_by === receivedByFilter;

    let matchesDate = true;
    if (dateFilter !== 'all' && item.communication_date) {
      const itemDate = new Date(item.communication_date);
      const today = new Date();
      const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

      if (dateFilter === 'week') {
        matchesDate = itemDate >= sevenDaysAgo;
      } else if (dateFilter === 'month') {
        matchesDate = itemDate >= thirtyDaysAgo;
      }
    }

    return matchesSearch && matchesStatus && matchesPriority && matchesAssignee && matchesReceivedBy && matchesDate;
  }).sort((a, b) => {
    // Sort: pending items first, then approved items sorted by created_at descending
    const aPending = a.status?.toLowerCase() === 'pending' ? 1 : 0;
    const bPending = b.status?.toLowerCase() === 'pending' ? 1 : 0;
    
    if (aPending !== bPending) {
      return bPending - aPending; // pending first
    }
    
    // Both are same status, sort by created_at or communication_date descending (newest first)
    const aDate = new Date(a.created_at || a.communication_date || 0);
    const bDate = new Date(b.created_at || b.communication_date || 0);
    return bDate - aDate;
  });

  const totalPages = itemsPerPage === -1 ? 1 : Math.ceil(filteredItems.length / itemsPerPage);
  const displayedItems = itemsPerPage === -1
    ? filteredItems
    : filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const navigate = useNavigate();
  const goOverview = () => navigate('/admin?section=process');

  return (
    <div className="admin-main">
      <div className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="header-content">
          <h1>Projects</h1>
          <p className="subtitle">Project list and quick actions</p>
        </div>
        <div className="header-filter" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginRight: '20px' }}>
          <label style={{ fontSize: '12px', color: '#666', fontWeight: '600', textTransform: 'uppercase' }}>Received&nbsp;By:</label>
          <select value={receivedByFilter} onChange={(e) => setReceivedByFilter(e.target.value)} style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px', fontFamily: 'inherit', backgroundColor: '#fff', cursor: 'pointer', marginRight: '16px' }}>
            <option value="all">All</option>
            {receivedByList.map(person => (
              <option key={person} value={person}>{person}</option>
            ))}
          </select>
          <div className="view-toggle">
            <button
              className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid View"
            >
              <LayoutGrid size={18} strokeWidth={2} />
            </button>
            <button
              className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="List View"
            >
              <List size={18} strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>
      <div className="user-page projects-page" >

        <main className="user-main" style={{ marginLeft: '-0px', }}>

          <section className="projects-list" style={{ marginTop: '0px' }}>
            {!loading && !error && items.length > 0 && (
              <div className="search-filter-section">
                <div className="results-info">
                  Showing {displayedItems.length} of {filteredItems.length} (total: {items.length})
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <div className="search-bar">
                    <input
                      type="text"
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="search-input"
                    />
                  </div>

                  <div className="filter-group" style={{ marginBottom: 0 }}>
                    <label>Show:</label>
                    <select value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value))} className="filter-select">
                      <option value={5}>5 items</option>
                      <option value={10}>10 items</option>
                      <option value={20}>20 items</option>
                      <option value={50}>50 items</option>
                      <option value={-1}>All items</option>
                    </select>
                  </div>

                  <div className="filter-controls">
                    <div className="filter-group">
                      <label>Status:</label>
                      <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="filter-select">
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </div>

                    <div className="filter-group">
                      <label>Priority:</label>
                      <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="filter-select">
                        <option value="all">All Priorities</option>
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>

                    <div className="filter-group">
                      <label>Date:</label>
                      <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="filter-select">
                        <option value="all">All Dates</option>
                        <option value="week">Last 7 Days</option>
                        <option value="month">Last 30 Days</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {loading && (
              <div style={{ padding: '60px 32px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
                <div style={{ fontSize: '48px', animation: 'spin 2s linear infinite', marginBottom: '24px' }}>⟳</div>
                <div style={{ color: '#666', fontSize: '14px', fontWeight: '500' }}>Loading projects...</div>
                <div style={{ color: '#999', fontSize: '12px', marginTop: '8px' }}>Fetching communications data</div>
              </div>
            )}
            {error && <div className="error">{error}</div>}

            {!loading && !error && items.length === 0 && (
              <div className="empty-state">
                <strong>No records found</strong>
                <p>There are no communications yet.</p>
              </div>
            )}

            {!loading && items.length > 0 && filteredItems.length === 0 && (
              <div className="empty-state">
                <strong>No matching records</strong>
                <p>Try adjusting your search or filters.</p>
              </div>
            )}

            {!loading && filteredItems.length > 0 && (
              <>
                <div className={viewMode === 'list' ? 'list-view' : 'card-grid'}>
                  {displayedItems.map(r => (
                    <article className="comm-card" key={r.id}>
                      <div className="comm-card-body">
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '8px' }}>
                          <div className="comm-line"><strong>Direction:</strong> <span>{r.direction || '-'}</span></div>
                          {r.status && (
                            <span className={`status-pill status-${r.status}`}>{r.status.charAt(0).toUpperCase() + r.status.slice(1)}</span>
                          )}
                        </div>
                        <div className="comm-line"><strong>Date:</strong> <span>{r.communication_date ? new Date(r.communication_date).toLocaleDateString() : '-'}</span></div>
                        <div className="comm-meta">
                          <div className="comm-line"><strong>Priority:</strong> <span className="priority-pill">{r.priority_level || 'Normal'}</span></div>
                          <div className="comm-line assignee"><strong>Assignee:</strong> <span>{r.assigned_to || '-'}</span></div>
                        </div>
                        {((r.attachments && r.attachments.length) || r.attachment || r.attachment_url) && (
                          <div className="comm-attachments">
                            <strong>Attachments:</strong>
                            <div className="attach-list">
                              {r.attachments && r.attachments.map((a, i) => {
                                const href = a.url || a.path || a;
                                const name = getAttachmentDisplayName(a, href);
                                const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(href);
                                return (
                                  <span key={i} className="attachment-item">
                                    {isImage ? (
                                      <button className="btn-view-attachment" onClick={() => { setViewingAttachment({ href, name }); setShowAttachmentModal(true); }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                        <img src={getAttachmentUrl(href)} alt={name} className="attachment-thumb" />
                                      </button>
                                    ) : null}
                                    <button className="btn-view-attachment" onClick={() => { setViewingAttachment({ href, name }); setShowAttachmentModal(true); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0066cc', textDecoration: 'underline' }}>{name}</button>
                                  </span>
                                );
                              })}
                              {!r.attachments && r.attachment && (
                                <button className="btn-view-attachment" onClick={() => { setViewingAttachment({ href: r.attachment, name: r.attachment_name || getFilenameFromPath(r.attachment) || r.attachment }); setShowAttachmentModal(true); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0066cc', textDecoration: 'underline' }}>{r.attachment_name || getFilenameFromPath(r.attachment) || r.attachment}</button>
                              )}
                              {!r.attachments && !r.attachment && r.attachment_url && (
                                <button className="btn-view-attachment" onClick={() => { setViewingAttachment({ href: r.attachment_url, name: r.attachment_filename || getFilenameFromPath(r.attachment_url) || r.attachment_url }); setShowAttachmentModal(true); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0066cc', textDecoration: 'underline' }}>{r.attachment_filename || getFilenameFromPath(r.attachment_url) || r.attachment_url}</button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="comm-card-footer">
                        <button className="btn-secondary" onClick={() => { setSelected(r); setShowModal(true); }}>View details</button>
                      </div>
                    </article>
                  ))}

                  {showModal && selected && (
                    <div className="modal-backdrop" onClick={() => setShowModal(false)}>
                      <div className="modal details-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header details-header">
                          <div>
                            <h2>Communication Details</h2>
                            <p className="modal-subtitle">ID: {selected.id}</p>
                          </div>
                          <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
                        </div>
                        {/* TABS */}
                        <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', padding: '0 24px', backgroundColor: '#f9fafb' }}>
                          <button onClick={() => setActiveModalTab('details')} style={{ padding: '12px 16px', background: 'none', border: 'none', borderBottom: activeModalTab === 'details' ? '2px solid #3b82f6' : '2px solid transparent', color: activeModalTab === 'details' ? '#3b82f6' : '#6b7280', fontWeight: activeModalTab === 'details' ? '600' : '400', cursor: 'pointer' }}>Details</button>
                          <button onClick={() => setActiveModalTab('history')} style={{ padding: '12px 16px', background: 'none', border: 'none', borderBottom: activeModalTab === 'history' ? '2px solid #3b82f6' : '2px solid transparent', color: activeModalTab === 'history' ? '#3b82f6' : '#6b7280', fontWeight: activeModalTab === 'history' ? '600' : '400', cursor: 'pointer' }}>Audit History</button>
                          <button onClick={() => setActiveModalTab('versions')} style={{ padding: '12px 16px', background: 'none', border: 'none', borderBottom: activeModalTab === 'versions' ? '2px solid #3b82f6' : '2px solid transparent', color: activeModalTab === 'versions' ? '#3b82f6' : '#6b7280', fontWeight: activeModalTab === 'versions' ? '600' : '400', cursor: 'pointer' }}>Version History</button>
                        </div>

                        <div className="modal-body" style={{ display: activeModalTab === 'history' ? 'block' : 'none', padding: '24px', height: '65vh', overflowY: 'auto', backgroundColor: '#fff' }}>
                          <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px', color: '#111827' }}>Automated Audit Trails</h3>
                          {auditLogs.length === 0 ? <p style={{ color: '#6b7280' }}>No audit history available.</p> : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                              {auditLogs.map((log, i) => (
                                <div key={i} style={{ padding: '12px', borderLeft: '4px solid #3b82f6', backgroundColor: '#f3f4f6', borderRadius: '4px' }}>
                                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>{new Date(log.created_at).toLocaleString()}</div>
                                  <div style={{ fontSize: '14px', color: '#111827' }}><span style={{ fontWeight: 'bold' }}>{log.user_email || log.user_role || 'System'}</span>: {log.action}</div>
                                  <div style={{ fontSize: '13px', color: '#4b5563', marginTop: '4px' }}>{log.description}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="modal-body" style={{ display: activeModalTab === 'versions' ? 'block' : 'none', padding: '24px', height: '65vh', overflowY: 'auto', backgroundColor: '#fff' }}>
                          <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px', color: '#111827' }}>Immutable Version History</h3>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {(!selected.attachments || (Array.isArray(selected.attachments) ? selected.attachments : JSON.parse(selected.attachments || '[]')).length === 0) && !selected.attachment && !selected.attachment_url ? (
                              <p style={{ color: '#6b7280' }}>No versions available.</p>
                            ) : (
                              (Array.isArray(selected.attachments) ? selected.attachments : JSON.parse(selected.attachments || '[]')).map((att, i) => (
                                <div key={i} style={{ padding: '16px', border: '1px solid #e5e7eb', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f9fafb' }}>
                                  <div>
                                    <div style={{ fontWeight: 'bold', color: '#111827', fontSize: '14px' }}>Version {i + 1} {att.watermarked && <span style={{ color: 'green', fontSize: '12px' }}>(Verified)</span>}</div>
                                    <div style={{ color: '#4b5563', fontSize: '13px', marginTop: '4px' }}>{att.name || att.filename || getFilenameFromPath(att.url || att.path)}</div>
                                    <div style={{ color: '#9ca3af', fontSize: '12px', marginTop: '4px' }}>Uploaded at: {att.uploadedAt ? new Date(att.uploadedAt).toLocaleString() : 'System'}</div>
                                  </div>
                                  <button onClick={() => { setViewingAttachment({ href: att.url || att.path, name: att.name || getFilenameFromPath(att.url || att.path) }); setShowAttachmentModal(true); fetch('/api/auth/record-audit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'VIEW', user_email: 'Admin', user_role: 'Admin', description: `Viewed Version ${i + 1} of ${selected.tracking_id}` }) }).catch(e => console.error(e)); }} style={{ padding: '8px 16px', backgroundColor: '#fff', border: '1px solid #d1d5db', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>View PDF</button>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        <div className="modal-body details-body" style={{ display: activeModalTab === 'details' ? 'block' : 'none' }}>
                          {/* Status Badge */}
                          <div className="detail-status-section" style={{ marginBottom: '24px' }}>
                            <span className={`detail-status-badge status-${selected.status}`}>
                              {selected.status ? selected.status.toUpperCase() : 'UNKNOWN'}
                            </span>
                          </div>

                          <div className="details-grid">
                            <div className="detail-item">
                              <label>Direction</label>
                              <p className="detail-value">{selected.direction || '-'}</p>
                            </div>
                            <div className="detail-item">
                              <label>Date</label>
                              <p className="detail-value">{selected.communication_date ? new Date(selected.communication_date).toLocaleDateString() : '-'}</p>
                            </div>
                            <div className="detail-item">
                              <label>Priority</label>
                              <p className="detail-value"><span className={`priority-badge detail-priority ${selected.priority_level}`}>{selected.priority_level?.toUpperCase() || 'NORMAL'}</span></p>
                            </div>
                            <div className="detail-item">
                              <label>Organization</label>
                              <p className="detail-value">{selected.organization || '-'}</p>
                            </div>
                          </div>

                          <div className="detail-section">
                            <label>Subject</label>
                            <p className="detail-text-large">{selected.subject || '-'}</p>
                          </div>

                          <div className="detail-section">
                            <label>Details</label>
                            <div className="details-box">{selected.details || 'No details provided'}</div>
                          </div>

                          <div className="details-grid">
                            <div className="detail-item">
                              <label>Received By</label>
                              <p className="detail-value">{selected.received_by || '-'}</p>
                            </div>
                            <div className="detail-item">
                              <label>Assigned To</label>
                              <p className="detail-value">{selected.assigned_to || '-'}</p>
                            </div>
                            <div className="detail-item">
                              <label>Tags</label>
                              <p className="detail-value">{selected.tags || '-'}</p>
                            </div>
                            <div className="detail-item">
                              <label>Created At</label>
                              <p className="detail-value">{selected.created_at ? new Date(selected.created_at).toLocaleDateString() : '-'}</p>
                            </div>
                          </div>

                          {((selected.attachments && (Array.isArray(selected.attachments) ? selected.attachments.length : Object.keys(JSON.parse(selected.attachments || '{}')).length > 0)) || selected.attachment || selected.attachment_url) && (
                            <div className="detail-section attachments-section">
                              <label>Attachments</label>
                              <div className="attachments-grid">
                                {parseAttachments(selected.attachments).map((a, i) => {
                                  const href = a.url || a.path || a;
                                  const name = getAttachmentDisplayName(a, href);
                                  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(href);
                                  return (
                                    <div key={i} className="attachment-card">
                                      {isImage ? (
                                        <button className="attachment-thumb-btn" onClick={() => { setViewingAttachment({ href, name, index: i }); setShowAttachmentModal(true); }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                          <img src={getAttachmentUrl(href)} alt={name} className="attachment-thumb" />
                                        </button>
                                      ) : (
                                        <div className="attachment-icon">�</div>
                                      )}
                                      <div className="attachment-info">
                                        <button className="attachment-name" onClick={() => { setViewingAttachment({ href, name, index: i }); setShowAttachmentModal(true); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0066cc', textDecoration: 'underline', fontSize: '13px', fontWeight: '500' }}>{name}</button>
                                        {selected.status !== 'approved' && (
                                          <div className="attachment-actions">
                                            <button className="btn-action" onClick={() => { setEditingAttachmentIndex(i); setEditText(name); }}>Edit</button>
                                            <button className="btn-action" onClick={() => { setUploadAttachmentIndex(i); }}>Replace</button>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                                {(!selected.attachments || parseAttachments(selected.attachments).length === 0) && selected.attachment && (
                                  <div className="attachment-card">
                                    <div className="attachment-icon">�</div>
                                    <div className="attachment-info">
                                      <button onClick={() => { setViewingAttachment({ href: selected.attachment, name: selected.attachment_name || getFilenameFromPath(selected.attachment) || selected.attachment }); setShowAttachmentModal(true); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0066cc', textDecoration: 'underline', fontSize: '13px', fontWeight: '500' }}>{selected.attachment_name || getFilenameFromPath(selected.attachment) || selected.attachment}</button>
                                      {selected.status !== 'approved' && (
                                        <div className="attachment-actions">
                                          <button className="btn-action" onClick={() => { setEditingAttachmentIndex(-1); setEditText(selected.attachment_name || selected.attachment); }}>Edit</button>
                                          <button className="btn-action" onClick={() => { setUploadAttachmentIndex(-1); }}>Replace</button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                                {(!selected.attachments || parseAttachments(selected.attachments).length === 0) && !selected.attachment && selected.attachment_url && (
                                  <div className="attachment-card">
                                    <div className="attachment-icon">�</div>
                                    <div className="attachment-info">
                                      <button onClick={() => { setViewingAttachment({ href: selected.attachment_url, name: selected.attachment_filename || getFilenameFromPath(selected.attachment_url) || selected.attachment_url }); setShowAttachmentModal(true); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0066cc', textDecoration: 'underline', fontSize: '13px', fontWeight: '500' }}>{selected.attachment_filename || getFilenameFromPath(selected.attachment_url) || selected.attachment_url}</button>
                                      {selected.status !== 'approved' && (
                                        <div className="attachment-actions">
                                          <button className="btn-action" onClick={() => { setEditingAttachmentIndex(-2); setEditText(selected.attachment_filename || selected.attachment_url); }}>Edit</button>
                                          <button className="btn-action" onClick={() => { setUploadAttachmentIndex(-2); }}>Replace</button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          <div className="detail-section upload-section">
                            <div className="upload-section-header">
                              <span className="upload-section-title">Attachments</span>
                              <span className="upload-section-sub">Upload Completed Document File</span>
                            </div>
                            {selected.status === 'pending' && completedDocumentUpload && (
                              <div style={{
                                padding: '8px 12px',
                                backgroundColor: '#d1fae5',
                                border: '1px solid #6ee7b7',
                                borderRadius: '4px',
                                color: '#065f46',
                                fontSize: '13px',
                                marginBottom: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                              }}>
                                ✓ Completed Document Ready: {completedDocumentUpload.name}
                              </div>
                            )}
                            {selected.status === 'approved' ? (
                              <div className="dropzone dropzone-locked">
                                <div className="dropzone-lock-icon">
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                  </svg>
                                </div>
                                <p className="dropzone-text">File upload is disabled</p>
                                <p className="dropzone-hint">This communication has been marked as done and can no longer be modified.</p>
                              </div>
                            ) : (
                              <>
                                {uploadError && <div className="upload-error">{uploadError}</div>}
                                {uploadSuccess && <div className="upload-success">{uploadSuccess}</div>}
                                <div
                                  className={`dropzone${uploadFile ? ' dropzone-has-file' : ''}`}
                                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('dropzone-active'); }}
                                  onDragLeave={(e) => { e.currentTarget.classList.remove('dropzone-active'); }}
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    e.currentTarget.classList.remove('dropzone-active');
                                    const file = e.dataTransfer.files?.[0];
                                    if (file && fileInputRef.current) {
                                      const dt = new DataTransfer();
                                      dt.items.add(file);
                                      fileInputRef.current.files = dt.files;
                                      setUploadFile(file);
                                    }
                                  }}
                                  onClick={() => fileInputRef.current?.click()}
                                >
                                  <input
                                    ref={fileInputRef}
                                    type="file"
                                    style={{ display: 'none' }}
                                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                                    disabled={isUploading}
                                  />
                                  <div className="dropzone-icon">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M12 16V8m0 0-3 3m3-3 3 3" />
                                      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
                                    </svg>
                                  </div>
                                  {uploadFile ? (
                                    <div className="dropzone-file-name">{uploadFile.name}</div>
                                  ) : (
                                    <>
                                      <p className="dropzone-text">
                                        Drag and drop files here, or <span className="dropzone-browse">browse</span>
                                      </p>
                                      <p className="dropzone-hint">Supports: PDF, Word, Excel, Images, etc.</p>
                                    </>
                                  )}
                                </div>
                                {uploadFile && (
                                  <div className="upload-actions">
                                    <button
                                      className="btn-primary"
                                      onClick={handleFileUpload}
                                      disabled={isUploading}
                                    >
                                      {isUploading ? 'Uploading...' : 'Upload & Replace'}
                                    </button>
                                    <button
                                      className="btn-secondary"
                                      onClick={() => { setUploadFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                                      disabled={isUploading}
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="modal-footer details-footer" style={{ display: activeModalTab === 'details' ? 'block' : 'none' }}>
                          {selected.status === 'pending' && (
                            <div className="action-buttons">
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
                                {!completedDocumentUpload && (
                                  <div style={{
                                    padding: '12px',
                                    backgroundColor: '#fef3c7',
                                    border: '1px solid #fcd34d',
                                    borderRadius: '6px',
                                    color: '#92400e',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    textAlign: 'center'
                                  }}>
                                    ⚠️ You must upload a completed document file before you can mark this communication as done.
                                  </div>
                                )}
                                {completedDocumentUpload && (
                                  <div style={{
                                    padding: '12px',
                                    backgroundColor: '#d1fae5',
                                    border: '1px solid #6ee7b7',
                                    borderRadius: '6px',
                                    color: '#065f46',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                  }}>
                                    ✓ Document uploaded: {completedDocumentUpload.name}
                                  </div>
                                )}
                                <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                                  <button
                                    className="btn-approve"
                                    onClick={handleApprove}
                                    disabled={isApproving || !completedDocumentUpload}
                                    style={{
                                      flex: 1,
                                      padding: '12px',
                                      fontSize: '15px',
                                      opacity: !completedDocumentUpload ? 0.5 : 1,
                                      cursor: !completedDocumentUpload ? 'not-allowed' : 'pointer'
                                    }}
                                  >
                                    {isApproving ? 'Marking as Done...' : '✓ Mark as Done'}
                                  </button>
                                  <button
                                    className="btn-reject"
                                    onClick={handleReject}
                                    disabled={isRejecting}
                                    style={{ flex: 1, padding: '12px', fontSize: '15px' }}
                                  >
                                    {isRejecting ? 'Rejecting...' : '✕ Reject'}
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                          <button className="btn-close" onClick={() => setShowModal(false)}>Close</button>
                        </div>
                      </div>
                    </div>
                  )}

                  {showAttachmentModal && viewingAttachment && (() => {
                    const hrefRaw = viewingAttachment.href || '';
                    const href = hrefRaw.toLowerCase();
                    const name = (viewingAttachment.name || '').toLowerCase();
                    const isImage = /\.(png|jpe?g|gif|webp|bmp)$/i.test(href) || /\.(png|jpe?g|gif|webp|bmp)$/i.test(name);
                    const isViewableInIframe = /\.(pdf|docx?|txt|csv|json|xml|html)$/i.test(href) || /\.(pdf|docx?|txt|csv|json|xml|html)$/i.test(name);
                    const displayUrl = getAttachmentUrl(hrefRaw);
                    return (
                      <div className="modal-backdrop" onClick={() => setShowAttachmentModal(false)}>
                        <div className="modal attachment-modal" onClick={e => e.stopPropagation()}>
                          <div className="modal-header">
                            <h2>View Attachment</h2>
                            <button className="modal-close" onClick={() => setShowAttachmentModal(false)}>✕</button>
                          </div>
                          <div
                            style={{
                              padding: '12px 20px',
                              borderBottom: '1px solid #e5e7eb',
                              fontSize: '13px',
                              color: '#4b5563',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              gap: '8px',
                              flexShrink: 0,
                            }}
                          >
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              📎 {viewingAttachment.name}
                            </span>
                            <a
                              href={displayUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                fontSize: '12px',
                                color: '#2563eb',
                                fontWeight: 600,
                                textDecoration: 'none',
                              }}
                            >
                              Open in new tab
                            </a>
                          </div>
                          <div className="modal-body attachment-body">
                            {isImage && (
                              <div className="attachment-viewer-inner attachment-viewer-image">
                                <img src={displayUrl} alt={viewingAttachment.name} className="full-attachment-image" />
                              </div>
                            )}
                            {!isImage && isViewableInIframe && (
                              <iframe
                                src={displayUrl}
                                className="full-attachment-iframe"
                                title={viewingAttachment.name}
                              />
                            )}
                            {!isImage && !isViewableInIframe && (
                              <div className="attachment-viewer-fallback">
                                <div style={{ fontSize: '32px', marginBottom: '8px' }}>�</div>
                                <div style={{ marginBottom: '4px' }}>Preview not available for this file type.</div>
                                <div>Use "Open in new tab" above to view or download the file.</div>
                              </div>
                            )}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: 12, borderTop: '1px solid #e5e7eb', flexShrink: 0 }}>
                            <button className="btn-secondary" onClick={() => setShowAttachmentModal(false)}>Close</button>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {editingAttachmentIndex !== null && (
                    <div className="modal-backdrop" onClick={() => setEditingAttachmentIndex(null)}>
                      <div className="modal edit-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                          <h2>Edit Attachment Name</h2>
                          <button className="modal-close" onClick={() => setEditingAttachmentIndex(null)}>✕</button>
                        </div>
                        <div className="modal-body">
                          <label>
                            <strong>Attachment Name:</strong>
                            <input
                              type="text"
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              className="edit-input"
                              style={{ width: '100%', padding: '8px', marginTop: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                            />
                          </label>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: 12 }}>
                          <button className="btn-secondary" onClick={() => setEditingAttachmentIndex(null)}>Cancel</button>
                          <button className="btn-primary" onClick={() => {
                            if (editingAttachmentIndex >= 0 && selected.attachments) {
                              selected.attachments[editingAttachmentIndex].name = editText;
                            } else if (editingAttachmentIndex === -1) {
                              selected.attachment_name = editText;
                            } else if (editingAttachmentIndex === -2) {
                              selected.attachment_filename = editText;
                            }
                            setEditingAttachmentIndex(null);
                            setSelected({ ...selected });
                          }}>Save</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {itemsPerPage !== -1 && totalPages > 1 && (
              <div className="pagination-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '24px', paddingBottom: '16px' }}>
                <button
                  className="btn-pagination"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </button>
                <span className="pagination-info" style={{ fontSize: '14px', fontWeight: '500', color: '#4b5563' }}>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  className="btn-pagination"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </button>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
