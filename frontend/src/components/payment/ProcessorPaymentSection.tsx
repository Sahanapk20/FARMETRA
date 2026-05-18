import React, { useState } from 'react';
import { FlaskConical, TestTube, Package, Truck, CreditCard, CheckCircle, Loader2, X } from 'lucide-react';
import { createPaymentIntent, PaymentGateway } from '../../services/paymentService';

interface ProcessorPaymentSectionProps {
  batchData: any;
  onPaymentComplete: (transactionId: string) => void;
}

const ProcessorPaymentSection: React.FC<ProcessorPaymentSectionProps> = ({ 
  batchData, 
  onPaymentComplete 
}) => {
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);

  const processorServices = [
    {
      id: 'certification',
      title: 'Quality Certification',
      description: 'Official food safety and quality certification for processed products',
      amount: 300,
      unit: 'per batch',
      features: [
        'FSSAI certification',
        'Lab testing reports',
        'Nutritional analysis',
        'Shelf life testing',
        'Quality compliance certificate'
      ],
      icon: <FlaskConical size={24} />,
      recommended: true
    },
    {
      id: 'testing',
      title: 'Lab Testing',
      description: 'Comprehensive laboratory testing for quality assurance',
      amount: 150,
      unit: 'per sample',
      features: [
        'Pesticide residue testing',
        'Microbial analysis',
        'Heavy metal testing',
        'Nutritional content analysis',
        'Detailed test reports'
      ],
      icon: <TestTube size={24} />
    },
    {
      id: 'equipment',
      title: 'Processing Equipment',
      description: 'Access to professional food processing equipment',
      amount: 1000,
      unit: 'per day',
      features: [
        'Industrial grinders',
        'Mixing machines',
        'Packaging equipment',
        'Quality control tools',
        'Technical support'
      ],
      icon: <Package size={24} />
    },
    {
      id: 'packaging',
      title: 'Premium Packaging',
      description: 'Professional food-grade packaging solutions',
      amount: 50,
      unit: 'per unit',
      features: [
        'Food-grade materials',
        'Custom branding',
        'Tamper-proof seals',
        'Nutrition labels',
        'QR code integration'
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
      const service = processorServices.find(s => s.id === serviceId);
      if (!service) throw new Error('Invalid service selected');

      const paymentData = {
        amount: service.amount,
        description: `${service.title} - ${batchData?.batchId || 'Batch'} Processing`,
        metadata: {
          serviceType: 'marketplace' as const,
          relatedId: batchData?.id || 'batch_' + Date.now(),
          serviceCategory: serviceId,
          batchId: batchData?.batchId,
          unit: service.unit
        }
      };

      const response = await createPaymentIntent(paymentData);
      
      if (response.success) {
        setTransactionId(response.transactionId);

        const paymentResult = await PaymentGateway.processPayment(response.paymentIntent, {
          name: 'Processor User',
          description: paymentData.description,
          email: 'processor@example.com',
          contact: '9999999999'
        });

        if (paymentResult.success && paymentResult.paymentId) {
          const verifyResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/payments/verify`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('FARMETRA_token')}`
            },
            body: JSON.stringify({
              razorpay_order_id: response.paymentIntent.id,
              razorpay_payment_id: paymentResult.paymentId,
              razorpay_signature: 'dummy_signature',
              transactionId: response.transactionId
            })
          });

          const verifyResult = await verifyResponse.json();
          
          if (verifyResult.success) {
            setPaymentStatus('completed');
            setIsProcessing(false);
            onPaymentComplete(response.transactionId);
          } else {
            setError(verifyResult.error || 'Payment verification failed');
            setIsProcessing(false);
          }
        } else {
          setError(paymentResult.error || 'Payment failed');
          setIsProcessing(false);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Payment processing failed');
      setIsProcessing(false);
      setPaymentStatus('failed');
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
            Your processing service has been activated. Quality certification process will begin shortly.
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
          Processing Services
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
        Professional processing services to ensure quality and compliance for your agricultural products.
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
          {processorServices.map((service) => (
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

export default ProcessorPaymentSection;
