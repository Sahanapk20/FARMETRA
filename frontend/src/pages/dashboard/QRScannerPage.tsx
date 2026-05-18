import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Camera,
    Upload,
    ArrowLeft,
    CheckCircle,
    XCircle,
    Package,
    MapPin,
    Calendar,
    AlertTriangle,
    Loader,
    RotateCcw
} from 'lucide-react';
import './QRScannerPage.css';

// Mock scan result
const mockScanResult = {
    found: true,
    batch: {
        id: '1',
        batchId: 'ORG-2024-0847',
        product: 'Organic Wheat',
        origin: 'Golden Valley Farms, Punjab',
        status: 'in_transit',
        weight: 500,
        unit: 'kg',
        currentLocation: 'Delhi Distribution Center',
        lastEvent: 'Shipped',
        lastEventTime: '2024-12-08T16:00:00Z',
    },
};

const QRScannerPage = () => {
    const navigate = useNavigate();
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [scanResult, setScanResult] = useState<typeof mockScanResult | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        return () => {
            // Cleanup camera on unmount
            if (videoRef.current?.srcObject) {
                const stream = videoRef.current.srcObject as MediaStream;
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const startCamera = async () => {
        setError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            });

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                setHasPermission(true);
                setIsScanning(true);

                // Simulate scan after 3 seconds
                setTimeout(() => {
                    simulateScan();
                }, 3000);
            }
        } catch (err) {
            console.error('Camera access denied:', err);
            setHasPermission(false);
            setError('Camera access denied. Please enable camera permissions.');
        }
    };

    const stopCamera = () => {
        if (videoRef.current?.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
        setIsScanning(false);
    };

    const simulateScan = () => {
        setIsProcessing(true);
        stopCamera();

        // Simulate API lookup
        setTimeout(() => {
            setIsProcessing(false);
            setScanResult(mockScanResult);
        }, 1500);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setIsProcessing(true);
            // Simulate processing QR from image
            setTimeout(() => {
                setIsProcessing(false);
                setScanResult(mockScanResult);
            }, 2000);
        }
    };

    const resetScanner = () => {
        setScanResult(null);
        setIsProcessing(false);
        setError(null);
    };

    const confirmReceipt = () => {
        // Navigate to add event page with pre-filled data
        navigate(`/dashboard/batches/${scanResult?.batch.id}/add-event?type=received`);
    };

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            created: 'badge-info',
            in_transit: 'badge-warning',
            processing: 'badge-primary',
            completed: 'badge-success',
        };
        return colors[status] || 'badge-neutral';
    };

    return (
        <div className="qr-scanner-page">
            {/* Header */}
            <div className="page-header">
                <button className="back-btn" onClick={() => navigate(-1)}>
                    <ArrowLeft size={20} />
                    Back
                </button>
                <div>
                    <h1 className="page-title">Scan QR Code</h1>
                    <p className="page-subtitle">Scan a product QR code to verify and log receipt</p>
                </div>
            </div>

            <div className="scanner-container">
                {/* Scanner View */}
                {!scanResult && !isProcessing && (
                    <div className="scanner-view">
                        {isScanning ? (
                            <div className="camera-container">
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    className="camera-feed"
                                />
                                <div className="scan-overlay">
                                    <div className="scan-frame">
                                        <div className="scan-corner top-left"></div>
                                        <div className="scan-corner top-right"></div>
                                        <div className="scan-corner bottom-left"></div>
                                        <div className="scan-corner bottom-right"></div>
                                        <div className="scan-line"></div>
                                    </div>
                                    <p className="scan-hint">Position QR code within the frame</p>
                                </div>
                                <button className="stop-scan-btn" onClick={stopCamera}>
                                    <XCircle size={20} />
                                    Stop Scanning
                                </button>
                            </div>
                        ) : (
                            <div className="scanner-start">
                                <div className="scanner-options">
                                    <button className="scanner-option-btn primary" onClick={startCamera}>
                                        <div className="option-icon">
                                            <Camera size={40} />
                                        </div>
                                        <span className="option-title">Scan with Camera</span>
                                        <span className="option-desc">Use device camera to scan QR</span>
                                    </button>

                                    <div className="option-divider">
                                        <span>or</span>
                                    </div>

                                    <label className="scanner-option-btn">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleFileUpload}
                                            hidden
                                        />
                                        <div className="option-icon">
                                            <Upload size={40} />
                                        </div>
                                        <span className="option-title">Upload Image</span>
                                        <span className="option-desc">Select a QR code image</span>
                                    </label>
                                </div>

                                {error && (
                                    <div className="scanner-error">
                                        <AlertTriangle size={20} />
                                        <span>{error}</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Processing State */}
                {isProcessing && (
                    <div className="processing-view">
                        <div className="processing-animation">
                            <Loader size={48} className="spinner" />
                        </div>
                        <h3>Processing QR Code</h3>
                        <p>Looking up batch information...</p>
                    </div>
                )}

                {/* Scan Result */}
                {scanResult && !isProcessing && (
                    <div className="scan-result">
                        {scanResult.found ? (
                            <>
                                <div className="result-header success">
                                    <div className="result-icon">
                                        <CheckCircle size={48} />
                                    </div>
                                    <h2>Product Verified</h2>
                                    <p>This product is authentic and registered</p>
                                </div>

                                <div className="result-card">
                                    <div className="result-batch-header">
                                        <div className="batch-icon">
                                            <Package size={24} />
                                        </div>
                                        <div className="batch-info">
                                            <span className="batch-id font-mono">{scanResult.batch.batchId}</span>
                                            <h3>{scanResult.batch.product}</h3>
                                        </div>
                                        <span className={`badge ${getStatusColor(scanResult.batch.status)}`}>
                                            {scanResult.batch.status.replace('_', ' ')}
                                        </span>
                                    </div>

                                    <div className="result-details">
                                        <div className="detail-item">
                                            <MapPin size={16} />
                                            <div>
                                                <span className="label">Origin</span>
                                                <span className="value">{scanResult.batch.origin}</span>
                                            </div>
                                        </div>
                                        <div className="detail-item">
                                            <Package size={16} />
                                            <div>
                                                <span className="label">Weight</span>
                                                <span className="value">{scanResult.batch.weight} {scanResult.batch.unit}</span>
                                            </div>
                                        </div>
                                        <div className="detail-item">
                                            <MapPin size={16} />
                                            <div>
                                                <span className="label">Current Location</span>
                                                <span className="value">{scanResult.batch.currentLocation}</span>
                                            </div>
                                        </div>
                                        <div className="detail-item">
                                            <Calendar size={16} />
                                            <div>
                                                <span className="label">Last Event</span>
                                                <span className="value">
                                                    {scanResult.batch.lastEvent} • {new Date(scanResult.batch.lastEventTime).toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="result-actions">
                                    <button className="btn btn-primary btn-lg" onClick={confirmReceipt}>
                                        <CheckCircle size={20} />
                                        Confirm Receipt
                                    </button>
                                    <button
                                        className="btn btn-outline btn-lg"
                                        onClick={() => navigate(`/dashboard/batches/${scanResult.batch.id}`)}
                                    >
                                        View Full Details
                                    </button>
                                </div>

                                <button className="scan-again-btn" onClick={resetScanner}>
                                    <RotateCcw size={16} />
                                    Scan Another
                                </button>
                            </>
                        ) : (
                            <>
                                <div className="result-header error">
                                    <div className="result-icon">
                                        <XCircle size={48} />
                                    </div>
                                    <h2>Product Not Found</h2>
                                    <p>This QR code is not registered in our system</p>
                                </div>

                                <div className="result-actions">
                                    <button className="btn btn-primary btn-lg" onClick={resetScanner}>
                                        <RotateCcw size={20} />
                                        Try Again
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default QRScannerPage;
