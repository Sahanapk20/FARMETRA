const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Product, Order, Batch, User, Event, Handoff, CropAnalysis } = require('../models');
const { authMiddleware, optionalAuthMiddleware, requireRole } = require('../middleware/auth');

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../uploads/products');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'product-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  }
});

// ============ PUBLIC ROUTES ============

// GET /marketplace/products — Public product listing
router.get('/products', async (req, res) => {
  try {
    const { search, category, minPrice, maxPrice, sort } = req.query;
    let filter = { isAvailable: true };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    if (category && category !== 'All') {
      filter.category = category;
    }
    if (minPrice) filter.price = { ...filter.price, $gte: Number(minPrice) };
    if (maxPrice) filter.price = { ...filter.price, $lte: Number(maxPrice) };

    let sortOption = { createdAt: -1 };
    if (sort === 'price_asc') sortOption = { price: 1 };
    if (sort === 'price_desc') sortOption = { price: -1 };
    if (sort === 'name') sortOption = { name: 1 };

    const products = await Product.find(filter)
      .sort(sortOption)
      .populate('retailerId', 'name organization location')
      .populate('batchId', 'batchId productName status');

    res.json({
      success: true,
      products: products.map(p => ({
        id: p._id.toString(),
        name: p.name,
        description: p.description,
        price: p.price,
        quantity: p.quantity,
        unit: p.unit,
        category: p.category,
        image: p.image,
        isAvailable: p.isAvailable,
        retailer: p.retailerId ? {
          name: p.retailerId.name,
          organization: p.retailerId.organization,
          location: p.retailerId.location
        } : null,
        batch: p.batchId ? {
          batchId: p.batchId.batchId,
          productName: p.batchId.productName,
          status: p.batchId.status
        } : null,
        createdAt: p.createdAt
      }))
    });
  } catch (err) {
    console.error('Products listing error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /marketplace/products/:id — Product detail with supply chain
router.get('/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('retailerId', 'name organization location email')
      .populate({
        path: 'batchId',
        populate: [
          { path: 'createdBy', select: 'name organization location role' },
          { path: 'currentHolder', select: 'name organization location role' }
        ]
      });

    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    // Get supply chain events
    let events = [];
    let cropAnalysis = null;
    let handoffs = [];

    if (product.batchId) {
      events = await Event.find({ batch: product.batchId._id }).sort({ createdAt: 1 });
      handoffs = await Handoff.find({ batch: product.batchId._id })
        .populate('fromUser', 'name role organization location')
        .populate('toUser', 'name role organization location')
        .sort({ createdAt: 1 });

      // Try to find crop analysis for this batch's farmer
      if (product.batchId.createdBy) {
        cropAnalysis = await CropAnalysis.findOne({
          farmerId: product.batchId.createdBy._id
        }).sort({ createdAt: -1 });
      }
    }

    // Build supply chain timeline
    const timeline = [];

    // Step 1: Crop Growth (from analysis)
    if (cropAnalysis) {
      timeline.push({
        step: 'Crop Growth Analysis',
        role: 'Smart Agriculture',
        actor: 'ML System',
        details: {
          soilType: cropAnalysis.soilType,
          weather: cropAnalysis.weather,
          disease: cropAnalysis.diseaseDetected,
          recommendedCrops: cropAnalysis.recommendedCrops
        },
        timestamp: cropAnalysis.createdAt,
        icon: 'sprout'
      });
    }

    // Step 2: Farmer
    if (product.batchId && product.batchId.createdBy) {
      timeline.push({
        step: 'Harvested by Farmer',
        role: 'FARMER',
        actor: product.batchId.createdBy.name,
        organization: product.batchId.createdBy.organization,
        location: product.batchId.location || product.batchId.createdBy.location,
        timestamp: product.batchId.createdAt,
        icon: 'leaf'
      });
    }

    // Add handoff steps
    handoffs.forEach(h => {
      const roleMap = {
        'PROCESSOR': 'Processed',
        'DISTRIBUTOR': 'Distributed',
        'RETAILER': 'Received by Retailer'
      };
      timeline.push({
        step: roleMap[h.toUser?.role] || `Transferred to ${h.toUser?.role}`,
        role: h.toUser?.role || 'Unknown',
        actor: h.toUser?.name || 'Unknown',
        organization: h.toUser?.organization,
        location: h.toUser?.location,
        timestamp: h.createdAt,
        icon: h.toUser?.role === 'PROCESSOR' ? 'factory' :
              h.toUser?.role === 'DISTRIBUTOR' ? 'truck' : 'store'
      });
    });

    // Step: Retailer listing
    timeline.push({
      step: 'Listed on Marketplace',
      role: 'RETAILER',
      actor: product.retailerId?.name || 'Retailer',
      organization: product.retailerId?.organization,
      location: product.retailerId?.location,
      timestamp: product.createdAt,
      icon: 'shopping-cart'
    });

    res.json({
      success: true,
      product: {
        id: product._id.toString(),
        name: product.name,
        description: product.description,
        price: product.price,
        quantity: product.quantity,
        unit: product.unit,
        category: product.category,
        image: product.image,
        isAvailable: product.isAvailable,
        retailer: product.retailerId ? {
          name: product.retailerId.name,
          organization: product.retailerId.organization,
          location: product.retailerId.location
        } : null,
        batch: product.batchId ? {
          id: product.batchId._id.toString(),
          batchId: product.batchId.batchId,
          productName: product.batchId.productName,
          productType: product.batchId.productType,
          weight: product.batchId.weight,
          weightUnit: product.batchId.weightUnit,
          farmName: product.batchId.farmName,
          location: product.batchId.location,
          status: product.batchId.status,
          harvestDate: product.batchId.harvestDate,
          farmer: product.batchId.createdBy ? {
            name: product.batchId.createdBy.name,
            organization: product.batchId.createdBy.organization,
            location: product.batchId.createdBy.location
          } : null
        } : null,
        cropAnalysis: cropAnalysis ? {
          soilType: cropAnalysis.soilType,
          weather: cropAnalysis.weather,
          disease: cropAnalysis.diseaseDetected,
          diseaseConfidence: cropAnalysis.diseaseConfidence,
          recommendedCrops: cropAnalysis.recommendedCrops,
          suggestions: cropAnalysis.suggestions
        } : null,
        timeline,
        events: events.map(e => ({
          id: e._id.toString(),
          type: e.eventType,
          description: e.description,
          location: e.location,
          timestamp: e.createdAt,
          actor: e.actor
        })),
        createdAt: product.createdAt
      }
    });
  } catch (err) {
    console.error('Product detail error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /marketplace/verify/:batchId — Full transparency
router.get('/verify/:batchId', async (req, res) => {
  try {
    const batch = await Batch.findOne({
      $or: [
        { batchId: req.params.batchId },
        { _id: req.params.batchId.match(/^[0-9a-fA-F]{24}$/) ? req.params.batchId : null }
      ]
    })
    .populate('createdBy', 'name organization location role')
    .populate('currentHolder', 'name organization location role');

    if (!batch) {
      return res.status(404).json({ success: false, error: 'Batch not found' });
    }

    const events = await Event.find({ batch: batch._id }).sort({ createdAt: 1 });
    const handoffs = await Handoff.find({ batch: batch._id })
      .populate('fromUser', 'name role organization location')
      .populate('toUser', 'name role organization location')
      .sort({ createdAt: 1 });

    const cropAnalysis = await CropAnalysis.findOne({
      farmerId: batch.createdBy?._id
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      verification: {
        batch: {
          batchId: batch.batchId,
          productName: batch.productName,
          productType: batch.productType,
          weight: batch.weight,
          weightUnit: batch.weightUnit,
          farmName: batch.farmName,
          location: batch.location,
          status: batch.status,
          harvestDate: batch.harvestDate,
          createdAt: batch.createdAt
        },
        farmer: batch.createdBy ? {
          name: batch.createdBy.name,
          organization: batch.createdBy.organization,
          location: batch.createdBy.location
        } : null,
        cropAnalysis: cropAnalysis ? {
          soilType: cropAnalysis.soilType,
          weather: cropAnalysis.weather,
          disease: cropAnalysis.diseaseDetected
        } : null,
        events: events.map(e => ({
          type: e.eventType,
          description: e.description,
          location: e.location,
          timestamp: e.createdAt,
          actor: e.actor
        })),
        handoffs: handoffs.map(h => ({
          from: h.fromUser ? { name: h.fromUser.name, role: h.fromUser.role, org: h.fromUser.organization } : null,
          to: h.toUser ? { name: h.toUser.name, role: h.toUser.role, org: h.toUser.organization } : null,
          type: h.handoffType,
          timestamp: h.createdAt
        }))
      }
    });
  } catch (err) {
    console.error('Verify error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============ AUTHENTICATED ROUTES ============

// POST /marketplace/products — Retailer lists a product
router.post('/products', authMiddleware, requireRole(['RETAILER', 'ADMIN']), upload.single('image'), async (req, res) => {
  try {
    const { name, description, price, quantity, unit, category, batchId } = req.body;

    // Handle image upload
    let imageUrl = null;
    if (req.file) {
      imageUrl = `/uploads/products/${req.file.filename}`;
    }

    // Verify batch exists
    const batch = await Batch.findById(batchId);
    if (!batch) {
      return res.status(404).json({ success: false, error: 'Batch not found' });
    }

    const product = new Product({
      name,
      description,
      price: Number(price),
      quantity: Number(quantity),
      unit: unit || 'kg',
      category: category || 'General',
      image: imageUrl,
      batchId,
      retailerId: req.user.id,
      isAvailable: true
    });

    await product.save();

    res.json({
      success: true,
      product: {
        id: product._id.toString(),
        name: product.name,
        price: product.price
      }
    });
  } catch (err) {
    console.error('Create product error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /marketplace/orders — Place an order
router.post('/orders', optionalAuthMiddleware, async (req, res) => {
  try {
    const { items, customerName, customerEmail, customerPhone, shippingAddress } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, error: 'No items in order' });
    }

    // Calculate total and validate products
    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({ success: false, error: `Product ${item.productId} not found` });
      }
      if (!product.isAvailable || product.quantity < item.quantity) {
        return res.status(400).json({ success: false, error: `${product.name} is not available in requested quantity` });
      }

      orderItems.push({
        productId: product._id,
        name: product.name,
        price: product.price,
        quantity: item.quantity
      });
      totalAmount += product.price * item.quantity;

      // Reduce product quantity
      product.quantity -= item.quantity;
      if (product.quantity <= 0) product.isAvailable = false;
      await product.save();
    }

    const order = new Order({
      items: orderItems,
      totalAmount,
      customerId: req.user?.id || null,
      customerName,
      customerEmail,
      customerPhone,
      shippingAddress,
      status: 'confirmed',
      paymentStatus: 'paid'  // Mock payment
    });

    await order.save();

    res.json({
      success: true,
      order: {
        orderId: order.orderId,
        totalAmount: order.totalAmount,
        status: order.status,
        items: order.items
      }
    });
  } catch (err) {
    console.error('Order error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /marketplace/orders — Order history
router.get('/orders', authMiddleware, async (req, res) => {
  try {
    const orders = await Order.find({ customerId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({ success: true, orders });
  } catch (err) {
    console.error('Orders fetch error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
