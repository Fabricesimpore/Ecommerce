const db = require('../config/database.config');
const EventLogger = require('./event-logger.service');

class FraudDetectionService {
  constructor() {
    this.eventLogger = new EventLogger();
    this.riskThresholds = {
      low: 20,
      medium: 40,
      high: 60,
      critical: 80
    };
  }

  // Main fraud detection method
  async analyzeTransaction(transactionData) {
    const startTime = Date.now();

    try {
      const {
        userId,
        ipAddress,
        userAgent,
        deviceFingerprint,
        paymentAmount,
        paymentMethod,
        sessionId,
        context = {}
      } = transactionData;

      // Update user behavior tracking
      await this.updateUserBehavior(userId, sessionId, ipAddress, userAgent, deviceFingerprint, 'payment', context);

      // Calculate fraud score using database function
      const result = await db.query(`
        SELECT * FROM calculate_fraud_score($1, $2, $3, $4, $5)
      `, [userId, ipAddress, deviceFingerprint, paymentAmount, JSON.stringify(context)]);

      const fraudAnalysis = result.rows[0];
      const riskLevel = this.getRiskLevel(fraudAnalysis.risk_score);

      // Create fraud incident if risk is significant
      let incidentId = null;
      if (fraudAnalysis.risk_score >= this.riskThresholds.medium) {
        incidentId = await this.createFraudIncident({
          userId,
          incidentType: 'payment_fraud',
          triggeredRules: fraudAnalysis.triggered_rules,
          riskScore: fraudAnalysis.risk_score,
          severity: riskLevel,
          ipAddress,
          userAgent,
          sessionId,
          deviceFingerprint,
          incidentData: {
            payment_amount: paymentAmount,
            payment_method: paymentMethod,
            analysis_duration_ms: Date.now() - startTime,
            ...context
          },
          recommendedAction: fraudAnalysis.recommended_action
        });
      }

      // Log the fraud analysis
      await this.eventLogger.log({
        eventType: 'fraud_analysis_completed',
        eventCategory: 'system',
        actorId: userId,
        actorType: 'user',
        eventData: {
          risk_score: fraudAnalysis.risk_score,
          risk_level: riskLevel,
          triggered_rules: fraudAnalysis.triggered_rules,
          recommended_action: fraudAnalysis.recommended_action,
          incident_created: incidentId !== null,
          incident_id: incidentId,
          analysis_duration_ms: Date.now() - startTime
        },
        ipAddress,
        userAgent,
        sessionId,
        severity: riskLevel === 'critical' ? 'error' : 'info'
      });

      return {
        success: true,
        riskScore: fraudAnalysis.risk_score,
        riskLevel,
        triggeredRules: fraudAnalysis.triggered_rules,
        recommendedAction: fraudAnalysis.recommended_action,
        incidentId,
        shouldBlock: fraudAnalysis.recommended_action === 'block',
        shouldReview: fraudAnalysis.recommended_action === 'review',
        message: this.getActionMessage(fraudAnalysis.recommended_action, fraudAnalysis.risk_score)
      };
    } catch (error) {
      await this.eventLogger.logError('fraud_analysis_failed', error, {
        user_id: transactionData.userId,
        transaction_data: transactionData
      });

      console.error('Fraud analysis error:', error);

      // Return safe default in case of system error
      return {
        success: false,
        riskScore: 0,
        riskLevel: 'low',
        triggeredRules: [],
        recommendedAction: 'allow',
        incidentId: null,
        shouldBlock: false,
        shouldReview: false,
        message: 'Fraud analysis temporarily unavailable',
        error: error.message
      };
    }
  }

  // Update user behavior tracking
  async updateUserBehavior(userId, sessionId, ipAddress, userAgent, deviceFingerprint, actionType, context) {
    try {
      await db.query(`
        SELECT update_user_behavior($1, $2, $3, $4, $5, $6, $7)
      `, [userId, sessionId, ipAddress, userAgent, deviceFingerprint, actionType, JSON.stringify(context)]);
    } catch (error) {
      console.error('User behavior update error:', error);
      // Don't throw - this is supplementary data
    }
  }

