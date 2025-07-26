const db = require('../config/database.config');

class EventLogger {
  constructor() {
    this.defaultOptions = {
      eventCategory: 'system',
      actorType: 'user',
      severity: 'info',
      success: true
    };
  }

  // Main logging method
  async log(options) {
    try {
      const config = { ...this.defaultOptions, ...options };

      const {
        eventType,
        eventCategory,
        actorId = null,
        actorType,
        targetId = null,
        targetType = null,
        eventData = {},
        metadata = {},
        ipAddress = null,
        userAgent = null,
        sessionId = null,
        severity,
        success,
        errorMessage = null,
        durationMs = null
      } = config;

      // Validate required fields
      if (!eventType) {
        throw new Error('eventType is required for logging');
      }

      // Use the database function to log the event
      const result = await db.query(`
        SELECT log_event($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      `, [
        eventType,
        eventCategory,
        actorId,
        actorType,
        targetId,
        targetType,
        JSON.stringify(eventData),
        JSON.stringify(metadata),
        ipAddress,
        userAgent,
        sessionId,
        severity,
        success,
        errorMessage,
        durationMs
      ]);

      const eventId = result.rows[0].log_event;

      // Console log for development
      if (process.env.NODE_ENV === 'development') {
        console.log(`[EVENT] ${eventType} | ${eventCategory} | ${success ? 'SUCCESS' : 'FAILED'} | ID: ${eventId}`);
      }

      return eventId;
    } catch (error) {
      // Fallback logging to console if database logging fails
      console.error('Event logging failed:', error);
      console.log('Event data:', options);
      return null;
    }
  }

  // Convenience methods for common event types
  async logAuth(eventType, userId, success = true, metadata = {}, request = null) {
    return await this.log({
      eventType,
      eventCategory: 'auth',
      actorId: userId,
      actorType: 'user',
      eventData: {
        timestamp: new Date().toISOString(),
        ...metadata
      },
      ipAddress: request?.ip,
      userAgent: request?.get('User-Agent'),
      sessionId: request?.sessionID,
      success
    });
  }

  async logProductAction(eventType, userId, productId, actionData = {}, request = null) {
    return await this.log({
      eventType,
      eventCategory: 'product',
      actorId: userId,
      actorType: 'user',
      targetId: productId,
      targetType: 'product',
      eventData: {
        timestamp: new Date().toISOString(),
        ...actionData
      },
      ipAddress: request?.ip,
      userAgent: request?.get('User-Agent'),
      sessionId: request?.sessionID
    });
  }

  async logOrderAction(eventType, userId, orderId, orderData = {}, request = null) {
    return await this.log({
      eventType,
      eventCategory: 'order',
      actorId: userId,
      actorType: 'user',
      targetId: orderId,
      targetType: 'order',
      eventData: {
        timestamp: new Date().toISOString(),
        ...orderData
      },
      ipAddress: request?.ip,
      userAgent: request?.get('User-Agent'),
      sessionId: request?.sessionID
    });
  }

  async logPaymentAction(eventType, userId, paymentId, paymentData = {}, request = null) {
    return await this.log({
      eventType,
      eventCategory: 'payment',
      actorId: userId,
      actorType: userId ? 'user' : 'webhook',
      targetId: paymentId,
      targetType: 'payment',
      eventData: {
        timestamp: new Date().toISOString(),
        ...paymentData
      },
      ipAddress: request?.ip,
      userAgent: request?.get('User-Agent'),
      sessionId: request?.sessionID
    });
  }

  async logDeliveryAction(eventType, userId, deliveryId, deliveryData = {}, request = null) {
    return await this.log({
      eventType,
      eventCategory: 'delivery',
      actorId: userId,
      actorType: 'user',
      targetId: deliveryId,
      targetType: 'delivery',
      eventData: {
        timestamp: new Date().toISOString(),
        ...deliveryData
      },
      ipAddress: request?.ip,
      userAgent: request?.get('User-Agent'),
      sessionId: request?.sessionID
    });
  }

