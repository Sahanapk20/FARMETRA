import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    Users,
    Activity,
    Package,
    TrendingUp,
    Shield,
    ChevronRight,
    Loader,
    CreditCard
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import AdminPaymentDashboard from '../../components/payment/AdminPaymentDashboard';
import '../dashboard/DashboardHome.css';

interface AdminStats {
    totalUsers: number;
    totalBatches: number;
    totalEvents: number;
    totalHandoffs: number;
    usersByRole: Record<string, number>;
}

const AdminDashboard = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            const token = localStorage.getItem('FARMETRA_token');
            const response = await fetch(`${API_URL}/admin/stats`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setStats(data.stats);
            }
        } catch (error) {
            console.error('Failed to load admin stats:', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="dashboard-home" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                <Loader size={40} className="spinner" />
            </div>
        );
    }

    const statCards = [
        { label: 'Total Users', value: stats?.totalUsers || 0, icon: <Users size={24} />, color: 'primary' },
        { label: 'Total Batches', value: stats?.totalBatches || 0, icon: <Package size={24} />, color: 'accent' },
        { label: 'Total Events', value: stats?.totalEvents || 0, icon: <Activity size={24} />, color: 'info' },
        { label: 'Total Handoffs', value: stats?.totalHandoffs || 0, icon: <TrendingUp size={24} />, color: 'success' },
    ];

    return (
        <div className="dashboard-home">
            <div className="page-header">
                <div className="page-header-row">
                    <div>
                        <h1 className="page-title">
                            <Shield size={28} style={{ marginRight: '12px', color: '#10b981' }} />
                            Admin Dashboard
                        </h1>
                        <p className="page-subtitle">Welcome back, {user?.name}. Here's your system overview.</p>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="stats-grid">
                {statCards.map((stat, index) => (
                    <div key={index} className={`stats-card stat-${stat.color}`}>
                        <div className={`stats-icon stats-icon-${stat.color}`}>
                            {stat.icon}
                        </div>
                        <div className="stats-content">
                            <span className="stats-value">{stat.value.toLocaleString()}</span>
                            <span className="stats-label">{stat.label}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Role Distribution */}
            {stats?.usersByRole && (
                <div className="chart-card" style={{ marginBottom: '24px' }}>
                    <div className="chart-header">
                        <h3 className="chart-title">Users by Role</h3>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', padding: '20px' }}>
                        {Object.entries(stats.usersByRole).map(([role, count]) => (
                            <div key={role} style={{
                                padding: '12px 20px',
                                background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
                                borderRadius: '10px',
                                border: '1px solid #86efac',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px'
                            }}>
                                <span style={{ fontWeight: 600, color: '#166534' }}>{role}</span>
                                <span style={{
                                    background: '#10b981',
                                    color: 'white',
                                    padding: '2px 10px',
                                    borderRadius: '12px',
                                    fontSize: '13px',
                                    fontWeight: 600
                                }}>
                                    {count}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Quick Links */}
            <div className="bottom-row">
                <div className="card recent-batches-card">
                    <div className="card-header">
                        <h3>Admin Actions</h3>
                    </div>
                    <div style={{ padding: '8px 0' }}>
                        <Link to="/dashboard/admin/users" style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '16px 20px',
                            borderBottom: '1px solid #f3f4f6',
                            textDecoration: 'none',
                            color: 'inherit'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '10px',
                                    background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white'
                                }}>
                                    <Users size={20} />
                                </div>
                                <div>
                                    <div style={{ fontWeight: 600 }}>Manage Users</div>
                                    <div style={{ fontSize: '13px', color: '#6b7280' }}>View all users, change roles</div>
                                </div>
                            </div>
                            <ChevronRight size={20} color="#9ca3af" />
                        </Link>

                        <Link to="/dashboard/admin/activity" style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '16px 20px',
                            textDecoration: 'none',
                            color: 'inherit'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '10px',
                                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white'
                                }}>
                                    <Activity size={20} />
                                </div>
                                <div>
                                    <div style={{ fontWeight: 600 }}>System Activity</div>
                                    <div style={{ fontSize: '13px', color: '#6b7280' }}>View all events and handoffs</div>
                                </div>
                            </div>
                            <ChevronRight size={20} color="#9ca3af" />
                        </Link>

                        <Link to="/dashboard/admin/payments" style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '16px 20px',
                            textDecoration: 'none',
                            color: 'inherit'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '10px',
                                    background: 'linear-gradient(135deg, #10b981, #059669)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white'
                                }}>
                                    <CreditCard size={20} />
                                </div>
                                <div>
                                    <div style={{ fontWeight: 600 }}>Payment Analytics</div>
                                    <div style={{ fontSize: '13px', color: '#6b7280' }}>View revenue and transactions</div>
                                </div>
                            </div>
                            <ChevronRight size={20} color="#9ca3af" />
                        </Link>
                    </div>
                </div>

                {/* Payment Analytics Dashboard */}
                <AdminPaymentDashboard />
            </div>
        </div>
    );
};

export default AdminDashboard;
