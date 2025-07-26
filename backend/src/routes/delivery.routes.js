const express = require('express');
const DeliveryController = require('../controllers/delivery.controller');
const { authenticate, requireDriver, requireAdmin } = require('../middlewares/auth.middleware');

const router = express.Router();

// All delivery routes require authentication
router.use(authenticate);

// Driver application (authenticated users only)
router.post('/apply', DeliveryController.applyAsDriver);

// Driver-only routes
router.get('/jobs', requireDriver, DeliveryController.getAvailableDeliveries);
router.post('/accept/:deliveryId', requireDriver, DeliveryController.acceptDelivery);
router.put('/status/:deliveryId', requireDriver, DeliveryController.updateDeliveryStatus);
router.get('/my-deliveries', requireDriver, DeliveryController.getMyDeliveries);
router.get('/my-stats', requireDriver, DeliveryController.getMyStats);

// Tracking (accessible by all authenticated users with proper authorization)
router.get('/track/:deliveryId', DeliveryController.trackDelivery);

// Admin routes
router.get('/admin/all', requireAdmin, DeliveryController.getAllDeliveries);
router.put('/admin/drivers/:driverId/approve', requireAdmin, DeliveryController.approveDriver);
router.put('/admin/drivers/:driverId/suspend', requireAdmin, DeliveryController.suspendDriver);
router.get('/admin/analytics', requireAdmin, DeliveryController.getDeliveryAnalytics);
router.post('/admin/auto-match', requireAdmin, DeliveryController.runAutoMatch);

module.exports = router;
