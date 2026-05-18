import { useState, useEffect } from 'react';

import { Link } from 'react-router-dom';

import {

    Package,

    Plus,

    Search,

    Filter,

    ChevronDown,

    Eye,

    QrCode,

    MoreVertical,

    MapPin,

    Calendar,

    ArrowUpDown,

    Loader,

    GitBranch,

    CreditCard

} from 'lucide-react';

import { fetchBatches } from '../../api/apiClient';

import { useAuth } from '../../context/AuthContext';

import { useLanguage } from '../../context/LanguageContext';

import { getTranslation } from '../../locales/translations';

import DistributorPaymentSection from '../../components/payment/DistributorPaymentSection';

import type { Batch } from '../../api/types';

import './BatchesPage.css';



const getStatusOptions = (currentLanguage: string) => [
    { value: 'all', label: getTranslation('common', 'allStatus', currentLanguage) },
    { value: 'created', label: getTranslation('dashboard', 'statusCreated', currentLanguage) },
    { value: 'in_transit', label: getTranslation('dashboard', 'statusInTransit', currentLanguage) },
    { value: 'processing', label: getTranslation('dashboard', 'statusProcessing', currentLanguage) },
    { value: 'split', label: getTranslation('common', 'split', currentLanguage) },
    { value: 'completed', label: getTranslation('dashboard', 'statusCompleted', currentLanguage) }
];

const getStatusBadge = (status: string, currentLanguage: string) => {
    const styles: Record<string, { class: string; label: string }> = {
        created: { class: 'badge-info', label: getTranslation('dashboard', 'statusCreated', currentLanguage) },
        in_transit: { class: 'badge-warning', label: getTranslation('dashboard', 'statusInTransit', currentLanguage) },
        processing: { class: 'badge-primary', label: getTranslation('dashboard', 'statusProcessing', currentLanguage) },
        split: { class: 'badge-blockchain', label: getTranslation('common', 'split', currentLanguage) },
        completed: { class: 'badge-success', label: getTranslation('dashboard', 'statusCompleted', currentLanguage) }
    };
    return styles[status] || styles.created;
};



