import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
    User,
    Mail,
    Building2,
    Shield,
    Camera,
    Save,
    Leaf,
    Factory,
    Truck,
    Store,
    Settings,
    CheckCircle,
    Loader,
    Plus,
    Trash2,
    MapPin,
    Home
} from 'lucide-react';
import { fetchDashboardStats } from '../../api/apiClient';
import './ProfilePage.css';

// Role icons and colors
const roleConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
    FARMER: { icon: <Leaf size={20} />, color: '#22c55e', label: 'Farmer' },
    PROCESSOR: { icon: <Factory size={20} />, color: '#f59e0b', label: 'Processor' },
    DISTRIBUTOR: { icon: <Truck size={20} />, color: '#3b82f6', label: 'Distributor' },
    RETAILER: { icon: <Store size={20} />, color: '#8b5cf6', label: 'Retailer' },
    ADMIN: { icon: <Settings size={20} />, color: '#ef4444', label: 'Administrator' },
    USER: { icon: <User size={20} />, color: '#6b7280', label: 'User' }
};

const ProfilePage = () => {
    const { user } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    // Account activity stats
    const [stats, setStats] = useState({ batches: 0, events: 0, qrScans: 0 });

    const [formData, setFormData] = useState({
        name: user?.name || '',
        email: user?.email || '',
        organization: user?.organization || '',
    });

    const [addresses, setAddresses] = useState<any[]>([]);
    const [newAddress, setNewAddress] = useState({ street: '', city: '', state: '', pincode: '', label: 'Home' });
    const [showAddressForm, setShowAddressForm] = useState(false);

    const isConsumer = user?.role?.toUpperCase() === 'CONSUMER';

    useEffect(() => {
        const saved = localStorage.getItem('FARMETRA_addresses');
        if (saved) setAddresses(JSON.parse(saved));
    }, []);

    useEffect(() => {
        localStorage.setItem('FARMETRA_addresses', JSON.stringify(addresses));
    }, [addresses]);

    const roleInfo = roleConfig[user?.role?.toUpperCase() || 'USER'] || roleConfig.USER;

    // Fetch account activity stats
    useEffect(() => {
        const loadStats = async () => {
            try {
                const data = await fetchDashboardStats();
                console.log('Dashboard stats:', data);
                const batchCount = data.stats?.totalBatches ?? data.recentBatches?.length ?? 0;
                const qrCount = data.stats?.qrScans ?? 0;
                const eventCount = data.recentActivity?.length ?? 0;

                setStats({
                    batches: batchCount,
                    events: eventCount,
                    qrScans: qrCount
                });
            } catch (error) {
                console.error('Failed to load stats:', error);
            }
        };
        loadStats();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        // Simulate save API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        setIsSaving(false);
        setSaveSuccess(true);
        setIsEditing(false);
        setTimeout(() => setSaveSuccess(false), 3000);
    };

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <div className="profile-page">
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">My Profile</h1>
                    <p className="page-subtitle">View and manage your account information</p>
                </div>
            </div>

            {/* Success Message */}
            {saveSuccess && (
                <div className="success-toast">
                    <CheckCircle size={20} />
                    <span>Profile updated successfully!</span>
                </div>
            )}

            <div className="profile-content">
                {/* Profile Card */}
                <div className="profile-card">
                    <div className="profile-header">
                        <div className="profile-avatar-section">
                            <div className="profile-avatar" style={{ borderColor: roleInfo.color }}>
                                <span>{getInitials(user?.name || 'U')}</span>
                            </div>
                            <button className="avatar-edit-btn" title="Change Photo">
                                <Camera size={16} />
                            </button>
                        </div>

                        <div className="profile-header-info">
                            <h2>{user?.name || 'User'}</h2>
                            <div className="role-badge" style={{ backgroundColor: `${roleInfo.color}20`, color: roleInfo.color }}>
                                {roleInfo.icon}
                                <span>{roleInfo.label}</span>
                            </div>
                        </div>

                        {!isEditing && (
                            <button
                                className="btn btn-outline"
                                onClick={() => setIsEditing(true)}
                            >
                                Edit Profile
                            </button>
                        )}
                    </div>

                    {/* Profile Form */}
                    <div className="profile-form">
                        <div className="form-section">
                            <h3 className="section-title">Personal Information</h3>

                            <div className="form-grid">
                                <div className="input-group">
                                    <label className="input-label">
                                        <User size={16} />
                                        Full Name
                                    </label>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            name="name"
                                            className="input"
                                            value={formData.name}
                                            onChange={handleChange}
                                        />
                                    ) : (
                                        <div className="display-value">{user?.name || '-'}</div>
                                    )}
                                </div>

                                <div className="input-group">
                                    <label className="input-label">
                                        <Mail size={16} />
                                        Email Address
                                    </label>
                                    <div className="display-value readonly">{user?.email || '-'}</div>
                                    <span className="input-hint">Email cannot be changed</span>
                                </div>

                                <div className="input-group">
                                    <label className="input-label">
                                        <Building2 size={16} />
                                        Organization
                                    </label>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            name="organization"
                                            className="input"
                                            value={formData.organization}
                                            onChange={handleChange}
                                        />
                                    ) : (
                                        <div className="display-value">{user?.organization || '-'}</div>
                                    )}
                                </div>

                                <div className="input-group">
                                    <label className="input-label">
                                        <Shield size={16} />
                                        Role
                                    </label>
                                    <div className="display-value readonly" style={{ color: roleInfo.color }}>
                                        {roleInfo.label}
                                    </div>
                                    <span className="input-hint">Role is assigned by administrator</span>
                                </div>
                            </div>
                        </div>

                        {isEditing && (
                            <div className="form-actions">
                                <button
                                    className="btn btn-outline"
                                    onClick={() => {
                                        setIsEditing(false);
                                        setFormData({
                                            name: user?.name || '',
                                            email: user?.email || '',
                                            organization: user?.organization || '',
                                        });
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    className={`btn btn-primary ${isSaving ? 'btn-loading' : ''}`}
                                    onClick={handleSave}
                                    disabled={isSaving}
                                >
                                    {isSaving ? (
                                        <>
                                            <Loader size={18} className="spinner" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save size={18} />
                                            Save Changes
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Account Stats */}
                <div className="account-stats">
                    <h3 className="section-title">Account Activity</h3>
                    <div className="stats-grid">
                        <div className="stat-item">
                            <span className="stat-value">{stats.batches}</span>
                            <span className="stat-label">Batches</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-value">{stats.events}</span>
                            <span className="stat-label">Recent Activity</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-value">{stats.qrScans}</span>
                            <span className="stat-label">QR Scans</span>
                        </div>
                    </div>
                </div>

                {isConsumer && (
                    <div className="addresses-section mt-8">
                        <div className="section-header-row">
                            <h3 className="section-title">Delivery Addresses</h3>
                            <button className="btn btn-outline btn-sm" onClick={() => setShowAddressForm(!showAddressForm)}>
                                <Plus size={16} /> Add New
                            </button>
                        </div>

                        {showAddressForm && (
                            <div className="address-form-box mb-6">
                                <div className="form-grid">
                                    <div className="input-group full-width">
                                        <label className="input-label">Street Address</label>
                                        <input className="input" value={newAddress.street} onChange={e => setNewAddress({...newAddress, street: e.target.value})} placeholder="House No, Building, Street" />
                                    </div>
                                    <div className="input-group">
                                        <label className="input-label">City</label>
                                        <input className="input" value={newAddress.city} onChange={e => setNewAddress({...newAddress, city: e.target.value})} placeholder="City" />
                                    </div>
                                    <div className="input-group">
                                        <label className="input-label">State</label>
                                        <input className="input" value={newAddress.state} onChange={e => setNewAddress({...newAddress, state: e.target.value})} placeholder="State" />
                                    </div>
                                    <div className="input-group">
                                        <label className="input-label">Pincode</label>
                                        <input className="input" value={newAddress.pincode} onChange={e => setNewAddress({...newAddress, pincode: e.target.value})} placeholder="6-digit ZIP" />
                                    </div>
                                    <div className="input-group">
                                        <label className="input-label">Label</label>
                                        <select className="input" value={newAddress.label} onChange={e => setNewAddress({...newAddress, label: e.target.value})}>
                                            <option value="Home">Home</option>
                                            <option value="Work">Work</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="form-actions mt-4">
                                    <button className="btn btn-primary" onClick={() => {
                                        if (newAddress.street && newAddress.city) {
                                            setAddresses([...addresses, { ...newAddress, id: Date.now() }]);
                                            setNewAddress({ street: '', city: '', state: '', pincode: '', label: 'Home' });
                                            setShowAddressForm(false);
                                        }
                                    }}>Save Address</button>
                                </div>
                            </div>
                        )}

                        <div className="address-list">
                            {addresses.length === 0 ? (
                                <p className="text-muted">No addresses saved yet.</p>
                            ) : (
                                addresses.map(addr => (
                                    <div key={addr.id} className="address-card">
                                        <div className="addr-icon">
                                            {addr.label === 'Home' ? <Home size={18} /> : <MapPin size={18} />}
                                        </div>
                                        <div className="addr-details">
                                            <span className="addr-label">{addr.label}</span>
                                            <p>{addr.street}, {addr.city}</p>
                                            <p>{addr.state} - {addr.pincode}</p>
                                        </div>
                                        <button className="btn-remove-addr" onClick={() => setAddresses(addresses.filter(a => a.id !== addr.id))}>
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}


                {/* Account Stats Spacer */}
                <div className="mt-8"></div>
            </div>
        </div>
    );
};

export default ProfilePage;
