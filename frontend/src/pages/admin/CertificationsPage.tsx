import { useState, useEffect } from 'react';
import {
    ShieldCheck,
    Search,
    FileText,
    CheckCircle,
    XCircle,
    ExternalLink,
    Loader,
    Eye,
    Calendar,
    User as UserIcon,
    Package
} from 'lucide-react';
import { fetchPendingCertifications, verifyCertificate } from '../../api/apiClient';
import type { AdminPendingCertification } from '../../api/types';
import '../dashboard/DashboardHome.css';

const CertificationsPage = () => {
    const [batches, setBatches] = useState<AdminPendingCertification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [verifying, setVerifying] = useState<string | null>(null);

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

    useEffect(() => {
        loadPendingCerts();
    }, []);

    const loadPendingCerts = async () => {
        try {
            const data = await fetchPendingCertifications();
            setBatches(data);
        } catch (error) {
            console.error('Failed to load pending certifications:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerify = async (batchId: string, certName: string, status: 'verified' | 'rejected') => {
        setVerifying(`${batchId}-${certName}`);
        try {
            const result = await verifyCertificate(batchId, certName, status);
            if (result.success) {
                // Update local state
                setBatches(prev => prev.map(b => {
                    if (b.id === batchId) {
                        return {
                            ...b,
                            certifications: b.certifications.filter(c => c.certName !== certName)
                        };
                    }
                    return b;
                }).filter(b => b.certifications.length > 0));
            }
        } catch (error) {
            console.error('Verification failed:', error);
        } finally {
            setVerifying(null);
        }
    };

    const filteredBatches = batches.filter(b =>
        b.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.farmer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.batchId.toLowerCase().includes(searchQuery.toLowerCase())
    );

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
                            <ShieldCheck size={28} style={{ marginRight: '12px', color: '#16a34a' }} />
                            Certification Verification
                        </h1>
                        <p className="page-subtitle">{batches.length} batches awaiting verification</p>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div style={{ marginBottom: '24px' }}>
                <div style={{ position: 'relative', maxWidth: '400px' }}>
                    <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                    <input
                        type="text"
                        placeholder="Search batches or farmers..."
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
            </div>

            {/* Batch List */}
            <div style={{ display: 'grid', gap: '24px' }}>
                {filteredBatches.map((batch) => (
                    <div key={batch.id} style={{ 
                        background: 'white', 
                        borderRadius: '16px', 
                        border: '1px solid #e5e7eb', 
                        padding: '24px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', borderBottom: '1px solid #f3f4f6', paddingBottom: '16px' }}>
                            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                <div style={{ 
                                    width: '48px', 
                                    height: '48px', 
                                    borderRadius: '12px', 
                                    background: '#f0fdf4', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center',
                                    color: '#16a34a'
                                }}>
                                    <Package size={24} />
                                </div>
                                <div>
                                    <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', margin: 0 }}>{batch.productName}</h3>
                                    <div style={{ display: 'flex', gap: '12px', marginTop: '4px', fontSize: '13px', color: '#6b7280' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <UserIcon size={14} /> {batch.farmer.name}
                                        </span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Calendar size={14} /> {new Date(batch.createdAt).toLocaleDateString()}
                                        </span>
                                        <span style={{ fontWeight: 600, color: '#3b82f6' }}>{batch.batchId}</span>
                                    </div>
                                </div>
                            </div>
                            <span style={{ 
                                padding: '4px 12px', 
                                borderRadius: '20px', 
                                background: '#fef3c7', 
                                color: '#d97706', 
                                fontSize: '12px', 
                                fontWeight: 700 
                            }}>
                                {batch.certifications.length} PENDING
                            </span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                            {batch.certifications.map((cert) => (
                                <div key={cert.certName} style={{ 
                                    border: '1px solid #f3f4f6', 
                                    borderRadius: '12px', 
                                    padding: '16px',
                                    background: '#f9fafb'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                                        <FileText size={20} color="#6b7280" />
                                        <span style={{ fontWeight: 600, fontSize: '15px' }}>{cert.certName}</span>
                                    </div>
                                    
                                    <div style={{ marginBottom: '16px' }}>
                                        <a 
                                            href={`${API_URL}${cert.fileUrl}`} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            style={{ 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                gap: '8px', 
                                                color: '#3b82f6', 
                                                fontSize: '13px', 
                                                textDecoration: 'none',
                                                fontWeight: 500,
                                                padding: '8px 12px',
                                                background: '#eff6ff',
                                                borderRadius: '8px',
                                                width: 'fit-content'
                                            }}
                                        >
                                            <Eye size={16} />
                                            View Document
                                            <ExternalLink size={14} />
                                        </a>
                                        {cert.ipfsHash && (
                                            <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '8px', fontFamily: 'monospace' }}>
                                                IPFS: {cert.ipfsHash.substring(0, 15)}...
                                            </p>
                                        )}
                                    </div>

                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                            disabled={verifying === `${batch.id}-${cert.certName}`}
                                            onClick={() => handleVerify(batch.id, cert.certName, 'verified')}
                                            style={{
                                                flex: 1,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '6px',
                                                padding: '8px',
                                                borderRadius: '8px',
                                                background: '#16a34a',
                                                color: 'white',
                                                border: 'none',
                                                fontSize: '13px',
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                opacity: verifying === `${batch.id}-${cert.certName}` ? 0.7 : 1
                                            }}
                                        >
                                            <CheckCircle size={14} />
                                            Approve
                                        </button>
                                        <button
                                            disabled={verifying === `${batch.id}-${cert.certName}`}
                                            onClick={() => handleVerify(batch.id, cert.certName, 'rejected')}
                                            style={{
                                                flex: 1,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '6px',
                                                padding: '8px',
                                                borderRadius: '8px',
                                                background: '#ef4444',
                                                color: 'white',
                                                border: 'none',
                                                fontSize: '13px',
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                opacity: verifying === `${batch.id}-${cert.certName}` ? 0.7 : 1
                                            }}
                                        >
                                            <XCircle size={14} />
                                            Reject
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                {filteredBatches.length === 0 && (
                    <div style={{ 
                        padding: '60px', 
                        textAlign: 'center', 
                        background: 'white', 
                        borderRadius: '16px', 
                        border: '1px dashed #e5e7eb',
                        color: '#6b7280'
                    }}>
                        <ShieldCheck size={48} style={{ margin: '0 auto 16px', color: '#d1d5db' }} />
                        <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#374151' }}>No pending certifications</h3>
                        <p style={{ marginTop: '4px' }}>All batch certifications have been processed.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CertificationsPage;
