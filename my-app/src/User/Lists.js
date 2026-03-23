import React, { useState, useEffect } from 'react';
import './User.css';
import UserSidebar from './sidebar';
import { ReloadIcon, FileIcon } from '@radix-ui/react-icons';

export default function Lists() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [previewAttachment, setPreviewAttachment] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDirection, setFilterDirection] = useState('all');
  const [filterOrganization, setFilterOrganization] = useState('all');
  const [filterAssigned, setFilterAssigned] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchApprovedProjects = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/communications');
      if (!res.ok) throw new Error(`Server responded ${res.status}`);
      const data = await res.json();
      // Filter for approved items only
      const approvedItems = (data || []).filter(item => item.status === 'approved');
      // Transform database data to dashboard format
      const transformedItems = approvedItems.map((comm) => {
        return {
          ...comm, // Keep all original properties
          id: comm.id,
          tracking: comm.tracking_id || `ITSD-${new Date(comm.communication_date || Date.now()).getFullYear()}-${String(comm.id).padStart(6, '0')}`,
          title: comm.subject,
        };
      });
      setItems(transformedItems);
    } catch (err) {
      console.error('Failed to load approved projects:', err);
      setError('Unable to load approved projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovedProjects();
  }, []);

  useEffect(() => {
    setCurrentPage(1); // Reset to first page when filters change
  }, [searchQuery, filterDirection, filterOrganization, filterAssigned]);

  const getFilteredItems = () => {
    return items.filter(item => {
      // Search filter - check multiple fields
      const searchLower = searchQuery.toLowerCase();
      if (searchQuery && !
        ((item.direction || '').toLowerCase().includes(searchLower) ||
          (item.organization || '').toLowerCase().includes(searchLower) ||
          ((item.type_of_communication || item.typeOfCommunication || item.type || '')).toString().toLowerCase().includes(searchLower) ||
          (item.assigned_to || '').toLowerCase().includes(searchLower) ||
          (item.priority_level || '').toLowerCase().includes(searchLower))
      ) {
        return false;
      }

      // Direction filter
      if (filterDirection !== 'all' && item.direction !== filterDirection) {
        return false;
      }

      // Organization filter
      if (filterOrganization !== 'all' && item.organization !== filterOrganization) {
        return false;
      }

      // Assigned filter
      if (filterAssigned !== 'all' && item.assigned_to !== filterAssigned) {
        return false;
      }

      return true;
    });
  };

  const getPaginatedItems = () => {
    const filtered = getFilteredItems();
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filtered.slice(startIndex, endIndex);
  };

  const totalPages = Math.ceil(getFilteredItems().length / itemsPerPage);

  const getUniqueValues = (fieldName) => {
    const values = new Set();
    items.forEach(item => {
      const value = item[fieldName];
      if (value) values.add(value);
    });
    return Array.from(values).sort();
  };

  const formatDate = (dateString, showTime = false) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid date';
    if (showTime) {
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    }
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const getFilenameFromPath = (path) => {
    if (!path || typeof path !== 'string') return null;
    const decoded = decodeURIComponent(path);
    const segment = decoded.split('/').filter(Boolean).pop();
    return segment || null;
  };

  const API_BASE = 'http://localhost:5000';
  const getAttachmentUrl = (href) => {
    if (!href) return '';
    const s = typeof href === 'string' ? href : String(href);
    if (s.startsWith('http://') || s.startsWith('https://')) return s;
    const path = s.startsWith('/') ? s : '/' + s;
    const encodedPath = path.split('/').map(seg => seg ? encodeURIComponent(seg) : '').join('/') || '/';
    return API_BASE + encodedPath;
  };

  const extractVersionNumber = (filename) => {
    if (!filename) return 0;
    const m = filename.match(/_V(\d+)(?=\.[^.]+$)/i);
    return m ? parseInt(m[1], 10) : 0;
  };

  const selectLatestAttachment = (attachments) => {
    if (!attachments || attachments.length === 0) return [];
    let latest = attachments[0];
    let highest = extractVersionNumber(latest.name);

    attachments.forEach((att) => {
      const ver = extractVersionNumber(att.name);
      if (ver > highest) {
        latest = att;
        highest = ver;
      }
    });

    return [latest];
  };

  const getAttachments = (item) => {
    if (!item) return [];

    const results = [];

    try {
      // 1) Array-style attachments column (JSON or array)
      let raw = item.attachments;
      if (raw) {
        if (typeof raw === 'string') {
          try {
            raw = JSON.parse(raw);
          } catch (e) {
            console.error('Failed to parse attachments JSON:', e);
            raw = null;
          }
        }

        const arr = Array.isArray(raw) ? raw : [raw];

        arr.forEach((att) => {
          if (!att) return;

          const publicPath =
            att.url ||
            att.filePath ||
            att.attachment_url ||
            att.attachment ||
            null;

          if (!publicPath) return;

          const name =
            att.originalName ||
            att.name ||
            att.attachment_name ||
            att.attachment_filename ||
            att.filename ||
            getFilenameFromPath(publicPath) ||
            'Attachment';

          results.push({
            name,
            url: getAttachmentUrl(publicPath),
          });
        });
      }

      // 2) Legacy single-file columns (attachment / attachment_url)
      if (results.length === 0) {
        const singlePath = item.attachment_url || item.attachment || null;
        if (singlePath) {
          const singleName =
            item.attachment_name ||
            item.attachment_filename ||
            item.filename ||
            getFilenameFromPath(singlePath) ||
            'Attachment';

          results.push({
            name: singleName,
            url: getAttachmentUrl(singlePath),
          });
        }
      }
    } catch (err) {
      console.error('Failed to normalize attachments:', err);
    }

    // only show the latest versioned attachment (new upload / done)
    if (results.length > 1) {
      return selectLatestAttachment(results);
    }

    return results;
  };

  const renderAttachments = (item) => {
    const attachments = getAttachments(item);
    if (!attachments || attachments.length === 0) {
      return <span style={{ color: '#999' }}>No attachment</span>;
    }

    const handleAttachmentClick = (attachment) => {
      if (!attachment) return;
      setPreviewAttachment({
        url: attachment.url,
        name: attachment.name || getFilenameFromPath(attachment.url) || 'Attachment',
      });
    };

    return (
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {attachments.map((attachment, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleAttachmentClick(attachment)}
            style={{
              border: 'none',
              padding: 0,
              background: 'none',
              cursor: 'pointer',
              color: '#0066cc',
              textDecoration: 'none',
              fontWeight: '500',
              marginBottom: '4px'
            }}
            title={attachment.name}
          >
            <FileIcon style={{ width: '16px', height: '16px', marginRight: '4px' }} /> {attachment.name}
          </button>
        ))}
      </div>
    );
  };

  const getPriorityBadge = (priority) => {
    const colors = {
      high: '#d32f2f',
      medium: '#f57c00',
      low: '#388e3c'
    };
    return (
      <span style={{
        display: 'inline-block',
        padding: '4px 12px',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: '600',
        backgroundColor: colors[priority] || '#757575',
        color: 'white',
        textTransform: 'uppercase'
      }}>
        {priority || 'N/A'}
      </span>
    );
  };

  const renderAttachmentPreviewModal = () => {
    if (!previewAttachment) return null;

    const { url, name } = previewAttachment;
    const lowerName = (name || '').toLowerCase();
    const lowerUrl = (url || '').toLowerCase();
    const isImage = /\.(png|jpe?g|gif|webp|bmp)$/i.test(lowerName) || /\.(png|jpe?g|gif|webp|bmp)$/i.test(lowerUrl);
    const isViewableInIframe = /\.(pdf|docx?|txt|csv|json|xml|html)$/i.test(lowerName) || /\.(pdf|docx?|txt|csv|json|xml|html)$/i.test(lowerUrl);

    return (
      <div
        className="attachment-preview-backdrop"
        onClick={() => setPreviewAttachment(null)}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.55)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
        }}
      >
        <div
          className="attachment-preview-modal"
          onClick={(e) => e.stopPropagation()}
          style={{
            background: '#fff',
            borderRadius: '12px',
            width: '85%',
            height: '85%',
            maxWidth: '1400px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '14px 20px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0,
            }}
          >
            <div style={{ fontWeight: 600, fontSize: '15px' }}>Attachment Preview</div>
            <button
              type="button"
              onClick={() => setPreviewAttachment(null)}
              style={{
                border: 'none',
                background: 'none',
                fontSize: '20px',
                cursor: 'pointer',
                lineHeight: 1,
                color: '#6b7280',
              }}
            >
              ×
            </button>
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
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <FileIcon style={{ width: '14px', height: '14px' }} /> {name}
            </span>
            <a
              href={url}
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

          <div
            className="attachment-preview-viewer"
            style={{
              flex: 1,
              minHeight: '50vh',
              padding: '16px',
              overflow: 'auto',
              backgroundColor: '#f9fafb',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {isImage && (
              <div
                style={{
                  flex: 1,
                  minHeight: 300,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <img
                  src={url}
                  alt={name}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    width: 'auto',
                    height: 'auto',
                    objectFit: 'contain',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  }}
                />
              </div>
            )}
            {!isImage && isViewableInIframe && (
              <iframe
                src={url}
                title={name}
                style={{
                  flex: 1,
                  minHeight: 400,
                  width: '100%',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  background: '#fff',
                }}
              />
            )}
            {!isImage && !isViewableInIframe && (
              <div
                style={{
                  flex: 1,
                  minHeight: 200,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#6b7280',
                  fontSize: '13px',
                  textAlign: 'center',
                  padding: '24px',
                }}
              >
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>�</div>
                <div style={{ marginBottom: '4px' }}>Preview not available for this file type.</div>
                <div>Use &quot;Open in new tab&quot; above to view or download the file.</div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="user-page">
      <UserSidebar active={'lists'} />
      <main className="user-main">
        <div className="overview-header">
          <div>
            <h1>Approved Projects</h1>
            <p className="overview-subtitle">View all approved communications</p>
          </div>
          <button
            onClick={fetchApprovedProjects}
            disabled={loading}
            className="refresh-btn"
            style={{
              padding: '8px 16px',
              backgroundColor: '#0066cc',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '13px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              opacity: loading ? 0.6 : 1,
              transition: 'opacity 0.2s'
            }}
          >
            <ReloadIcon style={{ width: '16px', height: '16px', animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {error && <div style={{ color: '#b00020', padding: '12px', background: '#ffebee', borderRadius: '4px', margin: '16px' }}>{error}</div>}

        {loading && (
          <div style={{ padding: '60px 32px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
            <ReloadIcon style={{ width: '48px', height: '48px', animation: 'spin 2s linear infinite', marginBottom: '24px' }} />
            <div style={{ color: '#666', fontSize: '14px', fontWeight: '500' }}>Loading approved projects...</div>
          </div>
        )}

        {!loading && (
          <div style={{ padding: '24px' }}>
            {items.length > 0 && (
              <div style={{
                marginBottom: '24px',
                padding: '16px',
                backgroundColor: '#f9f9f9',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr 1fr',
                gap: '12px',
                marginTop: '-35px'
              }}>
                {/* Search Bar */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: '#333' }}>Search</label>
                  <input
                    type="text"
                    placeholder="Search by keyword..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Direction Filter */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: '#333' }}>Direction</label>
                  <select
                    value={filterDirection}
                    onChange={(e) => setFilterDirection(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="all">All Directions</option>
                    {getUniqueValues('direction').map(dir => (
                      <option key={dir} value={dir}>{dir}</option>
                    ))}
                  </select>
                </div>

                {/* Organization Filter */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: '#333' }}>Organization</label>
                  <select
                    value={filterOrganization}
                    onChange={(e) => setFilterOrganization(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="all">All Organizations</option>
                    {getUniqueValues('organization').map(org => (
                      <option key={org} value={org}>{org}</option>
                    ))}
                  </select>
                </div>

                {/* Assigned Filter */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: '#333' }}>Assigned To</label>
                  <select
                    value={filterAssigned}
                    onChange={(e) => setFilterAssigned(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="all">All Assigned</option>
                    {getUniqueValues('assigned_to').map(assigned => (
                      <option key={assigned} value={assigned}>{assigned}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
            {items.length > 0 ? (
              <div>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  backgroundColor: '#fff',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                  <thead>
                    <tr style={{
                      backgroundColor: '#f5f5f5',
                      borderBottom: '2px solid #e0e0e0'
                    }}>
                      <th style={{
                        padding: '16px',
                        textAlign: 'left',
                        fontWeight: '600',
                        color: '#333',
                        fontSize: '14px'
                      }}>ID</th>
                      <th style={{
                        padding: '16px',
                        textAlign: 'left',
                        fontWeight: '600',
                        color: '#333',
                        fontSize: '14px'
                      }}>Direction</th>
                      <th style={{
                        padding: '16px',
                        textAlign: 'left',
                        fontWeight: '600',
                        color: '#333',
                        fontSize: '14px'
                      }}>Organization</th>
                      <th style={{
                        padding: '16px',
                        textAlign: 'left',
                        fontWeight: '600',
                        color: '#333',
                        fontSize: '14px'
                      }}>Direction</th>
                      <th style={{
                        padding: '16px',
                        textAlign: 'left',
                        fontWeight: '600',
                        color: '#333',
                        fontSize: '14px'
                      }}>Approved_Date</th>
                      <th style={{
                        padding: '16px',
                        textAlign: 'left',
                        fontWeight: '600',
                        color: '#333',
                        fontSize: '14px'
                      }}>Priority</th>
                      <th style={{
                        padding: '16px',
                        textAlign: 'left',
                        fontWeight: '600',
                        color: '#333',
                        fontSize: '14px'
                      }}>Assigned</th>
                      <th style={{
                        padding: '16px',
                        textAlign: 'left',
                        fontWeight: '600',
                        color: '#333',
                        fontSize: '14px'
                      }}>Attachments</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getPaginatedItems().map((item, index) => {
                      const paginatedItems = getPaginatedItems();
                      const displayDate = item.approved_date || item.approvedDate || item.date_approved || item.date_received || item.created_at;
                      const showExact = !!(item.approved_date || item.approvedDate || item.date_approved);
                      const displayIndex = (currentPage - 1) * itemsPerPage + index + 1;
                      return (
                        <tr
                          key={item.id}
                          style={{
                            borderBottom: index < paginatedItems.length - 1 ? '1px solid #e0e0e0' : 'none',
                            backgroundColor: index % 2 === 0 ? '#fafafa' : '#fff'
                          }}
                        >
                          <td style={{
                            padding: '16px',
                            fontSize: '14px',
                            color: '#333'
                          }}>{displayIndex}</td>
                          <td style={{
                            padding: '16px',
                            fontSize: '14px',
                            color: '#333'
                          }}>{item.direction || 'N/A'}</td>
                          <td style={{
                            padding: '16px',
                            fontSize: '14px',
                            color: '#333'
                          }}>{item.organization || 'N/A'}</td>
                          <td style={{
                            padding: '16px',
                            fontSize: '14px',
                            color: '#333'
                          }}>{(item.type_of_communication || item.typeOfCommunication || item.type) || 'N/A'}</td>
                          <td style={{
                            padding: '16px',
                            fontSize: '14px',
                            color: '#666'
                          }}>{formatDate(displayDate, showExact)}</td>
                          <td style={{
                            padding: '16px',
                            fontSize: '14px'
                          }}>{getPriorityBadge(item.priority_level)}</td>
                          <td style={{
                            padding: '16px',
                            fontSize: '14px',
                            color: '#333'
                          }}>{item.assigned_to || 'N/A'}</td>
                          <td style={{
                            padding: '16px',
                            fontSize: '14px'
                          }}>
                            {renderAttachments(item)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {totalPages > 1 && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '8px',
                    marginTop: '20px',
                    padding: '16px'
                  }}>
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      style={{
                        padding: '8px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        background: currentPage === 1 ? '#f3f4f6' : '#fff',
                        color: currentPage === 1 ? '#9ca3af' : '#374151',
                        cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                        fontSize: '14px'
                      }}
                    >
                      Previous
                    </button>
                    <span style={{
                      fontSize: '14px',
                      color: '#374151',
                      margin: '0 12px'
                    }}>
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      style={{
                        padding: '8px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        background: currentPage === totalPages ? '#f3f4f6' : '#fff',
                        color: currentPage === totalPages ? '#9ca3af' : '#374151',
                        cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                        fontSize: '14px'
                      }}
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            ) : getFilteredItems().length === 0 && items.length > 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: '#999', fontSize: '14px' }}>
                No projects match your filters
              </div>
            ) : (
              <div style={{ padding: '32px', textAlign: 'center', color: '#999', fontSize: '14px' }}>
                No approved projects available yet
              </div>
            )}
          </div>
        )}
        {renderAttachmentPreviewModal()}
      </main>
    </div>
  );
}
