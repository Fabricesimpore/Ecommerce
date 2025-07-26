const db = require('../../src/config/database.config');

// Mock dependencies before requiring the service
jest.mock('../../src/config/database.config');

// Create mock event logger
const mockEventLogger = {
  log: jest.fn(),
  logError: jest.fn(),
  logAdminAction: jest.fn()
};

jest.mock('../../src/services/event-logger.service', () => {
  return jest.fn().mockImplementation(() => mockEventLogger);
});

// Now require the service after mocking
const FraudDetectionService = require('../../src/services/fraud-detection.service');

describe('Fraud Detection Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default database mocks
    db.query.mockResolvedValue({ rows: [] });
  });

  describe('analyzeTransaction', () => {
    const mockTransactionData = {
      userId: 'user-123',
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      deviceFingerprint: 'device-123',
      paymentAmount: 100.00,
      paymentMethod: 'orange_money',
      sessionId: 'session-123'
    };

    it('should analyze transaction and return low risk for safe transaction', async () => {
      // Mock user behavior update call (first call)
      db.query.mockResolvedValueOnce({ rows: [] });
      
      // Mock fraud analysis result (second call)
      db.query.mockResolvedValueOnce({
        rows: [{
          risk_score: 15,
          triggered_rules: [],
          recommended_action: 'allow'
        }]
      });

      const result = await FraudDetectionService.analyzeTransaction(mockTransactionData);

      expect(result.success).toBe(true);
      expect(result.riskScore).toBe(15);
      expect(result.riskLevel).toBe('low');
      expect(result.recommendedAction).toBe('allow');
      expect(result.shouldBlock).toBe(false);
      expect(result.shouldReview).toBe(false);
      expect(result.incidentId).toBeNull();
      
      // Verify database queries were called
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM calculate_fraud_score'),
        expect.any(Array)
      );
    });

    it('should create fraud incident for high-risk transaction', async () => {
      // Mock user behavior update call (first call)
      db.query.mockResolvedValueOnce({ rows: [] });
      
      // Mock fraud analysis result
      db.query.mockResolvedValueOnce({
        rows: [{
          risk_score: 75,
          triggered_rules: ['high_amount', 'suspicious_location'],
          recommended_action: 'review'
        }]
      });

      // Mock incident creation
      db.query.mockResolvedValueOnce({
        rows: [{ id: 'incident-123' }]
      });

      const result = await FraudDetectionService.analyzeTransaction(mockTransactionData);

      expect(result.success).toBe(true);
      expect(result.riskScore).toBe(75);
      expect(result.riskLevel).toBe('high');
      expect(result.recommendedAction).toBe('review');
      expect(result.shouldReview).toBe(true);
      expect(result.incidentId).toBe('incident-123');
    });

    it('should block user for critical risk transaction', async () => {
      // Mock user behavior update call (first call)
      db.query.mockResolvedValueOnce({ rows: [] });
      
      // Mock fraud analysis result
      db.query.mockResolvedValueOnce({
        rows: [{
          risk_score: 95,
          triggered_rules: ['stolen_card', 'blacklisted_ip'],
          recommended_action: 'block'
        }]
      });

      // Mock incident creation
      db.query.mockResolvedValueOnce({
        rows: [{ id: 'incident-456' }]
      });

      // Mock user blocking queries
      db.query.mockResolvedValueOnce({ rows: [] }); // UPDATE users
      db.query.mockResolvedValueOnce({ rows: [] }); // UPDATE fraud_incidents

      const result = await FraudDetectionService.analyzeTransaction(mockTransactionData);

      expect(result.success).toBe(true);
      expect(result.riskScore).toBe(95);
      expect(result.riskLevel).toBe('critical');
      expect(result.shouldBlock).toBe(true);
      expect(mockEventLogger.logAdminAction).toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      // Mock successful updateUserBehavior call but error on calculate_fraud_score call  
      db.query
        .mockResolvedValueOnce({ rows: [] }) // updateUserBehavior succeeds
        .mockRejectedValueOnce(new Error('Database connection failed')); // calculate_fraud_score fails

      const result = await FraudDetectionService.analyzeTransaction(mockTransactionData);

      expect(result.success).toBe(false);
      expect(result.riskScore).toBe(0);
      expect(result.riskLevel).toBe('low');
      expect(result.recommendedAction).toBe('allow');
      expect(result.message).toBe('Fraud analysis temporarily unavailable');
      
      // The global mockEventLogger should have been called
      expect(mockEventLogger.logError).toHaveBeenCalled();
    });
  });

  describe('updateIPReputation', () => {
    it('should update IP reputation successfully', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{ id: 'reputation-123' }]
      });

      const result = await FraudDetectionService.updateIPReputation(
        '192.168.1.1',
        'suspicious',
        'Multiple failed login attempts',
        'admin-123'
      );

      expect(result).toBe('reputation-123');
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO ip_reputation'),
        expect.arrayContaining(['192.168.1.1', 'suspicious', 'Multiple failed login attempts'])
      );
      expect(mockEventLogger.log).toHaveBeenCalled();
    });

    it('should handle IP reputation update errors', async () => {
      db.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(
        FraudDetectionService.updateIPReputation('192.168.1.1', 'suspicious', 'Test')
      ).rejects.toThrow('Database error');
    });
  });

  describe('getFraudIncidents', () => {
    it('should get fraud incidents with default options', async () => {
      const mockIncidents = [{
        id: 'incident-1',
        incident_type: 'payment_fraud',
        user_id: 'user-123',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        order_id: null,
        payment_id: null,
        triggered_rules: ['high_amount'],
        risk_score: 65,
        severity: 'medium',
        status: 'pending',
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0',
        device_fingerprint: 'device-123',
        incident_data: {},
        evidence: null,
        action_taken: 'flag',
        user_blocked: false,
        automatic_action: true,
        resolution_notes: null,
        resolved_by: null,
        resolved_at: null,
        created_at: new Date(),
        updated_at: new Date()
      }];

      db.query.mockResolvedValueOnce({ rows: mockIncidents });

      const result = await FraudDetectionService.getFraudIncidents();

      expect(result.success).toBe(true);
      expect(result.incidents).toHaveLength(1);
      expect(result.incidents[0].id).toBe('incident-1');
      expect(result.incidents[0].user.name).toBe('John Doe');
      expect(result.pagination.limit).toBe(50);
    });

    it('should filter incidents by severity', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      await FraudDetectionService.getFraudIncidents({ severity: 'critical' });

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('AND fi.severity = $1'),
        expect.arrayContaining(['critical'])
      );
    });
  });

  describe('resolveFraudIncident', () => {
    it('should resolve fraud incident successfully', async () => {
      const mockIncident = {
        id: 'incident-123',
        user_id: 'user-123',
        user_blocked: false,
        status: 'confirmed',
        resolution_notes: 'Confirmed fraud',
        resolved_at: new Date()
      };

      db.query.mockResolvedValueOnce({ rows: [mockIncident] });

      const resolution = {
        status: 'confirmed',
        notes: 'Confirmed fraud after investigation'
      };

      const result = await FraudDetectionService.resolveFraudIncident(
        'incident-123',
        resolution,
        'admin-123'
      );

      expect(result.success).toBe(true);
      expect(result.incident.status).toBe('confirmed');
      expect(mockEventLogger.logAdminAction).toHaveBeenCalled();
    });

    it('should handle false positive resolution', async () => {
      const mockIncident = {
        id: 'incident-123',
        user_id: 'user-123',
        user_blocked: true,
        status: 'false_positive',
        resolution_notes: 'False positive',
        resolved_at: new Date()
      };

      // Mock the resolution update
      db.query.mockResolvedValueOnce({ rows: [mockIncident] });
      
      // Mock the check for other confirmed incidents
      db.query.mockResolvedValueOnce({ rows: [{ confirmed_incidents: '0' }] });
      
      // Mock user unblock
      db.query.mockResolvedValueOnce({ rows: [] });

      const resolution = {
        status: 'false_positive',
        notes: 'Investigation showed this was not fraud'
      };

      const result = await FraudDetectionService.resolveFraudIncident(
        'incident-123',
        resolution,
        'admin-123'
      );

      expect(result.success).toBe(true);
      expect(mockEventLogger.logAdminAction).toHaveBeenCalledTimes(2); // Once for resolution, once for unblock
    });

    it('should throw error for non-existent incident', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const resolution = { status: 'confirmed', notes: 'Test' };

      await expect(
        FraudDetectionService.resolveFraudIncident('invalid-id', resolution, 'admin-123')
      ).rejects.toThrow('Fraud incident not found');
    });
  });

  describe('getFraudStatistics', () => {
    it('should get fraud statistics for specified period', async () => {
      const mockBreakdown = [{
        incident_type: 'payment_fraud',
        severity: 'high',
        status: 'confirmed',
        incident_count: '5',
        avg_risk_score: '75.5',
        users_blocked: '2',
        automatic_actions: '5'
      }];

      const mockOverall = {
        total_incidents: '10',
        unique_users_flagged: '8',
        confirmed_fraud: '6',
        false_positives: '2',
        avg_risk_score: '65.2',
        total_blocked_users: '3'
      };

      db.query.mockResolvedValueOnce({ rows: mockBreakdown });
      db.query.mockResolvedValueOnce({ rows: [mockOverall] });

      const result = await FraudDetectionService.getFraudStatistics(7);

      expect(result.success).toBe(true);
      expect(result.period).toBe('7 days');
      expect(result.overall.totalIncidents).toBe(10);
      expect(result.overall.accuracy).toBe('60.00');
      expect(result.breakdown).toHaveLength(1);
      expect(result.breakdown[0].count).toBe(5);
    });
  });

  describe('Helper Methods', () => {
    it('should correctly determine risk levels', () => {
      expect(FraudDetectionService.getRiskLevel(10)).toBe('low');      // < 40
      expect(FraudDetectionService.getRiskLevel(39)).toBe('low');      // < 40
      expect(FraudDetectionService.getRiskLevel(45)).toBe('medium');   // >= 40, < 60  
      expect(FraudDetectionService.getRiskLevel(65)).toBe('high');     // >= 60, < 80
      expect(FraudDetectionService.getRiskLevel(85)).toBe('critical'); // >= 80
    });

    it('should generate appropriate action messages', () => {
      expect(FraudDetectionService.getActionMessage('allow', 15))
        .toContain('approved with low risk (15/100)');
      expect(FraudDetectionService.getActionMessage('block', 90))
        .toContain('blocked due to high fraud risk (90/100)');
      expect(FraudDetectionService.getActionMessage('review', 65))
        .toContain('flagged for manual review (65/100)');
    });

    it('should correctly identify transactions that should be blocked', () => {
      const analysis1 = { shouldBlock: true, riskScore: 50 };
      const analysis2 = { shouldBlock: false, riskScore: 85 };
      const analysis3 = { shouldBlock: false, riskScore: 30 };

      expect(FraudDetectionService.shouldBlockTransaction(analysis1)).toBe(true);
      expect(FraudDetectionService.shouldBlockTransaction(analysis2)).toBe(true);
      expect(FraudDetectionService.shouldBlockTransaction(analysis3)).toBe(false);
    });

    it('should correctly identify transactions that should be reviewed', () => {
      const analysis1 = { shouldReview: true, riskScore: 30 };
      const analysis2 = { shouldReview: false, riskScore: 70 };
      const analysis3 = { shouldReview: false, riskScore: 40 };

      expect(FraudDetectionService.shouldReviewTransaction(analysis1)).toBe(true);
      expect(FraudDetectionService.shouldReviewTransaction(analysis2)).toBe(true);
      expect(FraudDetectionService.shouldReviewTransaction(analysis3)).toBe(false);
    });
  });
});