import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Communication.css';
import Header from './Header';
import Sidebar from '../sidebar';
import Analytics from '../Analytics/Analytics';
import AuditLogs from '../AuditLogs';
import Dashboard from '../Dashboard/Dashboard';
import Settings from '../Settings';
import Login from '../Login';
import { STORAGE_KEYS, DEFAULT_KIND, DEFAULT_TYPE, DEFAULT_INTERNAL_OFFICE, loadOptions } from '../../communicationOptions';

function App() {
  const navigate = useNavigate();
  const [page, setPage] = useState('new');
  const [direction, setDirection] = useState('outgoing');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);

  const tagSuggestions = ['Confidential', 'IT Equipment', 'Software', 'Network', 'Urgent', 'Procurement', 'Maintenance', 'Support'];

  // Form state
  const [formData, setFormData] = useState({
    kindOfCommunication: '',
    typeOfCommunication: '',
    communicationDate: '',
    organization: '',
    subject: '',
    details: '',
    receivedBy: [],
    assignedTo: [],
    followUpRequired: null,
    priorityLevel: '',
    approval: 'Not Required'
  });

  // Today's date in YYYY-MM-DD format for date inputs / validation
  const today = new Date().toISOString().split('T')[0];

  const [groups, setGroups] = useState([]);
  const [selectedGroupMembers, setSelectedGroupMembers] = useState([]);
  const [kindOptions, setKindOptions] = useState(() => loadOptions(STORAGE_KEYS.kind, DEFAULT_KIND));
  const [typeOptions, setTypeOptions] = useState(() => loadOptions(STORAGE_KEYS.type, DEFAULT_TYPE));
  const [internalOfficeOptions, setInternalOfficeOptions] = useState(() => loadOptions(STORAGE_KEYS.internalOffice, DEFAULT_INTERNAL_OFFICE));
  const [assignedList, setAssignedList] = useState(() => {
    try {
      const raw = localStorage.getItem('assigned_list');
      return raw ? JSON.parse(raw) : ['Aldrin Constantino', 'Jenny Rose Navarra', 'Imelda Badili', 'Princess Opiz', 'Collen Alexes Pernites', 'Mary Christine Cael', 'Ted Raphael Pabiona'];
    } catch (e) { return ['Aldrin Constantino', 'Jenny Rose Navarra', 'Imelda Badili', 'Princess Opiz', 'Collen Alexes Pernites', 'Mary Christine Cael', 'Ted Raphael Pabiona']; }
  });


  // Toast state
  const [toasts, setToasts] = useState([]);

  // Check if user is already logged in on component mount
  useEffect(() => {
    const user = localStorage.getItem('staffUser');
    if (user) {
      setIsLoggedIn(true);
      setPage('dashboard');
    }
    setLoading(false);
  }, []);

  // Initialize communication date to today
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setFormData(prev => ({
      ...prev,
      communicationDate: today
    }));
  }, []);

  // Fetch groups from database
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        console.log('Attempting to fetch groups from /api/groups');
        const response = await fetch('/api/groups');
        console.log('Response status:', response.status, response.ok);
        if (response.ok) {
          const data = await response.json();
          console.log('Raw data from API:', data);
          console.log('Groups extracted:', data.groups || []);
          setGroups(data.groups || []);
        } else {
          console.error('Failed to fetch groups, status:', response.status);
          try {
            const errorData = await response.json();
            console.error('Error response:', errorData);
          } catch (e) {
            console.error('Could not parse error response');
          }
        }
      } catch (error) {
        console.error('Error fetching groups - Network/Parsing error:', error);
      }
    };
    fetchGroups();
  }, []);

  // Fetch dropdown options from storage (managed in Admin Actions modal) when on communication form
  useEffect(() => {
    const onFormView = page !== 'analytics' && page !== 'dashboard' && page !== 'settings' && page !== 'login';
    if (onFormView) {
      setKindOptions(loadOptions(STORAGE_KEYS.kind, DEFAULT_KIND));
      setTypeOptions(loadOptions(STORAGE_KEYS.type, DEFAULT_TYPE));
      setInternalOfficeOptions(loadOptions(STORAGE_KEYS.internalOffice, DEFAULT_INTERNAL_OFFICE));
    }
  }, [page]);

  useEffect(() => {
    const onAssignedChange = (e) => {
      try {
        if (e && e.detail) setAssignedList(Array.isArray(e.detail) ? e.detail : JSON.parse(e.detail));
      } catch (err) { try { setAssignedList(JSON.parse(localStorage.getItem('assigned_list') || '[]')); } catch (e) { } }
    };

    const onStorage = (ev) => {
      if (ev.key === 'assigned_list') {
        try { setAssignedList(ev.newValue ? JSON.parse(ev.newValue) : []); } catch (e) { }
      }
    };

    window.addEventListener('assignedListChanged', onAssignedChange);
    window.addEventListener('storage', onStorage);

    return () => {
      window.removeEventListener('assignedListChanged', onAssignedChange);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  // Helper to record audit logs (non-blocking, won't interrupt UI)
  const recordAuditLog = async (userEmail, action, description, userRole = null) => {
    try {
      const auditData = { action, user_email: userEmail, user_role: userRole, description };
      await fetch('/api/auth/record-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(auditData)
      });
    } catch (err) {
      console.error('Error recording audit log (logout):', err);
    }
  };

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
    setPage('dashboard');
  };

  const handleLogout = async () => {
    try {
      const stored = localStorage.getItem('staffUser');
      let email = null;
      let name = null;
      if (stored) {
        try {
          const user = JSON.parse(stored);
          email = user.email || null;
          name = user.name || email;
        } catch (e) {
          email = null;
          name = null;
        }
      }

      // Fire-and-forget audit log for logout (mark as staff)
      // include role when available
      let role = null;
      try { role = JSON.parse(localStorage.getItem('staffUser') || '{}').role || null; } catch (e) { role = null; }
      const displayName = name || email || 'Unknown';
      recordAuditLog(displayName, 'LOGOUT', `Staff ${displayName} (${email}) logged out from browser (host: ${window.location.hostname})`, role);

      localStorage.removeItem('staffUser');
      sessionStorage.clear();
      setIsLoggedIn(false);
      navigate('/login');
    } catch (e) {
      setIsLoggedIn(false);
      navigate('/login');
    }
  };

  const handleRefresh = () => {
    const today = new Date().toISOString().split('T')[0];
    setFormData({
      kindOfCommunication: '',
      typeOfCommunication: '',
      communicationDate: today,
      organization: '',
      subject: '',
      details: '',
      receivedBy: [],
      assignedTo: [],
      followUpRequired: null,
      priorityLevel: '',
      approval: 'Not Required'
    });
    setUploadedFiles([]);
    setTags([]);
    setDirection('outgoing');
  };

  const handleFiles = (files) => {
    const newFiles = Array.from(files).map(file => ({
      name: file.name,
      size: (file.size / 1024).toFixed(2), // Convert to KB
      type: file.type,
      file: file
    }));
    setUploadedFiles([...uploadedFiles, ...newFiles]);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleInputChange = (e) => {
    handleFiles(e.target.files);
  };

  const removeFile = (index) => {
    setUploadedFiles(uploadedFiles.filter((_, i) => i !== index));
  };

  const handleTagInputChange = (e) => {
    setTagInput(e.target.value);
    setShowTagSuggestions(e.target.value.length > 0);
  };

  const addTag = (tag) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
      setTagInput('');
      setShowTagSuggestions(false);
    }
  };

  const handleTagSelect = (e) => {
    const selectedValue = e.target.value;
    if (!selectedValue) return;

    setTags((prevTags) => {
      if (prevTags.includes(selectedValue)) {
        return prevTags.filter((t) => t !== selectedValue);
      }
      return [...prevTags, selectedValue];
    });

    // Reset selection so user can toggle the same tag again
    e.target.value = '';
  };

  const removeTag = (index) => {
    setTags(tags.filter((_, i) => i !== index));
  };

  const handleAssignedSelect = (e) => {
    const selectedValue = e.target.value;
    if (!selectedValue) return;

    setFormData(prev => {
      const currentAssigned = Array.isArray(prev.assignedTo) ? prev.assignedTo : [];
      let newAssigned;
      if (currentAssigned.includes(selectedValue)) {
        newAssigned = currentAssigned.filter(v => v !== selectedValue);
      } else {
        newAssigned = [...currentAssigned, selectedValue];
      }

      // Update selectedGroupMembers based on all selected groups
      const allMembers = new Set();
      newAssigned.forEach(assn => {
        const group = groups.find(g => g.assigned_to === assn);
        if (group) {
          const members = typeof group.members === 'string' ? JSON.parse(group.members || '[]') : (group.members || []);
          members.forEach(m => allMembers.add(m));
        }
      });
      setSelectedGroupMembers(Array.from(allMembers));

      return { ...prev, assignedTo: newAssigned };
    });

    e.target.value = '';
  };

  const handleReceivedBySelect = (e) => {
    const selectedValue = e.target.value;
    if (!selectedValue) return;

    setFormData(prev => {
      const currentReceived = Array.isArray(prev.receivedBy) ? prev.receivedBy : [];
      let newReceived;
      if (currentReceived.includes(selectedValue)) {
        newReceived = currentReceived.filter(v => v !== selectedValue);
      } else {
        newReceived = [...currentReceived, selectedValue];
      }
      return { ...prev, receivedBy: newReceived };
    });

    e.target.value = '';
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'assignedTo' || name === 'receivedBy') return; // Handled by select logic

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const validateForm = () => {
    const errors = [];

    if (!direction) errors.push('Direction is required');
    if (!formData.kindOfCommunication) errors.push('Kind of Communication is required');
    if (!formData.typeOfCommunication) errors.push('Type of Communication is required');
    if (!formData.communicationDate) {
      errors.push('Communication Date is required');
    } else if (formData.communicationDate < today) {
      errors.push('Communication Date cannot be in the past');
    }
    if (!formData.organization) errors.push('Organization is required');
    if (!formData.subject.trim()) errors.push('Subject is required');
    if (!formData.details.trim()) errors.push('Communication Details are required');
    if (tags.length === 0) errors.push('At least one Tag is required');

    return errors;
  };

  // Compute form errors and overall validity for UI (no extra state needed)
  const formErrors = validateForm();
  const isFormValid = formErrors.length === 0;

  const showToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);

    // Auto remove toast after 4 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 4000);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const performSubmit = async () => {
    try {
      const communicationData = {
        direction,
        kindOfCommunication: formData.kindOfCommunication,
        typeOfCommunication: formData.typeOfCommunication,
        communicationDate: formData.communicationDate,
        organization: formData.organization,
        subject: formData.subject,
        details: formData.details,
        receivedBy: Array.isArray(formData.receivedBy) ? formData.receivedBy.join(', ') : formData.receivedBy,
        assignedTo: Array.isArray(formData.assignedTo) ? formData.assignedTo.join(', ') : formData.assignedTo,
        tags: tags.join(','),
        followUpRequired: formData.followUpRequired,
        priorityLevel: formData.priorityLevel,
        approval: formData.approval,
        // Initial attachment metadata; files themselves will be uploaded right after
        attachments: uploadedFiles.map(file => ({
          name: file.name,
          size: file.size,
          type: file.type
        }))
      };

      console.log('Submitting communication data:', communicationData);

      const response = await fetch('/api/communications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(communicationData)
      });

      console.log('Response status:', response.status);
      const responseText = await response.text();
      console.log('Response text:', responseText);

      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse response:', parseError);
        showToast('Server error: Invalid response. Check console for details.', 'error');
        return;
      }

      console.log('Response from server:', result);

      if (result.success) {
        // If there are uploaded files, upload them to the backend so URLs are stored in the DB
        if (uploadedFiles.length > 0 && result.id) {
          try {
            await Promise.all(
              uploadedFiles.map((fileWrapper, index) => {
                if (!fileWrapper.file) return null;
                const formData = new FormData();
                formData.append('file', fileWrapper.file);
                formData.append('communicationId', result.id);
                formData.append('attachmentIndex', index.toString());
                if (result.table) {
                  formData.append('targetTable', result.table);
                }

                return fetch('/api/communications/upload', {
                  method: 'POST',
                  body: formData
                });
              })
            );
          } catch (uploadError) {
            console.error('Attachment upload error:', uploadError);
            // We won't block the main success, but log so it can be diagnosed
          }
        }

        showToast('Communication submitted successfully!', 'success');
        // Record audit log for communication creation (non-blocking)
        try {
          const stored = localStorage.getItem('staffUser');
          let email = null;
          let name = null;
          let role = null;
          if (stored) {
            try {
              const user = JSON.parse(stored);
              email = user.email || null;
              name = user.name || email;
              role = user.role || null;
            } catch (e) { /* ignore parse errors */ }
          }
          const displayName = name || email || 'Unknown';
          const description = `Staff ${displayName} (${email}) created communication "${communicationData.subject}" assignedTo: ${communicationData.assignedTo || 'N/A'}`;
          recordAuditLog(displayName, 'CREATE_COMMUNICATION', description, role);
        } catch (err) {
          console.warn('Audit log failed:', err);
        }
        // Reset form
        setFormData({
          kindOfCommunication: '',
          typeOfCommunication: '',
          communicationDate: '',
          organization: '',
          subject: '',
          details: '',
          receivedBy: [],
          assignedTo: [],
          followUpRequired: null,
          priorityLevel: '',
          approval: 'Not Required'
        });
        setTags([]);
        setUploadedFiles([]);
        setDirection('outgoing');
        setShowReviewModal(false); // Close modal
      } else {
        showToast(result.message || 'Error submitting communication', 'error');
      }
    } catch (error) {
      console.error('Submission error:', error);
      showToast('Error submitting communication: ' + error.message, 'error');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validate form
    const errors = validateForm();
    if (errors.length > 0) {
      showToast('Please fill all required fields: ' + errors.join(', '), 'error');
      return;
    }

    setShowReviewModal(true);
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading...</div>;
  }

  return (
    <div className="app-shell">
      {/* Toast Notifications */}
      <div className="toasts-container">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            <span>{toast.message}</span>
            <button
              className="toast-close"
              onClick={() => removeToast(toast.id)}
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {!isLoggedIn ? (
        <Login onLoginSuccess={handleLoginSuccess} />
      ) : (
        <>
          <Sidebar active={page} onNavigate={setPage} onLogout={handleLogout} />

          {page === 'analytics' ? (
            <Analytics />
          ) : page === 'audiy' ? (
            <AuditLogs />
          ) : page === 'dashboard' ? (
            <Dashboard />
          ) : page === 'settings' ? (
            <Settings />
          ) : (
            <div className="main">
              <Header onRefresh={handleRefresh} />

              <main className="container">
                <section className="form-column">
                  <div className="card direction-card">
                    <h2>
                      Communication Direction<span className="req">*</span>
                    </h2>
                    <select
                      className="direction-dropdown"
                      value={direction}
                      onChange={(e) => setDirection(e.target.value)}
                    >
                      <option value="incoming">Incoming</option>
                      <option value="outgoing">Outgoing</option>
                      <option value="itsd">ITSD only</option>
                    </select>
                  </div>

                  <div className="card form-card">
                    <div className="form-grid">
                      <div className="field">
                        <label>
                          Kind of Communication<span className="req">*</span>
                        </label>
                        <select
                          name="kindOfCommunication"
                          value={formData.kindOfCommunication}
                          onChange={handleFormChange}
                          required
                        >
                          <option value="" disabled hidden>Select communication type...</option>
                          {kindOptions.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
                        </select>
                      </div>
                      <div className="field">
                        <label>
                          Type of Communication<span className="req">*</span>
                        </label>
                        <select
                          name="typeOfCommunication"
                          value={formData.typeOfCommunication}
                          onChange={handleFormChange}
                          required
                        >
                          <option value="" disabled hidden>Select type...</option>
                          {typeOptions.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
                        </select>
                      </div>

                      <div className="field">
                        <label>
                          Date<span className="req">*</span>
                        </label>
                        <input
                          type="date"
                          name="communicationDate"
                          value={formData.communicationDate}
                          min={today}
                          onChange={handleFormChange}
                          required
                        />
                      </div>

                      <div className="field">
                        <label>
                          Internal Office / External Org...<span className="req">*</span>
                        </label>
                        <select
                          name="organization"
                          value={formData.organization}
                          onChange={handleFormChange}
                          required
                        >
                          <option value="" disabled hidden>Select Offices...</option>
                          {internalOfficeOptions.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
                        </select>
                      </div>

                      <div className="field full">
                        <label>
                          Subject of Communications<span className="req">*</span>
                        </label>
                        <input
                          placeholder="Enter subject..."
                          name="subject"
                          value={formData.subject}
                          onChange={handleFormChange}
                          required
                        />
                      </div>

                      <div className="field full">
                        <label>
                          Communication Details<span className="req">*</span>
                        </label>
                        <textarea
                          placeholder="Enter detailed information about the communication..."
                          name="details"
                          value={formData.details}
                          onChange={handleFormChange}
                          required
                        />
                      </div>

                      <div className="field full">
                        <label>
                          Approval Requirement<span className="req">*</span>
                        </label>
                        <div style={{ display: 'flex', gap: '24px', marginTop: '12px' }}>
                          <label className="radio-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input
                              type="radio"
                              name="approval"
                              value="Required"
                              checked={formData.approval === 'Required'}
                              onChange={handleFormChange}
                            /> Requires Head Approval
                          </label>
                          <label className="radio-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input
                              type="radio"
                              name="approval"
                              value="Not Required"
                              checked={formData.approval === 'Not Required'}
                              onChange={handleFormChange}
                            /> Not Required
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="attachments card">
                    <h3>Attachments</h3>
                    <p className="upload-label">Upload Files</p>
                    <div
                      className={`dropzone ${dragActive ? 'active' : ''}`}
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                    >
                      <input
                        type="file"
                        id="file-input"
                        multiple
                        onChange={handleInputChange}
                        style={{ display: 'none' }}
                      />
                      <svg className="dropzone-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                      </svg>
                      <p className="dropzone-text">Drag and drop files here, or <span className="browse-link" onClick={() => document.getElementById('file-input').click()}>browse</span></p>
                      <p className="dropzone-hint">Supports: PDF, Word, Excel, Images, etc.</p>
                    </div>

                    {uploadedFiles.length > 0 && (
                      <div className="uploaded-files">
                        <h4>Uploaded Files ({uploadedFiles.length})</h4>
                        <div className="file-list">
                          {uploadedFiles.map((file, index) => (
                            <div key={index} className="file-item">
                              <div className="file-info">
                                <span className="file-name">{file.name}</span>
                                <span className="file-size">{file.size} KB</span>
                              </div>
                              <button
                                type="button"
                                className="remove-file-btn"
                                onClick={() => removeFile(index)}
                                title="Remove file"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </section>

                <aside className="right-column">
                  <div className="card side-card">
                    <h3>Personnel & Assignment</h3>
                    <label>Assigned To</label>
                    <select
                      name="assignedTo"
                      className="tag-dropdown"
                      onChange={handleAssignedSelect}
                      value=""
                    >
                      <option value="" disabled hidden>
                        {(formData.assignedTo && formData.assignedTo.length > 0) ? formData.assignedTo.join(', ') : 'Select personnel...'}
                      </option>
                      {groups && groups.length > 0 ? (
                        groups.map((group, i) => (
                          <option key={i} value={group.assigned_to}>
                            {(formData.assignedTo && formData.assignedTo.includes(group.assigned_to)) ? '✓ ' : ''}{group.assigned_to}
                          </option>
                        ))
                      ) : (
                        <option disabled>No personnel available</option>
                      )}
                    </select>
                    <p style={{ fontSize: '12px', color: '#666' }}>{groups.length} personnel loaded</p>

                    <label>Received/Released By (ITSD Personnel)</label>
                    <select
                      name="receivedBy"
                      className="tag-dropdown"
                      onChange={handleReceivedBySelect}
                      value=""
                    >
                      <option value="" disabled hidden>
                        {(formData.receivedBy && formData.receivedBy.length > 0) ? formData.receivedBy.join(', ') : 'Select Personnel...'}
                      </option>
                      {selectedGroupMembers.map((member, i) => (
                        <option key={i} value={member}>
                          {(formData.receivedBy && formData.receivedBy.includes(member)) ? '✓ ' : ''}{member}
                        </option>
                      ))}
                    </select>

                    <label>Tags</label>

                    <div className="tags-container">
                      <select
                        className="tag-dropdown"
                        onChange={handleTagSelect}
                        value=""
                      >
                        <option value="" disabled hidden>
                          {tags.length > 0 ? tags.join(', ') : 'Select tags...'}
                        </option>
                        {tagSuggestions.map((suggestion, index) => (
                          <option
                            key={index}
                            value={suggestion}
                          >
                            {tags.includes(suggestion) ? '✓ ' : ''}{suggestion}
                          </option>
                        ))}
                      </select>
                    </div>

                  </div>

                  <div className="card side-card">
                    <h3>
                      Follow-up<span className="req">*</span>
                    </h3>
                    <div className="radio-group">
                      <label className="radio-label">
                        <input
                          type="radio"
                          name="followUpRequired"
                          autoComplete="off"
                          checked={formData.followUpRequired === true}
                          onChange={() => setFormData(prev => ({ ...prev, followUpRequired: true }))}
                        /> Follow-up Required
                      </label>
                      <label className="radio-label">
                        <input
                          type="radio"
                          name="followUpRequired"
                          autoComplete="off"
                          checked={formData.followUpRequired === false}
                          onChange={() => setFormData(prev => ({ ...prev, followUpRequired: false }))}
                        /> No Follow-up Needed
                      </label>
                    </div>

                    <h3 style={{ marginTop: '20px' }}>
                      Priority Level<span className="req">*</span>
                    </h3>
                    <div className="priority">
                      <label className="priority-label high">
                        <input
                          type="radio"
                          name="priorityLevel"
                          value="high"
                          autoComplete="off"
                          checked={formData.priorityLevel === 'high'}
                          onChange={handleFormChange}
                        />
                        High
                      </label>
                      <label className="priority-label medium">
                        <input
                          type="radio"
                          name="priorityLevel"
                          value="medium"
                          autoComplete="off"
                          checked={formData.priorityLevel === 'medium'}
                          onChange={handleFormChange}
                        />
                        Medium
                      </label>
                      <label className="priority-label low">
                        <input
                          type="radio"
                          name="priorityLevel"
                          value="low"
                          autoComplete="off"
                          checked={formData.priorityLevel === 'low'}
                          onChange={handleFormChange}
                        />
                        Low
                      </label>
                    </div>
                  </div>
                </aside>
              </main>

              <footer className="submit-bar">
                <button
                  className="submit"
                  onClick={handleSubmit}
                  disabled={!isFormValid}
                  title={formErrors.length > 0 ? 'Fix required fields: ' + formErrors.join(', ') : 'Submit communication'}
                  style={{ opacity: isFormValid ? 1 : 0.6, cursor: isFormValid ? 'pointer' : 'not-allowed' }}
                >
                  Submit Communication
                </button>
              </footer>
            </div>
          )}

          {/* Review Modal */}
          {showReviewModal && (
            <div className="review-modal-backdrop">
              <div className="review-modal">
                <div className="review-modal-header">
                  <h3>Review Communication</h3>
                  <button
                    className="review-modal-close"
                    onClick={() => setShowReviewModal(false)}
                  >
                    ×
                  </button>
                </div>
                <div className="review-modal-body">
                  <div className="review-section">
                    <h4>📥 Direction</h4>
                    <p>{direction === 'incoming' ? 'Incoming' : 'Outgoing'}</p>
                  </div>
                  <div className="review-section">
                    <h4>🏷️ Kind of Communication</h4>
                    <p>{formData.kindOfCommunication}</p>
                  </div>
                  <div className="review-section">
                    <h4>📋 Type of Communication</h4>
                    <p>{formData.typeOfCommunication}</p>
                  </div>
                  <div className="review-section">
                    <h4>📅 Date</h4>
                    <p>{formData.communicationDate}</p>
                  </div>
                  <div className="review-section">
                    <h4>🏢 Organization</h4>
                    <p>{formData.organization}</p>
                  </div>
                  <div className="review-section">
                    <h4>📝 Subject</h4>
                    <p>{formData.subject}</p>
                  </div>
                  <div className="review-section">
                    <h4>📄 Details</h4>
                    <p>{formData.details}</p>
                  </div>
                  <div className="review-section">
                    <h4>👤 Assigned To</h4>
                    <p>{(formData.assignedTo && formData.assignedTo.length > 0) ? formData.assignedTo.join(', ') : 'Not specified'}</p>
                  </div>
                  <div className="review-section">
                    <h4>👨‍💼 Received/Released By</h4>
                    <p>{(formData.receivedBy && formData.receivedBy.length > 0) ? formData.receivedBy.join(', ') : 'Not specified'}</p>
                  </div>
                  <div className="review-section">
                    <h4>🏷️ Tags</h4>
                    <p>{tags.length > 0 ? tags.join(', ') : 'None'}</p>
                  </div>
                  <div className="review-section">
                    <h4>🔄 Follow-up Required</h4>
                    <p>{formData.followUpRequired === true ? 'Yes' : formData.followUpRequired === false ? 'No' : 'Not specified'}</p>
                  </div>
                  <div className="review-section">
                    <h4>⚡ Priority Level</h4>
                    <p>{formData.priorityLevel ? formData.priorityLevel.charAt(0).toUpperCase() + formData.priorityLevel.slice(1) : 'Not specified'}</p>
                  </div>
                  {uploadedFiles.length > 0 && (
                    <div className="review-section">
                      <h4>📎 Attachments</h4>
                      <ul>
                        {uploadedFiles.map((file, index) => (
                          <li key={index}>{file.name} ({file.size} KB)</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                <div className="review-modal-footer">
                  <button
                    className="review-modal-cancel-btn"
                    onClick={() => setShowReviewModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="review-modal-submit-btn"
                    onClick={performSubmit}
                  >
                    Submit Communication
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default App;
