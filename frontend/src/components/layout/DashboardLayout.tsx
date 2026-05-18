import { useState } from 'react';

import type { ReactNode } from 'react';

import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';

import {

    Leaf,

    LayoutDashboard,

    Package,

    Plus,

    History,

    QrCode,

    ScanLine,

    BarChart3,

    Settings,

    LogOut,

    Menu,

    X,

    Bell,

    Search,

    ChevronDown,

    User as UserIcon,

    Truck,

    Factory,

    Store,

    Shield,

    ShieldCheck,

    Users,

    Activity,

    CreditCard,

    Sprout,

    ShoppingBag,

    Heart,

    ShoppingCart

} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';

import { useCart } from '../../context/CartContext';

import { useWishlist } from '../../context/WishlistContext';

import LanguageSelector from '../LanguageSelector';

import { useTranslation } from '../../hooks/useTranslation';

import './DashboardLayout.css';



// Role-based navigation configuration

interface NavItem {

    icon: ReactNode;

    labelKey: string; // Translation key instead of hardcoded label

    path: string;

    roles?: string[]; // If empty/undefined, shown to all roles

}



const allNavItems: NavItem[] = [

    { icon: <LayoutDashboard size={20} />, labelKey: 'dashboard', path: '/dashboard' },

    { icon: <Sprout size={20} />, labelKey: 'cropGrowth', path: '/dashboard/crop-growth', roles: ['FARMER', 'ADMIN'] },

    { icon: <ShoppingBag size={20} />, labelKey: 'Marketplace', path: '/marketplace', roles: ['CONSUMER'] },

    { icon: <Package size={20} />, labelKey: 'batches', path: '/dashboard/batches' },

    { icon: <Plus size={20} />, labelKey: 'createBatch', path: '/dashboard/batches/create', roles: ['FARMER', 'ADMIN'] },

    { icon: <History size={20} />, labelKey: 'events', path: '/dashboard/events' },

    { icon: <QrCode size={20} />, labelKey: 'qrCodes', path: '/dashboard/qr' },

    { icon: <ScanLine size={20} />, labelKey: 'qrScanner', path: '/dashboard/qr/scan' },

    { icon: <ShoppingBag size={20} />, labelKey: 'listProduct', path: '/dashboard/list-product', roles: ['RETAILER', 'ADMIN'] },

    { icon: <CreditCard size={20} />, labelKey: 'payment', path: '/dashboard/payment' },

    { icon: <BarChart3 size={20} />, labelKey: 'analytics', path: '/dashboard/analytics', roles: ['ADMIN'] },

];



const adminNavItems: NavItem[] = [

    { icon: <Shield size={20} />, labelKey: 'adminDashboard', path: '/dashboard/admin' },

    { icon: <Users size={20} />, labelKey: 'users', path: '/dashboard/admin/users' },

    { icon: <Activity size={20} />, labelKey: 'activity', path: '/dashboard/admin/activity' },

    { icon: <ShieldCheck size={20} />, labelKey: 'certifications', path: '/dashboard/admin/certifications' },

];



// Role-specific labels, icons and colors for clear identification

const roleConfig: Record<string, { labelKey: string; icon: ReactNode; color: string }> = {

    FARMER: { labelKey: 'farmer', icon: <Leaf size={16} />, color: '#22c55e' },          // Green leaf for farmers

    PROCESSOR: { labelKey: 'processor', icon: <Factory size={16} />, color: '#f59e0b' }, // Orange factory

    DISTRIBUTOR: { labelKey: 'distributor', icon: <Truck size={16} />, color: '#3b8226' }, // Blue truck

    RETAILER: { labelKey: 'retailer', icon: <Store size={16} />, color: '#8b5cf6' },      // Purple store

    CONSUMER: { labelKey: 'Consumer', icon: <ShoppingBag size={16} />, color: '#0ea5e9' }, // Blue bag

    ADMIN: { labelKey: 'admin', icon: <Settings size={16} />, color: '#ef4444' },         // Red settings

    USER: { labelKey: 'user', icon: <UserIcon size={16} />, color: '#6b7280' }            // Gray user

};



