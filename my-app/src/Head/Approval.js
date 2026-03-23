import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import './HeadPage.css';
import './Approval.css';
import { LayoutDashboard, TrendingUp, Activity, Users, MessageCircle, Settings, FileText, Check, X, Clock, Eye, ShieldCheck } from 'lucide-react';

export default function Approval() {
    const navigate = useNavigate();
    const iconProps = { size: 16, strokeWidth: 2, style: { display: 'block' } };

    const navItems = [
        { label: 'Overview', icon: <LayoutDashboard {...iconProps} />, onClick: () => navigate('/head') },
        { label: 'Analytics', icon: <TrendingUp {...iconProps} />, onClick: () => navigate('/head/analytics') },
        { label: 'Process', icon: <Activity {...iconProps} />, onClick: () => navigate('/head/process') },
        { label: 'Approval', active: true, icon: <Users {...iconProps} />, onClick: () => navigate('/head/approval') },
        { label: 'Manage Roles', icon: <ShieldCheck {...iconProps} />, onClick: () => navigate('/head/manage-roles') }
    ];

    const settingsItems = [
        { label: 'Announcements', badge: 3, icon: <MessageCircle {...iconProps} />, onClick: () => navigate('/head/announcements') },
        { label: 'Settings', icon: <Settings {...iconProps} /> }
    ];

    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [toasts, setToasts] = useState([]);
    const [confirmModal, setConfirmModal] = useState({ show: false, action: null, id: null, message: '' });
    const [previewModal, setPreviewModal] = useState({ show: false, url: '', name: '' });

    const showToast = (message, type = 'success') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(toast => toast.id !== id));
        }, 4000);
    };

    const removeToast = (id) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
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

    const getFilenameFromPath = (path) => {
        if (!path || typeof path !== 'string') return null;
        try {
            const decoded = decodeURIComponent(path);
            return decoded.split('/').filter(Boolean).pop() || null;
        } catch (e) { return null; }
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

    const normalizeAttachmentItem = (att) => {
        if (!att) return null;

        if (typeof att === 'string') {
            const url = getAttachmentUrl(att);
            return { url, name: getFilenameFromPath(att) || 'Attachment' };
        }

        const rawUrl = att.url || att.path || att.filePath || att.attachment_url || att.attachment || '';
        const name = att.name || att.originalName || att.attachment_name || att.attachment_filename || att.filename || getFilenameFromPath(rawUrl) || 'Attachment';
        return { url: getAttachmentUrl(rawUrl), name };
    };

    const getViewerUrl = (url) => {
        if (!url) return '';
        const lower = url.toLowerCase();
        if (lower.endsWith('.doc') || lower.endsWith('.docx')) {
            return `https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`;
        }
        return url;
    };

    useEffect(() => {
        fetch('/api/communications/approvals/pending')
            .then(res => res.json())
            .then(data => {
                // The API returns an array or an object depending on custom wrapper, usually array directly
                setDocuments(Array.isArray(data) ? data : (data.data || []));
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    const handleApprove = (id) => {
        setConfirmModal({
            show: true,
            action: 'approve',
            id: id,
            message: 'Are you sure you want to completely approve this document?'
        });
    };

    const handleReject = (id) => {
        setConfirmModal({
            show: true,
            action: 'reject',
            id: id,
            message: 'Are you absolutely sure you want to reject this document?'
        });
    };

    const executeConfirmAction = () => {
        const { action, id } = confirmModal;
        setConfirmModal({ show: false, action: null, id: null, message: '' });

        if (action === 'approve') {
            fetch(`/api/communications/approvals/${id}/approve`, { method: 'PUT' })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        setDocuments(prev => prev.filter(doc => doc.id !== id));
                        showToast('Document completely approved and seamlessly transferred!', 'success');
                    } else {
                        showToast('Failed to approve document', 'error');
                    }
                })
                .catch(err => {
                    console.error(err);
                    showToast('An error occurred connecting to server', 'error');
                });
        } else if (action === 'reject') {
            fetch(`/api/communications/approvals/${id}/reject`, { method: 'PUT' })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        setDocuments(prev => prev.filter(doc => doc.id !== id));
                        showToast('Document powerfully rejected and removed from pending queue.', 'error');
                    } else {
                        showToast('Failed to reject document', 'error');
                    }
                })
                .catch(err => {
                    console.error(err);
                    showToast('An error occurred connecting to server', 'error');
                });
        }
    };

    const handlePreview = (doc) => {
        let attachments = [];
        try {
            attachments = parseAttachments(doc.attachments);
        } catch (e) { attachments = []; }

        if (attachments.length === 0) {
            // fallback to legacy fields for directly attached URLs
            const fallbackUrl = doc.attachment_url || doc.attachment || doc.document_url || '';
            if (fallbackUrl) {
                const viewUrl = getViewerUrl(getAttachmentUrl(fallbackUrl));
                setPreviewModal({ show: true, url: viewUrl, name: doc.attachment_filename || doc.attachment_name || getFilenameFromPath(fallbackUrl) || 'Document' });
                return;
            }
            showToast('No preview available for this document', 'error');
            return;
        }

        const firstAttachment = normalizeAttachmentItem(attachments[0]);
        if (firstAttachment && firstAttachment.url) {
            const viewUrl = getViewerUrl(firstAttachment.url);
            setPreviewModal({ show: true, url: viewUrl, name: firstAttachment.name });
        } else {
            showToast('No preview available for this document', 'error');
        }
    };

    return (
        <div className="head-page">
            <div className="toasts-container" style={{ position: 'fixed', bottom: '24px', right: '24px', display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 9999 }}>
                {toasts.map(toast => (
                    <div key={toast.id} className={`toast toast-${toast.type}`} style={{
                        padding: '12px 24px',
                        borderRadius: '8px',
                        color: 'white',
                        background: toast.type === 'error' ? '#ef4444' : '#10b981',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '16px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                        animation: 'fadeIn 0.3s ease-out'
                    }}>
                        <span>{toast.message}</span>
                        <button onClick={() => removeToast(toast.id)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', opacity: 0.8 }}>✕</button>
                    </div>
                ))}
            </div>

            {confirmModal.show && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, animation: 'fadeIn 0.2s ease-out' }}>
                    <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', maxWidth: '400px', width: '90%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)' }}>
                        <h3 style={{ margin: '0 0 16px 0', color: '#111827', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {confirmModal.action === 'approve' ? <Check color="#10b981" /> : <X color="#ef4444" />}
                            Confirm Action
                        </h3>
                        <p style={{ margin: '0 0 24px 0', color: '#4b5563', lineHeight: '1.5', fontSize: '14px' }}>{confirmModal.message}</p>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button
                                onClick={() => setConfirmModal({ show: false, action: null, id: null, message: '' })}
                                style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #d1d5db', background: 'white', color: '#374151', cursor: 'pointer', fontWeight: 500, transition: 'all 0.2s' }}
                                onMouseOver={(e) => e.target.style.background = '#f9fafb'}
                                onMouseOut={(e) => e.target.style.background = 'white'}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={executeConfirmAction}
                                style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: confirmModal.action === 'approve' ? '#10b981' : '#ef4444', color: 'white', cursor: 'pointer', fontWeight: 500, transition: 'all 0.2s' }}
                                onMouseOver={(e) => e.target.style.opacity = '0.9'}
                                onMouseOut={(e) => e.target.style.opacity = '1'}
                            >
                                {confirmModal.action === 'approve' ? 'Yes, Approve' : 'Yes, Reject'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {previewModal.show && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, animation: 'fadeIn 0.2s ease-out' }} onClick={() => setPreviewModal({ show: false, url: '', name: '' })}>
                    <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '12px', width: '90%', height: '90%', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', color: '#0f172a' }}>
                            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px', fontWeight: 600 }}>
                                <FileText size={20} color="#64748b" /> Preview: {previewModal.name}
                            </h3>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button
                                    onClick={() => window.open(previewModal.url, '_blank')}
                                    style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#334155', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '500', display: 'flex', alignItems: 'center', transition: 'background 0.2s' }}
                                    onMouseOver={(e) => e.target.style.background = '#e2e8f0'}
                                    onMouseOut={(e) => e.target.style.background = '#f1f5f9'}
                                >
                                    Open Details
                                </button>
                                <button
                                    onClick={() => setPreviewModal({ show: false, url: '', name: '' })}
                                    style={{ background: '#ef4444', border: 'none', color: 'white', width: '32px', height: '32px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}
                                    onMouseOver={(e) => e.target.style.background = '#dc2626'}
                                    onMouseOut={(e) => e.target.style.background = '#ef4444'}
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>
                        <iframe
                            src={previewModal.url}
                            style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#f8fafc', width: '100%', height: '100%' }}
                            title="Document Preview"
                        />
                    </div>
                </div>
            )}

            <Sidebar navItems={navItems} settingsItems={settingsItems} />
            <main className="head-main" style={{ padding: '32px' }}>

                <div className="approval-container">
                    <div className="approval-header">
                        <div>
                            <h1>Document Approvals</h1>
                            <p>Review and authorize submitted documents across departments</p>
                        </div>
                    </div>

                    <div className="approval-stats">
                        <div className="stat-pill">
                            <span className="stat-pill-title">Pending Reviews</span>
                            <span className="stat-pill-value">{documents.length}</span>
                        </div>
                        <div className="stat-pill">
                            <span className="stat-pill-title">Urgent Actions</span>
                            <span className="stat-pill-value" style={{ color: '#dc2626' }}>
                                {documents.filter(d => d.priority_level === 'high').length}
                            </span>
                        </div>
                    </div>

                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '64px', color: '#64748b' }}>
                            Loading approvals...
                        </div>
                    ) : documents.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '64px', backgroundColor: 'white', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>
                            <FileText size={48} color="#94a3b8" style={{ margin: '0 auto 16px auto' }} />
                            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: '#334155' }}>All caught up!</h3>
                            <p style={{ margin: 0, color: '#64748b' }}>There are no documents currently pending your approval.</p>
                        </div>
                    ) : (
                        <div className="approval-grid">
                            {documents.map(doc => {
                                let attachments = [];
                                try {
                                    attachments = typeof doc.attachments === 'string' ? JSON.parse(doc.attachments) : (doc.attachments || []);
                                } catch (e) { }
                                const filename = attachments.length > 0 ? attachments[0].name : 'No attachment';
                                const isUrgent = doc.priority_level === 'high';
                                const trackingId = doc.tracking_id || `ITSD-${new Date(doc.created_at || doc.communication_date || Date.now()).getFullYear()}-${String(doc.id).padStart(6, '0')}`;

                                return (
                                    <div key={doc.id} className="approval-card">
                                        <div className="approval-card-header">
                                            <span className={`approval-badge badge-${isUrgent ? 'urgent' : 'normal'}`}>
                                                {isUrgent ? 'Urgent' : 'Normal'}
                                            </span>
                                            <span style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 500 }}>{trackingId}</span>
                                        </div>

                                        <div>
                                            <h3 className="approval-card-title">{doc.subject}</h3>
                                            <div className="approval-meta">
                                                <span className="meta-item"><Users size={14} /> System ({doc.organization})</span>
                                                <span className="meta-item"><Clock size={14} /> {new Date(doc.communication_date).toLocaleDateString()}</span>
                                            </div>
                                        </div>

                                        <p className="approval-card-desc">{doc.details}</p>

                                        <div className="approval-file">
                                            <FileText className="approval-file-icon" size={20} />
                                            <span>{filename}</span>
                                        </div>

                                        <div className="approval-actions">
                                            <button className="btn-view" title="Preview Document" onClick={() => handlePreview(doc)}>
                                                <Eye size={16} />
                                            </button>
                                            <button className="btn-reject" onClick={() => handleReject(doc.id)}>
                                                <X size={16} /> Reject
                                            </button>
                                            <button className="btn-approve" onClick={() => handleApprove(doc.id)}>
                                                <Check size={16} /> Approve
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
