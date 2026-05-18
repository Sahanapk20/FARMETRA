import React, { useState, useEffect } from 'react';
import { CreditCard, Lock, CheckCircle, AlertTriangle, Loader2, X } from 'lucide-react';
import {
  createPaymentIntent,
  PaymentGateway,
  PaymentMonitor
} from '../../services/paymentService';
import PaymentCard from './PaymentCard';

interface PaymentSectionProps {
  analysisData: any;
  onPaymentComplete: (transactionId: string) => void;
}

const PaymentSection: React.FC<PaymentSectionProps> = ({
  analysisData,
  onPaymentComplete
}) => {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);

  const paymentPlans = [
    {
      id: 'basic',
      title: 'Basic Report',
      description: 'Get detailed soil analysis and basic crop recommendations',
      amount: 99,
      features: [
        'Complete soil analysis report',
        'Top 5 recommended crops',
        'Basic weather insights',
        'PDF report download'
      ]
    },
    {
      id: 'premium',
      title: 'Premium Analysis',
      description: 'Advanced analysis with expert recommendations and 14-day forecast',
      amount: 299,
      features: [
        'Everything in Basic',
        'Expert farming recommendations',
        '14-day weather forecast',
        'Crop disease risk assessment',
        'Yield optimization tips',
        'Priority support'
      ],
      recommended: true
    },
    {
      id: 'expert',
      title: 'Expert Consultation',
      description: 'Premium analysis plus 1-on-1 consultation with farming expert',
      amount: 599,
      features: [
        'Everything in Premium',
        '30-minute expert consultation',
        'Customized farming calendar',
        'Market price insights',
        'Crop insurance recommendations',
        'Lifetime report access'
      ]
    }
  ];

  const handlePlanSelect = async (planId: string) => {
    setSelectedPlan(planId);
    setError(null);
    await initiatePayment(planId);
  };

  const initiatePayment = async (planId: string) => {
    setIsProcessing(true);
    setPaymentStatus('processing');

    try {
      const plan = paymentPlans.find(p => p.id === planId);
      if (!plan) throw new Error('Invalid plan selected');

      const paymentData = {
        amount: plan.amount,
        description: `${plan.title} - Smart Crop Analysis`,
        metadata: {
          serviceType: 'analysis' as const,
          relatedId: analysisData.id || 'analysis_' + Date.now(),
          cropRecommendations: analysisData.recommendedCrops || [],
          analysisType: planId as 'basic' | 'premium' | 'expert'
        }
      };

      const response = await createPaymentIntent(paymentData);

      if (response.success) {
        setTransactionId(response.transactionId);

        // Start monitoring payment status
        PaymentMonitor.startMonitoring(
          response.transactionId,
          (status) => {
            setPaymentStatus(status.status);
            if (status.status === 'completed') {
              setIsProcessing(false);
              onPaymentComplete(response.transactionId);
            } else if (status.status === 'failed') {
              setIsProcessing(false);
              setError('Payment failed. Please try again.');
            }
          }
        );

        // Process payment (mock - replace with real payment gateway)
        const paymentResult = await PaymentGateway.processPayment(
          response.paymentIntent,
          {
            name: 'User',
            description: paymentData.description,
            email: 'user@example.com',
            contact: '9999999999'
          }
        );

        if (paymentResult.success) {
          setPaymentStatus('completed');
          setIsProcessing(false);
          onPaymentComplete(response.transactionId);
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
    if (transactionId) {
      PaymentMonitor.stopMonitoring(transactionId);
    }
    setSelectedPlan(null);
    setPaymentStatus(null);
    setError(null);
    setTransactionId(null);
  };

  useEffect(() => {
    return () => {
      if (transactionId) {
        PaymentMonitor.stopMonitoring(transactionId);
      }
    };
  }, [transactionId]);

  if (paymentStatus === 'completed') {
    return (
      <div className="wizard-card" style={{ marginTop: '2rem' }}>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <CheckCircle size={64} style={{ color: '#10b981', marginBottom: '1rem' }} />
          <h2 style={{ color: '#10b981', marginBottom: '1rem' }}>Payment Successful!</h2>
          <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
            Your premium analysis report is being generated. You'll receive it shortly.
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
          Unlock Premium Features
        </h2>
        {selectedPlan && (
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
        Get detailed insights, expert recommendations, and advanced farming analytics to maximize your crop yield.
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
          <AlertTriangle size={20} style={{ color: '#ef4444' }} />
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
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1.5rem'
        }}>
          {paymentPlans.map((plan) => (
            <PaymentCard
              key={plan.id}
              title={plan.title}
              description={plan.description}
              amount={plan.amount}
              features={plan.features}
              recommended={plan.recommended}
              selected={selectedPlan === plan.id}
              isLoading={isProcessing && selectedPlan === plan.id}
              onSelect={() => handlePlanSelect(plan.id)}
            />
          ))}
        </div>
      )}

      <div style={{
        marginTop: '2rem',
        padding: '1rem',
        background: '#f9fafb',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
      }}>
        <Lock size={16} style={{ color: '#6b7280' }} />
        <span style={{ fontSize: '0.9rem', color: '#6b7280' }}>
          Your payment information is secure and encrypted. We use industry-standard security measures.
        </span>
      </div>
    </div>
  );
};

export default PaymentSection;
