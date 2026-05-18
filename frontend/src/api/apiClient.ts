import type {
    Batch,
    BatchDetail,
    CreateBatchData,
    AddEventData,
    QRCode,
    DashboardStats,
    VerificationResult,
    BatchEvent,
    AdminPendingCertification
} from './types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Safe localStorage wrapper to handle blocked storage
function safeGetItem(key: string): string | null {
    try {
        return localStorage.getItem(key);
    } catch (error) {
        console.warn('localStorage access blocked:', error);
        return null;
    }
}

// Get auth token from localStorage
function getAuthToken(): string | null {
    return safeGetItem('FARMETRA_token');
}

// Generic fetch wrapper with error handling and auth
async function apiFetch<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const url = `${API_URL}${endpoint}`;
    const token = getAuthToken();

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
}

// ==================== BATCH API ====================

export async function fetchBatches(): Promise<Batch[]> {
    const result = await apiFetch<{ success: boolean; batches: Batch[] }>('/batch');
    return result.batches || [];
}

export async function fetchBatchById(id: string): Promise<BatchDetail | null> {
    try {
        const result = await apiFetch<{ success: boolean; batch: BatchDetail }>(`/batch/${id}`);
        return result.batch || null;
    } catch {
        return null;
    }
}

export async function createBatch(data: CreateBatchData): Promise<{ success: boolean; batch?: { id: string; batchId: string } }> {
    const formData = new FormData();
    formData.append('productName', data.productName);
    formData.append('productType', data.productType);
    formData.append('weight', data.weight);
    formData.append('weightUnit', data.weightUnit);
    formData.append('farmName', data.farmName);
    formData.append('location', data.location);
    if (data.harvestDate) formData.append('harvestDate', data.harvestDate);
    if (data.description) formData.append('description', data.description);
    if (data.certificationId) formData.append('certificationId', data.certificationId);

    // Add certifications list
    if (data.certifications) {
        data.certifications.forEach(cert => formData.append('certifications', cert));
    }

    // Add certification files
    if (data.certificationFiles) {
        Object.entries(data.certificationFiles).forEach(([certName, file]) => {
            formData.append(`cert-${certName}`, file);
        });
    }

    const token = getAuthToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${API_URL}/batch/create`, {
        method: 'POST',
        body: formData,
        headers,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to create batch' }));
        throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
}

export async function splitBatch(
    batchId: string,
    splits: Array<{ weight: number; destination?: string }>
): Promise<{ success: boolean; childBatches?: Array<{ id: string; batchId: string; weight: number }> }> {
    return apiFetch(`/batch/split/${batchId}`, {
        method: 'POST',
        body: JSON.stringify({ splits }),
    });
}

// ==================== EVENT API ====================

export async function fetchBatchEvents(batchId: string): Promise<BatchEvent[]> {
    try {
        const result = await apiFetch<{ success: boolean; events: BatchEvent[] }>(`/event/${batchId}`);
        return result.events || [];
    } catch {
        return [];
    }
}

export async function addEvent(
    batchId: string,
    data: AddEventData
): Promise<{ success: boolean; event?: { id: number; hash: string } }> {
    // Use FormData for file uploads
    const formData = new FormData();
    formData.append('eventType', data.eventType);
    formData.append('description', data.description);
    formData.append('location', data.location);
    formData.append('timestamp', data.timestamp);
    formData.append('actor', data.actor);

    if (data.temperature) formData.append('temperature', data.temperature);
    if (data.humidity) formData.append('humidity', data.humidity);
    if (data.notes) formData.append('notes', data.notes);

    if (data.documents) {
        data.documents.forEach(file => formData.append('documents', file));
    }
    if (data.photos) {
        data.photos.forEach(file => formData.append('photos', file));
    }

    const response = await fetch(`${API_URL}/event/add/${batchId}`, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        throw new Error('Failed to add event');
    }

    return response.json();
}

// ==================== QR CODE API ====================

export async function fetchQRCodes(): Promise<QRCode[]> {
    try {
        const result = await apiFetch<{ success: boolean; qrCodes: QRCode[] }>('/qr/list');
        return result.qrCodes || [];
    } catch {
        return [];
    }
}

export async function generateQRCode(
    batchId: string
): Promise<{ success: boolean; qrDataUrl?: string; verifyUrl?: string }> {
    return apiFetch(`/qr/generate/${batchId}`, {
        method: 'POST',
    });
}

// ==================== VERIFICATION API ====================

export async function verifyBatch(batchIdOrCode: string): Promise<VerificationResult | null> {
    try {
        // Try to find batch by QR code first, then by ID
        const result = await apiFetch<{
            success: boolean;
            batchHashValid?: boolean;
            eventChainValid?: boolean;
            batch?: any;
        }>(`/verify/batch/${batchIdOrCode}`);

        if (!result.batch) return null;

        const batch = result.batch;

        return {
            batchId: batch.batchId,
            isValid: result.batchHashValid || false,
            blockchainVerified: result.eventChainValid || false,
            product: {
                name: batch.product.name,
                type: batch.product.type,
                weight: batch.weight,
                unit: batch.weightUnit,
                description: batch.product.description,
            },
            origin: {
                farm: batch.origin.farm,
                location: batch.origin.location,
                harvestDate: batch.origin.harvestDate || batch.createdAt,
                farmerName: batch.origin.farmerName,
            },
            certifications: batch.certifications?.map((c: any) => c.name) || [],
            certificationId: batch.certificationId || null,
            journey: batch.events,
            blockchain: {
                hash: batch.blockchain.hash,
                network: batch.blockchain.network || 'IPFS (Pinata)',
                timestamp: batch.blockchain.timestamp || batch.createdAt,
                ipfsHash: batch.blockchain.ipfsHash || null,
                ipfsUrl: batch.blockchain.ipfsUrl || null,
            },
            parentBatch: batch.parentBatch || null,
            childBatches: batch.childBatches || [],
            custodyChain: batch.custodyChain || [],
            handoffs: batch.handoffs || [],
            createdAt: batch.createdAt,
        };
    } catch {
        return null;
    }
}

// ==================== DASHBOARD API ====================

interface PieDataItem {
    name: string;
    value: number;
    color: string;
}

interface ChartDataItem {
    name: string;
    batches: number;
    scans: number;
}

interface ActivityItem {
    id: string;
    type: string;
    message: string;
    time: string;
}

export async function fetchDashboardStats(): Promise<{
    stats: DashboardStats;
    recentBatches: Batch[];
    pieData?: PieDataItem[];
    chartData?: ChartDataItem[];
    recentActivity?: ActivityItem[];
}> {
    try {
        const result = await apiFetch<{
            success: boolean;
            stats: DashboardStats;
            recentBatches: Batch[];
            pieData?: PieDataItem[];
            chartData?: ChartDataItem[];
            recentActivity?: ActivityItem[];
        }>('/stats');

        return {
            stats: result.stats || { totalBatches: 0, qrScans: 0, verificationRate: 0 },
            recentBatches: result.recentBatches || [],
            pieData: result.pieData,
            chartData: result.chartData,
            recentActivity: result.recentActivity,
        };
    } catch {
        return {
            stats: { totalBatches: 0, qrScans: 0, verificationRate: 0 },
            recentBatches: [],
        };
    }
}

// ==================== ADMIN CERTIFICATION API ====================

export async function fetchPendingCertifications(): Promise<AdminPendingCertification[]> {
    const result = await apiFetch<{ success: boolean; batches: AdminPendingCertification[] }>('/admin/pending-certifications');
    return result.batches || [];
}

export async function verifyCertificate(
    batchId: string, 
    certName: string, 
    status: 'verified' | 'rejected'
): Promise<{ success: boolean; message: string }> {
    return apiFetch('/admin/verify-certificate', {
        method: 'POST',
        body: JSON.stringify({ batchId, certName, status }),
    });
}

// ==================== HANDOFF API ====================

export interface Recipient {
    id: number;
    name: string;
    email: string;
    role: string;
    organization: string | null;
}

export async function fetchAvailableRecipients(): Promise<Recipient[]> {
    try {
        const result = await apiFetch<{ success: boolean; recipients: Recipient[] }>('/handoff/available-recipients');
        return result.recipients || [];
    } catch {
        return [];
    }
}

export async function initiateHandoff(
    batchId: string,
    toUserId: number,
    handoffType: string,
    notes?: string
): Promise<{ success: boolean; handoff?: { id: number; hash: string } }> {
    return apiFetch(`/handoff/${batchId}`, {
        method: 'POST',
        body: JSON.stringify({ toUserId, handoffType, notes }),
    });
}

// ==================== CHAT API ====================

export interface ChatMessage {
    id: number;
    text: string;
    sender: 'user' | 'bot';
}

export async function sendChatMessage(
    message: string,
    history: ChatMessage[],
    location?: string,
    language?: string
): Promise<{ success: boolean; reply?: string; intent?: string; error?: string }> {
    try {
        const result = await apiFetch<{
            success: boolean;
            reply: string;
            intent?: string;
            detectedLocation?: string;
            detectedCrop?: string;
        }>('/chat', {
            method: 'POST',
            body: JSON.stringify({
                message,
                history,
                location,
                language
            }),
        });
        return { success: true, reply: result.reply, intent: result.intent };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to send message'
        };
    }
}

// ==================== CROP ANALYSIS API ====================

export async function analyzeCrop(data: {
    location: string;
    texture?: string;
    waterRetention?: string;
    color?: string;
    soilImage?: File;
    leafImage?: File;
}): Promise<{
    soilType: string;
    weather: { temperature: number; humidity: number; rainfall: number; condition: string; windSpeed: number; location: string };
    disease: string;
    diseaseConfidence: number;
    recommendedCrops: string[];
    suggestions: string[];
    warnings: string[];
}> {
    const formData = new FormData();
    formData.append('location', data.location);
    if (data.texture) formData.append('texture', data.texture);
    if (data.waterRetention) formData.append('waterRetention', data.waterRetention);
    if (data.color) formData.append('color', data.color);
    if (data.soilImage) formData.append('soilImage', data.soilImage);
    if (data.leafImage) formData.append('leafImage', data.leafImage);

    const token = getAuthToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${API_URL}/crop-analysis/analyze`, {
        method: 'POST',
        body: formData,
        headers,
    });

    if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: 'Analysis failed' }));
        throw new Error(errData.error || 'Analysis failed');
    }
    const result = await response.json();
    return result.result;
}

