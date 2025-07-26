const express = require('express');
const rateLimit = require('express-rate-limit');
const AnalyticsController = require('../controllers/analytics.controller');
const { authenticate, requireAdmin } = require('../middlewares/auth.middleware');

const router = express.Router();

// Rate limiting for analytics endpoints
const analyticsRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 analytics requests per windowMs
  message: {
    success: false,
    message: 'Too many analytics requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// More restrictive rate limiting for export operations
const exportRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit each IP to 10 export requests per hour
  message: {
    success: false,
    message: 'Too many export requests, please try again later.'
  }
});

// All analytics routes require authentication and admin role
router.use(authenticate, requireAdmin, analyticsRateLimit);

// Dashboard and overview analytics
router.get('/dashboard', AnalyticsController.getDashboard);
router.get('/summary', AnalyticsController.getAnalyticsSummary);
router.get('/realtime', AnalyticsController.getRealTimeMetrics);

// Specific analytics categories
router.get('/products', AnalyticsController.getProductAnalytics);
router.get('/vendors', AnalyticsController.getVendorAnalytics);
router.get('/payments', AnalyticsController.getPaymentAnalytics);
router.get('/users', AnalyticsController.getUserAnalytics);

// Analytics calculation and management
router.post('/calculate', AnalyticsController.calculateDailyStats);
router.get('/export', exportRateLimit, AnalyticsController.exportAnalytics);

// Event logging and audit trail
router.get('/events/history/:targetType/:targetId', AnalyticsController.getEventHistory);
router.get('/events/stats', AnalyticsController.getEventStatistics);
router.get('/events/user/:userId', AnalyticsController.getUserEvents);
router.post('/events/cleanup', AnalyticsController.cleanupOldEvents);

// Test endpoint (development only)
if (process.env.NODE_ENV !== 'production') {
  router.post('/events/log', AnalyticsController.logTestEvent);
}

module.exports = router;
