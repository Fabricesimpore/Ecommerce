const analyticsService = require('../services/analytics.service');
const EventLogger = require('../services/event-logger.service');

class AnalyticsController {
  constructor() {
    this.eventLogger = new EventLogger();
  }

  // GET /api/analytics/dashboard
  static async getDashboard(req, res) {
    try {
      const { days = 30 } = req.query;
      
      const startTime = Date.now();
      
      // Get multiple analytics data in parallel
      const [
        summary,
        dailyOverview,
        realTimeMetrics
      ] = await Promise.all([
        analyticsService.getAnalyticsSummary(),
        analyticsService.getDailyOverview(parseInt(days)),
        analyticsService.getRealTimeDashboard()
      ]);

      // Log dashboard access
      await new EventLogger().logAdminAction(
        'dashboard_accessed',
        req.user.id,
        null,
        'analytics',
        { days: parseInt(days), duration_ms: Date.now() - startTime },
        req
      );

      res.json({
        success: true,
        data: {
          summary: summary.summary,
          dailyOverview: dailyOverview.data,
          realTime: realTimeMetrics.metrics,
          period: `${days} days`,
          generatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Dashboard analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to load dashboard analytics'
      });
    }
  }

  // GET /api/analytics/products
  static async getProductAnalytics(req, res) {
    try {
      const { productId, days = 30 } = req.query;
      
      const analytics = await analyticsService.getProductAnalytics(
        productId ? parseInt(productId) : null,
        parseInt(days)
      );

      await new EventLogger().logAdminAction(
        'product_analytics_accessed',
        req.user.id,
        productId || null,
        'product',
        { days: parseInt(days) },
        req
      );

      res.json({
        success: true,
        data: analytics.data,
        period: analytics.period
      });
    } catch (error) {
      console.error('Product analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to load product analytics'
      });
    }
  }

