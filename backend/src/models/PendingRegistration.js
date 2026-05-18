const mongoose = require('mongoose');

const pendingRegistrationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // Already hashed
  role: { type: String, default: 'FARMER' },
  phone: { type: String },
  location: { type: String },
  organization: { type: String },
  otp: { type: String, required: true },
  otpExpiry: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now, expires: 600 } // Auto-delete after 10 minutes
});

module.exports = mongoose.model('PendingRegistration', pendingRegistrationSchema, 'PendingRegistrations');
