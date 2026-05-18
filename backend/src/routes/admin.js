const express = require("express");
const router = express.Router();
const { User, Batch, Event, Handoff } = require("../models");
const { authMiddleware, requireRole } = require("../middleware/auth");

// All admin routes require authentication and ADMIN role
router.use(authMiddleware);
router.use(requireRole(['ADMIN']));

/**
 * GET /admin/stats
 * Get system-wide statistics
 */
router.get("/stats", async (req, res) => {
    try {
        const [
            totalUsers,
            totalBatches,
            totalEvents,
            totalHandoffs,
            usersByRoleData
        ] = await Promise.all([
            User.countDocuments(),
            Batch.countDocuments(),
            Event.countDocuments(),
            Handoff.countDocuments(),
            User.aggregate([
                { $group: { _id: '$role', count: { $sum: 1 } } }
            ])
        ]);

        const roleStats = {};
        usersByRoleData.forEach(r => {
            if (r._id) {
                roleStats[r._id] = r.count;
            }
        });

        res.json({
            success: true,
            stats: {
                totalUsers,
                totalBatches,
                totalEvents,
                totalHandoffs,
                usersByRole: roleStats
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * GET /admin/users
 * List all users with their stats
 */
router.get("/users", async (req, res) => {
    try {
        // Using aggregation to efficiently fetch counts
        const users = await User.aggregate([
            { $sort: { createdAt: -1 } },
            {
                $lookup: {
                    from: "batches",
                    localField: "_id",
                    foreignField: "createdBy",
                    as: "batches"
                }
            },
            {
                $lookup: {
                    from: "handoffs",
                    localField: "_id",
                    foreignField: "fromUser",
                    as: "handoffsFrom"
                }
            },
            {
                $lookup: {
                    from: "handoffs",
                    localField: "_id",
                    foreignField: "toUser",
                    as: "handoffsTo"
                }
            },
            {
                $project: {
                    id: "$_id",
                    name: 1,
                    email: 1,
                    role: 1,
                    organization: 1,
                    location: 1,
                    createdAt: 1,
                    batchesCreated: { $size: "$batches" },
                    handoffsInitiated: { $size: "$handoffsFrom" },
                    handoffsReceived: { $size: "$handoffsTo" }
                }
            }
        ]);

        const formattedUsers = users.map(user => ({
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            role: user.role,
            organization: user.organization,
            location: user.location,
            createdAt: user.createdAt,
            stats: {
                batchesCreated: user.batchesCreated,
                handoffsInitiated: user.handoffsInitiated,
                handoffsReceived: user.handoffsReceived
            }
        }));

        res.json({ success: true, users: formattedUsers });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * GET /admin/users/:id
 * Get detailed user info
 */
router.get("/users/:id", async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
            .select('name email role organization location createdAt');

        if (!user) {
            return res.status(404).json({ success: false, error: "User not found" });
        }
        
        const userBatches = await Batch.find({ createdBy: user._id })
            .select('productName status createdAt')
            .sort({ createdAt: -1 })
            .limit(10);

        const formattedUser = {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            role: user.role,
            organization: user.organization,
            location: user.location,
            createdAt: user.createdAt,
            batches: userBatches.map(b => ({
                id: b._id.toString(),
                productName: b.productName,
                status: b.status,
                createdAt: b.createdAt
            }))
        };

        res.json({ success: true, user: formattedUser });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * PUT /admin/users/:id/role
 * Update user role
 */
router.put("/users/:id/role", async (req, res) => {
    try {
        const { role } = req.body;
        const validRoles = ['ADMIN', 'FARMER', 'PROCESSOR', 'DISTRIBUTOR', 'RETAILER', 'USER'];

        if (!role || !validRoles.includes(role.toUpperCase())) {
            return res.status(400).json({
                success: false,
                error: `Invalid role. Must be one of: ${validRoles.join(', ')}`
            });
        }

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { role: role.toUpperCase() },
            { new: true, select: 'name email role' }
        );
        
        if (!user) {
            return res.status(404).json({ success: false, error: "User not found" });
        }

        res.json({ success: true, user: { id: user._id.toString(), name: user.name, email: user.email, role: user.role }, message: `Role updated to ${role}` });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * GET /admin/activity
 * Get all system activity (events, handoffs, batch creations)
 */
router.get("/activity", async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;

        const [events, handoffs, batches] = await Promise.all([
            Event.find()
                .sort({ createdAt: -1 })
                .limit(limit)
                .populate({ path: 'batch', select: 'productName blockchain.hash batchId' }),
            Handoff.find()
                .sort({ createdAt: -1 })
                .limit(limit)
                .populate({ path: 'batch', select: 'productName blockchain.hash batchId' })
                .populate({ path: 'fromUser', select: 'name role' })
                .populate({ path: 'toUser', select: 'name role' }),
            Batch.find()
                .sort({ createdAt: -1 })
                .limit(limit)
                .populate({ path: 'createdBy', select: 'name role' })
        ]);

        // Combine and format all activities
        const activities = [];

        events.forEach(e => {
            // For handoff events, use the handoffDescription template instead of eventDescription
            const isHandoffEvent = e.eventType === 'handoff';
            
            // Extract recipient name from description if not stored separately
            let toName = e.recipientName;
            if (isHandoffEvent && !toName && e.description) {
                const match = e.description.match(/to\s+([^\s(]+)/);
                if (match) toName = match[1];
            }
            
            // Extract handoff type from description if not stored separately
            let handoffType = e.handoffType;
            if (isHandoffEvent && !handoffType && e.description) {
                const match = e.description.match(/\(([^)]+)\)/);
                if (match) handoffType = match[1];
            }
            
            activities.push({
                id: `event-${e._id}`,
                type: isHandoffEvent ? 'handoff' : 'event',
                subType: e.eventType,
                description: e.description,
                descriptionKey: isHandoffEvent ? 'handoffDescription' : 'eventDescription',
                descriptionParams: isHandoffEvent 
                    ? { from: e.actor, to: toName || 'Unknown', type: handoffType || 'transfer' }
                    : { eventType: e.eventType, actor: e.actor },
                actor: e.actor,
                batch: e.batch?.productName || 'Unknown',
                batchId: e.batch?.blockchain?.hash?.substring(0, 12) || e.batch?.batchId || `BATCH-${e.batch?._id}`,
                location: e.location,
                timestamp: e.createdAt.toISOString()
            });
        });

        handoffs.forEach(h => {
            activities.push({
                id: `handoff-${h._id}`,
                type: 'handoff',
                subType: h.handoffType,
                description: `${h.fromUser?.name || 'Unknown'} → ${h.toUser?.name || 'Unknown'}`,
                descriptionKey: 'handoffDescription',
                descriptionParams: { from: h.fromUser?.name || 'Unknown', to: h.toUser?.name || 'Unknown', type: h.handoffType },
                actor: h.fromUser?.name,
                batch: h.batch?.productName || 'Unknown',
                batchId: h.batch?.blockchain?.hash?.substring(0, 12) || h.batch?.batchId || `BATCH-${h.batch?._id}`,
                location: null,
                timestamp: h.createdAt.toISOString()
            });
        });

        batches.forEach(b => {
            activities.push({
                id: `batch-${b._id}`,
                type: 'batch_created',
                subType: 'creation',
                description: `New batch: ${b.productName}`,
                descriptionKey: 'batchCreatedDescription',
                descriptionParams: { productName: b.productName },
                actor: b.createdBy?.name || 'Unknown',
                batch: b.productName,
                batchId: b.blockchain?.hash?.substring(0, 12) || b.batchId || `BATCH-${b._id}`,
                location: b.location,
                timestamp: b.createdAt.toISOString()
            });
        });

        // Sort by timestamp descending
        activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        res.json({ success: true, activities: activities.slice(0, limit) });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * GET /admin/pending-certifications
 * List all batches with pending certifications
 */
router.get("/pending-certifications", async (req, res) => {
    try {
        const batches = await Batch.find({
            "certificationFiles.status": "pending"
        })
        .populate('createdBy', 'name organization role')
        .sort({ createdAt: -1 });

        const formatted = batches.map(batch => ({
            id: batch._id,
            batchId: batch.batchId || batch.blockchain?.hash?.substring(0, 16).toUpperCase(),
            productName: batch.productName,
            farmer: {
                id: batch.createdBy?._id,
                name: batch.createdBy?.name,
                organization: batch.createdBy?.organization
            },
            certifications: batch.certificationFiles.filter(c => c.status === 'pending').map(c => ({
                certName: c.certName,
                fileUrl: c.fileUrl,
                ipfsHash: c.ipfsHash,
                status: c.status
            })),
            createdAt: batch.createdAt
        }));

        res.json({ success: true, batches: formatted });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * POST /admin/verify-certificate
 * Approve or reject a certification
 */
router.post("/verify-certificate", async (req, res) => {
    try {
        const { batchId, certName, status } = req.body;

        if (!['verified', 'rejected'].includes(status)) {
            return res.status(400).json({ success: false, error: "Invalid status" });
        }

        const batch = await Batch.findById(batchId);
        if (!batch) {
            return res.status(404).json({ success: false, error: "Batch not found" });
        }

        // Find the specific certification in the array
        const certIndex = batch.certificationFiles.findIndex(c => c.certName === certName);
        if (certIndex === -1) {
            return res.status(404).json({ success: false, error: "Certification not found in this batch" });
        }

        // Update the status and timestamp
        batch.certificationFiles[certIndex].status = status;
        batch.certificationFiles[certIndex].verifiedAt = new Date();
        
        await batch.save();

        res.json({ 
            success: true, 
            message: `Certification '${certName}' ${status} successfully`,
            cert: batch.certificationFiles[certIndex]
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;

