import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Send,
    Package,
    Users,
    Building2,
    CheckCircle,
    Loader,
    AlertTriangle,
    ArrowLeft
} from 'lucide-react';
import './BatchSplitPage.css'; // Reuse existing styles

interface Batch {
    id: string;
    batchId: string;
    product: string;
    weight: number;
    weightUnit: string;
    status: string;
}

interface Recipient {
    id: number;
    name: string;
    email: string;
    role: string;
    organization?: string;
}

const handoffTypes = [
    { value: 'pickup', label: 'Pickup', description: 'Farmer → Processor/Distributor' },
    { value: 'processing_start', label: 'Processing Start', description: 'Start processing batch' },
    { value: 'processing_complete', label: 'Processing Complete', description: 'Finished processing' },
    { value: 'delivery', label: 'Delivery', description: 'Ship to next destination' },
    { value: 'retail_receive', label: 'Retail Receive', description: 'Retailer receives batch' },
    { value: 'sold', label: 'Sold to Consumer', description: 'Final sale to consumer' },
];

const TransferPage = () => {
    const navigate = useNavigate();
    const [batches, setBatches] = useState<Batch[]>([]);
    const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);
    const [recipients, setRecipients] = useState<Recipient[]>([]);
    const [selectedRecipient, setSelectedRecipient] = useState<number | null>(null);
    const [handoffType, setHandoffType] = useState('pickup');
    const [notes, setNotes] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const getToken = () => {
        try {
            return localStorage.getItem('FARMETRA_token');
        } catch {
            return null;
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        const token = getToken();
        if (!token) {
            setError('Please log in');
            setIsLoading(false);
            return;
        }

        try {
            // Load batches
            const batchRes = await fetch('http://localhost:5000/batch', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const batchData = await batchRes.json();
            if (batchData.success) {
                setBatches(batchData.batches || []);
            }

            // Load recipients
            const recipientRes = await fetch('http://localhost:5000/handoff/available-recipients', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const recipientData = await recipientRes.json();
            if (recipientData.success) {
                setRecipients(recipientData.recipients || []);
            }
        } catch (err) {
            setError('Failed to load data');
        } finally {
            setIsLoading(false);
        }
    };

    const toggleBatch = (id: string) => {
        setSelectedBatchIds(prev =>
            prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]
        );
    };

    const selectAll = () => {
        if (selectedBatchIds.length === batches.length) {
            setSelectedBatchIds([]);
        } else {
            setSelectedBatchIds(batches.map(b => b.id));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedBatchIds.length === 0) {
            setError('Please select at least one batch');
            return;
        }
        if (!selectedRecipient) {
            setError('Please select a recipient');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        const token = getToken();
        let successCount = 0;

        for (const batchId of selectedBatchIds) {
            try {
                const response = await fetch(`http://localhost:5000/handoff/${batchId}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        toUserId: selectedRecipient,
                        handoffType,
                        notes: notes || undefined
                    })
                });
                const data = await response.json();
                if (data.success) successCount++;
            } catch (err) {
                console.error(`Failed to transfer batch ${batchId}`);
            }
        }

        setIsSubmitting(false);

        if (successCount > 0) {
            setSuccess(true);
            setTimeout(() => navigate('/dashboard/batches'), 2000);
        } else {
            setError('Transfer failed');
        }
    };

    if (isLoading) {
        return (
            <div className="batch-split-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                <Loader size={40} className="spinner" />
            </div>
        );
    }

    if (success) {
        return (
            <div className="batch-split-page">
                <div className="success-screen">
                    <div className="success-icon">
                        <CheckCircle size={64} />
                    </div>
                    <h2>Transfer Successful!</h2>
                    <p>{selectedBatchIds.length} batch(es) transferred</p>
                </div>
            </div>
        );
    }

    return (
        <div className="batch-split-page">
            <div className="split-header">
                <button className="back-btn" onClick={() => navigate(-1)}>
                    <ArrowLeft size={20} />
                    Back
                </button>
                <div className="split-header-content">
                    <h1>Transfer Batches</h1>
                    <p>Select batches to transfer to another custodian</p>
                </div>
            </div>

            {error && (
                <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#b91c1c' }}>
                    <AlertTriangle size={18} />
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                {/* Batch Selection */}
                <div className="child-batches-section" style={{ marginBottom: '24px' }}>
                    <div className="section-header">
                        <h3><Package size={20} /> Select Batches ({selectedBatchIds.length} selected)</h3>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={selectAll}>
                            {selectedBatchIds.length === batches.length ? 'Deselect All' : 'Select All'}
                        </button>
                    </div>

                    {batches.length === 0 ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                            <Package size={32} />
                            <p>No batches available for transfer</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: '8px', maxHeight: '300px', overflowY: 'auto', padding: '4px' }}>
                            {batches.map(batch => (
                                <div
                                    key={batch.id}
                                    onClick={() => toggleBatch(batch.id)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        padding: '12px 16px',
                                        background: selectedBatchIds.includes(batch.id) ? '#dcfce7' : '#f9fafb',
                                        border: selectedBatchIds.includes(batch.id) ? '2px solid #22c55e' : '1px solid #e5e7eb',
                                        borderRadius: '10px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedBatchIds.includes(batch.id)}
                                        onChange={() => { }}
                                        style={{ width: '18px', height: '18px', accentColor: '#22c55e' }}
                                    />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: '13px' }}>{batch.batchId}</div>
                                        <div style={{ fontSize: '14px', color: '#374151' }}>{batch.product}</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontWeight: 600 }}>{batch.weight} {batch.weightUnit}</div>
                                        <div style={{ fontSize: '12px', color: '#6b7280', textTransform: 'capitalize' }}>{batch.status}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Handoff Type */}
                <div className="form-group" style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px' }}>Transfer Type</label>
                    <select
                        value={handoffType}
                        onChange={(e) => setHandoffType(e.target.value)}
                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px' }}
                    >
                        {handoffTypes.map(type => (
                            <option key={type.value} value={type.value}>
                                {type.label} - {type.description}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Recipient Selection */}
                <div className="form-group" style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px' }}>
                        <Users size={16} style={{ marginRight: '6px' }} />
                        Select Recipient
                    </label>
                    {recipients.length === 0 ? (
                        <div style={{ padding: '20px', textAlign: 'center', background: '#f9fafb', borderRadius: '8px', color: '#6b7280' }}>
                            No available recipients. Register users with the next role in the chain.
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: '8px' }}>
                            {recipients.map(recipient => (
                                <div
                                    key={recipient.id}
                                    onClick={() => setSelectedRecipient(recipient.id)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        padding: '14px 16px',
                                        background: selectedRecipient === recipient.id ? '#dbeafe' : '#f9fafb',
                                        border: selectedRecipient === recipient.id ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                                        borderRadius: '10px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '50%',
                                        background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'white',
                                        fontWeight: 600
                                    }}>
                                        {recipient.name.charAt(0)}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600 }}>{recipient.name}</div>
                                        <div style={{ fontSize: '13px', color: '#6b7280' }}>{recipient.role}</div>
                                        {recipient.organization && (
                                            <div style={{ fontSize: '12px', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Building2 size={12} /> {recipient.organization}
                                            </div>
                                        )}
                                    </div>
                                    {selectedRecipient === recipient.id && <CheckCircle size={20} color="#3b82f6" />}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Notes */}
                <div className="form-group" style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px' }}>Notes (Optional)</label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add any notes about this transfer..."
                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', minHeight: '80px', fontSize: '14px' }}
                    />
                </div>

                {/* Submit */}
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button type="button" className="btn btn-outline" onClick={() => navigate(-1)}>
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={isSubmitting || selectedBatchIds.length === 0 || !selectedRecipient}
                        style={{ flex: 1 }}
                    >
                        {isSubmitting ? (
                            <><Loader size={18} className="spinner" /> Transferring...</>
                        ) : (
                            <><Send size={18} /> Transfer {selectedBatchIds.length} Batch(es)</>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default TransferPage;
