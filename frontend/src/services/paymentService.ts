const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Safe localStorage wrapper
function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.warn('localStorage access blocked:', error);
    return null;
  }
}

// Get auth token
function getAuthToken(): string | null {
  return safeGetItem('FARMETRA_token');
}

// Generic API fetch with auth
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

// Payment types
export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: string;
  client_secret: string;
}

export interface PaymentMetadata {
  serviceType: 'analysis' | 'consultation' | 'marketplace' | 'insurance';
  relatedId: string;
  cropRecommendations?: string[];
  analysisType?: 'basic' | 'premium' | 'expert';
}

export interface CreatePaymentData {
  amount: number;
  currency?: string;
  description: string;
  metadata: PaymentMetadata;
}

export interface PaymentStatus {
  status: string;
  amount: number;
  currency: string;
  createdAt: string;
  completedAt?: string;
}

export interface PaymentRecord {
  _id: string;
  transactionId: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethod: string;
  description: string;
  metadata: PaymentMetadata;
  createdAt: string;
  completedAt?: string;
  refundedAt?: string;
}

// Payment API functions
export async function createPaymentIntent(data: CreatePaymentData): Promise<{
  success: boolean;
  paymentIntent: PaymentIntent;
  transactionId: string;
}> {
  return apiFetch('/payments/create-intent', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getPaymentStatus(transactionId: string): Promise<{
  success: boolean;
  status: PaymentStatus;
}> {
  return apiFetch(`/payments/${transactionId}/status`);
}

export async function getPaymentHistory(page = 1, limit = 10): Promise<{
  success: boolean;
  payments: PaymentRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}> {
  return apiFetch(`/payments/history?page=${page}&limit=${limit}`);
}

export async function processRefund(transactionId: string, reason: string): Promise<{
  success: boolean;
  message: string;
  refundAmount: number;
}> {
  return apiFetch('/payments/refund', {
    method: 'POST',
    body: JSON.stringify({ transactionId, reason }),
  });
}

// Razorpay payment gateway integration
export class PaymentGateway {
  static async processPayment(order: any, options: {
    name: string;
    description: string;
    email: string;
    contact: string;
  }): Promise<{
    success: boolean;
    paymentId?: string;
    error?: string;
  }> {
    return new Promise((resolve) => {
      // Load Razorpay script if not already loaded
      if (!(window as any).Razorpay) {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        script.onload = () => this.initiatePayment(order, options, resolve);
        script.onerror = () => resolve({
          success: false,
          error: 'Failed to load payment gateway. Please refresh and try again.'
        });
        document.body.appendChild(script);
      } else {
        this.initiatePayment(order, options, resolve);
      }
    });
  }

  private static initiatePayment(order: any, options: any, resolve: any) {
    const razorpay = new (window as any).Razorpay({
      key_id: order.keyId,
      amount: order.amount,
      currency: order.currency,
      name: 'FARMETRA',
      description: options.description,
      order_id: order.id,
      handler: async (response: any) => {
        resolve({
          success: true,
          paymentId: response.razorpay_payment_id
        });
      },
      prefill: {
        name: options.name,
        email: options.email,
        contact: options.contact
      },
      notes: {
        address: 'FARMETRA Agricultural Services'
      },
      theme: {
        color: '#10b981'
      },
      modal: {
        ondismiss: () => {
          resolve({
            success: false,
            error: 'Payment cancelled by user'
          });
        }
      }
    });

    razorpay.open();
  }

  static async confirmPayment(paymentId: string): Promise<{
    success: boolean;
    status?: string;
    error?: string;
  }> {
    // Razorpay handles payment confirmation automatically
    // The backend verification will confirm the payment
    return {
      success: true,
      status: 'completed'
    };
  }
}

// Real-time payment status monitoring
export class PaymentMonitor {
  private static intervals: Map<string, ReturnType<typeof setInterval>> = new Map();

  static startMonitoring(
    transactionId: string,
    onStatusChange: (status: PaymentStatus) => void,
    interval = 3000
  ): void {
    // Clear existing interval for this transaction
    this.stopMonitoring(transactionId);

    const intervalId = setInterval(async () => {
      try {
        const result = await getPaymentStatus(transactionId);
        if (result.success) {
          onStatusChange(result.status);
          
          // Stop monitoring if payment is completed or failed
          if (result.status.status === 'completed' || result.status.status === 'failed') {
            this.stopMonitoring(transactionId);
          }
        }
      } catch (error) {
        console.error('Payment monitoring error:', error);
      }
    }, interval);

    this.intervals.set(transactionId, intervalId);
  }

  static stopMonitoring(transactionId: string): void {
    const intervalId = this.intervals.get(transactionId);
    if (intervalId) {
      clearInterval(intervalId);
      this.intervals.delete(transactionId);
    }
  }
}

// Export payment utilities
export const PaymentUtils = {
  formatAmount: (amount: number, currency = 'INR'): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  },

  getStatusColor: (status: string): string => {
    switch (status) {
      case 'completed': return '#10b981';
      case 'pending': return '#f59e0b';
      case 'failed': return '#ef4444';
      case 'refunded': return '#6b7280';
      default: return '#6b7280';
    }
  },

  getStatusText: (status: string): string => {
    switch (status) {
      case 'completed': return 'Payment Successful';
      case 'pending': return 'Payment Pending';
      case 'processing': return 'Processing Payment';
      case 'failed': return 'Payment Failed';
      case 'refunded': return 'Payment Refunded';
      case 'cancelled': return 'Payment Cancelled';
      default: return 'Unknown Status';
    }
  }
};
