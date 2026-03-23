import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Sidebar.css';
import { loadAndApplyAdminColor } from './themeColors';
import {
	List,
	Plus,
	BarChart,
	ClipboardList,
	Settings,
	LogOut
} from 'lucide-react';

export default function Sidebar({ active = 'new', onNavigate = () => { }, onLogout = () => { } }) {
	const navigate = useNavigate();
	const [pendingCount, setPendingCount] = useState(0);
	const [staffUser, setStaffUser] = useState({ name: 'Staff Member', email: 'staff@itsd.com' });
	const [showProfileMenu, setShowProfileMenu] = useState(false);

	useEffect(() => {
		// Load and apply saved admin color theme
		loadAndApplyAdminColor();

		const stored = localStorage.getItem('staffUser');
		if (stored) {
			try {
				const parsed = JSON.parse(stored);
				setStaffUser({
					name: parsed.name || 'Staff Member',
					email: parsed.email || 'staff@itsd.com',
					profile: parsed.profile || null
				});
			} catch (err) {
				console.error('Error loading user from localStorage:', err);
			}
		}

		// Listen for admin color changes from Settings component
		const handleColorChange = (event) => {
			loadAndApplyAdminColor();
		};

		window.addEventListener('adminColorChanged', handleColorChange);
		return () => window.removeEventListener('adminColorChanged', handleColorChange);
	}, []);

	useEffect(() => {
		async function fetchPendingCount() {
			try {
				const res = await fetch('/api/communications');
				const data = await res.json();
				const pending = data.filter(d => d.status && d.status.toLowerCase() === 'pending').length;
				console.log('Pending communications count:', pending);
				setPendingCount(pending);
			} catch (err) {
				console.error('Failed to fetch pending count:', err);
				setPendingCount(0);
			}
		}

		// Fetch pending count on mount
		fetchPendingCount();

		// Refresh pending count every 30 seconds
		const interval = setInterval(fetchPendingCount, 30000);

		return () => clearInterval(interval);
	}, []);

	const getInitials = () => {
		if (!staffUser.name) return 'ST';
		return staffUser.name
			.split(' ')
			.map(n => n[0])
			.join('')
			.toUpperCase()
			.slice(0, 2);
	};

	return (
		<aside className="sidebar">
			<div className="sidebar-top">
				<div className="brand">
					<img src="/logo.png" alt="ITSD Logo" className="brand-icon" />
					<div className="brand-text">ITSD Communication Valencia city</div>
				</div>
			</div>
			<nav className="nav">
				<button
					className={`nav-item ${active === 'dashboard' ? 'active' : ''}`}
					onClick={() => onNavigate('dashboard')}
				>
					<span className="nav-icon" aria-hidden>
						<List size={18} strokeWidth={2} style={{ display: 'block' }} />
					</span>
					<span style={{ flex: 1, textAlign: 'left' }}>Record List</span>
					<span className="notification-badge">{pendingCount > 0 ? pendingCount : '0'}</span>
				</button>
				<button
					className={`nav-item ${active === 'new' ? 'active' : ''}`}
					onClick={() => onNavigate('new')}
				>
					<span className="nav-icon" aria-hidden>
						<Plus size={18} strokeWidth={2} style={{ display: 'block' }} />
					</span>
					New Document
				</button>
				<button
					className={`nav-item ${active === 'analytics' ? 'active' : ''}`}
					onClick={() => onNavigate('analytics')}
				>
					<span className="nav-icon" aria-hidden>
						<BarChart size={18} strokeWidth={2} style={{ display: 'block' }} />
					</span>
					Analytics
				</button>

				<button
					className={`nav-item ${active === 'audiy' ? 'active' : ''}`}
					onClick={() => onNavigate('audiy')}
				>
					<span className="nav-icon" aria-hidden>
						<ClipboardList size={18} strokeWidth={2} style={{ display: 'block' }} />
					</span>
					Audit Logs
				</button>

				<button
					className={`nav-item ${active === 'settings' ? 'active' : ''}`}
					onClick={() => onNavigate('settings')}
				>
					<span className="nav-icon" aria-hidden>
						<Settings size={18} strokeWidth={2} style={{ display: 'block' }} />
					</span>
					Settings
				</button>



				<button
					className={`nav-item logout-btn`}
					onClick={onLogout}
				>
					<span className="nav-icon" aria-hidden>
						<LogOut size={18} strokeWidth={2} style={{ display: 'block' }} />
					</span>
					Logout
				</button>
			</nav>
			<div className="sidebar-profile-bottom">
				<div className="profile">
					<div
						className="user-profile"
						onClick={() => setShowProfileMenu(!showProfileMenu)}
					>
						<div className="user-avatar" style={staffUser.profile ? { background: 'transparent', overflow: 'hidden' } : {}}>
							{staffUser.profile ? (
								<img src={staffUser.profile} alt={staffUser.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
							) : (
								getInitials()
							)}
						</div>
						<div className="user-details">
							<div className="user-name">{staffUser.name}</div>
							<div className="user-role">Staff</div>
						</div>
					</div>
				</div>
			</div>
		</aside>
	);
}
