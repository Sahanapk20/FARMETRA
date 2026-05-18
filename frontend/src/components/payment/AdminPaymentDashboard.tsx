import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Users, 
  CreditCard, 
  DollarSign, 
  Download,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  BarChart3,
  Activity
} from 'lucide-react';
import { getPaymentHistory } from '../../services/paymentService';

interface PaymentData {
  _id: string;
  transactionId: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethod: string;
  description: string;
  metadata: {
    serviceType: string;
    userRole?: string;
    [key: string]: any;
  };
  createdAt: string;
  completedAt?: string;
  refundedAt?: string;
}

interface AdminPaymentDashboardProps {
  onExportData?: (data: PaymentData[]) => void;
}

const AdminPaymentDashboard: React.FC<AdminPaymentDashboardProps> = ({ onExportData }) => {
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    status: 'all',
    serviceType: 'all',
    dateRange: '7days'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchPaymentData();
  }, [filters, currentPage]);

  const fetchPaymentData = async () => {
    try {
      setLoading(true);
      const response = await getPaymentHistory(currentPage, 20);
      
      if (response.success) {
        setPayments(response.payments);
        setTotalPages(response.pagination.pages);
      } else {
        setError('Failed to fetch payment data');
      }
    } catch (err: any) {
      setError(err.message || 'Error fetching payment data');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    const totalRevenue = payments
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0);
    
    const successfulPayments = payments.filter(p => p.status === 'completed').length;
    const pendingPayments = payments.filter(p => p.status === 'pending').length;
    const failedPayments = payments.filter(p => p.status === 'failed').length;
    const refundedPayments = payments.filter(p => p.status === 'refunded').length;

    const serviceTypeRevenue = payments
      .filter(p => p.status === 'completed')
      .reduce((acc: any, p) => {
        const serviceType = p.metadata?.serviceType || 'unknown';
        acc[serviceType] = (acc[serviceType] || 0) + p.amount;
        return acc;
      }, {});

    return {
      totalRevenue,
      totalTransactions: payments.length,
      successfulPayments,
      pendingPayments,
      failedPayments,
      refundedPayments,
      successRate: payments.length > 0 ? (successfulPayments / payments.length) * 100 : 0,
      serviceTypeRevenue
    };
  };

  const stats = calculateStats();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle size={16} style={{ color: '#10b981' }} />;
      case 'pending': return <Clock size={16} style={{ color: '#f59e0b' }} />;
      case 'failed': return <XCircle size={16} style={{ color: '#ef4444' }} />;
      case 'refunded': return <AlertTriangle size={16} style={{ color: '#6b7280' }} />;
      default: return <Clock size={16} style={{ color: '#6b7280' }} />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const handleExport = () => {
    if (onExportData) {
      onExportData(payments);
    }
  };

  if (loading) {
    return (
      <div className="wizard-card">
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <Activity size={48} className="animate-spin" style={{ color: '#10b981', marginBottom: '1rem' }} />
          <h3>Loading Payment Analytics...</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="wizard-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ margin: 0, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <BarChart3 size={24} />
          Payment Analytics Dashboard
        </h2>
        <button
          onClick={handleExport}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            background: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          <Download size={16} />
          Export Data
        </button>
      </div>

      {error && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          padding: '1rem',
          marginBottom: '1.5rem'
        }}>
          <span style={{ color: '#ef4444' }}>{error}</span>
        </div>
      )}

      {/* Stats Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '1rem', 
        marginBottom: '2rem' 
      }}>
        <div style={{ 
          background: '#f0fdf4', 
          padding: '1.5rem', 
          borderRadius: '8px', 
          border: '1px solid #10b981' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <DollarSign size={20} style={{ color: '#10b981' }} />
            <span style={{ color: '#6b7280', fontSize: '0.9rem' }}>Total Revenue</span>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10b981' }}>
            {formatAmount(stats.totalRevenue)}
          </div>
        </div>

        <div style={{ 
          background: '#eff6ff', 
          padding: '1.5rem', 
          borderRadius: '8px', 
          border: '1px solid #3b82f6' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <CreditCard size={20} style={{ color: '#3b82f6' }} />
            <span style={{ color: '#6b7280', fontSize: '0.9rem' }}>Total Transactions</span>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#3b82f6' }}>
            {stats.totalTransactions}
          </div>
        </div>

        <div style={{ 
          background: '#fef3c7', 
          padding: '1.5rem', 
          borderRadius: '8px', 
          border: '1px solid #f59e0b' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <TrendingUp size={20} style={{ color: '#f59e0b' }} />
            <span style={{ color: '#6b7280', fontSize: '0.9rem' }}>Success Rate</span>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f59e0b' }}>
            {stats.successRate.toFixed(1)}%
          </div>
        </div>

        <div style={{ 
          background: '#f3f4f6', 
          padding: '1.5rem', 
          borderRadius: '8px', 
          border: '1px solid #6b7280' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Users size={20} style={{ color: '#6b7280' }} />
            <span style={{ color: '#6b7280', fontSize: '0.9rem' }}>Active Users</span>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#6b7280' }}>
            {stats.successfulPayments}
          </div>
        </div>
      </div>

      {/* Payment Status Breakdown */}
      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1rem', color: '#1e293b' }}>Payment Status Breakdown</h3>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
          gap: '1rem' 
        }}>
          <div style={{ textAlign: 'center', padding: '1rem', background: '#f0fdf4', borderRadius: '8px' }}>
            <CheckCircle size={24} style={{ color: '#10b981', marginBottom: '0.5rem' }} />
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{stats.successfulPayments}</div>
            <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>Completed</div>
          </div>
          <div style={{ textAlign: 'center', padding: '1rem', background: '#fef3c7', borderRadius: '8px' }}>
            <Clock size={24} style={{ color: '#f59e0b', marginBottom: '0.5rem' }} />
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{stats.pendingPayments}</div>
            <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>Pending</div>
          </div>
          <div style={{ textAlign: 'center', padding: '1rem', background: '#fef2f2', borderRadius: '8px' }}>
            <XCircle size={24} style={{ color: '#ef4444', marginBottom: '0.5rem' }} />
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{stats.failedPayments}</div>
            <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>Failed</div>
          </div>
          <div style={{ textAlign: 'center', padding: '1rem', background: '#f3f4f6', borderRadius: '8px' }}>
            <AlertTriangle size={24} style={{ color: '#6b7280', marginBottom: '0.5rem' }} />
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{stats.refundedPayments}</div>
            <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>Refunded</div>
          </div>
        </div>
      </div>

      {/* Service Type Revenue */}
      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1rem', color: '#1e293b' }}>Revenue by Service Type</h3>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '1rem' 
        }}>
          {Object.entries(stats.serviceTypeRevenue).map(([serviceType, revenue]) => (
            <div key={serviceType} style={{ 
              padding: '1rem', 
              background: '#f9fafb', 
              borderRadius: '8px', 
              border: '1px solid #e5e7eb' 
            }}>
              <div style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                {serviceType.charAt(0).toUpperCase() + serviceType.slice(1)}
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#10b981' }}>
                {formatAmount(revenue as number)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Transactions Table */}
      <div>
        <h3 style={{ marginBottom: '1rem', color: '#1e293b' }}>Recent Transactions</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Transaction ID</th>
                <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Amount</th>
                <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Service</th>
                <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Status</th>
                <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {payments.slice(0, 10).map((payment) => (
                <tr key={payment._id}>
                  <td style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>
                      {payment.transactionId}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb', fontWeight: 'bold' }}>
                    {formatAmount(payment.amount)}
                  </td>
                  <td style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>
                    {payment.metadata?.serviceType || 'Unknown'}
                  </td>
                  <td style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {getStatusIcon(payment.status)}
                      <span style={{ 
                        textTransform: 'capitalize',
                        color: payment.status === 'completed' ? '#10b981' : 
                               payment.status === 'pending' ? '#f59e0b' : 
                               payment.status === 'failed' ? '#ef4444' : '#6b7280'
                      }}>
                        {payment.status}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb', fontSize: '0.9rem' }}>
                    {formatDate(payment.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminPaymentDashboard;
