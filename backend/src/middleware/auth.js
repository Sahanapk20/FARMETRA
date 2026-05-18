const jwt = require("jsonwebtoken");
const { User } = require("../models");

/**
 * JWT Authentication Middleware
 * Extracts and verifies JWT token from Authorization header
 * Attaches user info to req.user
 */
const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: "No authentication token provided"
            });
        }

        const token = authHeader.replace('Bearer ', '');

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Optionally fetch fresh user data from database
            const user = await User.findById(decoded.id).select('name email role organization');

            if (!user) {
                return res.status(401).json({
                    success: false,
                    error: "User not found"
                });
            }

            req.user = {
                id: user._id.toString(),
                name: user.name,
                email: user.email,
                role: user.role,
                organization: user.organization
            };
            next();
        } catch (jwtError) {
            if (jwtError.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    error: "Token expired"
                });
            }
            return res.status(401).json({
                success: false,
                error: "Invalid token"
            });
        }
    } catch (err) {
        return res.status(500).json({
            success: false,
            error: "Authentication error"
        });
    }
};

/**
 * Optional Auth Middleware
 * Like authMiddleware but doesn't fail if no token provided
 * Useful for endpoints that work both authenticated and unauthenticated
 */
const optionalAuthMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            req.user = null;
            return next();
        }

        const token = authHeader.replace('Bearer ', '');

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            const user = await User.findById(decoded.id).select('name email role organization');

            if (user) {
                req.user = {
                    id: user._id.toString(),
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    organization: user.organization
                };
            } else {
                req.user = null;
            }
        } catch {
            req.user = null;
        }

        next();
    } catch {
        req.user = null;
        next();
    }
};

/**
 * Role-based access control middleware
 * Use after authMiddleware
 * @param {string[]} allowedRoles - Array of allowed roles
 */
const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: "Authentication required"
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: `Access denied. Required role: ${allowedRoles.join(' or ')}`
            });
        }

        next();
    };
};

module.exports = { authMiddleware, optionalAuthMiddleware, requireRole };