  // Create fraud incident
  async createFraudIncident(incidentData) {
    try {
      const {
        userId,
        incidentType,
        orderId = null,
        paymentId = null,
        triggeredRules,
        riskScore,
        severity,
        ipAddress,
        userAgent,
        sessionId,
        deviceFingerprint,
        incidentData: data,
        recommendedAction
      } = incidentData;

      const query = `
        INSERT INTO fraud_incidents (
          user_id, incident_type, order_id, payment_id, triggered_rules,
          risk_score, severity, ip_address, user_agent, session_id,
          device_fingerprint, incident_data, action_taken, automatic_action
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING id
      `;

      const values = [
        userId, incidentType, orderId, paymentId, triggeredRules,
        riskScore, severity, ipAddress, userAgent, sessionId,
        deviceFingerprint, JSON.stringify(data), recommendedAction, true
      ];

      const result = await db.query(query, values);
      const incidentId = result.rows[0].id;

      // Automatically block user if critical risk
      if (severity === 'critical' && recommendedAction === 'block') {
        await this.blockUser(userId, incidentId, 'Automatic block due to fraud detection');
      }

      return incidentId;
    } catch (error) {
      console.error('Create fraud incident error:', error);
      return null;
    }
  }

  // Block user due to fraud
  async blockUser(userId, incidentId, reason) {
    try {
      // Update user status to blocked
      await db.query(
        'UPDATE users SET status = $1 WHERE id = $2',
        ['blocked', userId]
      );

      // Update incident to reflect user was blocked
      await db.query(
        'UPDATE fraud_incidents SET user_blocked = true WHERE id = $1',
        [incidentId]
      );

      // Log the blocking action
      await this.eventLogger.logAdminAction(
        'user_blocked_fraud',
        null, // System action
        userId,
        'user',
        {
          incident_id: incidentId,
          reason,
          automatic: true
        }
      );

      console.log(`User ${userId} blocked due to fraud detection (Incident: ${incidentId})`);
    } catch (error) {
      console.error('Block user error:', error);
    }
  }

  // Add IP to reputation list
  async updateIPReputation(ipAddress, reputationType, reason, userId = null) {
    try {
      const query = `
        INSERT INTO ip_reputation (ip_address, reputation_type, reason, source, created_by)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (ip_address) 
        DO UPDATE SET
          reputation_type = EXCLUDED.reputation_type,
          reason = EXCLUDED.reason,
          updated_at = CURRENT_TIMESTAMP
        RETURNING id
      `;

      const source = userId ? 'manual' : 'automatic';
      const result = await db.query(query, [ipAddress, reputationType, reason, source, userId]);

      await this.eventLogger.log({
        eventType: 'ip_reputation_updated',
        eventCategory: 'admin',
        actorId: userId,
        actorType: userId ? 'user' : 'system',
        eventData: {
          ip_address: ipAddress.toString(),
          reputation_type: reputationType,
          reason,
          source
        }
      });

      return result.rows[0].id;
    } catch (error) {
      console.error('Update IP reputation error:', error);
      throw error;
    }
  }

