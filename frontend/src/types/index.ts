// ========================================
// AGRI-LOGISTICS TYPE DEFINITIONS
// ========================================

// User & Authentication Types
export type UserRole = 'farmer' | 'processor' | 'distributor' | 'retailer' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  organization: string;
  avatar?: string;
  createdAt: string;
  verified: boolean;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Batch Types
export type BatchStatus = 'created' | 'in_transit' | 'processing' | 'split' | 'completed' | 'recalled';

export interface Batch {
  id: string;
  batchId: string; // Human-readable ID like "A-2025-001"
  productName: string;
  productType: string;
  quantity: number;
  unit: string;
  weight: number;
  weightUnit: string;
  origin: {
    farm: string;
    location: string;
    coordinates?: { lat: number; lng: number };
  };
  status: BatchStatus;
  parentBatchId?: string;
  childBatchIds?: string[];
  currentHolder: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  blockchainHash?: string;
  qrCode?: string;
  events: BatchEvent[];
  metadata?: Record<string, unknown>;
}

export interface CreateBatchInput {
  productName: string;
  productType: string;
  quantity: number;
  unit: string;
  weight: number;
  weightUnit: string;
  origin: {
    farm: string;
    location: string;
    coordinates?: { lat: number; lng: number };
  };
  metadata?: Record<string, unknown>;
}

export interface SplitBatchInput {
  parentBatchId: string;
  splits: {
    weight: number;
    notes?: string;
  }[];
}

// Event Types
export type EventType = 
  | 'harvested'
  | 'stored'
  | 'processed'
  | 'quality_checked'
  | 'packaged'
  | 'shipped'
  | 'received'
  | 'split'
  | 'sold'
  | 'recalled';

export interface BatchEvent {
  id: string;
  batchId: string;
  type: EventType;
  description: string;
  location: string;
  timestamp: string;
  performedBy: string;
  performedByName: string;
  blockchainHash?: string;
  documents?: Document[];
  metadata?: Record<string, unknown>;
}

export interface CreateEventInput {
  batchId: string;
  type: EventType;
  description: string;
  location: string;
  metadata?: Record<string, unknown>;
}

// Document Types
export interface Document {
  id: string;
  name: string;
  type: string;
  url: string;
  uploadedAt: string;
}

// QR Code Types
export interface QRCodeData {
  batchId: string;
  verificationUrl: string;
  generatedAt: string;
  expiresAt?: string;
}

export interface VerificationResult {
  isValid: boolean;
  batch: Batch | null;
  events: BatchEvent[];
  blockchainVerified: boolean;
  verifiedAt: string;
  message: string;
}

// Analytics Types
export interface DashboardStats {
  totalBatches: number;
  activeBatches: number;
  completedBatches: number;
  qrScans: number;
  batchesTrend: number; // percentage change
  successRate: number;
}

export interface ChartDataPoint {
  name: string;
  value: number;
  date?: string;
}

// Notification Types
export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Navigation Types
export interface NavItem {
  label: string;
  path: string;
  icon: string;
  roles?: UserRole[];
}

export interface SidebarSection {
  title: string;
  items: NavItem[];
}
