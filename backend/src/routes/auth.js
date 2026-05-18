const express = require("express");
const { User, PendingRegistration } = require("../models");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { sendOTPEmail, sendPasswordResetEmail } = require("../email");

const router = express.Router();

// Generate 6-digit OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// ========================
// REGISTRATION WITH OTP
// ========================

// STEP 1: Send registration OTP
router.post("/send-registration-otp", async (req, res) => {
    try {
        const { name, email, password, organization, role, location } = req.body;

        // Validate required fields
        if (!name || !email || !password) {
            return res.status(400).json({ success: false, error: "Name, email, and password are required" });
        }

        // Check if email is restricted or role is ADMIN
        const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "farmetra3@gmail.com";
        if (email === ADMIN_EMAIL || (role && role.toUpperCase() === 'ADMIN')) {
            return res.status(403).json({ success: false, error: "Registration for this account or role is restricted." });
        }

        // Check if email already exists as a registered user
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, error: "Email already registered. Please login instead." });
        }

        // Generate OTP
        const otp = generateOTP();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Hash password before storing
        const hashedPassword = await bcrypt.hash(password, 10);

        // Upsert pending registration (replace if same email tries again)
        await PendingRegistration.findOneAndUpdate(
            { email },
            {
                name,
                email,
                password: hashedPassword,
                organization: organization || null,
                role: role ? role.toUpperCase() : "FARMER",
                location: location || null,
                otp,
                otpExpiry
            },
            { upsert: true, new: true }
        );

        // Send OTP email
        try {
            await sendOTPEmail(email, otp, name, 'registration');
        } catch (emailError) {
            console.error("Failed to send OTP email:", emailError);
            return res.status(500).json({ success: false, error: "Failed to send verification email. Please try again." });
        }

        res.json({
            success: true,
            message: "OTP sent to your email. Please verify to complete registration."
        });
    } catch (err) {
        console.error("Send registration OTP error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// STEP 2: Verify registration OTP and create account
router.post("/verify-registration-otp", async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({ success: false, error: "Email and OTP are required" });
        }

        // Find pending registration
        const pending = await PendingRegistration.findOne({ email });
        if (!pending) {
            return res.status(400).json({ success: false, error: "No pending registration found. Please register again." });
        }

        // Check OTP expiry
        if (new Date() > pending.otpExpiry) {
            await PendingRegistration.deleteOne({ email });
            return res.status(400).json({ success: false, error: "OTP has expired. Please register again." });
        }

        // Verify OTP
        if (pending.otp !== otp) {
            return res.status(400).json({ success: false, error: "Invalid OTP. Please try again." });
        }

        // Check again if email was registered in the meantime
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            await PendingRegistration.deleteOne({ email });
            return res.status(400).json({ success: false, error: "Email already registered." });
        }

        // Create the user
        const user = await User.create({
            name: pending.name,
            email: pending.email,
            password: pending.password, // Already hashed
            organization: pending.organization,
            role: pending.role,
            location: pending.location,
            isEmailVerified: true
        });

        // Clean up pending registration
        await PendingRegistration.deleteOne({ email });

        // Generate JWT token for auto-login
        const token = jwt.sign(
            { id: user._id.toString(), email: user.email, role: user.role },
            process.env.JWT_SECRET || "agri_jwt_secret_123",
            { expiresIn: "7d" }
        );

        const userResponse = {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            role: user.role,
            organization: user.organization,
            location: user.location,
            createdAt: user.createdAt
        };

        res.json({
            success: true,
            message: "Email verified! Account created successfully.",
            user: userResponse,
            token
        });
    } catch (err) {
        console.error("Verify registration OTP error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Resend registration OTP
router.post("/resend-registration-otp", async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, error: "Email is required" });
        }

        const pending = await PendingRegistration.findOne({ email });
        if (!pending) {
            return res.status(400).json({ success: false, error: "No pending registration found. Please register again." });
        }

        // Generate new OTP
        const otp = generateOTP();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

        pending.otp = otp;
        pending.otpExpiry = otpExpiry;
        await pending.save();

        // Send OTP email
        try {
            await sendOTPEmail(email, otp, pending.name, 'registration');
        } catch (emailError) {
            console.error("Failed to resend OTP email:", emailError);
            return res.status(500).json({ success: false, error: "Failed to send verification email. Please try again." });
        }

        res.json({
            success: true,
            message: "New OTP sent to your email."
        });
    } catch (err) {
        console.error("Resend registration OTP error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ========================
// LOGIN
// ========================

router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "farmetra3@gmail.com";
        const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "farmetra@123";

        // Specialized Admin Login Flow
        if (email === ADMIN_EMAIL) {
            if (password !== ADMIN_PASSWORD) {
                return res.status(400).json({ success: false, error: "Incorrect password" });
            }

            // Ensure admin exists in DB so relationships work
            let adminUser = await User.findOne({ email: ADMIN_EMAIL });
            if (!adminUser) {
                const hashed = await bcrypt.hash(ADMIN_PASSWORD, 10);
                adminUser = await User.create({
                    name: "System Admin",
                    email: ADMIN_EMAIL,
                    password: hashed,
                    role: "ADMIN",
                    organization: "FARMETRA",
                    isEmailVerified: true
                });
            } else if (adminUser.role !== 'ADMIN') {
                adminUser.role = 'ADMIN';
                await adminUser.save();
            }

            const token = jwt.sign(
                { id: adminUser._id.toString(), email: adminUser.email, role: "ADMIN" },
                process.env.JWT_SECRET,
                { expiresIn: "7d" }
            );

            return res.json({
                success: true,
                message: "Admin login successful",
                token,
                user: {
                    id: adminUser._id.toString(),
                    name: adminUser.name,
                    email: adminUser.email,
                    role: "ADMIN",
                    organization: adminUser.organization,
                    location: adminUser.location,
                    createdAt: adminUser.createdAt
                }
            });
        }

        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ success: false, error: "User not found" });

        if (user.role === 'ADMIN' && email !== ADMIN_EMAIL) {
            return res.status(403).json({ success: false, error: "Unauthorized admin access" });
        }

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return res.status(400).json({ success: false, error: "Incorrect password" });

        const token = jwt.sign(
            { id: user._id.toString(), email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        const userResponse = {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            role: user.role,
            organization: user.organization,
            location: user.location,
            createdAt: user.createdAt
        };

        res.json({
            success: true,
            message: "Login successful",
            token,
            user: userResponse
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ========================
// GET CURRENT USER
// ========================

router.get("/me", async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, error: "No token provided" });
        }

        const token = authHeader.replace('Bearer ', '');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findById(decoded.id).select('-password');
        if (!user) return res.status(404).json({ success: false, error: "User not found" });

        res.json({ success: true, user });
    } catch (err) {
        res.status(401).json({ success: false, error: "Invalid token" });
    }
});