  async logVendorAction(eventType, userId, targetId, vendorData = {}, request = null) {
    return await this.log({
      eventType,
      eventCategory: 'vendor',
      actorId: userId,
      actorType: 'user',
      targetId,
      targetType: 'vendor',
      eventData: {
        timestamp: new Date().toISOString(),
        ...vendorData
      },
      ipAddress: request?.ip,
      userAgent: request?.get('User-Agent'),
      sessionId: request?.sessionID
    });
  }

  async logAdminAction(eventType, adminId, targetId, targetType, adminData = {}, request = null) {
    return await this.log({
      eventType,
      eventCategory: 'admin',
      actorId: adminId,
      actorType: 'user',
      targetId,
      targetType,
      eventData: {
        timestamp: new Date().toISOString(),
        ...adminData
      },
      metadata: {
        admin_action: true,
        requires_audit: true
      },
      ipAddress: request?.ip,
      userAgent: request?.get('User-Agent'),
      sessionId: request?.sessionID
    });
  }

  async logSystemEvent(eventType, eventData = {}, severity = 'info') {
    return await this.log({
      eventType,
      eventCategory: 'system',
      actorType: 'system',
      eventData: {
        timestamp: new Date().toISOString(),
        ...eventData
      },
      severity
    });
  }

  async logError(eventType, error, context = {}, userId = null, request = null) {
    return await this.log({
      eventType: eventType || 'error',
      eventCategory: 'system',
      actorId: userId,
      actorType: userId ? 'user' : 'system',
      eventData: {
        timestamp: new Date().toISOString(),
        error_name: error.name,
        error_stack: error.stack,
        ...context
      },
      severity: 'error',
      success: false,
      errorMessage: error.message,
      ipAddress: request?.ip,
      userAgent: request?.get('User-Agent'),
      sessionId: request?.sessionID
    });
  }

  // Get event history for a specific entity
  async getEventHistory(targetType, targetId, options = {}) {
    try {
      const {
        limit = 50,
        offset = 0,
        eventCategory = null,
        severity = null,
        startDate = null,
        endDate = null
      } = options;

      let query = `
        SELECT 
          el.*,
          u.first_name,
          u.last_name,
          u.email
        FROM event_logs el
        LEFT JOIN users u ON el.actor_id = u.id
        WHERE el.target_type = $1 AND el.target_id = $2
      `;

      const values = [targetType, targetId];
      let paramCount = 2;

      if (eventCategory) {
        paramCount++;
        query += ` AND el.event_category = $${paramCount}`;
        values.push(eventCategory);
      }

      if (severity) {
        paramCount++;
        query += ` AND el.severity = $${paramCount}`;
        values.push(severity);
      }

      if (startDate) {
        paramCount++;
        query += ` AND el.created_at >= $${paramCount}`;
        values.push(startDate);
      }

      if (endDate) {
        paramCount++;
        query += ` AND el.created_at <= $${paramCount}`;
        values.push(endDate);
      }

      query += ` 
        ORDER BY el.created_at DESC 
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `;
      values.push(limit, offset);

      const { rows } = await db.query(query, values);

      return {
        success: true,
        events: rows.map((row) => ({
          id: row.id,
          eventType: row.event_type,
          eventCategory: row.event_category,
          actor: {
            id: row.actor_id,
            type: row.actor_type,
            name: row.actor_id ? `${row.first_name} ${row.last_name}` : 'System',
            email: row.email
          },
          eventData: row.event_data,
          metadata: row.metadata,
          severity: row.severity,
          success: row.success,
          errorMessage: row.error_message,
          duration: row.duration_ms,
          createdAt: row.created_at,
          ipAddress: row.ip_address,
          userAgent: row.user_agent
        })),
        pagination: {
          limit,
          offset,
          hasMore: rows.length === limit
        }
      };
    } catch (error) {
      console.error('Get event history error:', error);
      throw new Error('Failed to retrieve event history');
    }
  }

