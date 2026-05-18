const mongoose = require('mongoose');

const cropAnalysisSchema = new mongoose.Schema({
  farmerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  location: { type: String, required: true },
  soilType: { type: String, enum: ['Sandy', 'Clay', 'Loamy', 'Silty', 'Peaty', 'Unknown'], default: 'Unknown' },
  soilInputMethod: { type: String, enum: ['image', 'manual'], default: 'manual' },
  soilManualData: {
    texture: { type: String },
    waterRetention: { type: String },
    color: { type: String }
  },
  soilImage: { type: String },
  weather: {
    temperature: { type: Number },
    humidity: { type: Number },
    rainfall: { type: Number },
    condition: { type: String },
    windSpeed: { type: Number },
    location: { type: String }
  },
  diseaseDetected: { type: String, default: 'Healthy' },
  diseaseConfidence: { type: Number, default: 0 },
  diseaseImage: { type: String },
  recommendedCrops: [{ type: String }],
  suggestions: [{ type: String }],
  warnings: [{ type: String }],
  linkedBatchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('CropAnalysis', cropAnalysisSchema, 'CropAnalyses');