  // GET /api/analytics/vendors
  static async getVendorAnalytics(req, res) {
    try {
      const { vendorId, days = 30 } = req.query;
      
      const analytics = await analyticsService.getVendorAnalytics(
        vendorId ? parseInt(vendorId) : null,
        parseInt(days)
      );

      await new EventLogger().logAdminAction(
        'vendor_analytics_accessed',
        req.user.id,
        vendorId || null,
        'vendor',
        { days: parseInt(days) },
        req
      );

      res.json({
        success: true,
        data: analytics.data,
        period: analytics.period
      });
    } catch (error) {
      console.error('Vendor analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to load vendor analytics'
      });
    }
  }

  // GET /api/analytics/payments
  static async getPaymentAnalytics(req, res) {
    try {
      const { days = 30 } = req.query;
      
      const analytics = await analyticsService.getPaymentAnalytics(parseInt(days));

      await new EventLogger().logAdminAction(
        'payment_analytics_accessed',
        req.user.id,
        null,
        'payment',
        { days: parseInt(days) },
        req
      );

      res.json({
        success: true,
        data: analytics.data,
        period: analytics.period
      });
    } catch (error) {
      console.error('Payment analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to load payment analytics'
      });
    }
  }

  // GET /api/analytics/users
  static async getUserAnalytics(req, res) {
    try {
      const { userId, days = 30 } = req.query;
      
      const analytics = await analyticsService.getUserBehaviorAnalytics(
        userId ? parseInt(userId) : null,
        parseInt(days)
      );

      await new EventLogger().logAdminAction(
        'user_analytics_accessed',
        req.user.id,
        userId || null,
        'user',
        { days: parseInt(days) },
        req
      );

      res.json({
        success: true,
        data: analytics.data,
        period: analytics.period
      });
    } catch (error) {
      console.error('User analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to load user analytics'
      });
    }
  }

  // GET /api/analytics/realtime
  static async getRealTimeMetrics(req, res) {
    try {
      const metrics = await analyticsService.getRealTimeDashboard();

      res.json({
        success: true,
        data: metrics.metrics,
        timestamp: metrics.timestamp
      });
    } catch (error) {
      console.error('Real-time metrics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to load real-time metrics'
      });
    }
  }

  // POST /api/analytics/calculate
  static async calculateDailyStats(req, res) {
    try {
      const { date } = req.body;
      
      const result = await analyticsService.calculateDailyStats(date);

      await new EventLogger().logAdminAction(
        'analytics_calculation_triggered',
        req.user.id,
        null,
        'analytics',
        { date: date || 'today', stats_calculated: result.statsCalculated },
        req
      );

      res.json({
        success: true,
        message: 'Daily statistics calculated successfully',
        data: result
      });
    } catch (error) {
      console.error('Calculate daily stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to calculate daily statistics'
      });
    }
  }

  // GET /api/analytics/export
  static async exportAnalytics(req, res) {
    try {
      const { type = 'overview', format = 'json', startDate, endDate } = req.query;
      
      const exportData = await analyticsService.getAnalyticsExport(
        type,
        startDate,
        endDate,
        format
      );

      await new EventLogger().logAdminAction(
        'analytics_exported',
        req.user.id,
        null,
        'analytics',
        { 
          export_type: type, 
          format, 
          start_date: startDate, 
          end_date: endDate,
          record_count: exportData.data?.length || 0
        },
        req
      );

      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=${exportData.filename}`);
        res.send(exportData.data);
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=${exportData.filename}`);
        res.json({
          success: true,
          filename: exportData.filename,
          data: exportData.data,
          metadata: exportData.metadata
        });
      }
    } catch (error) {
      console.error('Export analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to export analytics data'
      });
    }
  }

  // GET /api/analytics/summary
  static async getAnalyticsSummary(req, res) {
    try {
      const { startDate, endDate } = req.query;
      
      const summary = await analyticsService.getAnalyticsSummary(startDate, endDate);

      res.json({
        success: true,
        data: summary.summary,
        period: summary.period,
        generatedAt: summary.generatedAt
      });
    } catch (error) {
      console.error('Analytics summary error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get analytics summary'
      });
    }
  }

  // GET /api/analytics/events/history/:targetType/:targetId
  static async getEventHistory(req, res) {
    try {
      const { targetType, targetId } = req.params;
      const {
        limit = 50,
        offset = 0,
        eventCategory,
        severity,
        startDate,
        endDate
      } = req.query;

      const eventLogger = new EventLogger();
      const history = await eventLogger.getEventHistory(
        targetType,
        parseInt(targetId),
        {
          limit: parseInt(limit),
          offset: parseInt(offset),
          eventCategory,
          severity,
          startDate,
          endDate
        }
      );

      await eventLogger.logAdminAction(
        'event_history_accessed',
        req.user.id,
        parseInt(targetId),
        targetType,
        { limit, offset, event_category: eventCategory },
        req
      );

      res.json({
        success: true,
        data: history.events,
        pagination: history.pagination
      });
    } catch (error) {
      console.error('Event history error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get event history'
      });
    }
  }

  // GET /api/analytics/events/stats
  static async getEventStatistics(req, res) {
    try {
      const { days = 30 } = req.query;
      
      const eventLogger = new EventLogger();
      const stats = await eventLogger.getEventStatistics(parseInt(days));

      res.json({
        success: true,
        data: stats.statistics,
        period: stats.period
      });
    } catch (error) {
      console.error('Event statistics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get event statistics'
      });
    }
  }

  // GET /api/analytics/events/user/:userId
  static async getUserEvents(req, res) {
    try {
      const { userId } = req.params;
      const {
        limit = 50,
        offset = 0,
        eventCategory,
        eventType,
        startDate,
        endDate
      } = req.query;

      const eventLogger = new EventLogger();
      const events = await eventLogger.getEventsByActor(
        parseInt(userId),
        {
          limit: parseInt(limit),
          offset: parseInt(offset),
          eventCategory,
          eventType,
          startDate,
          endDate
        }
      );

      res.json({
        success: true,
        data: events.events,
        pagination: events.pagination
      });
    } catch (error) {
      console.error('User events error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user events'
      });
    }
  }

  // POST /api/analytics/events/cleanup
  static async cleanupOldEvents(req, res) {
    try {
      const { retentionDays = 90 } = req.body;
      
      const eventLogger = new EventLogger();
      const result = await eventLogger.cleanupOldEvents(parseInt(retentionDays));

      await eventLogger.logAdminAction(
        'event_cleanup_triggered',
        req.user.id,
        null,
        'system',
        { 
          retention_days: retentionDays, 
          deleted_count: result.deletedCount 
        },
        req
      );

      res.json({
        success: true,
        message: `Cleaned up ${result.deletedCount} old events`,
        data: result
      });
    } catch (error) {
      console.error('Event cleanup error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to cleanup old events'
      });
    }
  }

  // POST /api/analytics/events/log (for manual testing)
  static async logTestEvent(req, res) {
    try {
      if (process.env.NODE_ENV === 'production') {
        return res.status(404).json({
          success: false,
          message: 'Test endpoint not available in production'
        });
      }

      const eventLogger = new EventLogger();
      const eventId = await eventLogger.log({
        ...req.body,
        actorId: req.user.id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json({
        success: true,
        message: 'Test event logged successfully',
        eventId
      });
    } catch (error) {
      console.error('Test event logging error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to log test event'
      });
    }
  }
}

module.exports = AnalyticsController;