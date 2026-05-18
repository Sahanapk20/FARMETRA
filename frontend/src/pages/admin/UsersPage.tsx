import { useState, useEffect } from 'react';
import {
    Users,
    Search,
    Filter,
    ChevronDown,
    Mail,
    MapPin,
    Building2,
    Package,
    ArrowLeftRight,
    Loader,
    Shield
} from 'lucide-react';
import '../dashboard/DashboardHome.css';

interface User {
    id: number;
    name: string;
    email: string;
    role: string;
    organization: string | null;
    location: string | null;
    createdAt: string;
    stats: {
        batchesCreated: number;
        handoffsInitiated: number;
        handoffsReceived: number;
    };
}

const roleColors: Record<string, string> = {
    ADMIN: '#dc2626',
    FARMER: '#16a34a',
    PROCESSOR: '#2563eb',
    DISTRIBUTOR: '#9333ea',
    RETAILER: '#ea580c',
    USER: '#6b7280'
};

const UsersPage = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('ALL');
    const [editingUserId, setEditingUserId] = useState<number | null>(null);

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

    useEffect(() => {
        loadUsers();
    }, []);

    useEffect(() => {
        filterUsers();
    }, [users, searchQuery, roleFilter]);

    const loadUsers = async () => {
        try {
            const token = localStorage.getItem('FARMETRA_token');
            const response = await fetch(`${API_URL}/admin/users`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setUsers(data.users);
            }
        } catch (error) {
            console.error('Failed to load users:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const filterUsers = () => {
        let result = users;

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(u =>
                u.name.toLowerCase().includes(query) ||
                u.email.toLowerCase().includes(query) ||
                u.organization?.toLowerCase().includes(query)
            );
        }

        if (roleFilter !== 'ALL') {
            result = result.filter(u => u.role === roleFilter);
        }

        setFilteredUsers(result);
    };

    const updateRole = async (userId: number, newRole: string) => {
        try {
            const token = localStorage.getItem('FARMETRA_token');
            const response = await fetch(`${API_URL}/admin/users/${userId}/role`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ role: newRole })
            });
            const data = await response.json();
            if (data.success) {
                setUsers(prev => prev.map(u =>
                    u.id === userId ? { ...u, role: newRole } : u
                ));
                setEditingUserId(null);
            }
        } catch (error) {
            console.error('Failed to update role:', error);
        }
    };

    if (isLoading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                <Loader size={40} className="spinner" />
            </div>
        );
    }

    return (
        <div className="dashboard-home">
            <div className="page-header">
                <div className="page-header-row">
                    <div>
                        <h1 className="page-title">
                            <Users size={28} style={{ marginRight: '12px', color: '#3b82f6' }} />
                            User Management
                        </h1>
                        <p className="page-subtitle">{users.length} registered users</p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div style={{
                display: 'flex',
                gap: '12px',
                marginBottom: '24px',
                flexWrap: 'wrap'
            }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                    <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '12px 12px 12px 40px',
                            borderRadius: '10px',
                            border: '1px solid #e5e7eb',
                            fontSize: '14px'
                        }}
                    />
                </div>
                <div style={{ position: 'relative' }}>
                    <Filter size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        style={{
                            padding: '12px 40px 12px 40px',
                            borderRadius: '10px',
                            border: '1px solid #e5e7eb',
                            fontSize: '14px',
                            background: 'white',
                            cursor: 'pointer'
                        }}
                    >
                        <option value="ALL">All Roles</option>
                        <option value="ADMIN">Admin</option>
                        <option value="FARMER">Farmer</option>
                        <option value="PROCESSOR">Processor</option>
                        <option value="DISTRIBUTOR">Distributor</option>
                        <option value="RETAILER">Retailer</option>
                    </select>
                </div>
            </div>

            {/* Users Table */}
            <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#f9fafb' }}>
                                <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, fontSize: '13px', color: '#6b7280' }}>User</th>
                                <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, fontSize: '13px', color: '#6b7280' }}>Role</th>
                                <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, fontSize: '13px', color: '#6b7280' }}>Organization</th>
                                <th style={{ padding: '16px', textAlign: 'center', fontWeight: 600, fontSize: '13px', color: '#6b7280' }}>Batches</th>
                                <th style={{ padding: '16px', textAlign: 'center', fontWeight: 600, fontSize: '13px', color: '#6b7280' }}>Handoffs</th>
                                <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, fontSize: '13px', color: '#6b7280' }}>Joined</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map((user) => (
                                <tr key={user.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                                    <td style={{ padding: '16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{
                                                width: '40px',
                                                height: '40px',
                                                borderRadius: '50%',
                                                background: `linear-gradient(135deg, ${roleColors[user.role] || '#6b7280'}, ${roleColors[user.role] || '#6b7280'}dd)`,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: 'white',
                                                fontWeight: 600,
                                                fontSize: '14px'
                                            }}>
                                                {user.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 600, color: '#1f2937' }}>{user.name}</div>
                                                <div style={{ fontSize: '13px', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <Mail size={12} />
                                                    {user.email}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        {editingUserId === user.id ? (
                                            <select
                                                defaultValue={user.role}
                                                onChange={(e) => updateRole(user.id, e.target.value)}
                                                onBlur={() => setEditingUserId(null)}
                                                autoFocus
                                                style={{
                                                    padding: '6px 10px',
                                                    borderRadius: '6px',
                                                    border: '1px solid #e5e7eb',
                                                    fontSize: '13px'
                                                }}
                                            >
                                                <option value="ADMIN">Admin</option>
                                                <option value="FARMER">Farmer</option>
                                                <option value="PROCESSOR">Processor</option>
                                                <option value="DISTRIBUTOR">Distributor</option>
                                                <option value="RETAILER">Retailer</option>
                                            </select>
                                        ) : (
                                            <span
                                                onClick={() => setEditingUserId(user.id)}
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    padding: '4px 12px',
                                                    borderRadius: '20px',
                                                    fontSize: '12px',
                                                    fontWeight: 600,
                                                    background: `${roleColors[user.role]}20`,
                                                    color: roleColors[user.role],
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {user.role === 'ADMIN' && <Shield size={12} />}
                                                {user.role}
                                                <ChevronDown size={12} />
                                            </span>
                                        )}
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        {user.organization ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#4b5563', fontSize: '14px' }}>
                                                <Building2 size={14} />
                                                {user.organization}
                                            </div>
                                        ) : (
                                            <span style={{ color: '#9ca3af' }}>—</span>
                                        )}
                                        {user.location && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#9ca3af', fontSize: '12px', marginTop: '4px' }}>
                                                <MapPin size={12} />
                                                {user.location}
                                            </div>
                                        )}
                                    </td>
                                    <td style={{ padding: '16px', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                            <Package size={14} color="#6b7280" />
                                            <span style={{ fontWeight: 600 }}>{user.stats.batchesCreated}</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                            <ArrowLeftRight size={14} color="#6b7280" />
                                            <span style={{ fontWeight: 600 }}>{user.stats.handoffsInitiated + user.stats.handoffsReceived}</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px', fontSize: '13px', color: '#6b7280' }}>
                                        {new Date(user.createdAt).toLocaleDateString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredUsers.length === 0 && (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                        No users found
                    </div>
                )}
            </div>
        </div>
    );
};

export default UsersPage;
