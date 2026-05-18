const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  transactionId: {
    type: String,
    required: true,
    unique: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'INR',
    enum: ['INR', 'USD', 'EUR']
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['stripe', 'razorpay', 'paypal'],
    required: true
  },
  gatewayTransactionId: {
    type: String,
    sparse: true
  },
  description: {
    type: String,
    required: true
  },
  metadata: {
    serviceType: {
      type: String,
      enum: ['analysis', 'consultation', 'marketplace', 'insurance'],
      required: true
    },
    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    cropRecommendations: [String],
    analysisType: {
      type: String,
      enum: ['basic', 'premium', 'expert']
    }
  },
  refundAmount: {
    type: Number,
    default: 0
  },
  refundReason: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  completedAt: Date,
  refundedAt: Date
});

// Index for faster queries
paymentSchema.index({ userId: 1, createdAt: -1 });
paymentSchema.index({ transactionId: 1 });
paymentSchema.index({ status: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
