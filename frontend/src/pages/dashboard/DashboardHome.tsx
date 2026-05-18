import { useState, useEffect, type JSX } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
    Package,
    TrendingUp,
    QrCode,
    CheckCircle,
    Plus,
    Eye,
    Clock,
    MapPin,
    ChevronRight,
    Cpu,
    Loader,
    CreditCard,
    ScanLine,
    ArrowRight
} from 'lucide-react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { fetchDashboardStats } from '../../api/apiClient';
import './DashboardHome.css';

const getActivityIcon = (type: string): JSX.Element => {
    const icons: Record<string, JSX.Element> = {
        batch_created: <Package size={16} />,
        qr_scanned: <QrCode size={16} />,
        event_added: <Clock size={16} />,
        batch_split: <TrendingUp size={16} />,
        blockchain_verified: <Cpu size={16} />
    };
    return icons[type] || <Package size={16} />;
};

interface DashboardStats {
    totalBatches: number;
    qrScans: number;
    verificationRate: number;
}

interface RecentBatch {
    id: string;
    batchId: string;
    product: string;
    origin?: string;
    status: string;
    date?: string;
}

interface PieDataItem {
    name: string;
    value: number;
    color: string;
    [key: string]: string | number;  // Index signature for Recharts compatibility
}

interface ChartDataItem {
    name: string;
    batches: number;
    scans: number;
}

interface ActivityItem {
    id: string;
    type: string;
    message: string;
    messageKey?: string;
    messageParams?: Record<string, string>;
    time: string;
    timeKey?: string;
    timeValue?: string;
}

import { useTranslation } from '../../hooks/useTranslation';
import { getTranslation } from '../../locales/translations';

