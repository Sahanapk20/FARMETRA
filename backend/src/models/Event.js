const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  batch: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', required: true },
  eventType: {
    type: String,
    enum: ['created', 'harvested', 'transport', 'processing', 'inspection', 'packaging', 'storage', 'handoff', 'qr_scan', 'split', 'delivered', 'custom'],
    required: true
  },
  description: { type: String, required: true },
  location: { type: String },
  timestamp: { type: Date, default: Date.now },
  actor: { type: String },
  actorRole: { type: String },
  temperature: { type: Number },
  humidity: { type: Number },
  notes: { type: String },
  documents: [{ type: String }],
  photos: [{ type: String }],
  blockchain: {
    hash: { type: String },
    timestamp: { type: Date }
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Event', eventSchema, 'Events');
