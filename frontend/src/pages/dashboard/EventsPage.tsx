import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    History,
    Package,
    Truck,
    CheckCircle,
    AlertTriangle,
    Thermometer,
    MapPin,
    Calendar,
    Filter,
    Search,
    ChevronRight,
    Loader,
    RefreshCw
} from 'lucide-react';
import './EventsPage.css';

interface EventItem {
    id: number;
    batchId: number;
    batchName: string;
    type: string;
    description: string;
    location: string;
    timestamp: string;
    actor: string;
    temperature?: string;
    humidity?: string;
    verified: boolean;
}

const eventTypeConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
    harvest: { icon: <Package size={16} />, color: '#10b981', label: 'Harvest' },
    pickup: { icon: <Truck size={16} />, color: '#3b82f6', label: 'Pickup' },
    shipment: { icon: <Truck size={16} />, color: '#f59e0b', label: 'Shipment' },
    delivery: { icon: <CheckCircle size={16} />, color: '#10b981', label: 'Delivery' },
    processing: { icon: <RefreshCw size={16} />, color: '#8b5cf6', label: 'Processing' },
    quality_check: { icon: <CheckCircle size={16} />, color: '#06b6d4', label: 'Quality Check' },
    storage: { icon: <Package size={16} />, color: '#64748b', label: 'Storage' },
    handoff: { icon: <Truck size={16} />, color: '#ec4899', label: 'Handoff' },
    alert: { icon: <AlertTriangle size={16} />, color: '#ef4444', label: 'Alert' },
};

const EventsPage = () => {
    const [events, setEvents] = useState<EventItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('FARMETRA_token');
            const response = await fetch('http://localhost:5000/event/all', {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            const data = await response.json();
            if (data.success) {
                setEvents(data.events || []);
            } else {
                setError(data.error || 'Failed to fetch events');
            }
        } catch (err) {
            setError('Network error');
            console.error('Failed to fetch events:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const getEventConfig = (type: string) => {
        return eventTypeConfig[type.toLowerCase()] || {
            icon: <History size={16} />,
            color: '#64748b',
            label: type
        };
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const filteredEvents = events.filter(event => {
        const matchesSearch =
            event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            event.batchName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            event.actor.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = filterType === 'all' || event.type.toLowerCase() === filterType;
        return matchesSearch && matchesType;
    });

    // Group events by date
    const groupedEvents = filteredEvents.reduce((groups, event) => {
        const date = new Date(event.timestamp).toLocaleDateString('en-IN');
        if (!groups[date]) groups[date] = [];
        groups[date].push(event);
        return groups;
    }, {} as Record<string, EventItem[]>);

    if (isLoading) {
        return (
            <div className="events-page">
                <div className="loading-state">
                    <Loader size={40} className="spinner" />
                    <p>Loading events...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="events-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Events Timeline</h1>
                    <p className="page-subtitle">Track all supply chain events across your batches</p>
                </div>
                <button className="btn btn-outline" onClick={fetchEvents}>
                    <RefreshCw size={18} />
                    Refresh
                </button>
            </div>

            {/* Filters */}
            <div className="events-filters">
                <div className="search-box">
                    <Search size={20} />
                    <input
                        type="text"
                        placeholder="Search events, batches, actors..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="filter-group">
                    <Filter size={18} />
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                    >
                        <option value="all">All Events</option>
                        <option value="harvest">Harvest</option>
                        <option value="pickup">Pickup</option>
                        <option value="shipment">Shipment</option>
                        <option value="delivery">Delivery</option>
                        <option value="processing">Processing</option>
                        <option value="quality_check">Quality Check</option>
                        <option value="handoff">Handoff</option>
                    </select>
                </div>
            </div>

            {error && (
                <div className="error-message">
                    <AlertTriangle size={20} />
                    {error}
                </div>
            )}

            {/* Timeline */}
            <div className="events-timeline">
                {Object.keys(groupedEvents).length === 0 ? (
                    <div className="empty-state">
                        <History size={48} />
                        <h3>No events found</h3>
                        <p>Events will appear here as batches move through the supply chain.</p>
                    </div>
                ) : (
                    Object.entries(groupedEvents).map(([date, dayEvents]) => (
                        <div key={date} className="timeline-day">
                            <div className="timeline-date">
                                <Calendar size={16} />
                                <span>{date}</span>
                            </div>
                            <div className="timeline-events">
                                {dayEvents.map((event) => {
                                    const config = getEventConfig(event.type);
                                    return (
                                        <div key={event.id} className="timeline-event">
                                            <div
                                                className="event-icon"
                                                style={{ backgroundColor: `${config.color}20`, color: config.color }}
                                            >
                                                {config.icon}
                                            </div>
                                            <div className="event-content">
                                                <div className="event-header">
                                                    <span
                                                        className="event-type-badge"
                                                        style={{ backgroundColor: `${config.color}20`, color: config.color }}
                                                    >
                                                        {config.label}
                                                    </span>
                                                    <span className="event-time">
                                                        {formatDate(event.timestamp)}
                                                    </span>
                                                </div>
                                                <p className="event-description">{event.description}</p>
                                                <div className="event-meta">
                                                    <Link
                                                        to={`/dashboard/batches/${event.batchId}`}
                                                        className="event-batch"
                                                    >
                                                        <Package size={14} />
                                                        {event.batchName}
                                                        <ChevronRight size={14} />
                                                    </Link>
                                                    <span className="event-location">
                                                        <MapPin size={14} />
                                                        {event.location}
                                                    </span>
                                                    <span className="event-actor">
                                                        By: {event.actor}
                                                    </span>
                                                    {event.temperature && (
                                                        <span className="event-temp">
                                                            <Thermometer size={14} />
                                                            {event.temperature}°C
                                                        </span>
                                                    )}
                                                </div>
                                                {event.verified && (
                                                    <span className="verified-badge">
                                                        <CheckCircle size={12} />
                                                        Verified
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default EventsPage;
