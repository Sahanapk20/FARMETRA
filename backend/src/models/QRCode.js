const mongoose = require('mongoose');

const qrCodeSchema = new mongoose.Schema({
  batch: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', required: true },
  qrData: { type: String, required: true },
  qrImageUrl: { type: String },
  publicUrl: { type: String },
  scanCount: { type: Number, default: 0 },
  lastScannedAt: { type: Date },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('QRCode', qrCodeSchema, 'QRCodes');
