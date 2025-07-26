const express = require('express');
const PaymentController = require('../controllers/payment.controller');
const { authenticate, requireAdmin } = require('../middlewares/auth.middleware');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Rate limiting for payment operations (more restrictive)
const paymentRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 payment requests per windowMs
  message: {
    success: false,
    message: 'Too many payment requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiting for webhook (more permissive for legitimate webhooks)
const webhookRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // allow 100 webhook requests per minute
  message: {
    success: false,
    message: 'Too many webhook requests'
  },
  skip: (req) => {
    // Skip rate limiting for requests from known Orange Money IPs
    // In production, you would whitelist actual Orange Money webhook IPs
    const trustedIPs = process.env.ORANGE_MONEY_WEBHOOK_IPS?.split(',') || [];
    return trustedIPs.includes(req.ip);
  }
});

// Public webhook endpoint (no authentication required)
// This must be accessible to Orange Money servers
router.post('/webhook', webhookRateLimit, PaymentController.handleWebhook);

// Mock payment confirmation (development only)
if (process.env.NODE_ENV !== 'production') {
  router.post('/mock/confirm/:reference', PaymentController.confirmMockPayment);
}

// All other routes require authentication
router.use(authenticate);

// Payment initiation (authenticated users only)
router.post('/initiate', paymentRateLimit, PaymentController.initiatePayment);

// Payment verification
router.get('/verify/:reference', PaymentController.verifyPayment);

// Get payment details
router.get('/:reference', PaymentController.getPayment);

// Get payments for a specific order
router.get('/order/:orderId', PaymentController.getOrderPayments);

// Cancel payment
router.put('/:reference/cancel', PaymentController.cancelPayment);

// Retry failed payment
router.post('/:reference/retry', paymentRateLimit, PaymentController.retryPayment);

// Admin-only routes
router.get('/statistics', requireAdmin, PaymentController.getPaymentStatistics);
router.post('/:reference/refund', requireAdmin, PaymentController.refundPayment);
router.get('/:reference/audit', requireAdmin, PaymentController.getPaymentAudit);
router.post('/cleanup-expired', requireAdmin, PaymentController.cleanupExpiredPayments);

module.exports = router;