// ========================
// FORGOT PASSWORD WITH OTP
// ========================

// STEP 1: Send forgot password OTP
router.post("/forgot-password", async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, error: "Email is required" });
        }

        // Block password reset for admin account
        const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "farmetra3@gmail.com";
        if (email === ADMIN_EMAIL) {
            return res.status(403).json({ success: false, error: "Password reset is not available for the admin account." });
        }

        const user = await User.findOne({ email });

        // Always return success even if user not found (security)
        if (!user) {
            return res.json({
                success: true,
                message: "If an account exists with this email, an OTP has been sent."
            });
        }

        // Generate OTP
        const otp = generateOTP();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Save OTP to user record
        await User.findByIdAndUpdate(user._id, { otp, otpExpiry });

        // Send OTP email
        try {
            await sendOTPEmail(email, otp, user.name, 'password-reset');
        } catch (emailError) {
            console.error("Failed to send OTP email:", emailError);
        }

        res.json({
            success: true,
            message: "If an account exists with this email, an OTP has been sent."
        });
    } catch (err) {
        console.error("Forgot password error:", err);
        res.status(500).json({ success: false, error: "An error occurred. Please try again." });
    }
});

// STEP 2: Verify forgot password OTP
router.post("/verify-reset-otp", async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({ success: false, error: "Email and OTP are required" });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ success: false, error: "Invalid email or OTP." });
        }

        // Check OTP expiry
        if (!user.otp || !user.otpExpiry || new Date() > user.otpExpiry) {
            return res.status(400).json({ success: false, error: "OTP has expired. Please request a new one." });
        }

        // Verify OTP
        if (user.otp !== otp) {
            return res.status(400).json({ success: false, error: "Invalid OTP. Please try again." });
        }

        // OTP is valid — generate a temporary reset token for the password change step
        const resetToken = crypto.randomBytes(32).toString('hex');
        await User.findByIdAndUpdate(user._id, {
            resetToken,
            resetTokenExpiry: new Date(Date.now() + 10 * 60 * 1000), // 10 min
            otp: null,
            otpExpiry: null
        });

        res.json({
            success: true,
            message: "OTP verified successfully.",
            resetToken
        });
    } catch (err) {
        console.error("Verify reset OTP error:", err);
        res.status(500).json({ success: false, error: "An error occurred. Please try again." });
    }
});