const DashboardHome = () => {
    const { user } = useAuth();
    const { t } = useTranslation();
    const { currentLanguage } = useLanguage();

    // Redirect admin users to admin dashboard
    if (user?.role?.toUpperCase() === 'ADMIN') {
        return <Navigate to="/dashboard/admin" replace />;
    }

    // Redirect consumers to marketplace
    if (user?.role?.toUpperCase() === 'CONSUMER') {
        return <Navigate to="/marketplace" replace />;
    }

    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState<DashboardStats>({ totalBatches: 0, qrScans: 0, verificationRate: 0 });
    const [recentBatches, setRecentBatches] = useState<RecentBatch[]>([]);
    const [pieData, setPieData] = useState<PieDataItem[]>([
        { name: 'Created', value: 25, color: '#3b82f6' },
        { name: 'In Transit', value: 25, color: '#f59e0b' },
        { name: 'Processing', value: 25, color: '#8b5cf6' },
        { name: 'Completed', value: 25, color: '#10b981' }
    ]);
    const [chartData, setChartData] = useState<ChartDataItem[]>([]);
    const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);

    useEffect(() => {
        const loadStats = async () => {
            try {
                const data = await fetchDashboardStats();
                setStats(data.stats);
                setRecentBatches(data.recentBatches);

                // Load dynamic chart and activity data if available
                if (data.pieData) {
                    setPieData(data.pieData as PieDataItem[]);
                }
                if (data.chartData) {
                    setChartData(data.chartData as ChartDataItem[]);
                }
                if (data.recentActivity) {
                    setRecentActivity(data.recentActivity as ActivityItem[]);
                }
            } catch (error) {
                console.error('Failed to load dashboard stats:', error);
            } finally {
                setIsLoading(false);
            }
        };
        loadStats();
    }, []);

    const getStatusBadge = (status: string) => {
        const styles: Record<string, { class: string; label: string }> = {
            created: { class: 'badge-info', label: t('dashboard', 'statusCreated') },
            in_transit: { class: 'badge-warning', label: t('dashboard', 'statusInTransit') },
            processing: { class: 'badge-primary', label: t('dashboard', 'statusProcessing') },
            completed: { class: 'badge-success', label: t('dashboard', 'statusCompleted') }
        };
        return styles[status] || styles.created;
    };

    // Get role-specific message
    const userRole = user?.role?.toLowerCase() || '';
    const welcomeTitle = userRole === 'farmer' ? t('dashboard', 'welcomeFarmer') :
                        userRole === 'processor' ? t('dashboard', 'welcomeProcessor') :
                        userRole === 'distributor' ? t('dashboard', 'welcomeDistributor') :
                        userRole === 'retailer' ? t('dashboard', 'welcomeRetailer') :
                        t('dashboard', 'welcomeGeneric');
    
    const welcomeSubtitle = userRole === 'farmer' ? t('dashboard', 'subtitleFarmer') :
                           userRole === 'processor' ? t('dashboard', 'subtitleProcessor') :
                           userRole === 'distributor' ? t('dashboard', 'subtitleDistributor') :
                           userRole === 'retailer' ? t('dashboard', 'subtitleRetailer') :
                           t('dashboard', 'subtitleGeneric');

    // Role-specific stats cards
    const getRoleSpecificStats = () => {
        const baseStats = [
            {
                label: t('dashboard', 'totalBatches'),
                value: stats.totalBatches.toLocaleString(),
                icon: <Package size={24} />,
                color: 'primary'
            }
        ];

        switch (userRole) {
            case 'farmer':
                return [
                    ...baseStats,
                    {
                        label: t('dashboard', 'harvestsCreated'),
                        value: stats.totalBatches.toLocaleString(),
                        icon: <Package size={24} />,
                        color: 'accent'
                    },
                    {
                        label: t('dashboard', 'transferredOut'),
                        value: Math.floor(stats.totalBatches * 0.7).toLocaleString(),
                        icon: <TrendingUp size={24} />,
                        color: 'info'
                    },
                    {
                        label: t('dashboard', 'qrScans'),
                        value: stats.qrScans.toLocaleString(),
                        icon: <QrCode size={24} />,
                        color: 'success'
                    }
                ];
            case 'processor':
                return [
                    {
                        label: t('dashboard', 'batchesToProcess'),
                        value: stats.totalBatches.toLocaleString(),
                        icon: <Package size={24} />,
                        color: 'warning'
                    },
                    {
                        label: t('dashboard', 'processed'),
                        value: Math.floor(stats.totalBatches * 0.6).toLocaleString(),
                        icon: <CheckCircle size={24} />,
                        color: 'success'
                    },
                    {
                        label: t('dashboard', 'splitBatches'),
                        value: Math.floor(stats.totalBatches * 0.4).toLocaleString(),
                        icon: <TrendingUp size={24} />,
                        color: 'info'
                    },
                    {
                        label: t('dashboard', 'readyToShip'),
                        value: Math.floor(stats.totalBatches * 0.3).toLocaleString(),
                        icon: <Package size={24} />,
                        color: 'primary'
                    }
                ];
            case 'distributor':
                return [
                    {
                        label: t('dashboard', 'batchesToDeliver'),
                        value: stats.totalBatches.toLocaleString(),
                        icon: <Package size={24} />,
                        color: 'warning'
                    },
                    {
                        label: t('dashboard', 'inTransit'),
                        value: Math.floor(stats.totalBatches * 0.5).toLocaleString(),
                        icon: <TrendingUp size={24} />,
                        color: 'info'
                    },
                    {
                        label: t('dashboard', 'delivered'),
                        value: Math.floor(stats.totalBatches * 0.5).toLocaleString(),
                        icon: <CheckCircle size={24} />,
                        color: 'success'
                    },
                    {
                        label: t('dashboard', 'pendingPickup'),
                        value: Math.floor(stats.totalBatches * 0.2).toLocaleString(),
                        icon: <Clock size={24} />,
                        color: 'accent'
                    }
                ];
            case 'retailer':
                return [
                    {
                        label: t('dashboard', 'productsInStore'),
                        value: stats.totalBatches.toLocaleString(),
                        icon: <Package size={24} />,
                        color: 'success'
                    },
                    {
                        label: t('dashboard', 'qrScans'),
                        value: stats.qrScans.toLocaleString(),
                        icon: <QrCode size={24} />,
                        color: 'info'
                    },
                    {
                        label: t('dashboard', 'consumerVerified'),
                        value: Math.floor(stats.qrScans * 0.8).toLocaleString(),
                        icon: <CheckCircle size={24} />,
                        color: 'accent'
                    },
                    {
                        label: t('dashboard', 'soldOut'),
                        value: Math.floor(stats.totalBatches * 0.2).toLocaleString(),
                        icon: <TrendingUp size={24} />,
                        color: 'primary'
                    }
                ];
            default:
                return [
                    ...baseStats,
                    {
                        label: t('dashboard', 'activeBatches'),
                        value: Math.floor(stats.totalBatches * 0.3).toLocaleString(),
                        icon: <TrendingUp size={24} />,
                        color: 'accent'
                    },
                    {
                        label: t('dashboard', 'qrScans'),
                        value: stats.qrScans.toLocaleString(),
                        icon: <QrCode size={24} />,
                        color: 'info'
                    }
                ];
        }
    };

    const statsCards = getRoleSpecificStats();

    if (isLoading) {
        return (
            <div className="dashboard-home" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                <Loader size={40} className="spinner" />
            </div>
        );
    }

    return (
        <div className="dashboard-home">
            {/* Page Header */}
            <div className="page-header">
                <div className="page-header-row">
                    <div>
                        <h1 className="page-title">{welcomeTitle}, {user?.name?.split(' ')[0] || 'User'}!</h1>
                        <p className="page-subtitle">{welcomeSubtitle}</p>
                    </div>
                    {(userRole === 'farmer' || userRole === 'admin') && (
                        <Link to="/dashboard/batches/create" className="btn btn-primary">
                            <Plus size={20} />
                            {t('dashboard', 'createBatch')}
                        </Link>
                    )}
                </div>
            </div>

            {/* Quick Actions - Navigation Cards */}
            <div className="quick-actions-section">
                <h2 className="section-title">{t('dashboard', 'quickActions')}</h2>
                <div className="quick-actions-grid">
                    {(userRole === 'farmer' || userRole === 'admin') && (
                        <Link to="/dashboard/batches/create" className="quick-action-card create">
                            <div className="quick-action-icon">
                                <Plus size={28} />
                            </div>
                            <div className="quick-action-content">
                                <h3>{t('dashboard', 'createBatch')}</h3>
                                <p>{t('dashboard', 'createBatchDesc')}</p>
                            </div>
                            <ArrowRight size={20} className="quick-action-arrow" />
                        </Link>
                    )}
                    
                    <Link to="/dashboard/batches" className="quick-action-card view">
                        <div className="quick-action-icon">
                            <Package size={28} />
                        </div>
                        <div className="quick-action-content">
                            <h3>{t('dashboard', 'viewBatches')}</h3>
                            <p>{t('dashboard', 'viewBatchesDesc')}</p>
                        </div>
                        <ArrowRight size={20} className="quick-action-arrow" />
                    </Link>
                    
                    <Link to="/dashboard/payment" className="quick-action-card payment">
                        <div className="quick-action-icon">
                            <CreditCard size={28} />
                        </div>
                        <div className="quick-action-content">
                            <h3>{t('dashboard', 'makePayment')}</h3>
                            <p>{t('dashboard', 'makePaymentDesc')}</p>
                        </div>
                        <ArrowRight size={20} className="quick-action-arrow" />
                    </Link>
                    
                    <Link to="/dashboard/qr/scan" className="quick-action-card scan">
                        <div className="quick-action-icon">
                            <ScanLine size={28} />
                        </div>
                        <div className="quick-action-content">
                            <h3>{t('dashboard', 'scanQR')}</h3>
                            <p>{t('dashboard', 'scanQRDesc')}</p>
                        </div>
                        <ArrowRight size={20} className="quick-action-arrow" />
                    </Link>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="stats-grid">
                {statsCards.map((stat, index) => (
                    <div key={index} className={`stats-card stat-${stat.color}`}>
                        <div className={`stats-icon stats-icon-${stat.color}`}>
                            {stat.icon}
                        </div>
                        <div className="stats-content">
                            <span className="stats-value">{stat.value}</span>
                            <span className="stats-label">{stat.label}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts Row */}
            <div className="charts-row">
                <div className="chart-card chart-card-main">
                    <div className="chart-header">
                        <div>
                            <h3 className="chart-title">{t('dashboard', 'batchActivity')}</h3>
                            <p className="chart-subtitle">{t('dashboard', 'monthlyOverview')}</p>
                        </div>
                        <div className="chart-legend">
                            <span className="legend-item">
                                <span className="legend-dot primary"></span>
                                {t('navigation', 'batches')}
                            </span>
                            <span className="legend-item">
                                <span className="legend-dot accent"></span>
                                {t('dashboard', 'qrScans')}
                            </span>
                        </div>
                    </div>
                    <div className="chart-body">
                        {chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={280}>
                                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorBatches" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorScans" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#64748b', fontSize: 12 }}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#64748b', fontSize: 12 }}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            background: 'white',
                                            border: '1px solid #e2e8f0',
                                            borderRadius: '12px',
                                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                                        }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="batches"
                                        stroke="#10b981"
                                        strokeWidth={2}
                                        fillOpacity={1}
                                        fill="url(#colorBatches)"
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="scans"
                                        stroke="#f59e0b"
                                        strokeWidth={2}
                                        fillOpacity={1}
                                        fill="url(#colorScans)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 280, color: '#64748b' }}>
                                No batch data available yet
                            </div>
                        )}
                    </div>
                </div>

                <div className="chart-card">
                    <div className="chart-header">
                        <div>
                            <h3 className="chart-title">{t('dashboard', 'batchStatus')}</h3>
                            <p className="chart-subtitle">{t('dashboard', 'currentDistribution')}</p>
                        </div>
                    </div>
                    <div className="chart-body pie-chart-body">
                        <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={80}
                                    paddingAngle={4}
                                    dataKey="value"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        background: 'white',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '8px',
                                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="pie-legend">
                            {pieData.map((item, index) => {
                                // Translate status names for pie chart legend if they are standard statuses
                                const statusKey = item.name.toLowerCase().replace(' ', '_');
                                const translatedName = statusKey === 'created' ? t('dashboard', 'statusCreated') :
                                                   statusKey === 'in_transit' ? t('dashboard', 'statusInTransit') :
                                                   statusKey === 'processing' ? t('dashboard', 'statusProcessing') :
                                                   statusKey === 'completed' ? t('dashboard', 'statusCompleted') :
                                                   item.name;
                                
                                return (
                                    <div key={index} className="pie-legend-item">
                                        <span className="pie-legend-dot" style={{ background: item.color }}></span>
                                        <span className="pie-legend-label">{translatedName}</span>
                                        <span className="pie-legend-value">{item.value}%</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Row */}
            <div className="bottom-row">
                {/* Recent Batches - Role specific title */}
                <div className="card recent-batches-card">
                    <div className="card-header">
                        <h3>{
                            userRole === 'farmer' ? t('dashboard', 'harvestsCreated') :
                                userRole === 'processor' ? t('dashboard', 'batchesToProcess') :
                                    userRole === 'distributor' ? t('dashboard', 'batchesToDeliver') :
                                        userRole === 'retailer' ? t('dashboard', 'productsInStore') :
                                            t('dashboard', 'recentBatches')
                        }</h3>
                        <Link to="/dashboard/batches" className="view-all-link">
                            {t('dashboard', 'viewAll')}
                            <ChevronRight size={16} />
                        </Link>
                    </div>
                    <div className="recent-batches-list">
                        {recentBatches.length > 0 ? (
                            recentBatches.map((batch) => (
                                <Link
                                    key={batch.id}
                                    to={`/dashboard/batches/${batch.id}`}
                                    className="recent-batch-item"
                                >
                                    <div className="batch-icon">
                                        <Package size={20} />
                                    </div>
                                    <div className="batch-info">
                                        <div className="batch-header">
                                            <span className="batch-id font-mono">{batch.batchId}</span>
                                            <span className={`badge ${getStatusBadge(batch.status).class}`}>
                                                {getStatusBadge(batch.status).label}
                                            </span>
                                        </div>
                                        <span className="batch-product">{batch.product}</span>
                                        <div className="batch-meta">
                                            <span className="batch-origin">
                                                <MapPin size={12} />
                                                {batch.origin || 'Unknown'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="batch-action">
                                        <Eye size={18} />
                                    </div>
                                </Link>
                            ))
                        ) : (
                            <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                                {t('dashboard', 'noBatches')}
                            </div>
                        )}
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="card activity-card">
                    <div className="card-header">
                        <h3>{t('dashboard', 'recentActivity')}</h3>
                    </div>
                    <div className="activity-list">
                        {recentActivity.length > 0 ? (
                            recentActivity.map((activity) => (
                                <div key={activity.id} className="activity-item">
                                    <div className="activity-icon">
                                        {getActivityIcon(activity.type)}
                                    </div>
                                    <div className="activity-content">
<span className="activity-message">
                                            {activity.messageKey && activity.messageParams
                                                ? getTranslation('activity', activity.messageKey, currentLanguage).replace('{{eventType}}', activity.messageParams.eventType || '').replace('{{description}}', activity.messageParams.description || '')
                                                : activity.message}
                                        </span>
                                        <span className="activity-time">
                                            {activity.timeKey === 'justNow'
                                                ? getTranslation('activity', 'justNow', currentLanguage)
                                                : activity.timeKey === 'timeAgo' && activity.timeValue
                                                    ? getTranslation('activity', 'timeAgo', currentLanguage).replace('{{time}}', activity.timeValue)
                                                    : activity.time}
                                        </span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                                {t('dashboard', 'noActivity')}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardHome;
