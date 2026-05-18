import React, { useState } from 'react';
import { Store, Megaphone, BarChart3, Truck, CreditCard, CheckCircle, Loader2, X } from 'lucide-react';
import { createPaymentIntent, PaymentGateway } from '../../services/paymentService';

interface RetailerPaymentSectionProps {
  storeData: any;
  onPaymentComplete: (transactionId: string) => void;
}

const RetailerPaymentSection: React.FC<RetailerPaymentSectionProps> = ({ 
  storeData, 
  onPaymentComplete 
}) => {
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);

  const retailerServices = [
    {
      id: 'premium-listing',
      title: 'Premium Product Listing',
      description: 'Featured placement in marketplace with enhanced visibility',
      amount: 50,
      unit: 'per product',
      features: [
        'Top search results placement',
        'Premium product badge',
        'Enhanced product gallery',
        'Priority customer support',
        'Detailed analytics dashboard'
      ],
      icon: <Store size={24} />,
      recommended: true
    },
    {
      id: 'marketing',
      title: 'Marketing Campaign',
      description: 'Professional marketing campaigns to boost your sales',
      amount: 200,
      unit: 'per campaign',
      features: [
        'Social media promotion',
        'Email marketing campaigns',
        'Banner advertisements',
        'Customer targeting',
        'Performance analytics'
      ],
      icon: <Megaphone size={24} />
    },
    {
      id: 'analytics',
      title: 'Store Analytics Pro',
      description: 'Advanced analytics and insights for your retail store',
      amount: 99,
      unit: 'per month',
      features: [
        'Sales trend analysis',
        'Customer behavior insights',
        'Inventory optimization',
        'Competitor analysis',
        'Custom reports'
      ],
      icon: <BarChart3 size={24} />
    },
    {
      id: 'delivery',
      title: 'Premium Delivery Setup',
      description: 'Professional delivery service setup for your store',
      amount: 500,
      unit: 'per month',
      features: [
        'Delivery fleet management',
        'Route optimization',
        'Real-time tracking',
        'Customer notifications',
        'Delivery analytics'
      ],
      icon: <Truck size={24} />
    }
  ];

  const handleServiceSelect = async (serviceId: string) => {
    setSelectedService(serviceId);
    setError(null);
    await initiatePayment(serviceId);
  };

  const initiatePayment = async (serviceId: string) => {
    setIsProcessing(true);
    setPaymentStatus('processing');

    try {
      const service = retailerServices.find(s => s.id === serviceId);
      if (!service) throw new Error('Invalid service selected');

      const paymentData = {
        amount: service.amount,
        description: `${service.title} - ${storeData?.storeName || 'Store'} Services`,
        metadata: {
          serviceType: 'marketplace' as const,
          relatedId: storeData?.id || 'store_' + Date.now(),
          serviceCategory: serviceId,
          storeId: storeData?.storeId,
          unit: service.unit
        }
      };

      const response = await createPaymentIntent(paymentData);
      
      if (response.success) {
        setTransactionId(response.transactionId);

        const paymentResult = await PaymentGateway.processPayment(response.paymentIntent, {
          name: 'Retailer User',
          description: paymentData.description,
          email: 'retailer@example.com',
          contact: '9999999999'
        });

        if (paymentResult.success) {
          alert('Payment successful!');
          onPaymentComplete(response.transactionId);
        } else {
          alert('Payment failed. Please try again.');
        }
      } else {
        alert('Failed to create payment intent. Please try again.');
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      setError(err.message || 'Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setSelectedService(null);
    setPaymentStatus(null);
    setError(null);
    setTransactionId(null);
  };

  if (paymentStatus === 'completed') {
    return (
      <div className="wizard-card" style={{ marginTop: '2rem' }}>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <CheckCircle size={64} style={{ color: '#10b981', marginBottom: '1rem' }} />
          <h2 style={{ color: '#10b981', marginBottom: '1rem' }}>Payment Successful!</h2>
          <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
            Your retail service has been activated. Enhanced features will be available shortly.
          </p>
          <div style={{ background: '#f0fdf4', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>
              <strong>Transaction ID:</strong> {transactionId}
            </p>
          </div>
          <button
            onClick={handleClose}
            style={{
              padding: '0.75rem 2rem',
              background: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="wizard-card" style={{ marginTop: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CreditCard size={24} />
          Retailer Services
        </h2>
        {selectedService && (
          <button
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0.5rem'
            }}
          >
            <X size={20} />
          </button>
        )}
      </div>

      <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
        Professional services to boost your retail store visibility and sales performance.
      </p>

      {error && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          padding: '1rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <span style={{ color: '#ef4444' }}>{error}</span>
        </div>
      )}

      {paymentStatus === 'processing' ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <Loader2 size={48} className="animate-spin" style={{ color: '#10b981', marginBottom: '1rem' }} />
          <h3>Processing Payment...</h3>
          <p style={{ color: '#6b7280' }}>Please wait while we process your payment securely.</p>
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
          gap: '1.5rem' 
        }}>
          {retailerServices.map((service) => (
            <div
              key={service.id}
              className={`payment-card ${service.recommended ? 'recommended' : ''} ${selectedService === service.id ? 'selected' : ''}`}
              onClick={!isProcessing ? () => handleServiceSelect(service.id) : undefined}
              style={{
                border: selectedService === service.id ? '2px solid #10b981' : '1px solid #e5e7eb',
                borderRadius: '12px',
                padding: '1.5rem',
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                position: 'relative',
                background: selectedService === service.id ? '#f0fdf4' : 'white'
              }}
            >
              {service.recommended && (
                <div
                  style={{
                    position: 'absolute',
                    top: '-10px',
                    right: '20px',
                    background: '#10b981',
                    color: 'white',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}
                >
                  RECOMMENDED
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ color: '#10b981', marginRight: '0.5rem' }}>
                  {service.icon}
                </div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold' }}>{service.title}</h3>
              </div>

              <p style={{ color: '#6b7280', marginBottom: '1rem', fontSize: '0.85rem' }}>
                {service.description}
              </p>

              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10b981', marginBottom: '1rem' }}>
                ₹{service.amount} <span style={{ fontSize: '0.9rem', color: '#6b7280', fontWeight: 'normal' }}>/ {service.unit}</span>
              </div>

              <ul style={{ listStyle: 'none', padding: 0, marginBottom: '1.5rem' }}>
                {service.features.map((feature, index) => (
                  <li key={index} style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <CheckCircle size={14} style={{ color: '#10b981', marginRight: '0.5rem' }} />
                    <span style={{ fontSize: '0.85rem' }}>{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                disabled={isProcessing}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: selectedService === service.id ? '1px solid #10b981' : '1px solid #d1d5db',
                  background: selectedService === service.id ? '#10b981' : 'white',
                  color: selectedService === service.id ? 'white' : '#374151',
                  fontWeight: 'bold',
                  cursor: isProcessing ? 'not-allowed' : 'pointer'
                }}
              >
                {isProcessing && selectedService === service.id ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Processing...
                  </>
                ) : selectedService === service.id ? (
                  <>
                    <CheckCircle size={16} />
                    Selected
                  </>
                ) : (
                  'Select Service'
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RetailerPaymentSection;
