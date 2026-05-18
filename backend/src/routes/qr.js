const express = require("express");
const multer = require("multer");
const path = require("path");
const { Batch, QRCode } = require("../models");
const { uploadFileToPinata } = require("../pinata");
const generateQR = require("../qr");
const { authMiddleware, optionalAuthMiddleware } = require("../middleware/auth");

const upload = multer({ dest: path.join(__dirname, "../../uploads/") });
const router = express.Router();

/**
 * POST /qr/upload-file
 * Upload a file and get QR code
 */
router.post("/upload-file", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: "file required" });

    const filePath = req.file.path;
    const { ipfsHash, url } = await uploadFileToPinata(filePath);

    // create QR for gateway url
    const qrDataUrl = await generateQR(url);

    res.json({ success: true, ipfsHash, ipfsUrl: url, qrDataUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /qr/generate/:batchId
 * Generate QR code for a batch
 */
router.post("/generate/:batchId", async (req, res) => {
  try {
    const query = req.params.batchId.startsWith('BATCH-') ? { batchId: req.params.batchId } : { _id: req.params.batchId };
    const batch = await Batch.findOne(query);

    if (!batch) {
      return res.status(404).json({ success: false, error: "Batch not found" });
    }

    // Generate verification URL
    const batchCode = batch.blockchain?.hash ? batch.blockchain.hash.substring(0, 16).toUpperCase() : `BATCH-${batch._id}`;
    const verifyUrl = `${process.env.BASE_URL || 'http://localhost:5173'}/verify?id=${batch._id}`;

    // Generate QR code data URL
    const qrDataUrl = await generateQR(verifyUrl);

    // Store QR code in database
    let qrCode = await QRCode.findOne({ batch: batch._id });

    if (qrCode) {
      qrCode.qrData = verifyUrl;
      qrCode.qrImageUrl = qrDataUrl;
      qrCode.publicUrl = verifyUrl;
      await qrCode.save();
    } else {
      qrCode = await QRCode.create({
        batch: batch._id,
        qrData: verifyUrl,
        qrImageUrl: qrDataUrl,
        publicUrl: verifyUrl
      });
    }

    // Update batch with QR code status
    await Batch.findByIdAndUpdate(batch._id, { hasQR: true, qrCode: qrDataUrl });

    res.json({
      success: true,
      batchId: batchCode,
      qrDataUrl,
      verifyUrl
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /qr/batch/:batchId
 * Get existing QR code for a batch
 */
router.get("/batch/:batchId", async (req, res) => {
  try {
    const query = req.params.batchId.startsWith('BATCH-') ? { batchId: req.params.batchId } : { _id: req.params.batchId };
    const batch = await Batch.findOne(query);
    if (!batch) return res.status(404).json({ success: false, error: "Batch not found" });

    const qrCode = await QRCode.findOne({ batch: batch._id })
      .populate('batch');

    if (!qrCode) {
      return res.status(404).json({ success: false, error: "QR code not found. Generate one first." });
    }

    // Regenerate QR image
    const qrDataUrl = await generateQR(qrCode.qrData);

    res.json({
      success: true,
      qrCode: {
        id: qrCode._id.toString(),
        batchId: qrCode.batch.blockchain?.hash?.substring(0, 16).toUpperCase() || `BATCH-${qrCode.batch._id}`,
        url: qrCode.qrData,
        qrDataUrl,
        product: qrCode.batch.productName
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /qr/list
 * List QR codes - filtered by user (users see only their own batches' QR codes)
 */
router.get("/list", optionalAuthMiddleware, async (req, res) => {
  try {
    // Build batch filter based on user
    let batchFilter = {};

    if (req.user && req.user.role !== 'ADMIN') {
      // Non-admin users see QR codes only for batches they created or have custody of
      batchFilter = {
        $or: [
          { createdBy: req.user.id },
          { currentHolder: req.user.id }
        ]
      };
    }

    const batchDocs = await Batch.find(batchFilter).select('_id');
    const batchIds = batchDocs.map(b => b._id);

    const qrCodes = await QRCode.find({
      batch: { $in: batchIds }
    })
      .sort({ createdAt: -1 })
      .populate('batch');

    const formatted = qrCodes.map(qr => ({
      id: qr._id.toString(),
      batchId: qr.batch.batchId || `BATCH-${qr.batch._id}`,
      type: "static",
      product: qr.batch.productName,
      createdAt: qr.batch.createdAt.toISOString().split("T")[0],
      scans: qr.scanCount || 0,
      lastScanned: qr.lastScannedAt,
      status: qr.isActive ? "active" : "inactive",
      url: qr.qrData
    }));

    res.json({ success: true, qrCodes: formatted });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /qr/:batchId
 * Delete QR code for a batch
 */
router.delete("/:batchId", async (req, res) => {
  try {
    const query = req.params.batchId.startsWith('BATCH-') ? { batchId: req.params.batchId } : { _id: req.params.batchId };
    const batch = await Batch.findOne(query);
    if (!batch) return res.status(404).json({ success: false, error: "Batch not found" });

    const qrCode = await QRCode.findOne({ batch: batch._id });

    if (!qrCode) {
      return res.status(404).json({ success: false, error: "QR code not found" });
    }

    await QRCode.findByIdAndDelete(qrCode._id);
    await Batch.findByIdAndUpdate(batch._id, { hasQR: false, qrCode: null });

    res.json({ success: true, message: "QR code deleted" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;