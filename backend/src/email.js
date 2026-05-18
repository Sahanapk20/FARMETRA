const nodemailer = require('nodemailer');

// Create reusable transporter object using SMTP
const createTransporter = () => {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });
};

/**
 * Send OTP email for registration or password reset
 * @param {string} email - Recipient email
 * @param {string} otp - 6-digit OTP code
 * @param {string} userName - User's name
 * @param {string} purpose - 'registration' or 'password-reset'
 */
const sendOTPEmail = async (email, otp, userName, purpose = 'registration') => {
    const transporter = createTransporter();

    const isRegistration = purpose === 'registration';
    const subject = isRegistration
        ? 'Verify Your Email - FARMETRA'
        : 'Password Reset OTP - FARMETRA';
    const heading = isRegistration
        ? 'Email Verification'
        : 'Password Reset Request';
    const description = isRegistration
        ? 'Thank you for registering with FARMETRA! Please use the OTP below to verify your email address and complete your registration.'
        : 'We received a request to reset your password. Please use the OTP below to proceed with resetting your password.';

    const mailOptions = {
        from: `"FARMETRA" <${process.env.SMTP_USER || 'noreply@farmetra.com'}>`,
        to: email,
        subject,
        html: `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background: #f8faf5;">
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #16a34a, #15803d, #166534); padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0;">
                    <div style="display: inline-block; background: rgba(255,255,255,0.15); padding: 8px 20px; border-radius: 50px; margin-bottom: 16px;">
                        <span style="color: white; font-size: 14px; letter-spacing: 1px;">🌾 FARMETRA</span>
                    </div>
                    <h1 style="color: white; margin: 0; font-size: 26px; font-weight: 600;">${heading}</h1>
                    <p style="color: rgba(255,255,255,0.85); margin-top: 8px; font-size: 14px;">Supply Chain Traceability Platform</p>
                </div>
                
                <!-- Body -->
                <div style="background: white; padding: 40px 30px; border: 1px solid #e5e7eb; border-top: none;">
                    <p style="color: #374151; font-size: 16px; margin-top: 0;">Hi <strong>${userName || 'there'}</strong>,</p>
                    
                    <p style="color: #6b7280; font-size: 15px; line-height: 1.6;">
                        ${description}
                    </p>
                    
                    <!-- OTP Box -->
                    <div style="text-align: center; margin: 32px 0;">
                        <p style="color: #6b7280; font-size: 13px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 12px;">Your Verification Code</p>
                        <div style="background: linear-gradient(135deg, #f0fdf4, #dcfce7); border: 2px solid #16a34a; border-radius: 16px; padding: 24px 40px; display: inline-block;">
                            <span style="font-size: 40px; font-weight: 700; letter-spacing: 12px; color: #15803d; font-family: 'Courier New', monospace;">${otp}</span>
                        </div>
                    </div>
                    
                    <!-- Warning -->
                    <div style="background: #fffbeb; border: 1px solid #fbbf24; border-radius: 10px; padding: 16px; margin: 24px 0;">
                        <p style="color: #92400e; font-size: 13px; margin: 0;">
                            ⏱️ This code will expire in <strong>10 minutes</strong>. Do not share this code with anyone.
                        </p>
                    </div>
                    
                    <p style="color: #9ca3af; font-size: 13px; line-height: 1.5;">
                        If you didn't request this, you can safely ignore this email. No changes will be made to your account.
                    </p>
                </div>
                
                <!-- Footer -->
                <div style="background: #f9fafb; padding: 24px 30px; text-align: center; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
                    <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                        © ${new Date().getFullYear()} FARMETRA — Agricultural Supply Chain Traceability
                    </p>
                </div>
            </div>
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`OTP email sent to ${email}:`, info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Email send error:', error);
        throw error;
    }
};

/**
 * Send password reset email (legacy - kept for backward compatibility)
 */
const sendPasswordResetEmail = async (email, resetToken, userName) => {
    const transporter = createTransporter();
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetLink = `${baseUrl}/reset-password?token=${resetToken}`;

    const mailOptions = {
        from: `"FARMETRA" <${process.env.SMTP_USER || 'noreply@farmetra.com'}>`,
        to: email,
        subject: 'Password Reset - FARMETRA',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                    <h1 style="color: white; margin: 0;">🌾 FARMETRA</h1>
                    <p style="color: rgba(255,255,255,0.9); margin-top: 10px;">Supply Chain Traceability</p>
                </div>
                <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
                    <h2 style="color: #1f2937; margin-top: 0;">Password Reset Request</h2>
                    <p style="color: #4b5563;">Hi ${userName || 'there'},</p>
                    <p style="color: #4b5563;">Click the button below to create a new password:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetLink}" style="background: #10b981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                            Reset Password
                        </a>
                    </div>
                    <p style="color: #9ca3af; font-size: 12px;">This link will expire in 1 hour.</p>
                </div>
            </div>
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Password reset email sent:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Email send error:', error);
        throw error;
    }
};

module.exports = { sendOTPEmail, sendPasswordResetEmail };
