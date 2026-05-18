import { useState } from 'react';
import {
    CreditCard,
    Smartphone,
    Truck,
    CheckCircle,
    Shield,
    Lock,
    ArrowLeft,
    Loader2,
    Receipt,
    IndianRupee,
    QrCode,
    Calendar,
    User
} from 'lucide-react';
import './Payment.css';

// Payment method types
type PaymentMethod = 'upi' | 'card' | 'cod';

// Order item interface
interface OrderItem {
    id: string;
    name: string;
    quantity: number;
    price: number;
    image?: string;
}

// Payment state interface
interface PaymentState {
    method: PaymentMethod;
    upiId: string;
    cardNumber: string;
    cardExpiry: string;
    cardCvv: string;
    cardName: string;
    isProcessing: boolean;
    isSuccess: boolean;
    transactionId: string;
    error: string | null;
}

interface PaymentProps {
    amount?: number;
    items?: OrderItem[];
    onSuccess?: (transactionId: string) => void;
    onCancel?: () => void;
}

const Payment = ({ amount: propAmount, items: propItems, onSuccess, onCancel }: PaymentProps) => {
    // Payment state
    const [paymentState, setPaymentState] = useState<PaymentState>({
        method: 'upi',
        upiId: '',
        cardNumber: '',
        cardExpiry: '',
        cardCvv: '',
        cardName: '',
        isProcessing: false,
        isSuccess: false,
        transactionId: '',
        error: null,
    });

    // Calculate order totals
    const displayItems = propItems || [];
    const subtotal = displayItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const deliveryFee = subtotal > 500 || propAmount ? 0 : 50;
    const totalAmount = propAmount || (subtotal + deliveryFee);

    // Generate transaction ID
    const generateTransactionId = () => {
        const prefix = 'TXN';
        const timestamp = Date.now().toString().slice(-6);
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        return `${prefix}${timestamp}${random}`;
    };

    // Handle payment method selection
    const handleMethodChange = (method: PaymentMethod) => {
        setPaymentState(prev => ({ ...prev, method, error: null }));
    };

    // Handle input changes
    const handleInputChange = (field: keyof PaymentState, value: string) => {
        setPaymentState(prev => ({ ...prev, [field]: value, error: null }));
    };

    // Format card number with spaces
    const formatCardNumber = (value: string) => {
        const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
        const matches = v.match(/\d{4,16}/g);
        const match = (matches && matches[0]) || '';
        const parts = [];
        for (let i = 0, len = match.length; i < len; i += 4) {
            parts.push(match.substring(i, i + 4));
        }
        if (parts.length) {
            return parts.join(' ');
        }
        return v;
    };

    // Format expiry date
    const formatExpiry = (value: string) => {
        const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
        if (v.length >= 2) {
            return `${v.substring(0, 2)}/${v.substring(2, 4)}`;
        }
        return v;
    };

    // Validate payment fields
    const validatePayment = (): boolean => {
        const { method, upiId, cardNumber, cardExpiry, cardCvv, cardName } = paymentState;

        if (method === 'upi') {
            if (!upiId || !upiId.includes('@')) {
                setPaymentState(prev => ({ ...prev, error: 'Please enter a valid UPI ID (e.g., name@upi)' }));
                return false;
            }
        }

        if (method === 'card') {
            if (!cardNumber || cardNumber.replace(/\s/g, '').length < 16) {
                setPaymentState(prev => ({ ...prev, error: 'Please enter a valid 16-digit card number' }));
                return false;
            }
            if (!cardExpiry || cardExpiry.length < 5) {
                setPaymentState(prev => ({ ...prev, error: 'Please enter a valid expiry date (MM/YY)' }));
                return false;
            }
            if (!cardCvv || cardCvv.length < 3) {
                setPaymentState(prev => ({ ...prev, error: 'Please enter a valid CVV' }));
                return false;
            }
            if (!cardName || cardName.length < 3) {
                setPaymentState(prev => ({ ...prev, error: 'Please enter the name on card' }));
                return false;
            }
        }

        return true;
    };

    // Handle payment submission
    const handlePayment = async () => {
        if (!validatePayment()) return;

        setPaymentState(prev => ({ ...prev, isProcessing: true, error: null }));

        // Simulate payment processing delay
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Generate transaction ID
        const transactionId = generateTransactionId();

        // Store payment data in localStorage (optional bonus)
        const paymentData = {
            transactionId,
            amount: totalAmount,
            method: paymentState.method,
            timestamp: new Date().toISOString(),
            items: displayItems,
        };
        localStorage.setItem('lastPayment', JSON.stringify(paymentData));

        setPaymentState(prev => ({
            ...prev,
            isProcessing: false,
            isSuccess: true,
            transactionId,
        }));

        if (onSuccess) {
            // Briefly show success before calling parent callback
            setTimeout(() => {
                onSuccess(transactionId);
            }, 1500);
        }
    };

    // Reset payment state
    const handleReset = () => {
        setPaymentState({
            method: 'upi',
            upiId: '',
            cardNumber: '',
            cardExpiry: '',
            cardCvv: '',
            cardName: '',
            isProcessing: false,
            isSuccess: false,
            transactionId: '',
            error: null,
        });
    };

    // Render success screen
    if (paymentState.isSuccess) {
        return (
            <div className="payment-page">
                <div className="payment-success-container">
                    <div className="success-animation">
                        <div className="success-circle">
                            <CheckCircle size={64} className="success-icon" />
                        </div>
                    </div>
                    <h2 className="success-title">Payment Successful!</h2>
                    <p className="success-message">Your transaction has been completed successfully.</p>

                    <div className="transaction-details">
                        <div className="detail-row">
                            <span className="detail-label">Transaction ID</span>
                            <span className="detail-value transaction-id">{paymentState.transactionId}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">Payment Method</span>
                            <span className="detail-value">
                                {paymentState.method === 'upi' && 'UPI Payment'}
                                {paymentState.method === 'card' && 'Credit/Debit Card'}
                                {paymentState.method === 'cod' && 'Cash on Delivery'}
                            </span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">Amount Paid</span>
                            <span className="detail-value amount">₹{totalAmount.toFixed(2)}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">Date & Time</span>
                            <span className="detail-value">{new Date().toLocaleString()}</span>
                        </div>
                    </div>

                    <div className="success-actions">
                        <button className="btn btn-primary" onClick={handleReset}>
                            Make Another Payment
                        </button>
                        <button className="btn btn-outline" onClick={() => window.print()}>
                            Print Receipt
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="payment-page">
            {/* Page Header */}
            <div className="payment-header">
                <button className="back-btn" onClick={() => onCancel ? onCancel() : window.history.back()}>
                    <ArrowLeft size={20} />
                    Back
                </button>
                <h1 className="page-title">Secure Payment</h1>
                <p className="page-subtitle">Complete your order securely</p>
            </div>

            <div className="payment-container">
                {/* Left Column - Payment Methods */}
                <div className="payment-methods-section">
                    <div className="section-card">
                        <div className="section-header">
                            <Shield size={24} className="section-icon" />
                            <div>
                                <h2>Select Payment Method</h2>
                                <p>Choose your preferred payment option</p>
                            </div>
                        </div>

                        {/* Payment Method Options */}
                        <div className="payment-options">
                            {/* UPI Option */}
                            <label className={`payment-option ${paymentState.method === 'upi' ? 'selected' : ''}`}>
                                <input
                                    type="radio"
                                    name="paymentMethod"
                                    value="upi"
                                    checked={paymentState.method === 'upi'}
                                    onChange={() => handleMethodChange('upi')}
                                />
                                <div className="option-content">
                                    <div className="option-icon upi-icon">
                                        <QrCode size={24} />
                                    </div>
                                    <div className="option-details">
                                        <span className="option-title">UPI Payment</span>
                                        <span className="option-subtitle">Google Pay, PhonePe, Paytm</span>
                                    </div>
                                    <div className="option-check">
                                        {paymentState.method === 'upi' && <CheckCircle size={20} />}
                                    </div>
                                </div>
                            </label>

                            {/* Card Option */}
                            <label className={`payment-option ${paymentState.method === 'card' ? 'selected' : ''}`}>
                                <input
                                    type="radio"
                                    name="paymentMethod"
                                    value="card"
                                    checked={paymentState.method === 'card'}
                                    onChange={() => handleMethodChange('card')}
                                />
                                <div className="option-content">
                                    <div className="option-icon card-icon">
                                        <CreditCard size={24} />
                                    </div>
                                    <div className="option-details">
                                        <span className="option-title">Credit / Debit Card</span>
                                        <span className="option-subtitle">Visa, Mastercard, RuPay</span>
                                    </div>
                                    <div className="option-check">
                                        {paymentState.method === 'card' && <CheckCircle size={20} />}
                                    </div>
                                </div>
                            </label>

                            {/* COD Option */}
                            <label className={`payment-option ${paymentState.method === 'cod' ? 'selected' : ''}`}>
                                <input
                                    type="radio"
                                    name="paymentMethod"
                                    value="cod"
                                    checked={paymentState.method === 'cod'}
                                    onChange={() => handleMethodChange('cod')}
                                />
                                <div className="option-content">
                                    <div className="option-icon cod-icon">
                                        <Truck size={24} />
                                    </div>
                                    <div className="option-details">
                                        <span className="option-title">Cash on Delivery</span>
                                        <span className="option-subtitle">Pay when you receive</span>
                                    </div>
                                    <div className="option-check">
                                        {paymentState.method === 'cod' && <CheckCircle size={20} />}
                                    </div>
                                </div>
                            </label>
                        </div>

                        {/* Payment Form Fields */}
                        <div className="payment-form">
                            {/* UPI Form */}
                            {paymentState.method === 'upi' && (
                                <div className="form-section animate-fadeIn">
                                    <label className="form-label">
                                        <Smartphone size={16} />
                                        UPI ID
                                    </label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="yourname@upi"
                                        value={paymentState.upiId}
                                        onChange={(e) => handleInputChange('upiId', e.target.value)}
                                    />
                                    <span className="form-hint">Enter your UPI ID registered with Google Pay, PhonePe, or Paytm</span>

                                    <div className="upi-apps">
                                        <span className="upi-apps-label">Supported Apps:</span>
                                        <div className="upi-app-icons">
                                            <span className="upi-app">Google Pay</span>
                                            <span className="upi-app">PhonePe</span>
                                            <span className="upi-app">Paytm</span>
                                            <span className="upi-app">BHIM</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Card Form */}
                            {paymentState.method === 'card' && (
                                <div className="form-section animate-fadeIn">
                                    <div className="card-visual">
                                        <div className="card-front">
                                            <div className="card-chip">
                                                <div className="chip-lines"></div>
                                            </div>
                                            <div className="card-number-display">
                                                {paymentState.cardNumber || '•••• •••• •••• ••••'}
                                            </div>
                                            <div className="card-details">
                                                <div className="card-holder">
                                                    <span className="label">Card Holder</span>
                                                    <span className="value">{paymentState.cardName || 'YOUR NAME'}</span>
                                                </div>
                                                <div className="card-expiry">
                                                    <span className="label">Expires</span>
                                                    <span className="value">{paymentState.cardExpiry || 'MM/YY'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="card-form-grid">
                                        <div className="form-group full-width">
                                            <label className="form-label">
                                                <CreditCard size={16} />
                                                Card Number
                                            </label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                placeholder="1234 5678 9012 3456"
                                                maxLength={19}
                                                value={paymentState.cardNumber}
                                                onChange={(e) => handleInputChange('cardNumber', formatCardNumber(e.target.value))}
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label">
                                                <Calendar size={16} />
                                                Expiry Date
                                            </label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                placeholder="MM/YY"
                                                maxLength={5}
                                                value={paymentState.cardExpiry}
                                                onChange={(e) => handleInputChange('cardExpiry', formatExpiry(e.target.value))}
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label">
                                                <Lock size={16} />
                                                CVV
                                            </label>
                                            <input
                                                type="password"
                                                className="form-input"
                                                placeholder="123"
                                                maxLength={4}
                                                value={paymentState.cardCvv}
                                                onChange={(e) => handleInputChange('cardCvv', e.target.value.replace(/\D/g, ''))}
                                            />
                                            <span className="form-hint">3 digits on back of card</span>
                                        </div>

                                        <div className="form-group full-width">
                                            <label className="form-label">
                                                <User size={16} />
                                                Name on Card
                                            </label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                placeholder="JOHN DOE"
                                                value={paymentState.cardName}
                                                onChange={(e) => handleInputChange('cardName', e.target.value.toUpperCase())}
                                            />
                                        </div>
                                    </div>

                                    <div className="secure-badge">
                                        <Lock size={14} />
                                        <span>Your card details are secure and encrypted</span>
                                    </div>
                                </div>
                            )}

                            {/* COD Message */}
                            {paymentState.method === 'cod' && (
                                <div className="form-section animate-fadeIn cod-section">
                                    <div className="cod-message">
                                        <Truck size={48} className="cod-icon-large" />
                                        <h3>Cash on Delivery</h3>
                                        <p>You will pay <strong>₹{totalAmount.toFixed(2)}</strong> when your order is delivered.</p>
                                        <div className="cod-notes">
                                            <div className="cod-note">
                                                <CheckCircle size={16} />
                                                <span>No online payment required now</span>
                                            </div>
                                            <div className="cod-note">
                                                <CheckCircle size={16} />
                                                <span>Pay cash or UPI at your doorstep</span>
                                            </div>
                                            <div className="cod-note">
                                                <CheckCircle size={16} />
                                                <span>Delivery charges may apply</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Error Message */}
                        {paymentState.error && (
                            <div className="error-message">
                                <span className="error-text">{paymentState.error}</span>
                            </div>
                        )}

                        {/* Pay Button */}
                        <button
                            className={`btn btn-primary btn-pay ${paymentState.isProcessing ? 'btn-loading' : ''}`}
                            onClick={handlePayment}
                            disabled={paymentState.isProcessing}
                        >
                            {paymentState.isProcessing ? (
                                <>
                                    <Loader2 size={20} className="spinner" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <IndianRupee size={20} />
                                    Proceed to Pay ₹{totalAmount.toFixed(2)}
                                </>
                            )}
                        </button>

                        <div className="secure-footer">
                            <Shield size={16} />
                            <span>256-bit SSL Encryption | PCI DSS Compliant</span>
                        </div>
                    </div>
                </div>

                {/* Right Column - Order Summary */}
                <div className="order-summary-section">
                    <div className="section-card">
                        <div className="section-header">
                            <Receipt size={24} className="section-icon" />
                            <div>
                                <h2>Order Summary</h2>
                                <p>Review your order details</p>
                            </div>
                        </div>

                        <div className="order-items">
                            {displayItems.map((item) => (
                                <div key={item.id} className="order-item">
                                    <div className="item-info">
                                        <span className="item-name">{item.name}</span>
                                        <span className="item-quantity">Qty: {item.quantity} kg</span>
                                    </div>
                                    <span className="item-price">₹{(item.price * item.quantity).toFixed(2)}</span>
                                </div>
                            ))}
                        </div>

                        {/* Divider */}
                        <div className="divider"></div>

                        {/* Price Breakdown */}
                        <div className="price-breakdown">
                            <div className="price-row">
                                <span>Subtotal</span>
                                <span>₹{subtotal.toFixed(2)}</span>
                            </div>
                            <div className="price-row">
                                <span>Delivery Fee</span>
                                <span className={deliveryFee === 0 ? 'free-delivery' : ''}>
                                    {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee.toFixed(2)}`}
                                </span>
                            </div>
                            <div className="price-row">
                                <span>Taxes (GST)</span>
                                <span>Included</span>
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="divider"></div>

                        {/* Total */}
                        <div className="total-row">
                            <span className="total-label">Total Amount</span>
                            <span className="total-amount">₹{totalAmount.toFixed(2)}</span>
                        </div>

                        {/* Savings Message */}
                        {deliveryFee === 0 && (
                            <div className="savings-message">
                                <CheckCircle size={14} />
                                <span>You saved ₹50 on delivery!</span>
                            </div>
                        )}
                    </div>

                    {/* Trust Badges */}
                    <div className="trust-badges">
                        <div className="trust-badge">
                            <Shield size={20} />
                            <span>Secure Payments</span>
                        </div>
                        <div className="trust-badge">
                            <CheckCircle size={20} />
                            <span>Verified Orders</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Payment;
