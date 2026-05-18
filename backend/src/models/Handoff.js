const mongoose = require('mongoose');

const handoffSchema = new mongoose.Schema({
  batch: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', required: true },
  fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  toUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  handoffType: {
    type: String,
    enum: ['pickup', 'dropoff', 'transfer'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'completed'],
    default: 'pending'
  },
  notes: { type: String },
  location: { type: String },
  blockchain: {
    hash: { type: String },
    timestamp: { type: Date }
  },
  createdAt: { type: Date, default: Date.now },
  completedAt: { type: Date }
});

module.exports = mongoose.model('Handoff', handoffSchema, 'Handoffs');
