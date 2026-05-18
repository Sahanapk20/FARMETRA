import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
    Leaf,
    Shield,
    CheckCircle,
    XCircle,
    QrCode,
    MapPin,
    Calendar,
    Package,
    Truck,
    Factory,
    ShoppingBag,
    ExternalLink,
    Copy,
    ChevronDown,
    AlertTriangle,
    Cpu,
    Store,
    GitBranch,
    ArrowRight,
    User
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { verifyBatch } from '../../api/apiClient';
import './VerifyPage.css';

// Type for verification result
interface CustodyChainItem {
    actor: string;
    role: string;
    organization?: string | null;
    action: string;
    timestamp: string;
    location: string;
    fromActor?: string;
    fromRole?: string;
}

interface ChildBatchInfo {
    id: string;
    batchId: string;
    weight: number;
    weightUnit: string;
    location: string;
    status: string;
}

interface ParentBatchInfo {
    id: string;
    batchId: string;
    productName: string;
    weight: number;
    weightUnit: string;
    createdBy: string;
}

interface VerificationData {
    batchId: string;
    isValid: boolean;
    blockchainVerified: boolean;
    product: {
        name: string;
        type: string;
        weight: number;
        unit: string;
        description: string;
        image?: string;
    };
    origin: {
        farm: string;
        location: string;
        harvestDate: string;
        farmerName?: string;
        fromLocation?: string;
        toLocation?: string;
        currentHolder?: string;
        currentHolderRole?: string;
    };
    certifications: string[];
    certificationId?: string | null;
    journey: Array<{
        id: number;
        event: string;
        description: string;
        location: string;
        date: string;
        icon: string;
        verified: boolean;
        actor?: string;
    }>;
    blockchain: {
        hash: string;
        network: string;
        timestamp: string;
        ipfsHash?: string | null;
        ipfsUrl?: string | null;
    };
    custodyChain?: CustodyChainItem[];
    parentBatch?: ParentBatchInfo | null;
    childBatches?: ChildBatchInfo[];
}

// Get emoji for product type
const getProductEmoji = (type: string) => {
    const emojis: Record<string, string> = {
        grain: '🌾', wheat: '🌾', rice: '🍚',
        fruit: '🍎', vegetable: '🥬', spice: '🌶️',
        dairy: '🥛', beverage: '🍵', fiber: '🧵'
    };
    return emojis[type.toLowerCase()] || '📦';
};

const getEventIcon = (iconType: string): React.ReactElement => {
    const icons: Record<string, React.ReactElement> = {
        harvest: <Leaf size={20} />,
        harvested: <Leaf size={20} />,
        quality: <CheckCircle size={20} />,
        quality_checked: <CheckCircle size={20} />,
        process: <Factory size={20} />,
        processed: <Factory size={20} />,
        packaged: <Package size={20} />,
        ship: <Truck size={20} />,
        shipped: <Truck size={20} />,
        deliver: <ShoppingBag size={20} />,
        received: <ShoppingBag size={20} />,
        stored: <Store size={20} />,
        sold: <ShoppingBag size={20} />,
        split: <GitBranch size={20} />,
        handoff: <ArrowRight size={20} />
    };
    return icons[iconType.toLowerCase()] || <Package size={20} />;
};

// Get icon for role
const getRoleIcon = (role: string): React.ReactElement => {
    const icons: Record<string, React.ReactElement> = {
        FARMER: <Leaf size={18} />,
        PROCESSOR: <Factory size={18} />,
        DISTRIBUTOR: <Truck size={18} />,
        RETAILER: <Store size={18} />,
        ADMIN: <Shield size={18} />
    };
    return icons[role?.toUpperCase()] || <User size={18} />;
};

// Get role display name
const getRoleName = (role: string): string => {
    const names: Record<string, string> = {
        FARMER: 'Farmer',
        PROCESSOR: 'Processor',
        DISTRIBUTOR: 'Distributor',
        RETAILER: 'Retailer',
        ADMIN: 'Admin'
    };
    return names[role?.toUpperCase()] || role || 'Unknown';
};

