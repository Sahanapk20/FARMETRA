// API Types for FARMETRA

export interface CertificationFile {
    certName: string;
    fileUrl: string;
    ipfsHash?: string;
    status: 'pending' | 'verified' | 'rejected';
    verifiedAt?: string;
}

export interface Batch {
    id: string;
    batchId: string;
    product: string;
    productType?: string;
    weight: number;
    weightUnit?: string;
    origin?: string;
    status: 'created' | 'in_transit' | 'processing' | 'split' | 'completed';
    createdAt: string;
    hasQR?: boolean;
    blockchainVerified?: boolean;
    ipfs?: string;  // IPFS CID
    parentBatchId?: number;  // Parent batch ID if this is a child
    childBatchCount?: number;  // Number of child batches
}

export interface BatchDetail {
    id: string;
    batchId: string;
    product: {
        name: string;
        type: string;
        variety?: string;
        description?: string;
    };
    weight: number;
    weightUnit: string;
    quantity?: number;
    quantityUnit?: string;
    status: string;
    origin: {
        farm: string;
        farmerId?: string;
        location: string;
        harvestDate?: string;
    };
    certifications?: Array<{
        name: string;
        issuer?: string;
        validUntil?: string;
        verified?: boolean;
    }>;
    certificationFiles?: CertificationFile[];
    certificationId?: string | null;
    blockchain: {
        hash: string;
        network?: string;
        timestamp?: string;
        blockNumber?: number;
        ipfsHash?: string | null;
        ipfsUrl?: string | null;
    };
    currentCustodian?: {
        name: string;
        role?: string;
        location?: string;
        since?: string;
    };
    events: BatchEvent[];
    childBatches?: Array<{
        id: number;
        batchId?: string;
        weight: number;
        status: string;
    }>;
    parentBatchId?: number;
    parentBatch?: {
        id: number;
        batchId?: string;
        product: string;
    };
    ipfs?: string;  // IPFS CID
    documents?: Array<{
        name: string;
        type: string;
        size: string;
        url: string;
    }>;
    qrScans?: number;
    lastScanned?: string;
    hasQR?: boolean;
    createdAt: string;
}

export interface BatchEvent {
    id: number;
    type: string;
    title: string;
    description: string;
    location: string;
    timestamp: string;
    actor: string;
    verified: boolean;
    txHash?: string;
    temperature?: string;
    humidity?: string;
    documents?: string[];
    photos?: string[];
}

export interface CreateBatchData {
    productName: string;
    productType: string;
    weight: string;
    weightUnit: string;
    farmName: string;
    location: string;
    harvestDate?: string;
    description?: string;
    certifications?: string[];
    certificationFiles?: Record<string, File>;
    certificationId?: string;
}

export interface AdminPendingCertification {
    id: string;
    batchId: string;
    productName: string;
    farmer: {
        id: string;
        name: string;
        organization?: string;
    };
    certifications: CertificationFile[];
    createdAt: string;
}

export interface AddEventData {
    eventType: string;
    description: string;
    location: string;
    timestamp: string;
    actor: string;
    temperature?: string;
    humidity?: string;
    notes?: string;
    documents?: File[];
    photos?: File[];
}

export interface QRCode {
    id: string;
    batchId: string;
    type: 'static' | 'dynamic';
    product: string;
    createdAt: string;
    scans: number;
    lastScanned: string | null;
    status: 'active' | 'used' | 'expired';
    url: string;
}

export interface DashboardStats {
    totalBatches: number;
    qrScans: number;
    verificationRate: number;
}

export interface CustodyChainItem {
    actor: string;
    role: string;
    organization?: string | null;
    action: string;
    timestamp: string;
    location: string;
    fromActor?: string;
    fromRole?: string;
}

export interface HandoffItem {
    id: number;
    type: string;
    from: {
        name: string;
        role: string;
        organization?: string | null;
    };
    to: {
        name: string;
        role: string;
        organization?: string | null;
    };
    timestamp: string;
    notes?: string;
    hash?: string;
}

export interface ChildBatchInfo {
    id: string;
    batchId: string;
    weight: number;
    weightUnit: string;
    location: string;
    status: string;
}

export interface ParentBatchInfo {
    id: string;
    batchId: string;
    productName: string;
    weight: number;
    weightUnit: string;
    createdBy: string;
}

export interface VerificationResult {
    batchId: string;
    isValid: boolean;
    blockchainVerified: boolean;
    product: {
        name: string;
        type: string;
        weight: number;
        unit: string;
        description?: string;
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
    journey: BatchEvent[];
    blockchain: {
        hash: string;
        network: string;
        timestamp: string;
        ipfsHash?: string | null;
        ipfsUrl?: string | null;
    };
    parentBatch?: ParentBatchInfo | null;
    childBatches?: ChildBatchInfo[];
    custodyChain?: CustodyChainItem[];
    handoffs?: HandoffItem[];
    createdAt?: string;
}

export interface ApiResponse<T> {
    success: boolean;
    error?: string;
    data?: T;
}

// ==================== CROP ANALYSIS TYPES ====================

export interface WeatherData {
    temperature: number;
    humidity: number;
    rainfall: number;
    condition: string;
    windSpeed: number;
    location: string;
}

export interface CropAnalysisResult {
    soilType: string;
    weather: WeatherData;
    disease: string;
    diseaseConfidence: number;
    recommendedCrops: string[];
    suggestions: string[];
    warnings: string[];
}

// ==================== MARKETPLACE TYPES ====================

export interface MarketProduct {
    id: string;
    name: string;
    description: string;
    price: number;
    quantity: number;
    unit: string;
    category: string;
    image?: string;
    isAvailable: boolean;
    retailer: { name: string; organization: string; location: string } | null;
    batch: { batchId: string; productName: string; status: string } | null;
    createdAt: string;
}

export interface MarketProductDetail extends MarketProduct {
    cropAnalysis: {
        soilType: string;
        weather: WeatherData;
        disease: string;
        diseaseConfidence: number;
        recommendedCrops: string[];
        suggestions: string[];
    } | null;
    timeline: Array<{
        step: string;
        role: string;
        actor: string;
        organization?: string;
        location?: string;
        timestamp: string;
        icon: string;
        details?: any;
    }>;
    events: Array<{
        id: string;
        type: string;
        description: string;
        location: string;
        timestamp: string;
        actor: string;
    }>;
}

export interface OrderItem {
    productId: string;
    quantity: number;
}

export interface PlaceOrderData {
    items: OrderItem[];
    customerName: string;
    customerEmail: string;
    customerPhone?: string;
    shippingAddress: {
        street?: string;
        city?: string;
        state?: string;
        pincode?: string;
    };
}

export interface CreateProductData {
    name: string;
    description?: string;
    price: number;
    quantity: number;
    unit?: string;
    category?: string;
    batchId: string;
    image?: string;
}

