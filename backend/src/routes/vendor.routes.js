const express = require('express');
const VendorController = require('../controllers/vendor.controller');
const { authenticate, requireVendor, requireAdmin } = require('../middlewares/auth.middleware');

const router = express.Router();

// Public vendor routes
router.get('/', VendorController.getVendors);
router.get('/:id', VendorController.getVendor);
router.get('/:id/products', VendorController.getVendorProducts);

// Authenticated user routes
router.post('/apply', authenticate, VendorController.applyAsVendor);

// Vendor-only routes
router.get('/me/dashboard', authenticate, requireVendor, VendorController.getVendorDashboard);
router.put('/me/profile', authenticate, requireVendor, VendorController.updateVendorProfile);

// Admin-only routes
router.put('/:id/approve', authenticate, requireAdmin, VendorController.approveVendor);
router.put('/:id/suspend', authenticate, requireAdmin, VendorController.suspendVendor);

module.exports = router;