export async function detectSoil(data: { soilImage?: File; texture?: string; waterRetention?: string }): Promise<{ soilType: string; estimatedParams?: any }> {
    const formData = new FormData();
    if (data.soilImage) formData.append('soilImage', data.soilImage);
    if (data.texture) formData.append('texture', data.texture);
    if (data.waterRetention) formData.append('waterRetention', data.waterRetention);

    const token = getAuthToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${API_URL}/crop-analysis/soil-detect`, { method: 'POST', body: formData, headers });
    if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: 'Soil detection failed' }));
        throw new Error(errData.error || 'Soil detection failed');
    }
    return response.json();
}

export async function fetchCropRecommendation(data: {
    n: string;
    p: string;
    k: string;
    temperature: string;
    humidity: string;
    ph: string;
    rainfall: string;
}): Promise<{ recommendedCrop: string; recommendedCrops: string[]; avoidCrops: string[]; confidence: number; details: any }> {
    const token = getAuthToken();
    const headers: Record<string, string> = {
        'Content-Type': 'application/json'
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${API_URL}/crop-analysis/recommend-dataset`, { 
        method: 'POST', 
        body: JSON.stringify(data), 
        headers 
    });
    
    if (!response.ok) throw new Error('Recommendation failed');
    const result = await response.json();
    return result.result;
}

