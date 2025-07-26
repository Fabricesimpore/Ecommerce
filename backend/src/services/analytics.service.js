const db = require('../config/database.config');
const EventLogger = require('./event-logger.service');

class AnalyticsService {
  constructor() {
    this.eventLogger = new EventLogger();
  }

  // Calculate and store daily statistics
  async calculateDailyStats(targetDate = null) {
    const startTime = Date.now();
    const date = targetDate || new Date().toISOString().split('T')[0];

    try {
      // Use the database function to calculate stats
      const result = await db.query('SELECT calculate_daily_stats($1)', [date]);
      const statsCalculated = result.rows[0].calculate_daily_stats;

      await this.eventLogger.log({
        eventType: 'analytics_calculation',
        eventCategory: 'system',
        actorType: 'system',
        eventData: {
          date,
          stats_calculated: statsCalculated,
          duration_ms: Date.now() - startTime
        },
        success: true
      });

      return {
        success: true,
        date,
        statsCalculated,
        duration: Date.now() - startTime
      };
    } catch (error) {
      await this.eventLogger.log({
        eventType: 'analytics_calculation_failed',
        eventCategory: 'system',
        actorType: 'system',
        eventData: { date, error: error.message },
        severity: 'error',
        success: false,
        errorMessage: error.message
      });

      throw error;
    }
  }