const DashboardLayout = () => {

    const location = useLocation();

    const navigate = useNavigate();

    const { user, logout } = useAuth();

    const { cartItems } = useCart();

    const { wishlistItems } = useWishlist();

    const { t } = useTranslation();

    const [sidebarOpen, setSidebarOpen] = useState(false);

    const [userMenuOpen, setUserMenuOpen] = useState(false);



    // Get user role (uppercase)

    const userRole = user?.role?.toUpperCase() || 'USER';



    // Filter nav items based on user role

    // Admin users don't see main menu items - they only use admin section

    const navItems = userRole === 'ADMIN'

        ? []

        : allNavItems.filter(item => {

            if (!item.roles || item.roles.length === 0) return true;

            return item.roles.includes(userRole);

        });



    // Role display info

    const displayName = user?.name || 'User';

    const roleInfo = roleConfig[userRole] || roleConfig.USER;

    const displayRole = t('navigation', roleInfo.labelKey);

    const displayEmail = user?.email || '';

    const displayOrg = user?.organization || '';



    const handleLogout = () => {

        logout();

        navigate('/login');

    };



    const isActive = (path: string) => {

        if (path === '/dashboard') {

            return location.pathname === '/dashboard';

        }

        return location.pathname.startsWith(path);

    };



    const isConsumer = userRole === 'CONSUMER';



    return (

        <div className={`dashboard-layout ${isConsumer ? 'consumer-layout' : ''}`}>

            {/* Sidebar Overlay */}

            {sidebarOpen && (

                <div

                    className="sidebar-overlay"

                    onClick={() => setSidebarOpen(false)}

                />

            )}



            {/* Sidebar */}

            {!isConsumer && (

                <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>

                <div className="sidebar-header">

                    <Link to="/" className="nav-logo">

                        <div className="logo-icon">

                            <Leaf size={22} />

                        </div>

                        <span>FARMETRA</span>

                    </Link>

                    <button

                        className="sidebar-close"

                        onClick={() => setSidebarOpen(false)}

                    >

                        <X size={20} />

                    </button>

                </div>



                <nav className="sidebar-nav">

                    <div className="sidebar-section">

                        <span className="sidebar-section-title">{t('navigation', 'mainMenu')}</span>

                        {navItems.map((item) => (

                            <Link

                                key={item.path}

                                to={item.path}

                                className={`sidebar-link ${isActive(item.path) ? 'active' : ''}`}

                                onClick={() => setSidebarOpen(false)}

                            >

                                {item.icon}

                                <span>{t('navigation', item.labelKey)}</span>

                            </Link>

                        ))}

                    </div>



                    {/* Admin Section - Only for ADMIN role */}

                    {userRole === 'ADMIN' && (

                        <div className="sidebar-section mt-8">

                            <span className="sidebar-section-title" style={{ color: '#ef4444' }}>{t('navigation', 'admin')}</span>

                            {adminNavItems.map((item) => (

                                <Link

                                    key={item.path}

                                    to={item.path}

                                    className={`sidebar-link ${isActive(item.path) ? 'active' : ''}`}

                                    onClick={() => setSidebarOpen(false)}

                                >

                                    {item.icon}

                                    <span>{t('navigation', item.labelKey)}</span>

                                </Link>

                            ))}

                        </div>

                    )}



                    <div className="sidebar-section mt-8">

                        <span className="sidebar-section-title">{t('navigation', 'settings')}</span>

                        <Link to="/dashboard/settings" className="sidebar-link">

                            <Settings size={20} />

                            <span>{t('navigation', 'settings')}</span>

                        </Link>

                    </div>

                </nav>



                <div className="sidebar-footer">

                    <div className="sidebar-user">

                        <div className="user-avatar">

                            <span>{displayName.charAt(0)}</span>

                        </div>

                        <div className="user-info">

                            <span className="user-name">{displayName}</span>

                            <span className="user-role-badge" style={{

                                display: 'inline-flex',

                                alignItems: 'center',

                                gap: '4px',

                                color: roleInfo.color,

                                fontWeight: 500

                            }}>

                                {roleInfo.icon}

                                {displayRole}

                            </span>

                        </div>

                    </div>

                </div>

            </aside>

            )}



            {/* Main Content */}

            <div className="dashboard-main">

                <header className={`dashboard-topbar ${isConsumer ? 'ecommerce-topbar' : ''}`}>

                    <div className="topbar-left">

                        {isConsumer ? (

                            <Link to="/" className="nav-logo ecommerce-logo">

                                <div className="logo-icon">

                                    <Leaf size={22} />

                                </div>

                                <span>FARMETRA</span>

                            </Link>

                        ) : (

                            <button

                                className="menu-toggle"

                                onClick={() => setSidebarOpen(true)}

                            >

                                <Menu size={24} />

                            </button>

                        )}





                        {!isConsumer && (

                            <div className="search-box">

                                <Search size={20} />

                                <input

                                    type="text"

                                    placeholder={t('common', 'search')}

                                />

                            </div>

                        )}

                    </div>



                    <div className="topbar-right">

                        <LanguageSelector />

                        

                        {isConsumer && (

                            <>

                                <Link to="/dashboard/qr" className="topbar-icon-btn" title="QR Codes">

                                    <QrCode size={20} />

                                </Link>

                                <Link to="/wishlist" className="topbar-icon-btn">

                                    <Heart size={20} />

                                    {wishlistItems.length > 0 && (

                                        <span className="notification-dot wishlist-count">{wishlistItems.length}</span>

                                    )}

                                </Link>

                                <Link to="/checkout" className="topbar-icon-btn">

                                    <ShoppingCart size={20} />

                                    {cartItems.length > 0 && (

                                        <span className="notification-dot cart-count">{cartItems.length}</span>

                                    )}

                                </Link>

                            </>

                        )}



                        <button className="topbar-icon-btn">

                            <Bell size={20} />

                            <span className="notification-dot"></span>

                        </button>



                        <div className="user-menu-container">

                            <button

                                className="user-menu-trigger"

                                onClick={() => setUserMenuOpen(!userMenuOpen)}

                            >

                                <div className="user-avatar small">

                                    <span>{displayName.charAt(0)}</span>

                                </div>

                                <span className="user-name-short">{displayName.split(' ')[0]}</span>

                                <ChevronDown size={16} />

                            </button>



                            {userMenuOpen && (

                                <>

                                    <div

                                        className="user-menu-overlay"

                                        onClick={() => setUserMenuOpen(false)}

                                    />

                                    <div className="user-menu">

                                        <div className="user-menu-header">

                                            <div className="user-avatar">

                                                <span>{displayName.charAt(0)}</span>

                                            </div>

                                            <div>

                                                <span className="user-menu-name">{displayName}</span>

                                                <span className="user-menu-email">{displayEmail}</span>

                                                <span className="user-menu-org" style={{ fontSize: '11px', color: '#64748b' }}>{displayOrg}</span>

                                            </div>

                                        </div>

                                            <Link to="/dashboard/profile" className="user-menu-item" onClick={() => setUserMenuOpen(false)}>

                                                <UserIcon size={18} />

                                                <span>{t('navigation', 'profile')}</span>

                                            </Link>

                                        <button className="user-menu-item logout" onClick={handleLogout}>

                                            <LogOut size={18} />

                                            <span>{t('navigation', 'logout')}</span>

                                        </button>

                                    </div>

                                </>

                            )}

                        </div>

                    </div>

                </header>



                {/* Page Content */}

                <main className="dashboard-content">

                    <Outlet />

                </main>

            </div>

        </div>

    );

};



export default DashboardLayout;

