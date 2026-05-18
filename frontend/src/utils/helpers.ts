// Format date to readable string
export const formatDate = (date: string | Date): string => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
};

// Format date with time
export const formatDateTime = (date: string | Date): string => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

// Format relative time (e.g., "2 hours ago")
export const formatRelativeTime = (date: string | Date): string => {
    const now = new Date();
    const d = new Date(date);
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return formatDate(date);
};

// Generate batch ID
export const generateBatchId = (prefix: string = 'B'): string => {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}-${year}-${random}`;
};

// Batch status type
export type BatchStatus = 'created' | 'in_transit' | 'processing' | 'split' | 'completed' | 'recalled';

// Event type
export type EventType = 'harvested' | 'stored' | 'processed' | 'quality_checked' | 'packaged' | 'shipped' | 'received' | 'split' | 'sold' | 'recalled';

// Get status color class
export const getStatusColor = (status: BatchStatus): string => {
    const colors: Record<BatchStatus, string> = {
        created: 'badge-info',
        in_transit: 'badge-warning',
        processing: 'badge-primary',
        split: 'badge-blockchain',
        completed: 'badge-success',
        recalled: 'badge-error',
    };
    return colors[status] || 'badge-neutral';
};

// Get status label
export const getStatusLabel = (status: BatchStatus): string => {
    const labels: Record<BatchStatus, string> = {
        created: 'Created',
        in_transit: 'In Transit',
        processing: 'Processing',
        split: 'Split',
        completed: 'Completed',
        recalled: 'Recalled',
    };
    return labels[status] || status;
};

// Get event type color
export const getEventTypeColor = (type: EventType): string => {
    const colors: Record<EventType, string> = {
        harvested: 'timeline-dot-success',
        stored: 'timeline-dot-info',
        processed: 'timeline-dot-primary',
        quality_checked: 'timeline-dot-info',
        packaged: 'timeline-dot-primary',
        shipped: 'timeline-dot-warning',
        received: 'timeline-dot-success',
        split: 'timeline-dot-blockchain',
        sold: 'timeline-dot-success',
        recalled: 'timeline-dot-error',
    };
    return colors[type] || '';
};

// Get event type label
export const getEventTypeLabel = (type: EventType): string => {
    const labels: Record<EventType, string> = {
        harvested: 'Harvested',
        stored: 'Stored',
        processed: 'Processed',
        quality_checked: 'Quality Checked',
        packaged: 'Packaged',
        shipped: 'Shipped',
        received: 'Received',
        split: 'Batch Split',
        sold: 'Sold',
        recalled: 'Recalled',
    };
    return labels[type] || type;
};

// Truncate blockchain hash for display
export const truncateHash = (hash: string, length: number = 8): string => {
    if (hash.length <= length * 2) return hash;
    return `${hash.slice(0, length)}...${hash.slice(-length)}`;
};

// Format weight with unit
export const formatWeight = (weight: number, unit: string): string => {
    return `${weight.toLocaleString()} ${unit}`;
};

// Format number with commas
export const formatNumber = (num: number): string => {
    return num.toLocaleString();
};

// Validate email
export const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

// Generate random color for avatars
export const generateAvatarColor = (name: string): string => {
    const colors = [
        '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6',
        '#ec4899', '#ef4444', '#06b6d4', '#84cc16'
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
};

// Get initials from name
export const getInitials = (name: string): string => {
    return name
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
};

// Debounce function
export const debounce = <T extends (...args: unknown[]) => unknown>(
    func: T,
    wait: number
): ((...args: Parameters<T>) => void) => {
    let timeout: ReturnType<typeof setTimeout>;
    return (...args: Parameters<T>) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
};

// Class name helper
export const cn = (...classes: (string | undefined | false | null)[]): string => {
    return classes.filter(Boolean).join(' ');
};
