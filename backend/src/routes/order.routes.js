const express = require('express');
const OrderController = require('../controllers/order.controller');
const { authenticate, requireAdmin } = require('../middlewares/auth.middleware');

const router = express.Router();

// All order routes require authentication
router.use(authenticate);

// Order creation and management
router.post('/', OrderController.createOrder);
router.get('/my-orders', OrderController.getMyOrders);
router.get('/my-stats', OrderController.getOrderStats);
router.get('/recent', OrderController.getRecentOrders);

// Order details and updates
router.get('/:id', OrderController.getOrder);
router.put('/:id/status', OrderController.updateOrderStatus);
router.put('/:id/cancel', OrderController.cancelOrder);

// Order payment
router.post('/:id/pay', OrderController.initiateOrderPayment);

// Order tracking (can be accessed with order number)
router.get('/track/:orderNumber', OrderController.trackOrder);

// Admin routes
router.get('/admin/all', requireAdmin, OrderController.getAllOrders);
router.put('/admin/:id/payment-status', requireAdmin, OrderController.updatePaymentStatus);

module.exports = router;
