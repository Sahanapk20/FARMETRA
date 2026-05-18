import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    MapPin,
    Calendar,
    Clock,
    Upload,
    Camera,
    Thermometer,
    Droplets,
    User,
    FileText,
    CheckCircle,
    Loader
} from 'lucide-react';
import { addEvent } from '../../api/apiClient';
import { useAuth } from '../../context/AuthContext';
import './AddEventPage.css';

const eventTypes = [
    // Farmer events
    { value: 'harvested', label: 'Harvested', icon: '🌾', color: 'success', role: 'farmer', hint: 'Crop was harvested from field' },
    { value: 'quality_checked', label: 'Quality Check', icon: '✅', color: 'info', role: 'all', hint: 'Quality inspection done' },
    // Processor events
    { value: 'processed', label: 'Processed', icon: '🏭', color: 'primary', role: 'processor', hint: 'Raw material was processed' },
    { value: 'packaged', label: 'Packaged', icon: '📦', color: 'info', role: 'processor', hint: 'Products were packaged' },
    // Distributor events
    { value: 'shipped', label: 'Shipped', icon: '🚚', color: 'warning', role: 'distributor', hint: 'Sent to next location' },
    { value: 'received', label: 'Received', icon: '📥', color: 'success', role: 'all', hint: 'Received at new location' },
    // Storage events
    { value: 'stored', label: 'In Storage', icon: '🏪', color: 'primary', role: 'all', hint: 'Placed in cold/dry storage' },
    // Retailer events
    { value: 'sold', label: 'Sold', icon: '💰', color: 'success', role: 'retailer', hint: 'Sold to customer' },
    // Special events
    { value: 'split', label: 'Split Batch', icon: '🔀', color: 'blockchain', role: 'all', hint: 'Batch was divided' },
    { value: 'recalled', label: 'Recalled', icon: '⚠️', color: 'error', role: 'all', hint: 'Product recalled' },
];

const AddEventPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);

    const [formData, setFormData] = useState({
        eventType: '',
        description: '',
        location: '',
        timestamp: new Date().toISOString().slice(0, 16),
        actor: '',
        temperature: '',
        humidity: '',
        documents: [] as File[],
        photos: [] as File[],
        notes: '',
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    // Pre-populate location with user's organization and actor with user's name
    useEffect(() => {
        if (user) {
            setFormData(prev => ({
                ...prev,
                location: user.organization || prev.location,
                actor: user.name || prev.actor
            }));
        }
    }, [user]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'documents' | 'photos') => {
        const files = Array.from(e.target.files || []);
        setFormData(prev => ({
            ...prev,
            [type]: [...prev[type], ...files]
        }));
    };

    const removeFile = (type: 'documents' | 'photos', index: number) => {
        setFormData(prev => ({
            ...prev,
            [type]: prev[type].filter((_, i) => i !== index)
        }));
    };

    const validate = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.eventType) {
            newErrors.eventType = 'Please select an event type';
        }
        if (!formData.description.trim()) {
            newErrors.description = 'Description is required';
        }
        if (!formData.location.trim()) {
            newErrors.location = 'Location is required';
        }
        if (!formData.actor.trim()) {
            newErrors.actor = 'Actor/Handler name is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const [submitError, setSubmitError] = useState<string | null>(null);
    const [txHash, setTxHash] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validate()) return;
        if (!id) return;

        setIsSubmitting(true);
        setSubmitError(null);

        try {
            const result = await addEvent(id, {
                eventType: formData.eventType,
                description: formData.description,
                location: formData.location,
                timestamp: new Date(formData.timestamp).toISOString(),
                actor: formData.actor,
                temperature: formData.temperature,
                humidity: formData.humidity,
                notes: formData.notes,
                documents: formData.documents,
                photos: formData.photos
            });

            if (result.success) {
                setTxHash(result.event?.hash || '0x...');
                setSubmitSuccess(true);
                // Navigate back after showing success
                setTimeout(() => {
                    navigate(`/dashboard/batches/${id}`);
                }, 1500);
            } else {
                setSubmitError('Failed to add event');
            }
        } catch (error) {
            setSubmitError(error instanceof Error ? error.message : 'An error occurred');
        } finally {
            setIsSubmitting(false);
        }
    };

    const getCurrentLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setFormData(prev => ({
                        ...prev,
                        location: `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`
                    }));
                },
                (error) => {
                    console.error('Error getting location:', error);
                }
            );
        }
    };

    if (submitSuccess) {
        return (
            <div className="add-event-page">
                <div className="success-screen">
                    <div className="success-icon">
                        <CheckCircle size={64} />
                    </div>
                    <h2>Event Recorded Successfully</h2>
                    <p>The event has been logged and verified on the blockchain</p>
                    <div className="success-details">
                        <span className="tx-label">Transaction Hash</span>
                        <code className="tx-hash">{txHash || '0x...'}</code>
                    </div>
                    {submitError && <p style={{ color: '#ef4444' }}>{submitError}</p>}
                </div>
            </div>
        );
    }

    return (
        <div className="add-event-page">
            {/* Header */}
            <div className="page-header">
                <button className="back-btn" onClick={() => navigate(-1)}>
                    <ArrowLeft size={20} />
                    Back
                </button>
                <div>
                    <h1 className="page-title">Add Event</h1>
                    <p className="page-subtitle">Record a new traceability event for batch <span className="font-mono">{id}</span></p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="event-form">
                {/* Event Type Selection */}
                <div className="form-section">
                    <h3 className="section-title">Event Type</h3>
                    <p className="section-desc">Select the type of event you're recording</p>

                    <div className="event-type-grid">
                        {eventTypes.map((type) => (
                            <button
                                key={type.value}
                                type="button"
                                className={`event-type-card ${formData.eventType === type.value ? 'selected' : ''}`}
                                onClick={() => {
                                    setFormData(prev => ({ ...prev, eventType: type.value }));
                                    if (errors.eventType) setErrors(prev => ({ ...prev, eventType: '' }));
                                }}
                                title={type.hint}
                            >
                                <span className="event-type-icon">{type.icon}</span>
                                <span className="event-type-label">{type.label}</span>
                                <span className="event-type-hint">{type.hint}</span>
                            </button>
                        ))}
                    </div>
                    {errors.eventType && <span className="input-error-text">{errors.eventType}</span>}
                </div>

                {/* Event Details */}
                <div className="form-section">
                    <h3 className="section-title">Event Details</h3>

                    <div className="form-grid">
                        <div className="input-group full-width">
                            <label className="input-label">Description *</label>
                            <textarea
                                name="description"
                                className={`input textarea ${errors.description ? 'input-error' : ''}`}
                                placeholder="Describe what happened during this event..."
                                rows={3}
                                value={formData.description}
                                onChange={handleChange}
                            />
                            {errors.description && <span className="input-error-text">{errors.description}</span>}
                        </div>

                        <div className="input-group">
                            <label className="input-label">
                                <MapPin size={16} />
                                Location *
                            </label>
                            <div className="input-with-action">
                                <input
                                    type="text"
                                    name="location"
                                    className={`input ${errors.location ? 'input-error' : ''}`}
                                    placeholder="Enter location or use GPS"
                                    value={formData.location}
                                    onChange={handleChange}
                                />
                                <button
                                    type="button"
                                    className="input-action-btn"
                                    onClick={getCurrentLocation}
                                    title="Get current location"
                                >
                                    <MapPin size={18} />
                                </button>
                            </div>
                            {errors.location && <span className="input-error-text">{errors.location}</span>}
                        </div>

                        <div className="input-group">
                            <label className="input-label">
                                <Calendar size={16} />
                                Date & Time
                            </label>
                            <input
                                type="datetime-local"
                                name="timestamp"
                                className="input"
                                value={formData.timestamp}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="input-group full-width">
                            <label className="input-label">
                                <User size={16} />
                                Handler / Actor *
                            </label>
                            <input
                                type="text"
                                name="actor"
                                className={`input ${errors.actor ? 'input-error' : ''}`}
                                placeholder="Name of person or organization handling this event"
                                value={formData.actor}
                                onChange={handleChange}
                            />
                            {errors.actor && <span className="input-error-text">{errors.actor}</span>}
                        </div>
                    </div>
                </div>

                {/* Environmental Conditions (Optional) */}
                <div className="form-section">
                    <h3 className="section-title">Environmental Conditions <span className="optional">(Optional)</span></h3>
                    <p className="section-desc">Record temperature and humidity if applicable</p>

                    <div className="form-grid">
                        <div className="input-group">
                            <label className="input-label">
                                <Thermometer size={16} />
                                Temperature
                            </label>
                            <div className="input-addon-group">
                                <input
                                    type="number"
                                    name="temperature"
                                    className="input"
                                    placeholder="e.g., 24"
                                    value={formData.temperature}
                                    onChange={handleChange}
                                />
                                <span className="input-addon">°C</span>
                            </div>
                        </div>

                        <div className="input-group">
                            <label className="input-label">
                                <Droplets size={16} />
                                Humidity
                            </label>
                            <div className="input-addon-group">
                                <input
                                    type="number"
                                    name="humidity"
                                    className="input"
                                    placeholder="e.g., 45"
                                    value={formData.humidity}
                                    onChange={handleChange}
                                />
                                <span className="input-addon">%</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Attachments */}
                <div className="form-section">
                    <h3 className="section-title">Attachments <span className="optional">(Optional)</span></h3>

                    <div className="attachments-grid">
                        <div className="attachment-box">
                            <label className="upload-area">
                                <input
                                    type="file"
                                    accept=".pdf,.doc,.docx"
                                    multiple
                                    onChange={(e) => handleFileChange(e, 'documents')}
                                    hidden
                                />
                                <FileText size={32} />
                                <span className="upload-title">Upload Documents</span>
                                <span className="upload-desc">PDF, DOC files</span>
                            </label>
                            {formData.documents.length > 0 && (
                                <div className="file-list">
                                    {formData.documents.map((file, index) => (
                                        <div key={index} className="file-item">
                                            <FileText size={16} />
                                            <span>{file.name}</span>
                                            <button type="button" onClick={() => removeFile('documents', index)}>×</button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="attachment-box">
                            <label className="upload-area">
                                <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={(e) => handleFileChange(e, 'photos')}
                                    hidden
                                />
                                <Camera size={32} />
                                <span className="upload-title">Upload Photos</span>
                                <span className="upload-desc">JPG, PNG images</span>
                            </label>
                            {formData.photos.length > 0 && (
                                <div className="file-list">
                                    {formData.photos.map((file, index) => (
                                        <div key={index} className="file-item">
                                            <Camera size={16} />
                                            <span>{file.name}</span>
                                            <button type="button" onClick={() => removeFile('photos', index)}>×</button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Additional Notes */}
                <div className="form-section">
                    <div className="input-group">
                        <label className="input-label">Additional Notes</label>
                        <textarea
                            name="notes"
                            className="input textarea"
                            placeholder="Any additional information about this event..."
                            rows={2}
                            value={formData.notes}
                            onChange={handleChange}
                        />
                    </div>
                </div>

                {/* Blockchain Notice */}
                <div className="blockchain-notice">
                    <div className="notice-icon">🔗</div>
                    <div className="notice-content">
                        <strong>Blockchain Recording</strong>
                        <p>This event will be permanently recorded on the blockchain and cannot be modified after submission.</p>
                    </div>
                </div>

                {/* Actions */}
                <div className="form-actions">
                    <button
                        type="button"
                        className="btn btn-outline btn-lg"
                        onClick={() => navigate(-1)}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className={`btn btn-primary btn-lg ${isSubmitting ? 'btn-loading' : ''}`}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader size={20} className="spinner" />
                                Recording on Blockchain...
                            </>
                        ) : (
                            <>
                                <CheckCircle size={20} />
                                Record Event
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AddEventPage;