  // Get fraud incidents
  async getFraudIncidents(options = {}) {
    try {
      const {
        status = null,
        severity = null,
        incidentType = null,
        userId = null,
        limit = 50,
        offset = 0,
        startDate = null,
        endDate = null
      } = options;

      let query = `
        SELECT 
          fi.*,
          u.first_name,
          u.last_name,
          u.email,
          resolver.first_name as resolver_first_name,
          resolver.last_name as resolver_last_name
        FROM fraud_incidents fi
        LEFT JOIN users u ON fi.user_id = u.id
        LEFT JOIN users resolver ON fi.resolved_by = resolver.id
        WHERE 1=1
      `;

      const values = [];
      let paramCount = 0;

      if (status) {
        paramCount++;
        query += ` AND fi.status = $${paramCount}`;
        values.push(status);
      }

      if (severity) {
        paramCount++;
        query += ` AND fi.severity = $${paramCount}`;
        values.push(severity);
      }

      if (incidentType) {
        paramCount++;
        query += ` AND fi.incident_type = $${paramCount}`;
        values.push(incidentType);
      }

      if (userId) {
        paramCount++;
        query += ` AND fi.user_id = $${paramCount}`;
        values.push(userId);
      }

      if (startDate) {
        paramCount++;
        query += ` AND fi.created_at >= $${paramCount}`;
        values.push(startDate);
      }

      if (endDate) {
        paramCount++;
        query += ` AND fi.created_at <= $${paramCount}`;
        values.push(endDate);
      }

      query += ` 
        ORDER BY fi.created_at DESC 
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `;
      values.push(limit, offset);

      const { rows } = await db.query(query, values);

      return {
        success: true,
        incidents: rows.map((row) => ({
          id: row.id,
          incidentType: row.incident_type,
          userId: row.user_id,
          user: row.user_id ? {
            name: `${row.first_name} ${row.last_name}`,
            email: row.email
          } : null,
          orderId: row.order_id,
          paymentId: row.payment_id,
          triggeredRules: row.triggered_rules,
          riskScore: row.risk_score,
          severity: row.severity,
          status: row.status,
          ipAddress: row.ip_address,
          userAgent: row.user_agent,
          deviceFingerprint: row.device_fingerprint,
          incidentData: row.incident_data,
          evidence: row.evidence,
          actionTaken: row.action_taken,
          userBlocked: row.user_blocked,
          automaticAction: row.automatic_action,
          resolutionNotes: row.resolution_notes,
          resolvedBy: row.resolved_by ? { name: `${row.resolver_first_name} ${row.resolver_last_name}` } : null,
          resolvedAt: row.resolved_at,
          createdAt: row.created_at,
          updatedAt: row.updated_at
        })),
        pagination: {
          limit,
          offset,
          hasMore: rows.length === limit
        }
      };
    } catch (error) {
      console.error('Get fraud incidents error:', error);
      throw new Error('Failed to retrieve fraud incidents');
    }
  }

  // Resolve fraud incident
  async resolveFraudIncident(incidentId, resolution, userId) {
    try {
      const { status, notes, evidence = {} } = resolution;

      const query = `
        UPDATE fraud_incidents 
        SET 
          status = $1,
          resolution_notes = $2,
          evidence = $3,
          resolved_by = $4,
          resolved_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $5
        RETURNING *
      `;

      const result = await db.query(query, [
        status, notes, JSON.stringify(evidence), userId, incidentId
      ]);

      if (result.rows.length === 0) {
        throw new Error('Fraud incident not found');
      }

      const incident = result.rows[0];

      // If confirmed as false positive, consider unblocking user
      if (status === 'false_positive' && incident.user_blocked) {
        await this.considerUnblockUser(incident.user_id, incidentId, userId);
      }

      await this.eventLogger.logAdminAction(
        'fraud_incident_resolved',
        userId,
        incident.user_id,
        'fraud_incident',
        {
          incident_id: incidentId,
          resolution_status: status,
          was_false_positive: status === 'false_positive'
        }
      );

      return {
        success: true,
        incident: {
          id: incident.id,
          status: incident.status,
          resolutionNotes: incident.resolution_notes,
          resolvedAt: incident.resolved_at
        }
      };
    } catch (error) {
      console.error('Resolve fraud incident error:', error);
      throw error;
    }
  }

  // Consider unblocking user after false positive
  async considerUnblockUser(userId, incidentId, adminId) {
    try {
      // Check if there are other confirmed fraud incidents for this user
      const { rows } = await db.query(`
        SELECT COUNT(*) as confirmed_incidents
        FROM fraud_incidents
        WHERE user_id = $1 AND status = 'confirmed' AND id != $2
      `, [userId, incidentId]);

      const confirmedIncidents = parseInt(rows[0].confirmed_incidents);

      if (confirmedIncidents === 0) {
        // No other confirmed incidents, safe to unblock
        await db.query(
          'UPDATE users SET status = $1 WHERE id = $2',
          ['active', userId]
        );

        await this.eventLogger.logAdminAction(
          'user_unblocked_false_positive',
          adminId,
          userId,
          'user',
          {
            incident_id: incidentId,
            reason: 'False positive fraud detection'
          }
        );

        console.log(`User ${userId} unblocked after false positive incident ${incidentId}`);
      }
    } catch (error) {
      console.error('Consider unblock user error:', error);
    }
  }

