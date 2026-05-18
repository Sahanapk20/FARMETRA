const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema({
  batchId: { type: String, required: true, unique: true },
  productName: { type: String, required: true },
  productType: { type: String, required: true },
  weight: { type: Number, required: true },
  weightUnit: { type: String, default: 'kg' },
  quantity: { type: Number },
  unit: { type: String },
  farmName: { type: String, required: true },
  location: { type: String, required: true },
  giTag: { type: String },
  harvestDate: { type: Date },
  description: { type: String },
  status: {
    type: String,
    enum: ['created', 'in_transit', 'processing', 'completed', 'split'],
    default: 'created'
  },
  certifications: [{ type: String }],
  certificationFiles: [{
    certName: String,
    fileUrl: String,
    ipfsHash: String,
    status: { 
      type: String, 
      enum: ['pending', 'verified', 'rejected'], 
      default: 'pending' 
    },
    verifiedAt: Date
  }],
  certificationId: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  currentHolder: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  parentBatch: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
  childBatches: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Batch' }],
  blockchain: {
    hash: { type: String },
    network: { type: String, default: 'IPFS (Pinata)' },
    timestamp: { type: Date },
    ipfsHash: { type: String },
    ipfsUrl: { type: String }
  },
  hasQR: { type: Boolean, default: false },
  qrCode: { type: String },
  blockchainVerified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

batchSchema.virtual('events', {
  ref: 'Event',
  localField: '_id',
  foreignField: 'batch'
});

batchSchema.virtual('user', {
  ref: 'User',
  localField: 'createdBy',
  foreignField: '_id',
  justOne: true
});

batchSchema.set('toObject', { virtuals: true });
batchSchema.set('toJSON', { virtuals: true });

// Generate unique batch ID before validation
batchSchema.pre('validate', async function(next) {
  if (!this.batchId) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    this.batchId = `BATCH-${timestamp}-${random}`;
  }
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Batch', batchSchema, 'Batches');
