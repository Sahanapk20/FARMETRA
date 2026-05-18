const express = require("express");
const multer = require("multer");
const path = require("path");
const { Event, Batch, User } = require("../models");
const { sha256 } = require("../utils");
const { uploadFileToPinata, uploadJSONToPinata } = require("../pinata");
const { authMiddleware, optionalAuthMiddleware } = require("../middleware/auth");

const router = express.Router();
const upload = multer({ dest: path.join(__dirname, "../../uploads/") });

// Get all events (across all batches) - for events timeline
router.get("/all", optionalAuthMiddleware, async (req, res) => {
    try {
        // Build filter based on user
        let batchFilter = {};
        if (req.user && req.user.role !== 'ADMIN') {
            // Non-admin users see events from batches they created OR have custody of
            batchFilter = {
                $or: [
                    { createdBy: req.user.id },
                    { currentHolder: req.user.id }
                ]
            };
        }

        // Get batches user has access to
        const accessibleBatches = await Batch.find(
            req.user && req.user.role !== 'ADMIN' ? batchFilter : {}
        ).select('_id productName blockchain.hash');
        
        const batchIds = accessibleBatches.map(b => b._id);
        
        const events = await Event.find({
            batch: { $in: batchIds }
        })
            .sort({ createdAt: -1 })
            .populate('batch')
            .limit(100);

        const formatted = events.map(ev => ({
            id: ev._id,
            batchId: ev.batch?._id,
            batchName: ev.batch?.productName || `Batch #${ev.batch?._id}`,
            type: ev.eventType,
            description: ev.description,
            location: ev.location,
            timestamp: ev.timestamp || ev.createdAt.toISOString(),
            actor: ev.actor,
            temperature: ev.temperature,
            humidity: ev.humidity,
            verified: !!ev.blockchain?.hash
        }));

        res.json({ success: true, events: formatted });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.get("/:batchId", async (req, res) => {
    try {
        const batchId = req.params.batchId;

        // Verify batch exists
        const query = req.params.batchId.startsWith('BATCH-') ? { batchId: req.params.batchId } : { _id: req.params.batchId };
        const batch = await Batch.findOne(query);
        if (!batch) {
            return res.status(404).json({ success: false, error: "Batch not found" });
        }

        const events = await Event.find({ batch: batch._id })
            .sort({ createdAt: 1 });

        const formatted = events.map(ev => ({
            id: ev._id,
            type: ev.eventType,
            title: ev.eventType.charAt(0).toUpperCase() + ev.eventType.slice(1).replace(/_/g, ' '),
            description: ev.description,
            location: ev.location,
            timestamp: ev.timestamp || ev.createdAt.toISOString(),
            actor: ev.actor,
            temperature: ev.temperature,
            humidity: ev.humidity,
            notes: ev.notes,
            verified: !!ev.blockchain?.hash,
            txHash: ev.blockchain?.hash ? ev.blockchain.hash.substring(0, 12) + "..." : null
        }));

        res.json({ success: true, events: formatted });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Add event to batch - requires authentication
// Any authenticated user can add events (they will be tracked as actor)
router.post("/add/:batchId", authMiddleware, upload.fields([
    { name: "documents", maxCount: 5 },
    { name: "photos", maxCount: 10 }
]), async (req, res) => {
    try {
        const batchId = req.params.batchId;

        // Verify batch exists
        const query = req.params.batchId.startsWith('BATCH-') ? { batchId: req.params.batchId } : { _id: req.params.batchId };
        const batch = await Batch.findOne(query);
        if (!batch) {
            return res.status(404).json({ success: false, error: "Batch not found" });
        }

        const {
            eventType,
            description,
            location,
            timestamp,
            actor,
            temperature,
            humidity,
            notes
        } = req.body;

        // Validate required fields
        if (!eventType || !description || !location || !actor) {
            return res.status(400).json({
                success: false,
                error: "Missing required fields: eventType, description, location, actor"
            });
        }

        let documentCIDs = [];
        let photoCIDs = [];

        // Upload documents to IPFS if present
        if (req.files && req.files.documents) {
            for (let file of req.files.documents) {
                try {
                    const result = await uploadFileToPinata(file.path);
                    documentCIDs.push(result.ipfsHash);
                } catch (e) {
                    console.log("Document upload failed:", e.message);
                }
            }
        }

        // Upload photos to IPFS if present
        if (req.files && req.files.photos) {
            for (let photo of req.files.photos) {
                try {
                    const result = await uploadFileToPinata(photo.path);
                    photoCIDs.push(result.ipfsHash);
                } catch (e) {
                    console.log("Photo upload failed:", e.message);
                }
            }
        }

        // Get previous event for chain
        const previousEvent = await Event.findOne({ batch: batch._id })
            .sort({ createdAt: -1 });

        // Build metadata for hashing
        const eventTimestamp = timestamp || new Date().toISOString();
        const meta = {
            batchId,
            eventType,
            description,
            location,
            timestamp: eventTimestamp,
            actor,
            temperature,
            humidity,
            notes,
            documentCIDs,
            photoCIDs,
            previousHash: previousEvent ? previousEvent.eventHash : null
        };

        const eventHash = sha256(meta);

        // Upload event metadata to IPFS
        let eventIpfsHash = null;
        try {
            const ipfsResult = await uploadJSONToPinata(meta);
            eventIpfsHash = ipfsResult.ipfsHash;
        } catch (e) {
            console.log("Event IPFS upload failed:", e.message);
        }

        // Store extra data in notes as JSON if we have files
        let notesContent = notes || '';
        if (documentCIDs.length > 0 || photoCIDs.length > 0) {
            const extraData = {
                originalNotes: notes,
                documentCIDs,
                photoCIDs
            };
            notesContent = JSON.stringify(extraData);
        }

        // Create event
        const event = await Event.create({
            batch: batch._id,
            eventType,
            description,
            location,
            timestamp: eventTimestamp,
            actor,
            temperature: temperature || null,
            humidity: humidity || null,
            notes: notesContent || null,
            documents: documentCIDs,
            photos: photoCIDs,
            blockchain: {
                hash: eventHash,
                previousHash: previousEvent ? previousEvent.blockchain?.hash : null
            },
            ipfsHash: eventIpfsHash
        });

        // Update batch status based on event type
        const statusMap = {
            'shipment': 'in_transit',
            'shipping': 'in_transit',
            'transit': 'in_transit',
            'processing': 'processing',
            'quality_check': 'processing',
            'storage': 'processing',
            'delivery': 'completed',
            'received': 'completed',
            'completed': 'completed'
        };

        const newStatus = statusMap[eventType.toLowerCase()];
        if (newStatus && newStatus !== batch.status) {
            await Batch.findByIdAndUpdate(batch._id, { status: newStatus });
        }

        res.json({
            success: true,
            event: {
                id: event._id,
                type: event.eventType,
                hash: eventHash,
                previousHash: event.blockchain?.previousHash,
                timestamp: event.timestamp
            }
        });

    } catch (err) {
        console.error("Add event error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Delete event (only latest event in chain)
router.delete("/:eventId", async (req, res) => {
    try {
        const eventId = req.params.eventId;

        const event = await Event.findById(req.params.eventId);
        if (!event) {
            return res.status(404).json({ success: false, error: "Event not found" });
        }

        // Check if this is the latest event in the batch
        const latestEvent = await Event.findOne({ batch: event.batch })
            .sort({ createdAt: -1 });

        if (latestEvent._id.toString() !== req.params.eventId) {
            return res.status(400).json({
                success: false,
                error: "Can only delete the latest event in a batch to maintain chain integrity"
            });
        }

        await Event.findByIdAndDelete(req.params.eventId);

        res.json({ success: true, message: "Event deleted" });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
