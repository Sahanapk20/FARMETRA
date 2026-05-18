const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['FARMER', 'PROCESSOR', 'DISTRIBUTOR', 'RETAILER', 'ADMIN', 'USER', 'CONSUMER'], 
    default: 'FARMER' 
  },
  phone: { type: String },
  location: { type: String },
  organization: { type: String },
  isActive: { type: Boolean, default: true },
  resetToken: { type: String },
  resetTokenExpiry: { type: Date },
  otp: { type: String },
  otpExpiry: { type: Date },
  isEmailVerified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('User', userSchema, 'Users');
