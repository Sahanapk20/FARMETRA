const express = require('express');
const router = express.Router();
const { Payment } = require('../models');
const { authMiddleware } = require('../middleware/auth');
const { createOrder, verifyPayment, fetchPayment, processRefund, isConfigured } = require('../services/razorpayService');

// Protect all payment routes
router.use(authMiddleware);

// POST /api/payments/create-intent - Create Razorpay order
router.post('/create-intent', async (req, res) => {
  try {
    const { amount, currency = 'INR', description, metadata } = req.body;
    const userId = req.user.id;

    // Check if Razorpay is configured
    if (!isConfigured()) {
      return res.status(500).json({ 
        success: false, 
        error: 'Razorpay is not configured. Please add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to environment variables.' 
      });
    }

    // Generate unique receipt ID
    const receipt = 'FARMETRA_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

    // Create Razorpay order
    const orderResult = await createOrder(amount, currency, receipt, {
      userId,
      description,
      ...metadata
    });

    if (!orderResult.success) {
      return res.status(500).json({ success: false, error: orderResult.error });
    }

    // Generate unique transaction ID
    const transactionId = 'FARMETRA_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

    // Create payment record
    const payment = new Payment({
      userId,
      transactionId,
      amount,
      currency,
      description,
      metadata,
      paymentMethod: 'razorpay',
      gatewayTransactionId: orderResult.order.id,
      status: 'pending'
    });

    await payment.save();

    res.json({
      success: true,
      order: orderResult.order,
      transactionId,
      keyId: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    console.error('Payment intent creation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/payments/verify - Verify Razorpay payment
router.post('/verify', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, transactionId } = req.body;
    const userId = req.user.id;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required payment verification parameters' 
      });
    }

    // Verify payment signature
    const verificationResult = await verifyPayment(
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature
    );

    if (!verificationResult.success || !verificationResult.verified) {
      return res.status(400).json({ 
        success: false, 
        error: verificationResult.error || 'Payment verification failed' 
      });
    }

    // Update payment record
    const payment = await Payment.findOne({ transactionId, userId });
    if (!payment) {
      return res.status(404).json({ success: false, error: 'Payment not found' });
    }

    payment.status = 'completed';
    payment.gatewayTransactionId = razorpay_payment_id;
    payment.completedAt = new Date();
    await payment.save();

    res.json({
      success: true,
      message: 'Payment verified successfully',
      payment: {
        transactionId: payment.transactionId,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        completedAt: payment.completedAt
      }
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/payments/:transactionId/status - Get payment status
router.get('/:transactionId/status', async (req, res) => {
  try {
    const { transactionId } = req.params;
    const userId = req.user.id;

    const payment = await Payment.findOne({ transactionId, userId });
    if (!payment) {
      return res.status(404).json({ success: false, error: 'Payment not found' });
    }

    // If payment has gateway transaction ID, fetch latest status from Razorpay
    let razorpayPayment = null;
    if (payment.gatewayTransactionId) {
      const paymentResult = await fetchPayment(payment.gatewayTransactionId);
      if (paymentResult.success) {
        razorpayPayment = paymentResult.payment;
      }
    }

    res.json({
      success: true,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      createdAt: payment.createdAt,
      completedAt: payment.completedAt,
      razorpayPayment: razorpayPayment
    });
  } catch (error) {
    console.error('Payment status error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/payments/webhook - Handle Razorpay webhooks
router.post('/webhook', async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.warn('Webhook secret not configured');
      return res.status(500).json({ error: 'Webhook not configured' });
    }

    // Verify webhook signature (you'll need to implement this based on Razorpay's webhook documentation)
    const signature = req.headers['x-razorpay-signature'];
    // TODO: Implement webhook signature verification

    const { event, payload } = req.body;
    
    console.log('Razorpay webhook received:', event);

    switch (event) {
      case 'payment.captured':
        const paymentId = payload.payment.entity.id;
        const notes = payload.payment.entity.notes;
        
        await Payment.findOneAndUpdate(
          { gatewayTransactionId: paymentId },
          { 
            status: 'completed',
            completedAt: new Date()
          }
        );
        break;
      
      case 'payment.failed':
        const failedPaymentId = payload.payment.entity.id;
        await Payment.findOneAndUpdate(
          { gatewayTransactionId: failedPaymentId },
          { status: 'failed' }
        );
        break;
      
      default:
        console.log('Unhandled webhook event:', event);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// GET /api/payments/history - Get user payment history
router.get('/history', async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;

    const payments = await Payment.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-__v');

    const total = await Payment.countDocuments({ userId });

    res.json({
      success: true,
      payments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Payment history error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/payments/refund - Process refund
router.post('/refund', async (req, res) => {
  try {
    const { transactionId, reason } = req.body;
    const userId = req.user.id;

    const payment = await Payment.findOne({ transactionId, userId });
    if (!payment) {
      return res.status(404).json({ success: false, error: 'Payment not found' });
    }

    if (payment.status !== 'completed') {
      return res.status(400).json({ success: false, error: 'Payment cannot be refunded' });
    }

    // Process refund with Razorpay
    const refundResult = await processRefund(
      payment.gatewayTransactionId, 
      payment.amount
    );

    if (!refundResult.success) {
      return res.status(500).json({ success: false, error: refundResult.error });
    }

    // Update payment record
    payment.status = 'refunded';
    payment.refundAmount = payment.amount;
    payment.refundReason = reason;
    payment.refundedAt = new Date();
    await payment.save();

    res.json({
      success: true,
      message: 'Refund processed successfully',
      refundAmount: payment.refundAmount,
      refundId: refundResult.refund.id
    });
  } catch (error) {
    console.error('Refund error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
