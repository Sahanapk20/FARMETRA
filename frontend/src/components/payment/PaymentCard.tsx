import React from 'react';
import { CreditCard, CheckCircle, Loader2 } from 'lucide-react';
import { PaymentUtils } from '../../services/paymentService';

interface PaymentCardProps {
  title: string;
  description: string;
  amount: number;
  currency?: string;
  features: string[];
  recommended?: boolean;
  onSelect: () => void;
  isLoading?: boolean;
  selected?: boolean;
}

const PaymentCard: React.FC<PaymentCardProps> = ({
  title,
  description,
  amount,
  currency = 'INR',
  features,
  recommended = false,
  onSelect,
  isLoading = false,
  selected = false
}) => {
  return (
    <div
      className={`payment-card ${recommended ? 'recommended' : ''} ${selected ? 'selected' : ''}`}
      onClick={!isLoading ? onSelect : undefined}
      style={{
        border: selected ? '2px solid #10b981' : '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '1.5rem',
        cursor: isLoading ? 'not-allowed' : 'pointer',
        transition: 'all 0.3s ease',
        position: 'relative',
        background: selected ? '#f0fdf4' : 'white'
      }}
    >
      {recommended && (
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
        <CreditCard size={24} style={{ color: '#10b981', marginRight: '0.5rem' }} />
        <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold' }}>{title}</h3>
      </div>

      <p style={{ color: '#6b7280', marginBottom: '1rem', fontSize: '0.9rem' }}>
        {description}
      </p>

      <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#10b981', marginBottom: '1rem' }}>
        {PaymentUtils.formatAmount(amount, currency)}
      </div>

      <ul style={{ listStyle: 'none', padding: 0, marginBottom: '1.5rem' }}>
        {features.map((feature, index) => (
          <li key={index} style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
            <CheckCircle size={16} style={{ color: '#10b981', marginRight: '0.5rem' }} />
            <span style={{ fontSize: '0.9rem' }}>{feature}</span>
          </li>
        ))}
      </ul>

      <button
        className={`payment-select-btn ${selected ? 'selected' : ''}`}
        disabled={isLoading}
        style={{
          width: '100%',
          padding: '0.75rem',
          borderRadius: '8px',
          border: selected ? '1px solid #10b981' : '1px solid #d1d5db',
          background: selected ? '#10b981' : 'white',
          color: selected ? 'white' : '#374151',
          fontWeight: 'bold',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem'
        }}
      >
        {isLoading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Processing...
          </>
        ) : selected ? (
          <>
            <CheckCircle size={16} />
            Selected
          </>
        ) : (
          'Select Plan'
        )}
      </button>
    </div>
  );
};

export default PaymentCard;
