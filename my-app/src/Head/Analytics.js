import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import { LayoutDashboard, TrendingUp, Activity, Users, MessageCircle, Settings, Filter, ShieldCheck } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function Analytics() {
    const navigate = useNavigate();

    const user = {
        name: 'Anthony Alverizko',
        email: 'anthony.alve@gmail.com',
        avatar: null
    };

    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [filterDirection, setFilterDirection] = useState('All');
    const [filterStatus, setFilterStatus] = useState('All');
    const [timeRange, setTimeRange] = useState('AllTime');

    useEffect(() => {
        Promise.all([
            fetch('/api/communications/approvals/pending').then(res => res.json()),
            fetch('/api/communications').then(res => res.json())
        ]).then(([approvalsData, commsData]) => {
            const pendingArr = approvalsData.success ? approvalsData.data : [];
            const commsArr = Array.isArray(commsData) ? commsData : [];

            const combined = [
                ...pendingArr.map(d => ({ ...d, table: 'Approval', computed_status: 'Pending Approval' })),
                ...commsArr.map(d => ({ ...d, table: 'Comm', computed_status: d.status === 'approved' ? 'Approved' : 'In Process' }))
            ];
            setData(combined);
            setLoading(false);
        }).catch(err => {
            console.error(err);
            setLoading(false);
        });
    }, []);

    const iconProps = { size: 16, strokeWidth: 2, style: { display: 'block' } };
    const navItems = [
        { label: 'Overview', icon: <LayoutDashboard {...iconProps} />, onClick: () => navigate('/head') },
        { label: 'Analytics', active: true, icon: <TrendingUp {...iconProps} />, onClick: () => navigate('/head/analytics') },
        { label: 'Process', icon: <Activity {...iconProps} />, onClick: () => navigate('/head/process') },
        { label: 'Approval', icon: <Users {...iconProps} />, onClick: () => navigate('/head/approval') },
        { label: 'Manage Roles', icon: <ShieldCheck {...iconProps} />, onClick: () => navigate('/head/manage-roles') }
    ];

    const settingsItems = [
        { label: 'Announcements', badge: 3, icon: <MessageCircle {...iconProps} />, onClick: () => navigate('/head/announcements') },
        { label: 'Settings', icon: <Settings {...iconProps} /> }
    ];

    // Filtering logic
    const now = new Date();
    const filteredData = data.filter(d => {
        if (filterDirection !== 'All' && d.direction !== filterDirection) return false;
        if (filterStatus !== 'All' && d.computed_status !== filterStatus) return false;

        if (timeRange !== 'AllTime') {
            const commDate = new Date(d.created_at || d.communication_date);
            const diffTime = Math.abs(now - commDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (timeRange === 'Last7Days' && diffDays > 7) return false;
            if (timeRange === 'Last30Days' && diffDays > 30) return false;
        }
        return true;
    });

    // Calculate Chart Data based on filteredData
    const typeCount = {};
    const statusCount = {};

    filteredData.forEach(item => {
        const t = item.kind_of_communication || 'Unspecified';
        typeCount[t] = (typeCount[t] || 0) + 1;

        const s = item.computed_status || 'Unknown';
        statusCount[s] = (statusCount[s] || 0) + 1;
    });

    const chartDataTypes = Object.entries(typeCount).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    const chartDataStats = Object.entries(statusCount).map(([name, value]) => ({ name, value }));

    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

    return (
        <div className="head-page">
            <Sidebar navItems={navItems} settingsItems={settingsItems} />
            <main className="head-main">
                <Header
                    title="Analytics Hub"
                    subtitle="Explore communication deep data & metrics"
                    userName={user.name}
                    userEmail={user.email}
                    userAvatar={user.avatar}
                />

                {/* Filters Panel */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', background: 'white', padding: '16px 24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontWeight: 600, marginRight: '12px' }}>
                        <Filter size={18} /> Filters:
                    </div>

                    <select style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', background: '#f8fafc', color: '#1e293b', fontWeight: 500 }} onChange={e => setFilterDirection(e.target.value)} value={filterDirection}>
                        <option value="All">All Directions</option>
                        <option value="Incoming">Incoming</option>
                        <option value="Outgoing">Outgoing</option>
                    </select>

                    <select style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', background: '#f8fafc', color: '#1e293b', fontWeight: 500 }} onChange={e => setFilterStatus(e.target.value)} value={filterStatus}>
                        <option value="All">All Statuses</option>
                        <option value="Pending Approval">Pending Approval</option>
                        <option value="In Process">In Process</option>
                        <option value="Approved">Approved</option>
                    </select>

                    <select style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', background: '#f8fafc', color: '#1e293b', fontWeight: 500 }} onChange={e => setTimeRange(e.target.value)} value={timeRange}>
                        <option value="AllTime">All Time Data</option>
                        <option value="Last7Days">Last 7 Days</option>
                        <option value="Last30Days">Last 30 Days</option>
                    </select>

                    <div style={{ marginLeft: 'auto', fontSize: '13px', background: '#e0e7ff', color: '#4338ca', padding: '6px 14px', borderRadius: '30px', fontWeight: 700 }}>
                        {filteredData.length} Records Match
                    </div>
                </div>

                {loading ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontWeight: 500 }}>Loading analytics...</div>
                ) : filteredData.length === 0 ? (
                    <div style={{ padding: '80px', textAlign: 'center', color: '#94a3b8', background: 'white', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>
                        No data matches the selected filters.
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>

                        {/* Chart 1 */}
                        <div style={{ background: 'white', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                            <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '20px', color: '#1e293b' }}>Volume by Communication Rule</h2>
                            <div style={{ width: '100%', height: 320 }}>
                                <ResponsiveContainer>
                                    <BarChart data={chartDataTypes}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                                        <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                                        <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                                        <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Chart 2 */}
                        <div style={{ background: 'white', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                            <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '20px', color: '#1e293b' }}>Status Composition Share</h2>
                            <div style={{ width: '100%', height: 320 }}>
                                <ResponsiveContainer>
                                    <PieChart>
                                        <Pie data={chartDataStats} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={110} innerRadius={65} paddingAngle={2}>
                                            {chartDataStats.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                                        <Legend verticalAlign="bottom" height={36} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                    </div>
                )}
            </main>
        </div>
    );
}
