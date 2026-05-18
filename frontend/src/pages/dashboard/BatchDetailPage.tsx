import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    ArrowLeft,
    Package,
    MapPin,
    Calendar,
    Weight,
    QrCode,
    Download,
    Share2,
    MoreVertical,
    CheckCircle,
    Clock,
    Truck,
    Factory,
    ShoppingBag,
    Leaf,
    FileText,
    Shield,
    Cpu,
    Copy,
    ExternalLink,
    GitBranch,
    Plus,
    Loader,
    Send
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { fetchBatchById } from '../../api/apiClient';
import { useAuth } from '../../context/AuthContext';
import type { BatchDetail } from '../../api/types';
import HandoffModal from '../../components/HandoffModal';
import './BatchDetailPage.css';

const getEventIcon = (type: string): React.ReactNode => {
    const icons: Record<string, React.ReactNode> = {
        harvested: <Leaf size={20} />,
        quality_checked: <CheckCircle size={20} />,
        stored: <Package size={20} />,
        processed: <Factory size={20} />,
        shipped: <Truck size={20} />,
        received: <ShoppingBag size={20} />,
        split: <GitBranch size={20} />,
    };
    return icons[type] || <Clock size={20} />;
};

const getStatusBadge = (status: string) => {
    const styles: Record<string, { class: string; label: string }> = {
        created: { class: 'badge-info', label: 'Created' },
        in_transit: { class: 'badge-warning', label: 'In Transit' },
        processing: { class: 'badge-primary', label: 'Processing' },
        split: { class: 'badge-blockchain', label: 'Split' },
        completed: { class: 'badge-success', label: 'Completed' },
    };
    return styles[status] || { class: 'badge-neutral', label: status };
};

const BatchDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('timeline');
    const [showQRModal, setShowQRModal] = useState(false);
    const [showHandoffModal, setShowHandoffModal] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [batch, setBatch] = useState<BatchDetail | null>(null);

    // Role-based permissions
    const userRole = user?.role?.toUpperCase() || 'USER';
    const canSplit = ['FARMER', 'PROCESSOR', 'DISTRIBUTOR', 'RETAILER', 'ADMIN'].includes(userRole);
    const canAddEvent = ['FARMER', 'PROCESSOR', 'DISTRIBUTOR', 'RETAILER', 'ADMIN'].includes(userRole);

    useEffect(() => {
        const loadBatch = async () => {
            if (!id) return;
            setIsLoading(true);
            try {
                const data = await fetchBatchById(id);
                setBatch(data);
            } catch (error) {
                console.error('Failed to fetch batch:', error);
            } finally {
                setIsLoading(false);
            }
        };
        loadBatch();
    }, [id]);

    const copyHash = () => {
        if (batch?.blockchain?.hash) {
            navigator.clipboard.writeText(batch.blockchain.hash);
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        }
    };

    if (isLoading) {
        return (
            <div className="batch-detail-page">
                <div className="loading-state" style={{ padding: '4rem', textAlign: 'center' }}>
                    <Loader className="spin" size={32} />
                    <p>Loading batch details...</p>
                </div>
            </div>
        );
    }

    if (!batch) {
        return (
            <div className="batch-detail-page">
                <div className="detail-header">
                    <button className="back-btn" onClick={() => navigate(-1)}>
                        <ArrowLeft size={20} />
                        Back to Batches
                    </button>
                </div>
                <div className="empty-state" style={{ padding: '4rem', textAlign: 'center' }}>
                    <Package size={48} />
                    <h3>Batch not found</h3>
                    <p>The batch you're looking for doesn't exist or has been removed.</p>
                    <Link to="/dashboard/batches" className="btn btn-primary">
                        View All Batches
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="batch-detail-page">
            {/* Header */}
            <div className="detail-header">
                <button className="back-btn" onClick={() => navigate(-1)}>
                    <ArrowLeft size={20} />
                    Back to Batches
                </button>

                <div className="header-content">
                    <div className="header-left">
                        <div className="batch-icon-large">
                            <Package size={32} />
                        </div>
                        <div className="header-info">
                            <div className="header-title-row">
                                <h1 className="batch-title">{batch.product.name}</h1>
                                <span className={`badge ${getStatusBadge(batch.status).class}`}>
                                    {getStatusBadge(batch.status).label}
                                </span>
                            </div>
                            <span className="batch-id-large font-mono">{batch.batchId}</span>
                            <div className="header-meta">
                                <span><MapPin size={14} /> {batch.origin?.location || 'Unknown'}</span>
                                <span><Calendar size={14} /> Harvested {batch.origin?.harvestDate ? new Date(batch.origin.harvestDate).toLocaleDateString() : 'N/A'}</span>
                                <span><Weight size={14} /> {batch.weight} {batch.weightUnit}</span>
                            </div>
                        </div>
                    </div>

                    <div className="header-actions">
                        <button className="btn btn-outline" onClick={() => setShowQRModal(true)}>
                            <QrCode size={18} />
                            View QR
                        </button>
                        <button className="btn btn-accent" onClick={() => setShowHandoffModal(true)}>
                            <Send size={18} />
                            Transfer
                        </button>
                        {canSplit && (
                            <Link to={`/dashboard/batches/${id}/split`} className="btn btn-outline">
                                <GitBranch size={18} />
                                Split Batch
                            </Link>
                        )}
                        {canAddEvent && (
                            <Link to={`/dashboard/batches/${id}/add-event`} className="btn btn-primary">
                                <Plus size={18} />
                                Add Event
                            </Link>
                        )}
                        <button className="btn btn-ghost btn-icon">
                            <MoreVertical size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="quick-stats">
                <div className="stat-box">
                    <span className="stat-label">Farm Origin</span>
                    <span className="stat-value">{batch.origin?.farm || 'Unknown'}</span>
                    <span className="stat-sub">{batch.origin?.location || 'Unknown'}</span>
                </div>
                <div className="stat-box">
                    <span className="stat-label">Status</span>
                    <span className="stat-value" style={{ textTransform: 'capitalize' }}>{batch.status?.replace('_', ' ') || 'Created'}</span>
                    <span className="stat-sub">Current state</span>
                </div>
                <div className="stat-box">
                    <span className="stat-label">Events Logged</span>
                    <span className="stat-value">{batch.events?.length || 0}</span>
                    <span className="stat-sub">{batch.events?.filter(e => e.verified).length || 0} verified</span>
                </div>
                <div className="stat-box blockchain">
                    <span className="stat-label">Has QR Code</span>
                    <span className="stat-value">{batch.hasQR ? 'Yes' : 'No'}</span>
                    <span className="stat-sub">{batch.hasQR ? 'Scannable' : 'Generate one'}</span>
                </div>
            </div>

            {/* Parent-Child Batch Info */}
            {(batch.parentBatchId || (batch.childBatches && batch.childBatches.length > 0)) && (
                <div className="parent-child-info">
                    {batch.parentBatch && (
                        <div className="parent-link">
                            <GitBranch size={16} />
                            <span>Split from parent: </span>
                            <Link to={`/dashboard/batches/${batch.parentBatch.id}`}>
                                {batch.parentBatch.batchId || `BATCH-${batch.parentBatch.id}`}
                            </Link>
                        </div>
                    )}
                    {batch.childBatches && batch.childBatches.length > 0 && (
                        <div className="child-batches">
                            <span className="child-label">
                                <GitBranch size={16} /> {batch.childBatches.length} child batch(es):
                            </span>
                            <div className="child-list">
                                {batch.childBatches.map(child => (
                                    <Link key={child.id} to={`/dashboard/batches/${child.id}`} className="child-chip">
                                        {child.batchId || `#${child.id}`} ({child.weight}kg)
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Tabs */}
            <div className="detail-tabs">
                <button
                    className={`tab ${activeTab === 'timeline' ? 'active' : ''}`}
                    onClick={() => setActiveTab('timeline')}
                >
                    <Clock size={18} />
                    Timeline
                </button>
                <button
                    className={`tab ${activeTab === 'details' ? 'active' : ''}`}
                    onClick={() => setActiveTab('details')}
                >
                    <FileText size={18} />
                    Details
                </button>
                <button
                    className={`tab ${activeTab === 'blockchain' ? 'active' : ''}`}
                    onClick={() => setActiveTab('blockchain')}
                >
                    <Cpu size={18} />
                    Blockchain
                </button>
                <button
                    className={`tab ${activeTab === 'documents' ? 'active' : ''}`}
                    onClick={() => setActiveTab('documents')}
                >
                    <FileText size={18} />
                    Documents
                </button>
                {batch.childBatches && batch.childBatches.length > 0 && (
                    <button
                        className={`tab ${activeTab === 'lineage' ? 'active' : ''}`}
                        onClick={() => setActiveTab('lineage')}
                    >
                        <GitBranch size={18} />
                        Lineage
                    </button>
                )}
            </div>

            {/* Tab Content */}
            <div className="tab-content">
                {/* Timeline Tab */}
                {activeTab === 'timeline' && (
                    <div className="timeline-container animate-fadeIn">
                        <div className="timeline-header">
                            <h3>Event Timeline</h3>
                            <p>Complete journey from farm to current location</p>
                        </div>
                        <div className="event-timeline">
                            {batch.events.map((event, index) => (
                                <div key={event.id} className="event-item">
                                    <div className="event-connector">
                                        <div className={`event-dot ${event.verified ? 'verified' : ''}`}>
                                            {getEventIcon(event.type)}
                                        </div>
                                        {index < batch.events.length - 1 && <div className="event-line"></div>}
                                    </div>
                                    <div className="event-content">
                                        <div className="event-header">
                                            <h4>{event.title}</h4>
                                            <div className="event-badges">
                                                {event.verified && (
                                                    <span className="verified-tag">
                                                        <Shield size={12} />
                                                        Verified
                                                    </span>
                                                )}
                                                <span className="event-time">
                                                    {new Date(event.timestamp).toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                        <p className="event-desc">{event.description}</p>
                                        <div className="event-meta">
                                            <span className="meta-item">
                                                <MapPin size={12} />
                                                {event.location}
                                            </span>
                                            <span className="meta-item">
                                                👤 {event.actor}
                                            </span>
                                            {event.temperature && (
                                                <span className="meta-item">🌡️ {event.temperature}</span>
                                            )}
                                            {event.humidity && (
                                                <span className="meta-item">💧 {event.humidity}</span>
                                            )}
                                        </div>
                                        {event.txHash && (
                                            <div className="event-tx">
                                                <span className="tx-label">Tx:</span>
                                                <code className="tx-hash">{event.txHash}</code>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Details Tab */}
                {activeTab === 'details' && (
                    <div className="details-container animate-fadeIn">
                        <div className="details-grid">
                            <div className="detail-card">
                                <h4>Product Information</h4>
                                <div className="detail-list">
                                    <div className="detail-row">
                                        <span className="label">Product Name</span>
                                        <span className="value">{batch.product.name}</span>
                                    </div>
                                    <div className="detail-row">
                                        <span className="label">Type</span>
                                        <span className="value">{batch.product.type}</span>
                                    </div>
                                    <div className="detail-row">
                                        <span className="label">Variety</span>
                                        <span className="value">{batch.product.variety}</span>
                                    </div>
                                    <div className="detail-row">
                                        <span className="label">Weight</span>
                                        <span className="value">{batch.weight} {batch.weightUnit}</span>
                                    </div>
                                    <div className="detail-row">
                                        <span className="label">Quantity</span>
                                        <span className="value">{batch.quantity} {batch.quantityUnit}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="detail-card">
                                <h4>Origin Details</h4>
                                <div className="detail-list">
                                    <div className="detail-row">
                                        <span className="label">Farm</span>
                                        <span className="value">{batch.origin.farm}</span>
                                    </div>
                                    <div className="detail-row">
                                        <span className="label">Farmer ID</span>
                                        <span className="value font-mono">{batch.origin.farmerId}</span>
                                    </div>
                                    <div className="detail-row">
                                        <span className="label">Location</span>
                                        <span className="value">{batch.origin.location}</span>
                                    </div>
                                    <div className="detail-row">
                                        <span className="label">Harvest Date</span>
                                        <span className="value">{batch.origin?.harvestDate ? new Date(batch.origin.harvestDate).toLocaleDateString() : 'N/A'}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="detail-card full-width">
                                <h4>Certifications</h4>
                                <div className="cert-grid">
                                    {(batch.certifications || []).map((cert, index) => (
                                        <div key={index} className="cert-card">
                                            <div className="cert-icon">
                                                <Shield size={24} />
                                            </div>
                                            <div className="cert-info">
                                                <span className="cert-name">{cert.name}</span>
                                                <span className="cert-issuer">Issued by {cert.issuer}</span>
                                                <span className="cert-validity">Valid until {cert.validUntil ? new Date(cert.validUntil).toLocaleDateString() : 'N/A'}</span>
                                            </div>
                                            {cert.verified && (
                                                <span className="cert-verified">
                                                    <CheckCircle size={16} />
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Blockchain Tab */}
                {activeTab === 'blockchain' && (
                    <div className="blockchain-container animate-fadeIn">
                        <div className="blockchain-card-dark">
                            <div className="blockchain-header">
                                <div className="blockchain-icon">
                                    <Cpu size={32} />
                                </div>
                                <div className="blockchain-status">
                                    <CheckCircle size={20} />
                                    <span>Verified on {batch.blockchain.network}</span>
                                </div>
                            </div>

                            <div className="blockchain-details">
                                <div className="bc-row">
                                    <span className="bc-label">Transaction Hash</span>
                                    <div className="bc-hash-row">
                                        <code className="bc-hash">{batch.blockchain.hash}</code>
                                        <button
                                            className={`btn btn-ghost btn-sm ${copySuccess ? 'success' : ''}`}
                                            onClick={copyHash}
                                        >
                                            {copySuccess ? <CheckCircle size={16} /> : <Copy size={16} />}
                                        </button>
                                    </div>
                                </div>

                                <div className="bc-grid">
                                    <div className="bc-item">
                                        <span className="bc-label">Network</span>
                                        <span className="bc-value" style={{ color: 'white' }}>
                                            {batch.blockchain?.network || 'IPFS (Pinata)'}
                                        </span>
                                    </div>
                                    <div className="bc-item">
                                        <span className="bc-label">Timestamp</span>
                                        <span className="bc-value" style={{ color: 'white' }}>
                                            {batch.blockchain?.timestamp ? new Date(batch.blockchain.timestamp).toLocaleString() : new Date().toLocaleString()}
                                        </span>
                                    </div>
                                </div>

                                {batch.blockchain?.ipfsHash && (
                                    <div className="bc-row" style={{ marginTop: '16px' }}>
                                        <span className="bc-label">IPFS Content Hash (Pinata)</span>
                                        <div className="bc-hash-row">
                                            <code className="bc-hash">{batch.blockchain.ipfsHash}</code>
                                        </div>
                                    </div>
                                )}

                                {batch.blockchain?.ipfsUrl ? (
                                    <a href={batch.blockchain.ipfsUrl} target="_blank" rel="noopener noreferrer" className="bc-explorer-link">
                                        <ExternalLink size={16} />
                                        View on IPFS Gateway (Pinata)
                                    </a>
                                ) : (
                                    <span className="bc-explorer-link" style={{ opacity: 0.5, cursor: 'default' }}>
                                        <ExternalLink size={16} />
                                        IPFS data not available
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="event-hashes">
                            <h4>Event Transaction Hashes</h4>
                            <div className="hash-list">
                                {batch.events.filter(e => e.txHash).map((event) => (
                                    <div key={event.id} className="hash-item">
                                        <span className="hash-event">{event.title}</span>
                                        <code className="hash-value">{event.txHash}</code>
                                        <span className="hash-date">{new Date(event.timestamp).toLocaleDateString()}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Documents Tab */}
                {activeTab === 'documents' && (
                    <div className="documents-container animate-fadeIn">
                        <div className="docs-header">
                            <h3>Attached Documents</h3>
                            <button className="btn btn-outline btn-sm">
                                <Plus size={16} />
                                Upload Document
                            </button>
                        </div>
                        <div className="docs-list">
                            {(batch.documents || []).map((doc, index) => (
                                <div key={index} className="doc-item">
                                    <div className="doc-icon">
                                        <FileText size={24} />
                                    </div>
                                    <div className="doc-info">
                                        <span className="doc-name">{doc.name}</span>
                                        <span className="doc-meta">{doc.type.toUpperCase()} • {doc.size}</span>
                                    </div>
                                    <div className="doc-actions">
                                        <button className="btn btn-ghost btn-sm">
                                            <Download size={16} />
                                        </button>
                                        <button className="btn btn-ghost btn-sm">
                                            <Share2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Lineage Tab */}
                {activeTab === 'lineage' && (
                    <div className="lineage-container animate-fadeIn">
                        <div className="lineage-header">
                            <h3>Batch Lineage</h3>
                            <p>View parent and child batch relationships</p>
                        </div>

                        <div className="lineage-tree">
                            <div className="lineage-node parent">
                                <div className="node-content">
                                    <GitBranch size={20} />
                                    <div className="node-info">
                                        <span className="node-id font-mono">{batch.batchId}</span>
                                        <span className="node-weight">{batch.weight} {batch.weightUnit} (Parent)</span>
                                    </div>
                                    <span className={`badge ${getStatusBadge(batch.status).class}`}>
                                        {getStatusBadge(batch.status).label}
                                    </span>
                                </div>
                            </div>

                            <div className="lineage-branches">
                                {batch.childBatches?.map((child) => (
                                    <div key={child.id} className="lineage-node child">
                                        <div className="branch-line"></div>
                                        <div className="node-content">
                                            <Package size={18} />
                                            <div className="node-info">
                                                <span className="node-id font-mono">{child.id}</span>
                                                <span className="node-weight">{child.weight} {batch.weightUnit}</span>
                                            </div>
                                            <span className={`badge ${getStatusBadge(child.status).class}`}>
                                                {getStatusBadge(child.status).label}
                                            </span>
                                            <Link to={`/dashboard/batches/${child.id}`} className="btn btn-ghost btn-sm">
                                                View
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="split-action">
                                <Link to={`/dashboard/batches/${id}/split`} className="btn btn-outline">
                                    <GitBranch size={18} />
                                    Split This Batch
                                </Link>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* QR Modal */}
            {showQRModal && (
                <div className="modal-overlay" onClick={() => setShowQRModal(false)}>
                    <div className="modal-content qr-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Batch QR Code</h3>
                            <button className="modal-close" onClick={() => setShowQRModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="qr-display">
                                <QRCodeSVG
                                    value={`https://FARMETRA.com/verify?id=${batch.batchId}`}
                                    size={220}
                                    level="H"
                                    includeMargin={true}
                                />
                            </div>
                            <div className="qr-info">
                                <span className="qr-batch-id font-mono">{batch.batchId}</span>
                                <p>Scan to verify product authenticity</p>
                            </div>
                            <div className="qr-actions">
                                <button className="btn btn-primary">
                                    <Download size={18} />
                                    Download QR
                                </button>
                                <button className="btn btn-outline">
                                    <Share2 size={18} />
                                    Share
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Handoff Modal */}
            <HandoffModal
                isOpen={showHandoffModal}
                onClose={() => setShowHandoffModal(false)}
                batchId={id || ''}
                batchName={batch.product.name}
                onSuccess={() => {
                    // Reload batch data after successful handoff
                    if (id) {
                        fetchBatchById(id).then(setBatch);
                    }
                }}
            />
        </div>
    );
};

export default BatchDetailPage;