// STEP 3: Reset password with token (after OTP verification)
router.post("/reset-password", async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({ success: false, error: "Token and new password are required" });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ success: false, error: "Password must be at least 6 characters" });
        }

        const user = await User.findOne({
            resetToken: token,
            resetTokenExpiry: { $gt: new Date() }
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                error: "Invalid or expired session. Please start over."
            });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await User.findByIdAndUpdate(user._id, {
            password: hashedPassword,
            resetToken: null,
            resetTokenExpiry: null,
            otp: null,
            otpExpiry: null
        });

        res.json({
            success: true,
            message: "Password has been reset successfully. You can now login with your new password."
        });
    } catch (err) {
        console.error("Reset password error:", err);
        res.status(500).json({ success: false, error: "An error occurred. Please try again." });
    }
});

// Resend forgot password OTP
router.post("/resend-reset-otp", async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, error: "Email is required" });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.json({ success: true, message: "If an account exists, a new OTP has been sent." });
        }

        const otp = generateOTP();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

        await User.findByIdAndUpdate(user._id, { otp, otpExpiry });

        try {
            await sendOTPEmail(email, otp, user.name, 'password-reset');
        } catch (emailError) {
            console.error("Failed to resend OTP email:", emailError);
        }

        res.json({
            success: true,
            message: "If an account exists, a new OTP has been sent."
        });
    } catch (err) {
        console.error("Resend reset OTP error:", err);
        res.status(500).json({ success: false, error: "An error occurred. Please try again." });
    }
});

// ========================
// LEGACY: Keep old register endpoint for backward compatibility
// ========================

router.post("/register", async (req, res) => {
    try {
        const { name, email, password, organization, role, location } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ success: false, error: "Name, email, and password are required" });
        }

        // Legacy restriction
        const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "farmetra3@gmail.com";
        if (email === ADMIN_EMAIL || (role && role.toUpperCase() === 'ADMIN')) {
            return res.status(403).json({ success: false, error: "Registration for this account or role is restricted." });
        }

        const exists = await User.findOne({ email });
        if (exists) return res.status(400).json({ success: false, error: "Email already exists" });

        const hashed = await bcrypt.hash(password, 10);

        const user = await User.create({
            name,
            email,
            password: hashed,
            organization: organization || null,
            role: role ? role.toUpperCase() : "FARMER",
            location: location || null
        });

        const token = jwt.sign(
            { id: user._id.toString(), email: user.email, role: user.role },
            process.env.JWT_SECRET || "agri_jwt_secret_123",
            { expiresIn: "7d" }
        );

        const userResponse = {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            role: user.role,
            organization: user.organization,
            location: user.location,
            createdAt: user.createdAt
        };

        res.json({
            success: true,
            message: "Registered successfully",
            user: userResponse,
            token
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;