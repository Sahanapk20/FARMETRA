import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
    QrCode,
    Download,
    Plus,
    Search,
    Eye,
    Copy,
    CheckCircle,
    Package,
    Clock,
    Loader,
    AlertTriangle,
    RefreshCw
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { fetchQRCodes, fetchBatches, generateQRCode } from '../../api/apiClient';
import './QRManagementPage.css';

interface QRCodeItem {
    id: string;
    batchId: string;
    type: string;
    product: string;
    createdAt: string;
    scans: number;
    lastScanned: string | null;
    status: string;
    url: string;
}

interface BatchItem {
    id: string;
    batchId: string;
    product: string;
    hasQR: boolean;
}

const QRManagementPage = () => {
    const { user } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedQR, setSelectedQR] = useState<QRCodeItem | null>(null);
    const [showGenerateModal, setShowGenerateModal] = useState(false);
    const [copySuccess, setCopySuccess] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [qrCodes, setQrCodes] = useState<QRCodeItem[]>([]);
    const [batches, setBatches] = useState<BatchItem[]>([]);
    const [selectedBatchId, setSelectedBatchId] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [qrData, batchData] = await Promise.all([
                fetchQRCodes(),
                fetchBatches()
            ]);
            setQrCodes(qrData as QRCodeItem[]);
            setBatches(batchData.map(b => ({
                id: b.id,
                batchId: b.batchId,
                product: b.product,
                hasQR: b.hasQR || false
            })));
        } catch (err) {
            setError('Failed to load data');
            console.error('Failed to load data:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateQR = async () => {
        if (!selectedBatchId) {
            setError('Please select a batch');
            return;
        }

        setIsGenerating(true);
        setError(null);
        try {
            const result = await generateQRCode(selectedBatchId);
            if (result.success) {
                // Refresh data
                await loadData();
                setShowGenerateModal(false);
                setSelectedBatchId('');
            } else {
                setError('Failed to generate QR code');
            }
        } catch (err) {
            setError('Failed to generate QR code');
            console.error('Failed to generate QR:', err);
        } finally {
            setIsGenerating(false);
        }
    };

    const filteredQRs = qrCodes.filter(qr =>
        qr.batchId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        qr.product.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Batches without QR codes
    const batchesWithoutQR = batches.filter(b => !b.hasQR);

    const copyUrl = async (id: string, url: string) => {
        try {
            if (!url) {
                console.error('No URL to copy');
                return;
            }
            await navigator.clipboard.writeText(url);
            setCopySuccess(id);
            setTimeout(() => setCopySuccess(null), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = url;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            setCopySuccess(id);
            setTimeout(() => setCopySuccess(null), 2000);
        }
    };

    const downloadQR = (batchId: string) => {
        const container = document.getElementById(`qr-${batchId}`);
        const svg = container?.querySelector('svg');
        if (!svg) {
            console.error('QR SVG not found for', batchId);
            return;
        }

        try {
            const svgData = new XMLSerializer().serializeToString(svg);
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();

            img.onload = () => {
                canvas.width = img.width * 2; // Higher resolution
                canvas.height = img.height * 2;
                ctx?.scale(2, 2);
                ctx?.drawImage(img, 0, 0);
                const pngFile = canvas.toDataURL('image/png');
                const downloadLink = document.createElement('a');
                downloadLink.download = `QR-${batchId}.png`;
                downloadLink.href = pngFile;
                document.body.appendChild(downloadLink);
                downloadLink.click();
                document.body.removeChild(downloadLink);
            };

            img.onerror = () => {
                console.error('Failed to load QR image');
            };

            // Use encodeURIComponent for proper encoding
            img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgData);
        } catch (err) {
            console.error('QR download failed:', err);
        }
    };

    if (isLoading) {
        return (
            <div className="qr-management-page">
                <div className="loading-state">
                    <Loader size={40} className="spinner" />
                    <p>Loading QR codes...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="qr-management-page">
            {/* Page Header */}
            <div className="page-header">
                <div className="page-header-row">
                    <div>
                        <h1 className="page-title">QR Codes</h1>
                        <p className="page-subtitle">Generate and manage QR codes for product traceability</p>
                    </div>
                    <div className="header-actions">
                        <button className="btn btn-outline" onClick={loadData}>
                            <RefreshCw size={18} />
                            Refresh
                        </button>
                        {user?.role?.toLowerCase() !== 'consumer' && (
                            <button className="btn btn-primary" onClick={() => setShowGenerateModal(true)}>
                                <Plus size={20} />
                                Generate QR
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {error && (
                <div className="error-message">
                    <AlertTriangle size={18} />
                    {error}
                </div>
            )}

            {/* Stats Cards */}
            <div className="qr-stats">
                <div className="qr-stat-card">
                    <div className="qr-stat-icon">
                        <QrCode size={24} />
                    </div>
                    <div className="qr-stat-content">
                        <span className="qr-stat-value">{qrCodes.length}</span>
                        <span className="qr-stat-label">Total QR Codes</span>
                    </div>
                </div>
                <div className="qr-stat-card">
                    <div className="qr-stat-icon active">
                        <CheckCircle size={24} />
                    </div>
                    <div className="qr-stat-content">
                        <span className="qr-stat-value">{batches.length}</span>
                        <span className="qr-stat-label">Total Batches</span>
                    </div>
                </div>
                <div className="qr-stat-card">
                    <div className="qr-stat-icon scans">
                        <Package size={24} />
                    </div>
                    <div className="qr-stat-content">
                        <span className="qr-stat-value">{batchesWithoutQR.length}</span>
                        <span className="qr-stat-label">Need QR Code</span>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="qr-toolbar">
                <div className="search-box">
                    <Search size={20} />
                    <input
                        type="text"
                        placeholder="Search by batch ID or product..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* QR Grid */}
            {filteredQRs.length === 0 ? (
                <div className="empty-state">
                    <QrCode size={48} />
                    <h3>No QR Codes Yet</h3>
                    <p>Generate a QR code for your batches to enable product verification.</p>
                    {user?.role?.toLowerCase() !== 'consumer' && (
                        <button className="btn btn-primary" onClick={() => setShowGenerateModal(true)}>
                            <Plus size={18} />
                            Generate First QR
                        </button>
                    )}
                </div>
            ) : (
                <div className="qr-grid">
                    {filteredQRs.map((qr) => (
                        <div key={qr.id} className="qr-card">
                            <div className="qr-card-header">
                                <span className="qr-status-badge active">Active</span>
                            </div>

                            <div className="qr-card-body">
                                <div className="qr-preview" id={`qr-${qr.batchId}`}>
                                    <QRCodeSVG
                                        value={qr.url}
                                        size={140}
                                        level="H"
                                        includeMargin={true}
                                    />
                                </div>

                                <div className="qr-info">
                                    <span className="qr-batch-id font-mono">{qr.batchId}</span>
                                    <span className="qr-product">{qr.product}</span>
                                </div>

                                <div className="qr-meta">
                                    <div className="qr-meta-item">
                                        <Clock size={14} />
                                        <span>{new Date(qr.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="qr-card-actions">
                                <button
                                    className="action-btn"
                                    onClick={() => setSelectedQR(qr)}
                                    title="View Details"
                                >
                                    <Eye size={18} />
                                </button>
                                <button
                                    className="action-btn"
                                    onClick={() => downloadQR(qr.batchId)}
                                    title="Download"
                                >
                                    <Download size={18} />
                                </button>
                                <button
                                    className={`action-btn ${copySuccess === qr.id ? 'success' : ''}`}
                                    onClick={() => copyUrl(qr.id, qr.url)}
                                    title="Copy URL"
                                >
                                    {copySuccess === qr.id ? <CheckCircle size={18} /> : <Copy size={18} />}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* QR Detail Modal */}
            {selectedQR && (
                <div className="modal-overlay" onClick={() => setSelectedQR(null)}>
                    <div className="modal-content qr-detail-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>QR Code Details</h3>
                            <button className="modal-close" onClick={() => setSelectedQR(null)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="qr-detail-grid">
                                <div className="qr-detail-preview">
                                    <QRCodeSVG
                                        value={selectedQR.url}
                                        size={200}
                                        level="H"
                                        includeMargin={true}
                                    />
                                </div>
                                <div className="qr-detail-info">
                                    <div className="detail-row">
                                        <span className="label">Batch ID</span>
                                        <span className="value font-mono">{selectedQR.batchId}</span>
                                    </div>
                                    <div className="detail-row">
                                        <span className="label">Product</span>
                                        <span className="value">{selectedQR.product}</span>
                                    </div>
                                    <div className="detail-row">
                                        <span className="label">Status</span>
                                        <span className="qr-status-badge active">Active</span>
                                    </div>
                                    <div className="detail-row">
                                        <span className="label">Created</span>
                                        <span className="value">{new Date(selectedQR.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="qr-url-box">
                                <label>Verification URL</label>
                                <div className="url-row">
                                    <code>{selectedQR.url}</code>
                                    <button
                                        className="btn btn-ghost btn-sm"
                                        onClick={() => copyUrl(selectedQR.id, selectedQR.url)}
                                        title={copySuccess === selectedQR.id ? "Copied!" : "Copy URL"}
                                    >
                                        {copySuccess === selectedQR.id ? <CheckCircle size={16} className="text-green-500" /> : <Copy size={16} />}
                                    </button>
                                </div>
                            </div>

                            <div className="qr-detail-actions">
                                <button className="btn btn-primary" onClick={() => downloadQR(selectedQR.batchId)}>
                                    <Download size={18} />
                                    Download PNG
                                </button>
                                <Link
                                    to={`/dashboard/batches/${selectedQR.id}`}
                                    className="btn btn-outline"
                                >
                                    <Package size={18} />
                                    View Batch
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Generate QR Modal */}
            {showGenerateModal && (
                <div className="modal-overlay" onClick={() => setShowGenerateModal(false)}>
                    <div className="modal-content generate-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Generate QR Code</h3>
                            <button className="modal-close" onClick={() => setShowGenerateModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="generate-form">
                                <label>Select Batch</label>
                                {batchesWithoutQR.length === 0 ? (
                                    <div className="no-batches-message">
                                        <Package size={24} />
                                        <p>All batches already have QR codes!</p>
                                        <Link to="/dashboard/batches/create" className="btn btn-outline btn-sm">
                                            Create New Batch
                                        </Link>
                                    </div>
                                ) : (
                                    <>
                                        <select
                                            className="input select"
                                            value={selectedBatchId}
                                            onChange={(e) => setSelectedBatchId(e.target.value)}
                                        >
                                            <option value="">Choose a batch...</option>
                                            {batchesWithoutQR.map(batch => (
                                                <option key={batch.id} value={batch.id}>
                                                    {batch.batchId} - {batch.product}
                                                </option>
                                            ))}
                                        </select>

                                        <div className="generate-info">
                                            <p>The QR code will link to a public verification page showing:</p>
                                            <ul>
                                                <li>✓ Product details and origin</li>
                                                <li>✓ Supply chain journey</li>
                                                <li>✓ Blockchain verification</li>
                                            </ul>
                                        </div>

                                        <button
                                            className="btn btn-primary btn-full"
                                            onClick={handleGenerateQR}
                                            disabled={!selectedBatchId || isGenerating}
                                        >
                                            {isGenerating ? (
                                                <>
                                                    <Loader size={18} className="spinner" />
                                                    Generating...
                                                </>
                                            ) : (
                                                <>
                                                    <QrCode size={18} />
                                                    Generate QR Code
                                                </>
                                            )}
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QRManagementPage;