const VerifyPage = () => {
    const [searchParams] = useSearchParams();
    const [isLoading, setIsLoading] = useState(true);
    const [data, setData] = useState<VerificationData | null>(null);
    const [showFullHash, setShowFullHash] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);
    const [activeSection, setActiveSection] = useState('overview');

    // Get batch ID from URL query
    const batchId = searchParams.get('id') || '';

    useEffect(() => {
        // Call real verification API
        const fetchVerification = async () => {
            if (!batchId) {
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            try {
                const result = await verifyBatch(batchId);
                if (result) {
                    setData({
                        batchId: result.batchId,
                        isValid: result.isValid,
                        blockchainVerified: result.blockchainVerified,
                        product: {
                            name: result.product.name,
                            type: result.product.type,
                            weight: result.product.weight,
                            unit: result.product.unit,
                            description: result.product.description || `${result.product.name} batch`,
                            image: getProductEmoji(result.product.type)
                        },
                        origin: {
                            farm: result.origin.farm,
                            location: result.origin.location,
                            harvestDate: result.origin.harvestDate,
                            farmerName: result.origin.farmerName,
                            fromLocation: result.origin.fromLocation || result.origin.location,
                            toLocation: result.origin.toLocation || result.origin.location,
                            currentHolder: result.origin.currentHolder,
                            currentHolderRole: result.origin.currentHolderRole
                        },
                        certifications: result.certifications || [],
                        certificationId: result.certificationId || null,
                        journey: (result.journey || []).map((ev: any, index: number) => ({
                            id: ev.id || index + 1,
                            event: ev.title || ev.eventType || ev.event || 'Event',
                            description: ev.description || '',
                            location: ev.location || '',
                            date: ev.timestamp || ev.date || '',
                            icon: ev.type || ev.eventType || ev.icon || 'package',
                            verified: ev.verified !== false,
                            actor: ev.actor
                        })),
                        blockchain: {
                            hash: result.blockchain.hash || '',
                            network: result.blockchain.network || 'IPFS (Pinata)',
                            timestamp: result.blockchain.timestamp || result.createdAt || '',
                            ipfsHash: result.blockchain.ipfsHash || null,
                            ipfsUrl: result.blockchain.ipfsUrl || null
                        },
                        custodyChain: result.custodyChain || [],
                        parentBatch: result.parentBatch || null,
                        childBatches: result.childBatches || []
                    });
                }
            } catch (error) {
                console.error('Verification failed:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchVerification();
    }, [batchId]);

    const copyHash = () => {
        if (data?.blockchain.hash) {
            navigator.clipboard.writeText(data.blockchain.hash);
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        }
    };

    const truncateHash = (hash: string) => {
        return `${hash.slice(0, 10)}...${hash.slice(-10)}`;
    };

    return (
        <div className="verify-page">
            {/* Header */}
            <nav className="verify-nav">
                <div className="container">
                    <Link to="/" className="nav-logo">
                        <div className="logo-icon">
                            <Leaf size={22} />
                        </div>
                        <span>FARMETRA</span>
                    </Link>
                    <span className="verify-badge">
                        <QrCode size={16} />
                        Product Verification
                    </span>
                </div>
            </nav>

            <main className="verify-main">
                <div className="container">
                    {isLoading ? (
                        <div className="verify-loading">
                            <div className="loading-spinner"></div>
                            <h3>Verifying Product</h3>
                            <p>Checking blockchain records...</p>
                        </div>
                    ) : data?.isValid ? (
                        <div className="verify-content">
                            {/* Verification Status */}
                            <div className="verify-status verified">
                                <div className="status-icon">
                                    <CheckCircle size={48} />
                                </div>
                                <div className="status-content">
                                    <h1>Authentic Product</h1>
                                    <p>This product has been verified on the blockchain</p>
                                </div>
                                <div className="status-badges">
                                    <span className="badge badge-success">
                                        <Shield size={14} />
                                        Verified
                                    </span>
                                    {data.blockchainVerified && (
                                        <span className="badge badge-blockchain">
                                            <Cpu size={14} />
                                            Blockchain Secured
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Navigation Tabs */}
                            <div className="verify-tabs">
                                <button
                                    className={`tab ${activeSection === 'overview' ? 'active' : ''}`}
                                    onClick={() => setActiveSection('overview')}
                                >
                                    Overview
                                </button>
                                <button
                                    className={`tab ${activeSection === 'journey' ? 'active' : ''}`}
                                    onClick={() => setActiveSection('journey')}
                                >
                                    Journey
                                </button>
                                <button
                                    className={`tab ${activeSection === 'blockchain' ? 'active' : ''}`}
                                    onClick={() => setActiveSection('blockchain')}
                                >
                                    Blockchain
                                </button>
                            </div>

                            {/* Overview Section */}
                            {activeSection === 'overview' && (
                                <div className="verify-section animate-fadeIn">
                                    <div className="product-card">
                                        <div className="product-image">
                                            <span>{data.product.image}</span>
                                        </div>
                                        <div className="product-details">
                                            <span className="batch-id font-mono">{data.batchId}</span>
                                            <h2>{data.product.name}</h2>
                                            <p className="product-desc">{data.product.description}</p>

                                            <div className="product-meta">
                                                <div className="meta-item">
                                                    <span className="meta-label">Weight</span>
                                                    <span className="meta-value">{data.product.weight} {data.product.unit}</span>
                                                </div>
                                                <div className="meta-item">
                                                    <span className="meta-label">Type</span>
                                                    <span className="meta-value">{data.product.type}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="info-cards">
                                        <div className="info-card">
                                            <div className="info-card-icon" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
                                                <MapPin size={22} />
                                            </div>
                                            <div className="info-card-content">
                                                <span className="info-label">Origin</span>
                                                <span className="info-value">{data.origin.farm}</span>
                                                <span className="info-sub">{data.origin.location}</span>
                                            </div>
                                        </div>

                                        <div className="info-card">
                                            <div className="info-card-icon">
                                                <Calendar size={22} />
                                            </div>
                                            <div className="info-card-content">
                                                <span className="info-label">Harvest Date</span>
                                                <span className="info-value">
                                                    {new Date(data.origin.harvestDate).toLocaleDateString('en-US', {
                                                        year: 'numeric',
                                                        month: 'long',
                                                        day: 'numeric'
                                                    })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="certifications-section">
                                        <h3>Certifications</h3>

                                        {/* Certification ID */}
                                        {data.certificationId && (
                                            <div className="certification-id-box" style={{
                                                padding: '12px 16px',
                                                background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
                                                border: '2px solid #22c55e',
                                                borderRadius: '12px',
                                                marginBottom: '16px'
                                            }}>
                                                <div style={{ fontSize: '12px', color: '#166534', fontWeight: 600, marginBottom: 4 }}>
                                                    OFFICIAL CERTIFICATION ID
                                                </div>
                                                <div style={{ fontSize: '16px', fontWeight: 700, color: '#15803d', fontFamily: 'monospace' }}>
                                                    {data.certificationId}
                                                </div>
                                            </div>
                                        )}

                                        {/* Certification Types */}
                                        <div className="cert-list">
                                            {data.certifications.map((cert: any, index: number) => (
                                                <div key={index} className="cert-item">
                                                    <CheckCircle size={18} />
                                                    <span>{typeof cert === 'string' ? cert : cert.name}</span>
                                                    {cert.verified && <span className="cert-verified">✓ Verified</span>}
                                                </div>
                                            ))}
                                            {data.certifications.length === 0 && !data.certificationId && (
                                                <p className="no-certs">No certifications recorded</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Journey Section - Combined with Supply Chain */}
                            {activeSection === 'journey' && (
                                <div className="verify-section animate-fadeIn">
                                    <h3 className="section-title">Product Journey</h3>
                                    <p className="section-desc">Complete journey from farm to your hands including all custody transfers</p>


                                    {/* Unified Timeline - Chronologically sorted */}
                                    <div className="journey-timeline">
                                        {(() => {
                                            // Combine custody chain and events into unified timeline
                                            type TimelineItem = {
                                                id: string;
                                                type: 'custody' | 'event';
                                                timestamp: Date;
                                                data: any;
                                            };

                                            const timelineItems: TimelineItem[] = [];

                                            // Add custody chain items
                                            (data.custodyChain || []).forEach((item, idx) => {
                                                timelineItems.push({
                                                    id: `custody-${idx}`,
                                                    type: 'custody',
                                                    timestamp: new Date(item.timestamp),
                                                    data: { ...item, isFirst: idx === 0 }
                                                });
                                            });

                                            // Add event items
                                            (data.journey || []).forEach((event) => {
                                                timelineItems.push({
                                                    id: `event-${event.id}`,
                                                    type: 'event',
                                                    timestamp: new Date(event.date),
                                                    data: event
                                                });
                                            });

                                            // Sort by timestamp (earliest first)
                                            timelineItems.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

                                            return timelineItems.map((item) => (
                                                <div key={item.id} className="journey-item">
                                                    <div className="journey-line"></div>
                                                    {item.type === 'custody' ? (
                                                        <>
                                                            <div className={`journey-dot ${item.data.isFirst ? 'verified' : ''}`} style={{ background: item.data.isFirst ? '#22c55e' : '#3b82f6' }}>
                                                                {getRoleIcon(item.data.role)}
                                                            </div>
                                                            <div className="journey-content">
                                                                <div className="journey-header">
                                                                    <h4>{item.data.action}</h4>
                                                                    <span className="verified-badge">
                                                                        <CheckCircle size={12} />
                                                                        {getRoleName(item.data.role)}
                                                                    </span>
                                                                </div>
                                                                <p className="journey-desc">
                                                                    {item.data.actor}
                                                                    {item.data.organization && ` (${item.data.organization})`}
                                                                    {item.data.fromActor && ` • Received from ${item.data.fromActor}`}
                                                                </p>
                                                                <div className="journey-meta">
                                                                    <span className="journey-location">
                                                                        <MapPin size={12} />
                                                                        {item.data.location || 'N/A'}
                                                                    </span>
                                                                    <span className="journey-date">
                                                                        <Calendar size={12} />
                                                                        {item.timestamp.toLocaleDateString()} {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <div className={`journey-dot ${item.data.verified ? 'verified' : ''}`}>
                                                                {getEventIcon(item.data.icon)}
                                                            </div>
                                                            <div className="journey-content">
                                                                <div className="journey-header">
                                                                    <h4>{item.data.event}</h4>
                                                                    {item.data.verified && (
                                                                        <span className="verified-badge">
                                                                            <CheckCircle size={12} />
                                                                            Verified
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <p className="journey-desc">{item.data.description}</p>
                                                                {item.data.actor && (
                                                                    <p style={{ margin: '4px 0', fontSize: '13px', color: '#6b7280' }}>By: {item.data.actor}</p>
                                                                )}
                                                                <div className="journey-meta">
                                                                    <span className="journey-location">
                                                                        <MapPin size={12} />
                                                                        {item.data.location}
                                                                    </span>
                                                                    <span className="journey-date">
                                                                        <Calendar size={12} />
                                                                        {item.timestamp.toLocaleDateString()} {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            ));
                                        })()}
                                    </div>

                                    {/* Child Batches */}
                                    {data.childBatches && data.childBatches.length > 0 && (
                                        <div style={{ marginTop: '24px', padding: '16px', background: '#f9fafb', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                                            <h4 style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#374151' }}>
                                                <GitBranch size={16} />
                                                Split into {data.childBatches.length} Child Batches
                                            </h4>
                                            <div style={{ display: 'grid', gap: '8px' }}>
                                                {data.childBatches.map((child) => (
                                                    <div key={child.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'white', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                                                        <div>
                                                            <span className="font-mono" style={{ fontSize: '11px', color: '#6b7280' }}>{child.batchId}</span>
                                                            <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#374151', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                <MapPin size={12} />
                                                                {child.location}
                                                            </p>
                                                        </div>
                                                        <div style={{ textAlign: 'right' }}>
                                                            <span style={{ fontWeight: 600 }}>{child.weight} {child.weightUnit}</span>
                                                            <span style={{ display: 'block', marginTop: '2px', padding: '2px 6px', background: child.status === 'completed' ? '#dcfce7' : '#fef3c7', color: child.status === 'completed' ? '#166534' : '#92400e', borderRadius: '4px', fontSize: '10px', textTransform: 'capitalize' }}>
                                                                {child.status}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Blockchain Section */}
                            {activeSection === 'blockchain' && (
                                <div className="verify-section animate-fadeIn">
                                    <h3 className="section-title">Blockchain Verification</h3>
                                    <p className="section-desc">Immutable record stored on {data.blockchain.network}</p>

                                    <div className="blockchain-card">
                                        <div className="blockchain-visual">
                                            <div className="blockchain-icon">
                                                <Cpu size={40} />
                                            </div>
                                            <div className="blockchain-status">
                                                <CheckCircle size={20} />
                                                <span>Verified on Chain</span>
                                            </div>
                                        </div>

                                        <div className="blockchain-details">
                                            <div className="detail-row">
                                                <span className="detail-label">Transaction Hash</span>
                                                <div className="hash-container">
                                                    <code className="hash-value">
                                                        {showFullHash ? data.blockchain.hash : truncateHash(data.blockchain.hash)}
                                                    </code>
                                                    <button
                                                        className="hash-toggle"
                                                        onClick={() => setShowFullHash(!showFullHash)}
                                                    >
                                                        <ChevronDown size={16} style={{ transform: showFullHash ? 'rotate(180deg)' : 'none' }} />
                                                    </button>
                                                    <button
                                                        className={`copy-btn ${copySuccess ? 'success' : ''}`}
                                                        onClick={copyHash}
                                                    >
                                                        {copySuccess ? <CheckCircle size={16} /> : <Copy size={16} />}
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="detail-row">
                                                <span className="detail-label">Network</span>
                                                <span className="detail-value" style={{ color: 'white' }}>
                                                    {data.blockchain.network || 'IPFS (Pinata)'}
                                                </span>
                                            </div>

                                            <div className="detail-row">
                                                <span className="detail-label">Timestamp</span>
                                                <span className="detail-value" style={{ color: 'white' }}>
                                                    {(data.blockchain.timestamp && data.blockchain.timestamp !== '0') ? new Date(data.blockchain.timestamp).toLocaleString() : new Date().toLocaleString()}
                                                </span>
                                            </div>

                                            {/* IPFS Hash */}
                                            {data.blockchain.ipfsHash && (
                                                <div className="detail-row" style={{ marginTop: '16px', padding: '16px', background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(59, 130, 246, 0.1))', borderRadius: '12px' }}>
                                                    <span className="detail-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <Cpu size={14} />
                                                        IPFS Content Hash (Pinata)
                                                    </span>
                                                    <div className="hash-container" style={{ marginTop: '8px' }}>
                                                        <code className="hash-value" style={{ fontSize: '12px', wordBreak: 'break-all' }}>
                                                            {data.blockchain.ipfsHash}
                                                        </code>
                                                        <button
                                                            className="copy-btn"
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(data.blockchain.ipfsHash || '');
                                                                setCopySuccess(true);
                                                                setTimeout(() => setCopySuccess(false), 2000);
                                                            }}
                                                            title="Copy IPFS Hash"
                                                        >
                                                            <Copy size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {data.blockchain.ipfsUrl ? (
                                            <a href={data.blockchain.ipfsUrl} target="_blank" rel="noopener noreferrer" className="blockchain-explorer">
                                                <ExternalLink size={16} />
                                                View on IPFS Gateway
                                            </a>
                                        ) : (
                                            <span className="blockchain-explorer" style={{ opacity: 0.5 }}>
                                                <ExternalLink size={16} />
                                                IPFS Hash Not Available
                                            </span>
                                        )}
                                    </div>

                                    <div className="qr-section">
                                        <h4>Shareable QR Code</h4>
                                        <div className="qr-container-wrapper">
                                            <div className="qr-box">
                                                <QRCodeSVG
                                                    value={`${import.meta.env.VITE_BASE_URL || window.location.origin}/verify?id=${data.batchId}`}
                                                    size={160}
                                                    level="H"
                                                    includeMargin={true}
                                                />
                                            </div>
                                            <p>Scan to verify this product</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Report Section */}
                            <div className="report-section">
                                <AlertTriangle size={18} />
                                <span>See something wrong?</span>
                                <a href="#report">Report an issue</a>
                            </div>
                        </div>
                    ) : (
                        <div className="verify-status invalid">
                            <div className="status-icon">
                                <XCircle size={48} />
                            </div>
                            <div className="status-content">
                                <h1>Verification Failed</h1>
                                <p>This product could not be verified. It may be counterfeit or not registered in our system.</p>
                            </div>
                            <div className="status-actions">
                                <Link to="/" className="btn btn-primary">
                                    Go to Homepage
                                </Link>
                                <a href="#report" className="btn btn-outline">
                                    Report Issue
                                </a>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Footer */}
            <footer className="verify-footer">
                <div className="container">
                    <p>Powered by <strong>FARMETRA</strong> - Building trust in agriculture</p>
                </div>
            </footer>
        </div>
    );
};

export default VerifyPage;
