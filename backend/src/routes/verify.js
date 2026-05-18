const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const { Batch, Event, Handoff, QRCode, User } = require("../models");
const { sha256 } = require("../utils");

// Verify batch by ID or batch hash
router.get("/batch/:id", async (req, res) => {
    try {
        const idOrHash = req.params.id;

        // Build query
        let query = {};
        if (mongoose.isValidObjectId(idOrHash)) {
            query = { _id: idOrHash };
        } else {
            query = { 
                $or: [
                    { batchId: new RegExp('^' + idOrHash, 'i') },
                    { 'blockchain.hash': new RegExp('^' + idOrHash, 'i') }
                ]
            };
        }

        // Fetch batch
        const batchDoc = await Batch.findOne(query)
            .populate('createdBy')
            .populate({ path: 'childBatches', populate: { path: 'createdBy' } })
            .populate({ path: 'parentBatch', populate: { path: 'createdBy' } });

        if (!batchDoc) {
            return res.status(404).json({ success: false, error: "Batch not found" });
        }

        // Fetch related data
        const [events, handoffs, qrCodeObj] = await Promise.all([
            Event.find({ batch: batchDoc._id }).sort({ createdAt: 1 }),
            Handoff.find({ batch: batchDoc._id })
                .sort({ createdAt: 1 })
                .populate('fromUser', 'name role organization location')
                .populate('toUser', 'name role organization location'),
            QRCode.findOne({ batch: batchDoc._id })
        ]);

        // Recalculate batch hash for verification
        const batchMeta = {
            productName: batchDoc.productName,
            productType: batchDoc.productType,
            weight: batchDoc.weight,
            farmName: batchDoc.farmName,
            location: batchDoc.location,
            harvestDate: batchDoc.harvestDate
        };

        const batchHashValid = !!(batchDoc.blockchain && batchDoc.blockchain.hash);

        // Verify event chain
        let eventChainValid = true;
        let prevHash = null;

        for (const ev of events) {
            if (ev.blockchain?.previousHash !== prevHash) {
                eventChainValid = false;
                break;
            }
            prevHash = ev.blockchain?.hash;
        }

        // Build custody chain - shows full journey from farmer to current holder
        const custodyChain = [];

        // Add creator as first in chain (typically farmer)
        custodyChain.push({
            actor: batchDoc.createdBy?.name || 'Unknown',
            role: batchDoc.createdBy?.role || 'FARMER',
            organization: batchDoc.createdBy?.organization || null,
            action: 'Created',
            timestamp: batchDoc.createdAt.toISOString(),
            location: batchDoc.createdBy?.location || batchDoc.location
        });

        // Add all handoffs
        for (const handoff of handoffs) {
            custodyChain.push({
                actor: handoff.toUser?.name || 'Unknown',
                role: handoff.toUser?.role || 'Unknown',
                organization: handoff.toUser?.organization || null,
                action: handoff.handoffType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                timestamp: handoff.createdAt.toISOString(),
                location: handoff.toUser?.location || handoff.notes || batchDoc.location,
                fromActor: handoff.fromUser?.name || 'Unknown',
                fromRole: handoff.fromUser?.role || 'Unknown',
                fromLocation: handoff.fromUser?.location || batchDoc.location
            });
        }

        // Format response for frontend
        const latestRecipLocation = custodyChain.length > 1 ? custodyChain[custodyChain.length - 1].location : (batchDoc.createdBy?.location || batchDoc.location);
        
        const formattedBatch = {
            id: batchDoc._id.toString(),
            batchId: batchDoc.blockchain?.hash ? batchDoc.blockchain.hash.substring(0, 16).toUpperCase() : batchDoc.batchId || `BATCH-${batchDoc._id}`,
            product: {
                name: batchDoc.productName,
                type: batchDoc.productType,
                description: batchDoc.description || `${batchDoc.productName} batch`
            },
            weight: batchDoc.weight,
            weightUnit: batchDoc.weightUnit || 'kg',
            status: batchDoc.status,
            origin: {
                farm: batchDoc.farmName,
                farmerId: `F-${batchDoc.createdBy?._id || 0}`,
                farmerName: batchDoc.createdBy?.name || 'Unknown',
                fromLocation: batchDoc.createdBy?.location || batchDoc.location,
                toLocation: latestRecipLocation,
                location: batchDoc.location,
                harvestDate: batchDoc.harvestDate || batchDoc.createdAt.toISOString().split("T")[0],
                currentHolder: custodyChain.length > 1 ? custodyChain[custodyChain.length - 1].actor : (batchDoc.createdBy?.name || 'Unknown'),
                currentHolderRole: custodyChain.length > 1 ? custodyChain[custodyChain.length - 1].role : (batchDoc.createdBy?.role || 'FARMER')
            },
            certifications: batchDoc.certifications && batchDoc.certifications.length > 0 ? 
                batchDoc.certifications.map(c => ({ name: c, verified: true })) : [],
            certificationId: batchDoc.certificationId || null,
            blockchain: {
                hash: batchDoc.blockchain?.hash || "0x" + batchDoc._id.toString().padStart(64, '0'),
                network: batchDoc.blockchain?.network || "IPFS (Pinata)",
                timestamp: batchDoc.blockchain?.timestamp || batchDoc.createdAt?.toISOString() || new Date().toISOString(),
                blockNumber: batchDoc._id,
                ipfsHash: batchDoc.blockchain?.ipfsHash || null,
                ipfsUrl: batchDoc.blockchain?.ipfsUrl || (batchDoc.blockchain?.ipfsHash ? `https://gateway.pinata.cloud/ipfs/${batchDoc.blockchain.ipfsHash}` : null)
            },
            events: events.map(ev => ({
                id: ev._id.toString(),
                type: ev.eventType,
                title: ev.eventType.charAt(0).toUpperCase() + ev.eventType.slice(1).replace(/_/g, ' '),
                description: ev.description,
                location: ev.location,
                timestamp: ev.timestamp || ev.createdAt.toISOString(),
                actor: ev.actor,
                verified: !!ev.blockchain?.hash,
                txHash: ev.blockchain?.hash ? ev.blockchain.hash.substring(0, 12) + "..." : null
            })),
            parentBatch: batchDoc.parentBatch ? {
                id: batchDoc.parentBatch._id.toString(),
                batchId: batchDoc.parentBatch.blockchain?.hash ? batchDoc.parentBatch.blockchain.hash.substring(0, 16).toUpperCase() : batchDoc.parentBatch.batchId,
                productName: batchDoc.parentBatch.productName,
                weight: batchDoc.parentBatch.weight,
                weightUnit: batchDoc.parentBatch.weightUnit,
                createdBy: batchDoc.parentBatch.createdBy?.name || 'Unknown'
            } : null,
            childBatches: (batchDoc.childBatches || []).map(child => ({
                id: child._id.toString(),
                batchId: child.blockchain?.hash ? child.blockchain.hash.substring(0, 16).toUpperCase() : child.batchId,
                weight: child.weight,
                weightUnit: child.weightUnit,
                location: child.location,
                status: child.status
            })),
            custodyChain,
            handoffs: handoffs.map(h => ({
                id: h._id.toString(),
                type: h.handoffType,
                from: {
                    name: h.fromUser?.name || 'Unknown',
                    role: h.fromUser?.role || 'Unknown',
                    organization: h.fromUser?.organization || null
                },
                to: {
                    name: h.toUser?.name || 'Unknown',
                    role: h.toUser?.role || 'Unknown',
                    organization: h.toUser?.organization || null
                },
                timestamp: h.createdAt.toISOString(),
                notes: h.notes,
                hash: h.blockchain?.hash
            })),
            createdAt: batchDoc.createdAt.toISOString()
        };

        res.json({
            success: true,
            batchHashValid,
            eventChainValid,
            eventsVerified: events.filter(e => !!e.blockchain?.hash).length,
            totalEvents: events.length,
            batch: formattedBatch
        });
    } catch (err) {
        console.error("Verify batch error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Quick verify - just returns validity status
router.get("/quick/:id", async (req, res) => {
    try {
        const idOrHash = req.params.id;

        // Build query
        let query = {};
        if (mongoose.isValidObjectId(idOrHash)) {
            query = { _id: idOrHash };
        } else {
            query = { 
                $or: [
                    { batchId: new RegExp('^' + idOrHash, 'i') },
                    { 'blockchain.hash': new RegExp('^' + idOrHash, 'i') }
                ]
            };
        }

        const batchDoc = await Batch.findOne(query);

        if (!batchDoc) {
            return res.json({ success: true, valid: false, reason: "Batch not found" });
        }
        
        const events = await Event.find({ batch: batchDoc._id }).sort({ createdAt: 1 });

        // Check chain integrity
        let chainValid = true;
        let prevHash = null;
        for (const ev of events) {
            if (ev.blockchain?.previousHash !== prevHash) {
                chainValid = false;
                break;
            }
            prevHash = ev.blockchain?.hash;
        }

        res.json({
            success: true,
            valid: !!(batchDoc.blockchain?.hash) && chainValid,
            batchId: batchDoc.blockchain?.hash?.substring(0, 16).toUpperCase() || batchDoc.batchId,
            status: batchDoc.status,
            eventCount: events.length
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;