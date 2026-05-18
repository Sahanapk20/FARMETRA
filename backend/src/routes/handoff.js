const express = require("express");
const router = express.Router();
const { Handoff, Batch, User, Event, Product } = require("../models");
const { sha256 } = require("../utils");
const { authMiddleware } = require("../middleware/auth");

// Get available users to handoff to - returns users with different roles
router.get("/available-recipients", authMiddleware, async (req, res) => {
    try {
        // Get users that could be recipients based on supply chain flow
        // FARMER -> PROCESSOR -> DISTRIBUTOR -> RETAILER
        const roleHierarchy = {
            'FARMER': ['PROCESSOR'],
            'PROCESSOR': ['DISTRIBUTOR', 'CONSUMER'],
            'DISTRIBUTOR': ['RETAILER'],
            'RETAILER': ['CONSUMER'],
            'ADMIN': ['FARMER', 'PROCESSOR', 'DISTRIBUTOR', 'RETAILER', 'CONSUMER']
        };

        const userRole = req.user.role;
        const allowedRoles = roleHierarchy[userRole] || [];

        const recipients = await User.find({
            role: { $in: allowedRoles },
            _id: { $ne: req.user.id }
        }).select('name email role organization');

        const formattedRecipients = recipients.map(r => ({
            id: r._id.toString(),
            name: r.name,
            email: r.email,
            role: r.role,
            organization: r.organization
        }));

        res.json({ success: true, recipients: formattedRecipients });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Initiate batch handoff
router.post("/:batchId", authMiddleware, async (req, res) => {
    try {
        const batchId = req.params.batchId;
        const { toUserId, handoffType, notes } = req.body;

        if (!toUserId || !handoffType) {
            return res.status(400).json({
                success: false,
                error: "toUserId and handoffType are required"
            });
        }

        // Verify batch exists and user has custody
        const query = req.params.batchId.startsWith('BATCH-') ? { batchId: req.params.batchId } : { _id: req.params.batchId };
        const batch = await Batch.findOne(query);

        if (!batch) {
            return res.status(404).json({ success: false, error: "Batch not found" });
        }

        // Check if user has custody (either created it or received it)
        const currentCustody = batch.currentHolder || batch.createdBy;
        if (currentCustody.toString() !== req.user.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({
                success: false,
                error: "You don't have custody of this batch"
            });
        }

        // Verify recipient exists and get their location
        const recipient = await User.findById(toUserId).select('name role organization location');

        if (!recipient) {
            return res.status(404).json({ success: false, error: "Recipient not found" });
        }

        // Create handoff hash for blockchain verification
        const handoffMeta = {
            batchId,
            fromUserId: req.user.id,
            toUserId: toUserId,
            handoffType,
            timestamp: Date.now()
        };
        const handoffHash = sha256(handoffMeta);

        // Create handoff record
        const handoff = await Handoff.create({
            batch: batch._id,
            fromUser: req.user.id,
            toUser: toUserId,
            handoffType,
            notes: notes || null,
            blockchain: {
                hash: handoffHash,
                timestamp: new Date()
            }
        });

        // Update batch custody
        await Batch.findByIdAndUpdate(batch._id, {
            currentHolder: toUserId,
            status: getStatusFromHandoffType(handoffType)
        });

        // If transferred to a consumer, automatically create a marketplace product
        if (recipient.role === 'CONSUMER') {
            // Check if product already exists for this batch
            const existingProduct = await Product.findOne({ batchId: batch._id });
            if (!existingProduct) {
                await Product.create({
                    name: batch.productName,
                    description: batch.description || `Fresh ${batch.productName} directly from ${batch.farmName}. Verified and traceable.`,
                    price: 0, // Placeholder
                    quantity: batch.weight,
                    unit: batch.weightUnit,
                    category: batch.productType || 'General',
                    batchId: batch._id,
                    retailerId: req.user.id, // The processor/retailer who handed it off
                    isAvailable: true
                });
            }
        }

        // Also create an event for the handoff
        const eventLocation = req.body.location || recipient.location || batch.location;
        await Event.create({
            batch: batch._id,
            eventType: 'handoff',
            description: `Batch handed off from ${req.user.name} to ${recipient.name} (${handoffType})`,
            location: eventLocation,
            timestamp: new Date(),
            actor: req.user.name,
            notes: notes || `to ${recipient.name}`,
            recipientName: recipient.name,
            handoffType: handoffType,
            blockchain: {
                hash: handoffHash
            }
        });

        res.json({
            success: true,
            handoff: {
                id: handoff.id,
                batchId,
                from: { id: req.user.id, name: req.user.name, role: req.user.role },
                to: { id: recipient.id, name: recipient.name, role: recipient.role },
                type: handoffType,
                hash: handoffHash
            }
        });
    } catch (err) {
        console.error("Handoff error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Get handoff history for a batch
router.get("/history/:batchId", authMiddleware, async (req, res) => {
    try {
        const batchId = req.params.batchId;

        const query = req.params.batchId.startsWith('BATCH-') ? { batchId: req.params.batchId } : { _id: req.params.batchId };
        const batch = await Batch.findOne(query);
        if (!batch) return res.status(404).json({ success: false, error: "Batch not found" });

        const handoffs = await Handoff.find({ batch: batch._id })
            .sort({ createdAt: 1 })
            .populate('fromUser', 'name role organization')
            .populate('toUser', 'name role organization');

        res.json({
            success: true,
            handoffs: handoffs.map(h => ({
                id: h._id,
                type: h.handoffType,
                from: h.fromUser,
                to: h.toUser,
                notes: h.notes,
                hash: h.blockchain?.hash,
                timestamp: h.createdAt
            }))
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Helper function to map handoff type to batch status
function getStatusFromHandoffType(type) {
    const statusMap = {
        'pickup': 'in_transit',
        'delivery': 'in_transit',
        'processing_start': 'processing',
        'processing_complete': 'processing',
        'retail_receive': 'completed',
        'sold': 'completed'
    };
    return statusMap[type] || 'in_transit';
}

module.exports = router;