export async function detectDisease(leafImage: File): Promise<{ disease: string; confidence: number; explanation: string; recommendation: string; preventionTips: string; severity: string }> {
    const formData = new FormData();
    formData.append('leafImage', leafImage);

    const token = getAuthToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${API_URL}/crop-analysis/disease-detect`, { method: 'POST', body: formData, headers });
    if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: 'Disease detection failed' }));
        throw new Error(errData.error || 'Disease detection failed');
    }
    return response.json();
}

export async function fetchWeather(location: string): Promise<{
    temperature: number; humidity: number; rainfall: number;
    condition: string; windSpeed: number; location: string;
}> {
    const result = await apiFetch<{ success: boolean; weather: any }>(`/crop-analysis/weather/${encodeURIComponent(location)}`);
    return result.weather;
}

// ==================== MARKETPLACE API ====================

export async function fetchProducts(search?: string, category?: string): Promise<any[]> {
    let endpoint = '/marketplace/products';
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (category && category !== 'All') params.append('category', category);
    const qs = params.toString();
    if (qs) endpoint += `?${qs}`;

    const response = await fetch(`${API_URL}${endpoint}`);
    if (!response.ok) throw new Error('Failed to fetch products');
    const result = await response.json();
    return result.products || [];
}

export async function fetchProductById(id: string): Promise<any> {
    const response = await fetch(`${API_URL}/marketplace/products/${id}`);
    if (!response.ok) throw new Error('Failed to fetch product');
    const result = await response.json();
    return result.product;
}

export async function createProduct(data: {
    name: string; description?: string; price: number;
    quantity: number; unit?: string; category?: string; batchId: string;
}): Promise<{ success: boolean }> {
    return apiFetch('/marketplace/products', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export async function placeOrder(data: {
    items: Array<{ productId: string; quantity: number }>;
    customerName: string;
    customerEmail: string;
    customerPhone?: string;
    shippingAddress: { street?: string; city?: string; state?: string; pincode?: string };
}): Promise<{ orderId: string; totalAmount: number }> {
    const response = await fetch(`${API_URL}/marketplace/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to place order');
    const result = await response.json();
    return result.order;
}

export async function verifyProduct(batchId: string): Promise<any> {
    const response = await fetch(`${API_URL}/marketplace/verify/${batchId}`);
    if (!response.ok) throw new Error('Verification failed');
    const result = await response.json();
    return result.verification;
}

