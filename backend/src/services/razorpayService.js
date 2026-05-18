const Razorpay = require('razorpay');
const crypto = require('crypto');

// Initialize Razorpay instance only when needed
const getRazorpayInstance = () => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay credentials not configured');
  }
  
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });
};

// Create Razorpay order
const createOrder = async (amount, currency = 'INR', receipt, notes = {}) => {
  try {
    const options = {
      amount: amount * 100, // Razorpay expects amount in paise
      currency,
      receipt,
      notes: {
        ...notes,
        timestamp: new Date().toISOString()
      }
    };

    const order = await razorpay.orders.create(options);
    return {
      success: true,
      order
    };
  } catch (error) {
    console.error('Razorpay order creation error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Verify Razorpay payment signature
const verifyPayment = async (razorpay_order_id, razorpay_payment_id, razorpay_signature) => {
  try {
    const generated_signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    const isAuthentic = generated_signature === razorpay_signature;

    if (isAuthentic) {
      // Fetch payment details
      const payment = await razorpay.payments.fetch(razorpay_payment_id);
      return {
        success: true,
        payment,
        verified: true
      };
    } else {
      return {
        success: false,
        error: 'Payment verification failed',
        verified: false
      };
    }
  } catch (error) {
    console.error('Razorpay payment verification error:', error);
    return {
      success: false,
      error: error.message,
      verified: false
    };
  }
};

// Fetch payment details
const fetchPayment = async (paymentId) => {
  try {
    const payment = await razorpay.payments.fetch(paymentId);
    return {
      success: true,
      payment
    };
  } catch (error) {
    console.error('Razorpay payment fetch error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Process refund
const processRefund = async (paymentId, amount) => {
  try {
    const refund = await razorpay.payments.refund(paymentId, {
      amount: amount * 100 // Amount in paise
    });
    return {
      success: true,
      refund
    };
  } catch (error) {
    console.error('Razorpay refund error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Check if Razorpay is properly configured
const isConfigured = () => {
  return process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET;
};

module.exports = {
  createOrder,
  verifyPayment,
  fetchPayment,
  processRefund,
  isConfigured
};