  // Get events by actor (user)
  async getEventsByActor(actorId, options = {}) {
    try {
      const {
        limit = 50,
        offset = 0,
        eventCategory = null,
        eventType = null,
        startDate = null,
        endDate = null
      } = options;

      let query = `
        SELECT 
          el.*,
          CASE 
            WHEN el.target_type = 'product' THEN p.title
            WHEN el.target_type = 'order' THEN o.order_number
            ELSE NULL
          END as target_name
        FROM event_logs el
        LEFT JOIN products p ON el.target_type = 'product' AND el.target_id = p.id
        LEFT JOIN orders o ON el.target_type = 'order' AND el.target_id = o.id
        WHERE el.actor_id = $1
      `;

      const values = [actorId];
      let paramCount = 1;

      if (eventCategory) {
        paramCount++;
        query += ` AND el.event_category = $${paramCount}`;
        values.push(eventCategory);
      }

      if (eventType) {
        paramCount++;
        query += ` AND el.event_type = $${paramCount}`;
        values.push(eventType);
      }

      if (startDate) {
        paramCount++;
        query += ` AND el.created_at >= $${paramCount}`;
        values.push(startDate);
      }

      if (endDate) {
        paramCount++;
        query += ` AND el.created_at <= $${paramCount}`;
        values.push(endDate);
      }

      query += ` 
        ORDER BY el.created_at DESC 
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `;
      values.push(limit, offset);

      const { rows } = await db.query(query, values);

      return {
        success: true,
        events: rows.map((row) => ({
          id: row.id,
          eventType: row.event_type,
          eventCategory: row.event_category,
          target: {
            id: row.target_id,
            type: row.target_type,
            name: row.target_name
          },
          eventData: row.event_data,
          metadata: row.metadata,
          severity: row.severity,
          success: row.success,
          errorMessage: row.error_message,
          duration: row.duration_ms,
          createdAt: row.created_at
        })),
        pagination: {
          limit,
          offset,
          hasMore: rows.length === limit
        }
      };
    } catch (error) {
      console.error('Get events by actor error:', error);
      throw new Error('Failed to retrieve actor events');
    }
  }

  // Get event statistics
  async getEventStatistics(days = 30) {
    try {
      const query = `
        SELECT 
          event_category,
          event_type,
          COUNT(*) as total_events,
          COUNT(*) FILTER (WHERE success = true) as successful_events,
          COUNT(*) FILTER (WHERE success = false) as failed_events,
          COUNT(DISTINCT actor_id) as unique_actors,
          AVG(duration_ms) as avg_duration_ms
        FROM event_logs
        WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
        GROUP BY event_category, event_type
        ORDER BY total_events DESC
      `;

      const { rows } = await db.query(query);

      return {
        success: true,
        period: `${days} days`,
        statistics: rows.map((row) => ({
          category: row.event_category,
          type: row.event_type,
          totalEvents: parseInt(row.total_events),
          successfulEvents: parseInt(row.successful_events),
          failedEvents: parseInt(row.failed_events),
          uniqueActors: parseInt(row.unique_actors),
          successRate: row.total_events > 0
            ? ((row.successful_events / row.total_events) * 100).toFixed(2)
            : 0,
          avgDuration: row.avg_duration_ms ? parseFloat(row.avg_duration_ms).toFixed(2) : null
        }))
      };
    } catch (error) {
      console.error('Event statistics error:', error);
      throw new Error('Failed to get event statistics');
    }
  }

  // Clean up old events (for maintenance)
  async cleanupOldEvents(retentionDays = 90) {
    try {
      const query = `
        DELETE FROM event_logs 
        WHERE created_at < CURRENT_DATE - INTERVAL '${retentionDays} days'
          AND severity NOT IN ('error', 'critical')
      `;

      const result = await db.query(query);
      const deletedCount = result.rowCount;

      await this.logSystemEvent('event_cleanup', {
        retention_days: retentionDays,
        deleted_count: deletedCount
      });

      return {
        success: true,
        deletedCount,
        retentionDays
      };
    } catch (error) {
      console.error('Event cleanup error:', error);
      throw new Error('Failed to cleanup old events');
    }
  }
}

module.exports = EventLogger;