  // Get analytics summary with trends
  async getAnalyticsSummary(startDate = null, endDate = null) {
    try {
      const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const end = endDate || new Date().toISOString().split('T')[0];

      const result = await db.query(
        'SELECT * FROM get_analytics_summary($1, $2)',
        [start, end]
      );

      const summary = result.rows.reduce((acc, row) => {
        if (!acc[row.metric_type]) {
          acc[row.metric_type] = {};
        }
        acc[row.metric_type][row.metric_name] = {
          current: parseFloat(row.current_value),
          previous: parseFloat(row.previous_value),
          changePercent: parseFloat(row.change_percent),
          trend: row.trend
        };
        return acc;
      }, {});

      return {
        success: true,
        period: { start, end },
        summary,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Analytics summary error:', error);
      throw new Error('Failed to generate analytics summary');
    }
  }

  // Get daily overview for dashboard
  async getDailyOverview(days = 30) {
    try {
      const query = `
        SELECT * FROM daily_overview 
        WHERE stat_date >= CURRENT_DATE - INTERVAL '${days} days'
        ORDER BY stat_date DESC
      `;

      const { rows } = await db.query(query);

      return {
        success: true,
        data: rows.map((row) => ({
          date: row.stat_date,
          totalOrders: parseInt(row.total_orders),
          totalRevenue: parseFloat(row.total_revenue),
          activeVendors: parseInt(row.active_vendors),
          avgPaymentSuccessRate: parseFloat(row.avg_payment_success_rate) || 0
        })),
        period: `${days} days`
      };
    } catch (error) {
      console.error('Daily overview error:', error);
      throw new Error('Failed to get daily overview');
    }
  }

  // Get product performance analytics
  async getProductAnalytics(productId = null, days = 30) {
    try {
      let query = `
        SELECT 
          p.id,
          p.title,
          p.price,
          p.category,
          COALESCE(SUM(pa.views), 0) as total_views,
          COALESCE(SUM(pa.searches), 0) as total_searches,
          COALESCE(SUM(pa.cart_additions), 0) as total_cart_additions,
          COALESCE(SUM(pa.orders), 0) as total_orders,
          COALESCE(SUM(pa.revenue), 0) as total_revenue,
          COALESCE(AVG(pa.conversion_rate), 0) as avg_conversion_rate,
          COALESCE(AVG(pa.avg_order_value), 0) as avg_order_value
        FROM products p
        LEFT JOIN product_analytics pa ON p.id = pa.product_id 
          AND pa.date >= CURRENT_DATE - INTERVAL '${days} days'
      `;

      const values = [];
      if (productId) {
        query += ' WHERE p.id = $1';
        values.push(productId);
      }

      query += ' GROUP BY p.id, p.title, p.price, p.category ORDER BY total_revenue DESC';

      const { rows } = await db.query(query, values);

      return {
        success: true,
        data: rows.map((row) => ({
          productId: row.id,
          title: row.title,
          price: parseFloat(row.price),
          category: row.category,
          metrics: {
            views: parseInt(row.total_views),
            searches: parseInt(row.total_searches),
            cartAdditions: parseInt(row.total_cart_additions),
            orders: parseInt(row.total_orders),
            revenue: parseFloat(row.total_revenue),
            conversionRate: parseFloat(row.avg_conversion_rate),
            avgOrderValue: parseFloat(row.avg_order_value)
          }
        })),
        period: `${days} days`
      };
    } catch (error) {
      console.error('Product analytics error:', error);
      throw new Error('Failed to get product analytics');
    }
  }

  // Get vendor performance analytics
  async getVendorAnalytics(vendorId = null, days = 30) {
    try {
      let query = `
        SELECT 
          u.id,
          u.first_name,
          u.last_name,
          u.business_name,
          u.email,
          COALESCE(SUM(va.total_orders), 0) as total_orders,
          COALESCE(SUM(va.fulfilled_orders), 0) as fulfilled_orders,
          COALESCE(SUM(va.cancelled_orders), 0) as cancelled_orders,
          COALESCE(SUM(va.total_revenue), 0) as total_revenue,
          COALESCE(AVG(va.avg_fulfillment_time_hours), 0) as avg_fulfillment_time,
          COALESCE(AVG(va.customer_rating), 0) as avg_rating,
          COALESCE(SUM(va.products_added), 0) as products_added,
          COALESCE(SUM(va.products_updated), 0) as products_updated,
          COALESCE(AVG(va.inventory_value), 0) as avg_inventory_value
        FROM users u
        LEFT JOIN vendor_analytics va ON u.id = va.vendor_id 
          AND va.date >= CURRENT_DATE - INTERVAL '${days} days'
        WHERE u.role = 'vendor'
      `;

      const values = [];
      if (vendorId) {
        query += ' AND u.id = $1';
        values.push(vendorId);
      }

      query += ' GROUP BY u.id, u.first_name, u.last_name, u.business_name, u.email ORDER BY total_revenue DESC';

      const { rows } = await db.query(query, values);

      return {
        success: true,
        data: rows.map((row) => ({
          vendorId: row.id,
          name: `${row.first_name} ${row.last_name}`,
          businessName: row.business_name,
          email: row.email,
          metrics: {
            totalOrders: parseInt(row.total_orders),
            fulfilledOrders: parseInt(row.fulfilled_orders),
            cancelledOrders: parseInt(row.cancelled_orders),
            totalRevenue: parseFloat(row.total_revenue),
            avgFulfillmentTime: parseFloat(row.avg_fulfillment_time),
            avgRating: parseFloat(row.avg_rating),
            productsAdded: parseInt(row.products_added),
            productsUpdated: parseInt(row.products_updated),
            avgInventoryValue: parseFloat(row.avg_inventory_value),
            fulfillmentRate: row.total_orders > 0
              ? ((row.fulfilled_orders / row.total_orders) * 100).toFixed(2)
              : 0
          }
        })),
        period: `${days} days`
      };
    } catch (error) {
      console.error('Vendor analytics error:', error);
      throw new Error('Failed to get vendor analytics');
    }
  }

  // Get payment analytics
  async getPaymentAnalytics(days = 30) {
    try {
      const query = `
        SELECT 
          payment_method,
          region,
          SUM(total_attempts) as total_attempts,
          SUM(successful_payments) as successful_payments,
          SUM(failed_payments) as failed_payments,
          SUM(cancelled_payments) as cancelled_payments,
          SUM(total_amount) as total_amount,
          AVG(avg_amount) as avg_amount,
          AVG(success_rate) as avg_success_rate,
          AVG(avg_processing_time_seconds) as avg_processing_time,
          SUM(fraud_flagged) as fraud_flagged
        FROM payment_analytics
        WHERE date >= CURRENT_DATE - INTERVAL '${days} days'
        GROUP BY payment_method, region
        ORDER BY total_amount DESC
      `;

      const { rows } = await db.query(query);

      return {
        success: true,
        data: rows.map((row) => ({
          paymentMethod: row.payment_method,
          region: row.region,
          metrics: {
            totalAttempts: parseInt(row.total_attempts),
            successfulPayments: parseInt(row.successful_payments),
            failedPayments: parseInt(row.failed_payments),
            cancelledPayments: parseInt(row.cancelled_payments),
            totalAmount: parseFloat(row.total_amount),
            avgAmount: parseFloat(row.avg_amount),
            successRate: parseFloat(row.avg_success_rate),
            avgProcessingTime: parseFloat(row.avg_processing_time),
            fraudFlagged: parseInt(row.fraud_flagged)
          }
        })),
        period: `${days} days`
      };
    } catch (error) {
      console.error('Payment analytics error:', error);
      throw new Error('Failed to get payment analytics');
    }
  }

  // Get user behavior analytics
  async getUserBehaviorAnalytics(userId = null, days = 30) {
    try {
      let query = `
        SELECT 
          u.id,
          u.first_name,
          u.last_name,
          u.email,
          u.role,
          u.created_at as registration_date,
          COALESCE(SUM(uba.session_count), 0) as total_sessions,
          COALESCE(SUM(uba.page_views), 0) as total_page_views,
          COALESCE(SUM(uba.search_queries), 0) as total_searches,
          COALESCE(SUM(uba.products_viewed), 0) as total_products_viewed,
          COALESCE(SUM(uba.cart_additions), 0) as total_cart_additions,
          COALESCE(SUM(uba.orders_placed), 0) as total_orders_placed,
          COALESCE(SUM(uba.time_spent_minutes), 0) as total_time_spent,
          COALESCE(MAX(uba.last_activity_at), u.created_at) as last_activity
        FROM users u
        LEFT JOIN user_behavior_analytics uba ON u.id = uba.user_id 
          AND uba.date >= CURRENT_DATE - INTERVAL '${days} days'
      `;

      const values = [];
      if (userId) {
        query += ' WHERE u.id = $1';
        values.push(userId);
      }

      query += ` GROUP BY u.id, u.first_name, u.last_name, u.email, u.role, u.created_at
        ORDER BY total_orders_placed DESC`;

      const { rows } = await db.query(query, values);

      return {
        success: true,
        data: rows.map((row) => ({
          userId: row.id,
          name: `${row.first_name} ${row.last_name}`,
          email: row.email,
          role: row.role,
          registrationDate: row.registration_date,
          lastActivity: row.last_activity,
          metrics: {
            totalSessions: parseInt(row.total_sessions),
            totalPageViews: parseInt(row.total_page_views),
            totalSearches: parseInt(row.total_searches),
            totalProductsViewed: parseInt(row.total_products_viewed),
            totalCartAdditions: parseInt(row.total_cart_additions),
            totalOrdersPlaced: parseInt(row.total_orders_placed),
            totalTimeSpent: parseInt(row.total_time_spent),
            avgSessionDuration: row.total_sessions > 0
              ? (row.total_time_spent / row.total_sessions).toFixed(2)
              : 0,
            conversionRate: row.total_products_viewed > 0
              ? ((row.total_orders_placed / row.total_products_viewed) * 100).toFixed(2)
              : 0
          }
        })),
        period: `${days} days`
      };
    } catch (error) {
      console.error('User behavior analytics error:', error);
      throw new Error('Failed to get user behavior analytics');
    }
  }

  // Get real-time dashboard metrics
  async getRealTimeDashboard() {
    try {
      const queries = await Promise.all([
        // Today's orders
        db.query(`
          SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as revenue
          FROM orders 
          WHERE DATE(created_at) = CURRENT_DATE
        `),

        // Today's payments
        db.query(`
          SELECT 
            payment_method,
            COUNT(*) as attempts,
            COUNT(*) FILTER (WHERE status = 'completed') as successful
          FROM payments 
          WHERE DATE(created_at) = CURRENT_DATE
          GROUP BY payment_method
        `),

        // Active users (last 24 hours)
        db.query(`
          SELECT COUNT(DISTINCT actor_id) as active_users
          FROM event_logs 
          WHERE created_at >= NOW() - INTERVAL '24 hours'
            AND actor_type = 'user'
            AND actor_id IS NOT NULL
        `),

        // Pending deliveries
        db.query(`
          SELECT COUNT(*) as pending_deliveries
          FROM deliveries 
          WHERE status IN ('pending', 'assigned', 'picked_up', 'in_transit')
        `),

        // Top products today
        db.query(`
          SELECT 
            p.title,
            COUNT(oi.id) as orders,
            SUM(oi.total_price) as revenue
          FROM order_items oi
          JOIN products p ON oi.product_id = p.id
          JOIN orders o ON oi.order_id = o.id
          WHERE DATE(o.created_at) = CURRENT_DATE
          GROUP BY p.id, p.title
          ORDER BY orders DESC
          LIMIT 5
        `)
      ]);

      const [ordersData, paymentsData, activeUsersData, deliveriesData, topProductsData] = queries;

      return {
        success: true,
        timestamp: new Date().toISOString(),
        metrics: {
          todayOrders: {
            count: parseInt(ordersData.rows[0].count),
            revenue: parseFloat(ordersData.rows[0].revenue)
          },
          paymentMethods: paymentsData.rows.map((row) => ({
            method: row.payment_method,
            attempts: parseInt(row.attempts),
            successful: parseInt(row.successful),
            successRate: row.attempts > 0 ? ((row.successful / row.attempts) * 100).toFixed(2) : 0
          })),
          activeUsers24h: parseInt(activeUsersData.rows[0].active_users),
          pendingDeliveries: parseInt(deliveriesData.rows[0].pending_deliveries),
          topProducts: topProductsData.rows.map((row) => ({
            title: row.title,
            orders: parseInt(row.orders),
            revenue: parseFloat(row.revenue)
          }))
        }
      };
    } catch (error) {
      console.error('Real-time dashboard error:', error);
      throw new Error('Failed to get real-time dashboard data');
    }
  }

  // Update product analytics (called when product events occur)
  async updateProductAnalytics(productId, eventType, metadata = {}) {
    try {
      const date = new Date().toISOString().split('T')[0];

      let updateField = '';
      switch (eventType) {
        case 'view':
          updateField = 'views = views + 1';
          break;
        case 'search':
          updateField = 'searches = searches + 1';
          break;
        case 'cart_add':
          updateField = 'cart_additions = cart_additions + 1';
          break;
        case 'order':
          updateField = `orders = orders + 1, revenue = revenue + ${metadata.amount || 0}`;
          break;
        default:
          return;
      }

      const query = `
        INSERT INTO product_analytics (
          product_id, date, 
          ${eventType === 'order' ? 'orders, revenue' : eventType.replace('_add', '_additions')}
        )
        VALUES ($1, $2, ${eventType === 'order' ? '1, $3' : '1'})
        ON CONFLICT (product_id, date)
        DO UPDATE SET ${updateField}, updated_at = CURRENT_TIMESTAMP
      `;

      const values = [productId, date];
      if (eventType === 'order' && metadata.amount) {
        values.push(metadata.amount);
      }

      await db.query(query, values);

      // Log the analytics update
      await this.eventLogger.log({
        eventType: 'analytics_updated',
        eventCategory: 'system',
        actorType: 'system',
        targetId: productId,
        targetType: 'product',
        eventData: { analyticsType: 'product', eventType, metadata }
      });
    } catch (error) {
      console.error('Product analytics update error:', error);
    }
  }

  // Schedule daily analytics calculation (to be called by cron job)
  async scheduleDailyCalculation() {
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const dateStr = yesterday.toISOString().split('T')[0];

      await this.calculateDailyStats(dateStr);

      console.log(`✅ Daily analytics calculated for ${dateStr}`);
      return { success: true, date: dateStr };
    } catch (error) {
      console.error('❌ Daily analytics calculation failed:', error);
      throw error;
    }
  }