  // Get fraud statistics
  async getFraudStatistics(days = 30) {
    try {
      const query = `
        SELECT 
          incident_type,
          severity,
          status,
          COUNT(*) as incident_count,
          AVG(risk_score) as avg_risk_score,
          COUNT(*) FILTER (WHERE user_blocked = true) as users_blocked,
          COUNT(*) FILTER (WHERE automatic_action = true) as automatic_actions
        FROM fraud_incidents
        WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
        GROUP BY incident_type, severity, status
        ORDER BY incident_count DESC
      `;

      const { rows } = await db.query(query);

      // Get overall statistics
      const overallQuery = `
        SELECT 
          COUNT(*) as total_incidents,
          COUNT(DISTINCT user_id) as unique_users_flagged,
          COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed_fraud,
          COUNT(*) FILTER (WHERE status = 'false_positive') as false_positives,
          AVG(risk_score) as avg_risk_score,
          COUNT(*) FILTER (WHERE user_blocked = true) as total_blocked_users
        FROM fraud_incidents
        WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
      `;

      const overallResult = await db.query(overallQuery);
      const overall = overallResult.rows[0];

      return {
        success: true,
        period: `${days} days`,
        overall: {
          totalIncidents: parseInt(overall.total_incidents),
          uniqueUsersFlagged: parseInt(overall.unique_users_flagged),
          confirmedFraud: parseInt(overall.confirmed_fraud),
          falsePositives: parseInt(overall.false_positives),
          avgRiskScore: parseFloat(overall.avg_risk_score) || 0,
          totalBlockedUsers: parseInt(overall.total_blocked_users),
          accuracy: overall.total_incidents > 0
            ? ((overall.confirmed_fraud / overall.total_incidents) * 100).toFixed(2)
            : 0
        },
        breakdown: rows.map((row) => ({
          incidentType: row.incident_type,
          severity: row.severity,
          status: row.status,
          count: parseInt(row.incident_count),
          avgRiskScore: parseFloat(row.avg_risk_score),
          usersBlocked: parseInt(row.users_blocked),
          automaticActions: parseInt(row.automatic_actions)
        }))
      };
    } catch (error) {
      console.error('Fraud statistics error:', error);
      throw new Error('Failed to get fraud statistics');
    }
  }

  // Get fraud dashboard data
  async getFraudDashboard() {
    try {
      const { rows } = await db.query('SELECT * FROM fraud_dashboard ORDER BY incident_date DESC LIMIT 30');

      return {
        success: true,
        dashboard: rows.map((row) => ({
          date: row.incident_date,
          incidentType: row.incident_type,
          severity: row.severity,
          incidentCount: parseInt(row.incident_count),
          avgRiskScore: parseFloat(row.avg_risk_score),
          confirmedFraud: parseInt(row.confirmed_fraud),
          falsePositives: parseInt(row.false_positives),
          usersBlocked: parseInt(row.users_blocked)
        }))
      };
    } catch (error) {
      console.error('Fraud dashboard error:', error);
      throw new Error('Failed to get fraud dashboard data');
    }
  }

  // Helper methods
  getRiskLevel(riskScore) {
    if (riskScore >= this.riskThresholds.critical) return 'critical';
    if (riskScore >= this.riskThresholds.high) return 'high';
    if (riskScore >= this.riskThresholds.medium) return 'medium';
    return 'low';
  }

  getActionMessage(action, riskScore) {
    switch (action) {
      case 'block':
        return `Transaction blocked due to high fraud risk (${riskScore}/100)`;
      case 'review':
        return `Transaction flagged for manual review (${riskScore}/100)`;
      case 'flag':
        return `Transaction flagged with medium risk (${riskScore}/100)`;
      default:
        return `Transaction approved with low risk (${riskScore}/100)`;
    }
  }

  // Validate if transaction should proceed
  shouldBlockTransaction(analysis) {
    return analysis.shouldBlock || analysis.riskScore >= this.riskThresholds.critical;
  }

  shouldReviewTransaction(analysis) {
    return analysis.shouldReview || analysis.riskScore >= this.riskThresholds.high;
  }
}

module.exports = new FraudDetectionService();
