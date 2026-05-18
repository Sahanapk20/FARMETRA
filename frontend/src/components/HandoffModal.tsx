import { useState, useEffect } from 'react';
import {
    X,
    Send,
    Users,
    Building2,
    CheckCircle,
    Loader,
    AlertTriangle
} from 'lucide-react';
import './HandoffModal.css';

interface Recipient {
    id: number;
    name: string;
    email: string;
    role: string;
    organization?: string;
}

interface HandoffModalProps {
    isOpen: boolean;
    onClose: () => void;
    batchId: string;
    batchName: string;
    onSuccess?: () => void;
}

const handoffTypes = [
    { value: 'pickup', label: 'Pickup', description: 'Farmer → Processor/Distributor' },
    { value: 'processing_start', label: 'Processing Start', description: 'Start processing batch' },
    { value: 'processing_complete', label: 'Processing Complete', description: 'Finished processing' },
    { value: 'delivery', label: 'Delivery', description: 'Ship to next destination' },
    { value: 'retail_receive', label: 'Retail Receive', description: 'Retailer receives batch' },
];

const HandoffModal = ({ isOpen, onClose, batchId, batchName, onSuccess }: HandoffModalProps) => {
    const [recipients, setRecipients] = useState<Recipient[]>([]);
    const [selectedRecipient, setSelectedRecipient] = useState<number | null>(null);
    const [handoffType, setHandoffType] = useState('pickup');
    const [notes, setNotes] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchRecipients();
            setSuccess(false);
            setError(null);
        }
    }, [isOpen]);

    const fetchRecipients = async () => {
        setIsLoading(true);
        setError(null);
        try {
            let token: string | null = null;
            try {
                token = localStorage.getItem('FARMETRA_token');
            } catch (e) {
                console.warn('localStorage blocked');
            }
            if (!token) {
                setError('Please log in to transfer batches');
                setIsLoading(false);
                return;
            }
            const response = await fetch('http://localhost:5000/handoff/available-recipients', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.status === 401) {
                setError('Session expired. Please log in again.');
                setIsLoading(false);
                return;
            }

            const data = await response.json();
            if (data.success) {
                setRecipients(data.recipients || []);
            } else {
                setError(data.error || 'Failed to fetch recipients');
            }
        } catch (err) {
            console.error('Handoff fetch error:', err);
            setError('Unable to connect. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedRecipient) {
            setError('Please select a recipient');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            let token: string | null = null;
            try {
                token = localStorage.getItem('FARMETRA_token');
            } catch (e) { /* ignore */ }
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

            if (data.success) {
                setSuccess(true);
                setTimeout(() => {
                    onClose();
                    onSuccess?.();
                }, 1500);
            } else {
                setError(data.error || 'Handoff failed');
            }
        } catch (err) {
            setError('Network error');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <div>
                        <h2>Transfer Batch Custody</h2>
                        <p className="modal-subtitle">{batchName}</p>
                    </div>
                    <button className="modal-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                {success ? (
                    <div className="success-state">
                        <CheckCircle size={48} />
                        <h3>Handoff Successful!</h3>
                        <p>The batch has been transferred to the new custodian.</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="modal-body">
                        {error && (
                            <div className="error-message">
                                <AlertTriangle size={18} />
                                {error}
                            </div>
                        )}

                        {/* Handoff Type */}
                        <div className="form-group">
                            <label>Handoff Type</label>
                            <select
                                value={handoffType}
                                onChange={(e) => setHandoffType(e.target.value)}
                                className="form-select"
                            >
                                {handoffTypes.map((type) => (
                                    <option key={type.value} value={type.value}>
                                        {type.label} - {type.description}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Recipient Selection */}
                        <div className="form-group">
                            <label>Select Recipient</label>
                            {isLoading ? (
                                <div className="loading-recipients">
                                    <Loader size={20} className="spinner" />
                                    Loading recipients...
                                </div>
                            ) : recipients.length === 0 ? (
                                <div className="no-recipients">
                                    <Users size={20} />
                                    <p>No available recipients found.</p>
                                    <span>Recipients must be registered with the appropriate role.</span>
                                </div>
                            ) : (
                                <div className="recipients-list">
                                    {recipients.map((recipient) => (
                                        <button
                                            key={recipient.id}
                                            type="button"
                                            className={`recipient-card ${selectedRecipient === recipient.id ? 'selected' : ''}`}
                                            onClick={() => setSelectedRecipient(recipient.id)}
                                        >
                                            <div className="recipient-avatar">
                                                {recipient.name.charAt(0)}
                                            </div>
                                            <div className="recipient-info">
                                                <span className="recipient-name">{recipient.name}</span>
                                                <span className="recipient-role">{recipient.role}</span>
                                                {recipient.organization && (
                                                    <span className="recipient-org">
                                                        <Building2 size={12} />
                                                        {recipient.organization}
                                                    </span>
                                                )}
                                            </div>
                                            {selectedRecipient === recipient.id && (
                                                <CheckCircle size={20} className="selected-check" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Notes */}
                        <div className="form-group">
                            <label>Notes (Optional)</label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Add any notes about this handoff..."
                                className="form-textarea"
                                rows={3}
                            />
                        </div>

                        {/* Actions */}
                        <div className="modal-actions">
                            <button type="button" className="btn btn-secondary" onClick={onClose}>
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={isSubmitting || !selectedRecipient}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader size={18} className="spinner" />
                                        Transferring...
                                    </>
                                ) : (
                                    <>
                                        <Send size={18} />
                                        Transfer Custody
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default HandoffModal;