  // Get analytics export data (for admin downloads)
  async getAnalyticsExport(type = 'overview', startDate = null, endDate = null, format = 'json') {
    try {
      const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const end = endDate || new Date().toISOString().split('T')[0];

      let data;
      switch (type) {
        case 'overview':
          data = await this.getDailyOverview(30);
          break;
        case 'products':
          data = await this.getProductAnalytics();
          break;
        case 'vendors':
          data = await this.getVendorAnalytics();
          break;
        case 'payments':
          data = await this.getPaymentAnalytics();
          break;
        case 'users':
          data = await this.getUserBehaviorAnalytics();
          break;
        default:
          throw new Error('Invalid export type');
      }

      if (format === 'csv') {
        // Convert to CSV format (simplified implementation)
        const csvData = this.convertToCSV(data.data);
        return {
          success: true,
          format: 'csv',
          filename: `${type}_analytics_${start}_to_${end}.csv`,
          data: csvData
        };
      }

      return {
        success: true,
        format: 'json',
        filename: `${type}_analytics_${start}_to_${end}.json`,
        data: data.data,
        metadata: {
          exportType: type,
          period: { start, end },
          generatedAt: new Date().toISOString(),
          recordCount: data.data.length
        }
      };
    } catch (error) {
      console.error('Analytics export error:', error);
      throw new Error('Failed to generate analytics export');
    }
  }

  // Helper method to convert data to CSV
  convertToCSV(data) {
    if (!data || data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];

    data.forEach((row) => {
      const values = headers.map((header) => {
        const value = row[header];
        return typeof value === 'string' ? `"${value}"` : value;
      });
      csvRows.push(values.join(','));
    });

    return csvRows.join('\n');
  }
}

module.exports = new AnalyticsService();
