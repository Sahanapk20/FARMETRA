const express = require("express");
const router = express.Router();
const { Batch, Event, User, QRCode } = require("../models");
const { sha256 } = require("../utils");
const { authMiddleware, optionalAuthMiddleware, requireRole } = require("../middleware/auth");
const { uploadFileToPinata, uploadJSONToPinata } = require("../pinata");
const generateQR = require("../qr");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Configure multer for certification uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, "../../uploads/certifications");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// List batches - filtered by user role
// Admin sees all, others see their own batches
router.get("/", optionalAuthMiddleware, async (req, res) => {
    try {
        // Build where filter based on user role
        let whereFilter = {};

        if (req.user) {
            const role = req.user.role;
            // Admin sees all batches
            if (role !== 'ADMIN') {
                // Other roles see only their created batches or batches in their custody
                whereFilter = { $or: [{ createdBy: req.user.id }, { currentHolder: req.user.id }] };
            }
        }

        const batches = await Batch.find(whereFilter)
            .sort({ createdAt: -1 })
            .populate('events')
            .populate('user')
            .populate('childBatches');

        const formattedBatches = batches.map(batch => ({
            id: batch._id.toString(),
            batchId: batch.blockchain?.hash ? batch.blockchain.hash.substring(0, 16).toUpperCase() : `BATCH-${batch._id}`,
            product: batch.productName,
            productType: batch.productType,
            weight: batch.weight,
            weightUnit: batch.weightUnit,
            origin: batch.location || batch.farmName,
            status: batch.status || (batch.events && batch.events.length > 0 ? "in_transit" : "created"),
            createdAt: batch.createdAt.toISOString().split("T")[0],
            hasQR: !!batch.qrCode,
            blockchainVerified: !!batch.blockchain?.hash,
            ipfs: batch.blockchain?.ipfsHash,
            parentBatchId: batch.parentBatch,
            childBatchCount: batch.childBatches?.length || 0,
            owner: batch.user?.name || 'Unknown',
            ownerRole: batch.user?.role || 'Unknown'
        }));

        res.json({ success: true, batches: formattedBatches });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Get batch by ID
router.get("/:id", async (req, res) => {
    try {
        const query = req.params.id.startsWith('BATCH-') ? { batchId: req.params.id } : { _id: req.params.id };
        const batch = await Batch.findOne(query)
            .populate('events')
            .populate('user')
            .populate('childBatches')
            .populate('parentBatch');

        if (!batch) {
            return res.status(404).json({ success: false, error: "Batch not found" });
        }

        const qrCodeInfo = await QRCode.findOne({ batch: batch._id });

        const formatted = {
            id: batch._id.toString(),
            batchId: batch.blockchain?.hash ? batch.blockchain.hash.substring(0, 16).toUpperCase() : `BATCH-${batch._id}`,
            product: {
                name: batch.productName,
                type: batch.productType,
                variety: "Standard",
                description: batch.description || `${batch.productName} batch`
            },
            weight: batch.weight,
            weightUnit: batch.weightUnit,
            quantity: batch.quantity || null,
            quantityUnit: batch.unit || null,
            status: batch.status || (batch.events && batch.events.length > 0 ? "in_transit" : "created"),
            origin: {
                farm: batch.farmName,
                farmerId: `F-${batch.user?._id || 0}`,
                location: batch.location,
                harvestDate: batch.harvestDate || batch.createdAt.toISOString().split("T")[0]
            },
            certifications: batch.certifications ?
                (Array.isArray(batch.certifications) ?
                    batch.certifications.map(c => ({ name: c, verified: true })) :
                    []) :
                [],
            certificationId: batch.certificationId || null,
            blockchain: {
                hash: batch.blockchain?.hash || "0x" + batch._id.toString().padStart(64, '0'),
                network: batch.blockchain?.network || "IPFS (Pinata)",
                timestamp: batch.blockchain?.timestamp || batch.createdAt?.toISOString() || new Date().toISOString(),
                blockNumber: batch._id,
                ipfsHash: batch.blockchain?.ipfsHash || null,
                ipfsUrl: batch.blockchain?.ipfsUrl || (batch.blockchain?.ipfsHash ? `https://gateway.pinata.cloud/ipfs/${batch.blockchain.ipfsHash}` : null)
            },
            events: batch.events.map(ev => ({
                id: ev.id,
                type: ev.eventType,
                title: ev.eventType,
                description: ev.description,
                location: ev.location,
                timestamp: ev.timestamp || ev.createdAt.toISOString(),
                actor: ev.actor,
                verified: !!ev.eventHash,
                txHash: ev.eventHash ? ev.eventHash.substring(0, 12) + "..." : null
            })),
            hasQR: !!qrCodeInfo,
            qrCode: qrCodeInfo ? {
                url: qrCodeInfo.qrImageUrl || qrCodeInfo.publicUrl,
                hash: qrCodeInfo.hash
            } : null,
            parentBatchId: batch.parentBatchId,
            parentBatch: batch.parentBatch ? {
                id: batch.parentBatch.id.toString(),
                batchId: batch.parentBatch.batchHash ? batch.parentBatch.batchHash.substring(0, 16).toUpperCase() : `BATCH-${batch.parentBatch.id}`,
                weight: batch.parentBatch.weight,
                weightUnit: batch.parentBatch.weightUnit
            } : null,
            childBatches: (batch.childBatches || []).map(child => ({
                id: child.id.toString(),
                batchId: child.batchHash ? child.batchHash.substring(0, 16).toUpperCase() : `BATCH-${child.id}`,
                weight: child.weight,
                weightUnit: child.weightUnit,
                status: child.status || 'created',
                location: child.location
            })),
            createdAt: batch.createdAt.toISOString()
        };

        res.json({ success: true, batch: formatted });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Create batch - Only FARMER and ADMIN can create batches
router.post("/create", authMiddleware, requireRole(['FARMER', 'ADMIN']), upload.any(), async (req, res) => {
    try {
        let {
            productName,
            productType,
            quantity,
            unit,
            weight,
            weightUnit,
            farmName,
            location,
            harvestDate,
            description,
            certifications,
            certificationId
        } = req.body;

        // certifications might be a string if sent via FormData with one item, or undefined
        if (typeof certifications === 'string') {
            certifications = [certifications];
        } else if (!certifications) {
            certifications = [];
        }

        // Validate required fields
        if (!productName || !productType || !weight || !farmName || !location) {
            return res.status(400).json({
                success: false,
                error: "Missing required fields: productName, productType, weight, farmName, location"
            });
        }

        // Get user from auth middleware (already verified)
        const userId = req.user.id;

        // 1. Metadata for hashing
        const meta = {
            productName,
            productType,
            weight: parseFloat(weight),
            farmName,
            location,
            harvestDate,
            timestamp: Date.now()
        };

        // 2. Hash it
        const batchHash = sha256(meta);

        // 3. Upload metadata to IPFS (Pinata)
        let ipfsHash = null;
        let ipfsUrl = null;
        try {
            const ipfsResult = await uploadJSONToPinata(meta);
            ipfsHash = ipfsResult.ipfsHash;
            ipfsUrl = ipfsResult.url;
        } catch (e) {
            console.log("IPFS upload failed (continuing without):", e.message);
        }

        // 4. Create batch in database
        const batch = await Batch.create({
            productName,
            productType,
            quantity: quantity || null,
            unit: unit || null,
            weight: parseFloat(weight),
            weightUnit: weightUnit || "kg",
            farmName,
            location,
            harvestDate: harvestDate || null,
            description: description || null,
            certifications: certifications || [],
            certificationId: certificationId || null,
            certificationFiles: [], // Will be populated below
            status: "created",
            blockchain: {
                hash: batchHash,
                ipfsHash: ipfsHash,
                ipfsUrl: ipfsUrl,
                timestamp: new Date()
            },
            createdBy: userId
        });

        // 4.5 Process certification files
        if (req.files && req.files.length > 0) {
            const certFiles = [];
            for (const file of req.files) {
                // file.fieldname is like "cert-Organic Certified"
                const certName = file.fieldname.startsWith('cert-') 
                    ? file.fieldname.replace('cert-', '') 
                    : 'Other Certificate';
                
                let ipfsHash = null;
                let ipfsUrl = null;
                
                try {
                    // Upload to Pinata
                    const pinataResult = await uploadFileToPinata(file.path);
                    ipfsHash = pinataResult.ipfsHash;
                    ipfsUrl = pinataResult.url;
                } catch (pinataErr) {
                    console.error(`Pinata upload failed for ${certName}:`, pinataErr.message);
                }

                certFiles.push({
                    certName: certName,
                    fileUrl: `/uploads/certifications/${file.filename}`,
                    ipfsHash: ipfsHash,
                    status: 'pending'
                });
            }
            
            // Update batch with certification files
            await Batch.findByIdAndUpdate(batch._id, { certificationFiles: certFiles });
        }

        // 5. Auto-generate QR code
        const verifyUrl = `${process.env.BASE_URL || 'http://localhost:5173'}/verify?id=${batch._id}`;
        let qrDataUrl = null;
        try {
            qrDataUrl = await generateQR(verifyUrl);
            await QRCode.create({
                batch: batch._id,
                qrData: verifyUrl,
                qrImageUrl: qrDataUrl,
                publicUrl: verifyUrl,
                hash: batchHash
            });
            // Update batch to reflect QR code existence
            await Batch.findByIdAndUpdate(batch._id, { hasQR: true, qrCode: qrDataUrl });
        } catch (e) {
            console.log("QR generation failed:", e.message);
        }

        res.json({
            success: true,
            batch: {
                id: batch._id.toString(),
                batchId: batchHash.substring(0, 16).toUpperCase(),
                product: batch.productName,
                weight: batch.weight,
                hash: batchHash,
                ipfs: ipfsHash,
                qr: qrDataUrl
            }
        });

    } catch (err) {
        console.error("Create batch error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Update batch status
router.patch("/:id/status", async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ["created", "in_transit", "processing", "completed"];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                error: `Invalid status. Must be one of: ${validStatuses.join(", ")}`
            });
        }

        const batch = await Batch.findByIdAndUpdate(req.params.id, { status });

        res.json({ success: true, batch: { id: batch._id, status: batch.status } });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Split batch - Only FARMER, PROCESSOR, and ADMIN can split batches
router.post("/split/:id", authMiddleware, requireRole(['FARMER', 'PROCESSOR', 'DISTRIBUTOR', 'RETAILER', 'ADMIN']), async (req, res) => {
    try {
        const parentId = req.params.id;
        const { splits } = req.body; // Array of { weight, destination }

        console.log("Split request received:", JSON.stringify(splits, null, 2));

        if (!splits || !Array.isArray(splits) || splits.length === 0) {
            return res.status(400).json({
                success: false,
                error: "Splits array is required"
            });
        }

        const parent = await Batch.findById(parentId);

        if (!parent) {
            return res.status(404).json({ success: false, error: "Batch not found" });
        }

        // Validate total split weight doesn't exceed parent
        const totalSplitWeight = splits.reduce((sum, s) => sum + parseFloat(s.weight || 0), 0);
        if (totalSplitWeight > parent.weight) {
            return res.status(400).json({
                success: false,
                error: `Total split weight (${totalSplitWeight}) exceeds parent batch weight (${parent.weight})`
            });
        }

        const childBatches = [];

        for (let i = 0; i < splits.length; i++) {
            const split = splits[i];
            const childMeta = {
                parentBatchId: parentId,
                productName: parent.productName,
                weight: parseFloat(split.weight),
                splitIndex: i,
                timestamp: Date.now()
            };

            const childHash = sha256(childMeta);

            // Upload child metadata to IPFS
            let childIpfsHash = null;
            try {
                const ipfsResult = await uploadJSONToPinata(childMeta);
                childIpfsHash = ipfsResult.ipfsHash;
            } catch (e) {
                console.log("Child IPFS upload failed:", e.message);
            }

            const child = await Batch.create({
                productName: parent.productName,
                productType: parent.productType,
                weight: parseFloat(split.weight),
                weightUnit: parent.weightUnit,
                farmName: parent.farmName,
                location: split.destination || parent.location,
                harvestDate: parent.harvestDate,
                description: `Split from BATCH-${parentId} (${i + 1}/${splits.length})`,
                certifications: parent.certifications,
                certificationId: parent.certificationId,
                status: "created",
                blockchain: {
                    hash: childHash,
                    ipfsHash: childIpfsHash
                },
                parentBatch: parentId,
                createdBy: parent.createdBy,
                currentHolder: req.user.id  // Transfer custody to the user performing the split
            });

            // Create split event for child batch
            await Event.create({
                batch: child._id,
                eventType: 'split',
                description: `Split from parent batch BATCH-${parentId}`,
                location: split.destination || parent.location,
                timestamp: new Date(),
                actor: req.user.name,
                blockchain: {
                    hash: childHash
                }
            });

            // Auto-generate QR for child
            const verifyUrl = `${process.env.BASE_URL || 'http://localhost:5173'}/verify?id=${child._id}`;
            try {
                await QRCode.create({
                    batch: child._id,
                    qrData: verifyUrl,
                    qrImageUrl: await generateQR(verifyUrl),
                    publicUrl: verifyUrl,
                    hash: childHash
                });
            } catch (e) {
                console.log("Child QR failed:", e.message);
            }

            childBatches.push({
                id: child._id.toString(),
                batchId: childHash.substring(0, 16).toUpperCase(),
                weight: child.weight,
                destination: split.destination || parent.location,
                parentBatchId: parentId,
                ipfs: childIpfsHash
            });
        }

        // Update parent batch: reduce weight and mark as split
        const remainingWeight = parent.weight - totalSplitWeight;
        await Batch.findByIdAndUpdate(parentId, {
            weight: remainingWeight,
            status: "split"
        });

        res.json({
            success: true,
            childBatches,
            parentRemainingWeight: remainingWeight
        });
    } catch (err) {
        console.error("Split batch error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;