const BatchesPage = () => {

    const { user } = useAuth();

    const { currentLanguage } = useLanguage();

    const [batches, setBatches] = useState<Batch[]>([]);

    const [isLoading, setIsLoading] = useState(true);

    const [searchQuery, setSearchQuery] = useState('');

    const [statusFilter, setStatusFilter] = useState('all');

    const [showFilters, setShowFilters] = useState(false);



    // Role-based permissions
    const userRole = user?.role?.toUpperCase() || 'USER';
    const canCreateBatch = ['FARMER', 'ADMIN'].includes(userRole);
    const statusOptions = getStatusOptions(currentLanguage);



    useEffect(() => {

        const loadBatches = async () => {

            setIsLoading(true);

            try {

                const data = await fetchBatches();

                setBatches(data);

            } catch (error) {

                console.error('Failed to fetch batches:', error);

            } finally {

                setIsLoading(false);

            }

        };

        loadBatches();

    }, []);



    const filteredBatches = batches.filter(batch => {

        const matchesSearch =

            batch.batchId?.toLowerCase().includes(searchQuery.toLowerCase()) ||

            batch.product?.toLowerCase().includes(searchQuery.toLowerCase()) ||

            batch.origin?.toLowerCase().includes(searchQuery.toLowerCase());



        const matchesStatus = statusFilter === 'all' || batch.status === statusFilter;



        return matchesSearch && matchesStatus;

    });



    if (isLoading) {

        return (

            <div className="batches-page">

                <div className="page-header">

                    <div className="page-header-row">

                        <div>

                            <h1 className="page-title">{getTranslation('navigation', 'batches', currentLanguage)}</h1>

                            <p className="page-subtitle">{getTranslation('common', 'manageAndTrackBatches', currentLanguage)}</p>

                        </div>

                    </div>

                </div>

                <div className="loading-state">

                    <Loader className="spin" size={32} />

                    <p>{getTranslation('common', 'loadingBatches', currentLanguage)}...</p>

                </div>

            </div>

        );

    }



    return (

        <div className="batches-page">

            {/* Page Header */}

            <div className="page-header">

                <div className="page-header-row">

                    <div>

                        <h1 className="page-title">{getTranslation('navigation', 'batches', currentLanguage)}</h1>

                        <p className="page-subtitle">{getTranslation('common', 'manageAndTrackBatches', currentLanguage)}</p>

                    </div>

                    <div className="page-header-actions">

                        <Link to="/dashboard/payment" className="btn btn-secondary">

                            <CreditCard size={20} />

                            {getTranslation('navigation', 'payment', currentLanguage)}

                        </Link>

                        {canCreateBatch && (

                            <Link to="/dashboard/batches/create" className="btn btn-primary">

                                <Plus size={20} />

                                {getTranslation('navigation', 'createBatch', currentLanguage)}

                            </Link>

                        )}

                    </div>

                </div>

            </div>



            {/* Toolbar */}

            <div className="batches-toolbar">

                <div className="search-filter-row">

                    <div className="search-box large">

                        <Search size={20} />

                        <input

                            type="text"

                            placeholder={getTranslation('common', 'searchByBatchProductOrigin', currentLanguage)}

                            value={searchQuery}

                            onChange={(e) => setSearchQuery(e.target.value)}

                        />

                    </div>



                    <div className="filter-group">

                        <div className="select-wrapper">

                            <select

                                value={statusFilter}

                                onChange={(e) => setStatusFilter(e.target.value)}

                                className="select-input"

                            >

                                {statusOptions.map(option => (

                                    <option key={option.value} value={option.value}>

                                        {option.label}

                                    </option>

                                ))}

                            </select>

                            <ChevronDown size={16} className="select-icon" />

                        </div>



                        <button

                            className={`btn btn-outline filter-btn ${showFilters ? 'active' : ''}`}

                            onClick={() => setShowFilters(!showFilters)}

                        >

                            <Filter size={18} />

                            {getTranslation('common', 'filters', currentLanguage)}

                        </button>

                    </div>

                </div>



                {showFilters && (

                    <div className="advanced-filters">

                        <div className="filter-item">

                            <label>Date Range</label>

                            <div className="date-range">

                                <input type="date" className="input" />

                                <span>to</span>

                                <input type="date" className="input" />

                            </div>

                        </div>

                        <div className="filter-item">

                            <label>Product Type</label>

                            <select className="input">

                                <option value="">All Types</option>

                                <option value="grain">Grain</option>

                                <option value="fruit">Fruit</option>

                                <option value="vegetable">Vegetable</option>

                                <option value="spice">Spice</option>

                            </select>

                        </div>

                    </div>

                )}

            </div>



            {/* Results Summary */}

            <div className="results-summary">

                <span className="results-count">

                    Showing <strong>{filteredBatches.length}</strong> of <strong>{batches.length}</strong> {getTranslation('common', 'batches', currentLanguage).toLowerCase()}

                </span>

                <button className="btn btn-ghost btn-sm">

                    <ArrowUpDown size={16} />

                    {getTranslation('common', 'sortByDate', currentLanguage)}

                </button>

            </div>



            {/* Batches Grid */}

            <div className="batches-grid">

                {filteredBatches.map((batch) => (

                    <div key={batch.id} className="batch-card">

                        <div className="batch-card-header">

                            <div className="batch-card-icon">

                                <Package size={22} />

                            </div>

                            <span className={`badge ${getStatusBadge(batch.status, currentLanguage).class}`}>

                                {getStatusBadge(batch.status, currentLanguage).label}

                            </span>

                            <button className="batch-card-menu">

                                <MoreVertical size={18} />

                            </button>

                        </div>



                        <div className="batch-card-body">

                            <span className="batch-id font-mono">{batch.batchId}</span>

                            <h3 className="batch-product-name">{batch.product}</h3>



                            <div className="batch-detail">

                                <MapPin size={14} />

                                <span>{batch.origin || 'Unknown Origin'}</span>

                            </div>



                            <div className="batch-detail">

                                <Calendar size={14} />

                                <span>{new Date(batch.createdAt).toLocaleDateString('en-US', {

                                    year: 'numeric',

                                    month: 'short',

                                    day: 'numeric'

                                })}</span>

                            </div>



                            <div className="batch-meta-row">

                                <div className="batch-weight">

                                    <span className="weight-value">{batch.weight}</span>

                                    <span className="weight-unit">{batch.weightUnit || 'kg'}</span>

                                </div>

                                <div className="batch-badges">

                                    {batch.hasQR && (

                                        <span className="mini-badge qr">

                                            <QrCode size={12} />

                                        </span>

                                    )}

                                    {batch.blockchainVerified && (

                                        <span className="mini-badge blockchain">✓</span>

                                    )}

                                    {(batch as any).parentBatchId && (

                                        <span className="mini-badge child" title="Child Batch">

                                            <GitBranch size={12} />

                                        </span>

                                    )}

                                    {((batch as any).childBatchCount || 0) > 0 && (

                                        <span className="mini-badge parent" title={`${(batch as any).childBatchCount} children`}>

                                            +{(batch as any).childBatchCount}

                                        </span>

                                    )}

                                </div>

                            </div>

                        </div>



                        <div className="batch-card-footer">

                            <Link to={`/dashboard/batches/${batch.id}`} className="btn btn-outline btn-sm w-full">

                                <Eye size={16} />

                                {getTranslation('common', 'viewDetails', currentLanguage)}

                            </Link>

                        </div>

                    </div>

                ))}

            </div>



            {/* Empty State */}

            {filteredBatches.length === 0 && (

                <div className="empty-state">

                    <div className="empty-icon">

                        <Package size={48} />

                    </div>

                    <h3>{getTranslation('common', 'noBatchesFound', currentLanguage)}</h3>

                    <p>{batches.length === 0 ? getTranslation('common', 'createFirstBatchToStart', currentLanguage) : getTranslation('common', 'tryAdjustingSearchFilter', currentLanguage)}</p>

                    {batches.length === 0 ? (

                        <Link to="/dashboard/batches/create" className="btn btn-primary">

                            <Plus size={20} />

                            {getTranslation('common', 'createFirstBatch', currentLanguage)}

                        </Link>

                    ) : (

                        <button className="btn btn-primary" onClick={() => {

                            setSearchQuery('');

                            setStatusFilter('all');

                        }}>

                            {getTranslation('common', 'clearFilters', currentLanguage)}

                        </button>

                    )}

                </div>

            )}



            {/* Distributor Payment Section - Show for distributor role */}

            {user?.role === 'distributor' && (

                <DistributorPaymentSection 

                    batchData={{ batchId: 'selected-batch' }}

                    onPaymentComplete={(transactionId) => {

                        console.log('Distributor payment completed:', transactionId);

                        // Handle post-payment logic

                    }}

                />

            )}

        </div>

    );

};



export default BatchesPage;

