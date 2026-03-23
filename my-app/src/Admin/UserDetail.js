import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import './Admin.css';

// AddUserModal: a simple reusable modal component for creating a user
export function AddUserModal({ open, onClose, onCreate }) {
	const [name, setName] = useState('');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [role, setRole] = useState('Admin');
	const [department, setDepartment] = useState('ITSD');
	const [phone, setPhone] = useState('');
	const [notes, setNotes] = useState('');
	const [permissions, setPermissions] = useState([]);
	const [error, setError] = useState('');

	if (!open) return null;

	const togglePerm = (perm) => {
		setPermissions(prev => prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]);
	};

	const validate = () => {
		if (!name.trim()) return 'Name is required';
		if (!email.trim()) return 'Email is required';
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Email is invalid';
		if (password && password.length > 0 && password.length < 6) return 'Password must be at least 6 characters';
		return '';
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		const v = validate();
		if (v) { setError(v); return; }
		
		const newUser = {
			name: name.trim(),
			email: email.trim(),
			password: password || undefined,
			role,
			department,
			phone,
			notes,
			permissions
		};

		try {
			const response = await fetch('/api/auth/users', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(newUser)
			});

			const result = await response.json();

			if (result.success) {
				onCreate?.({ id: result.user.id, ...newUser });
				// reset and close
				setName(''); setEmail(''); setPassword(''); setRole('Viewer'); setDepartment(''); setPhone(''); setNotes(''); setPermissions([]); setError('');
				onClose?.();
			} else {
				setError(result.message || 'Failed to create user');
			}
		} catch (err) {
			setError('Error submitting user: ' + err.message);
			console.error('User creation error:', err);
		}
	};

	return (
		<div className="modal-backdrop">
			<div className="modal">
				<div className="modal-header">
					<h2>Add User</h2>
					<button className="modal-close" onClick={onClose}>✕</button>
				</div>
				<form className="modal-body form-grid" onSubmit={handleSubmit}>
					{error && <div className="form-error">{error}</div>}
					<label>
						Name
						<input value={name} onChange={e => setName(e.target.value)} required />
					</label>
					<label>
						Email
						<input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
					</label>
					<label>
						Password
						<input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="(optional) set to let user sign in" />
					</label>
					<label>
						Role
						<select value={role} onChange={e => setRole(e.target.value)}>
							<option>Admin</option>						
							<option>Staff</option>	
							<option>User</option>							
						</select>
					</label>
					<label>
						Department
						<input value={department} disabled />
					</label>
					<label>
						Phone
						<input value={phone} onChange={e => setPhone(e.target.value)} />
					</label>
					<div className="permissions-group">
						<span className="perm-label">Permissions</span>
						
						<label className="perm-item"><input type="checkbox" checked={permissions.includes('Full')} onChange={() => togglePerm('Full')} /> Full Access</label>
					</div>
					<label className="full">
						Notes
						<textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
					</label>
					<div className="modal-actions">
						<button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
						<button type="submit" className="btn btn-primary">Create</button>
					</div>
				</form>
			</div>
		</div>
	);
}

export default function UserDetail() {
	
	
}

