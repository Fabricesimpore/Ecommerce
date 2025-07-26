const db = require('../../src/config/database.config');

// Mock the database first
jest.mock('../../src/config/database.config');

// Mock the EventLogger service
jest.mock('../../src/services/event-logger.service', () => {
  return jest.fn().mockImplementation(() => ({
    log: jest.fn(() => Promise.resolve(true)),
    logSystemEvent: jest.fn(() => Promise.resolve(true)),
    logError: jest.fn(() => Promise.resolve(true)),
    logUserAction: jest.fn(() => Promise.resolve(true)),
    logAdminAction: jest.fn(() => Promise.resolve(true))
  }));
});

describe('Fraud Detection Service - Basic Tests', () => {
  let FraudDetectionService;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Clear the require cache and reload the service
    delete require.cache[require.resolve('../../src/services/fraud-detection.service')];
    FraudDetectionService = require('../../src/services/fraud-detection.service');
    
    // Setup default database mocks
    db.query.mockResolvedValue({ rows: [] });
  });

  describe('Helper Methods', () => {
    it('should correctly determine risk levels', () => {
      // Based on thresholds: low: 20, medium: 40, high: 60, critical: 80
      expect(FraudDetectionService.getRiskLevel(10)).toBe('low');
      expect(FraudDetectionService.getRiskLevel(30)).toBe('low'); // 30 < 40
      expect(FraudDetectionService.getRiskLevel(50)).toBe('medium'); // 40 <= 50 < 60
      expect(FraudDetectionService.getRiskLevel(70)).toBe('high'); // 60 <= 70 < 80
      expect(FraudDetectionService.getRiskLevel(85)).toBe('critical'); // 85 >= 80
    });

    it('should generate appropriate action messages', () => {
      expect(FraudDetectionService.getActionMessage('allow', 15))
        .toContain('approved with low risk (15/100)');
      expect(FraudDetectionService.getActionMessage('block', 90))
        .toContain('blocked due to high fraud risk (90/100)');
      expect(FraudDetectionService.getActionMessage('review', 65))
        .toContain('flagged for manual review (65/100)');
      expect(FraudDetectionService.getActionMessage('flag', 45))
        .toContain('flagged with medium risk (45/100)');
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

    it('should handle successful fraud analysis', async () => {
      // Mock the database calls
      db.query
        .mockResolvedValueOnce({ rows: [] }) // updateUserBehavior call
        .mockResolvedValueOnce({ // calculate_fraud_score call
          rows: [{
            risk_score: 25,
            triggered_rules: [],
            recommended_action: 'allow'
          }]
        });

      const result = await FraudDetectionService.analyzeTransaction(mockTransactionData);

      expect(result.success).toBe(true);
      expect(result.riskScore).toBe(25);
      expect(result.riskLevel).toBe('low'); // 25 < 40 threshold
      expect(result.recommendedAction).toBe('allow');
      expect(result.shouldBlock).toBe(false);
      expect(result.shouldReview).toBe(false);
      expect(result.incidentId).toBeNull();

      // Verify database was called
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM calculate_fraud_score'),
        expect.any(Array)
      );
    });

    it('should return safe default on database error', async () => {
      // Mock database error on the updateUserBehavior call
      db.query.mockRejectedValueOnce(new Error('Database connection failed'));

      const result = await FraudDetectionService.analyzeTransaction(mockTransactionData);

      expect(result.success).toBe(false);
      expect(result.riskScore).toBe(0);
      expect(result.riskLevel).toBe('low');
      expect(result.recommendedAction).toBe('allow');
      expect(result.shouldBlock).toBe(false);
      expect(result.message).toBe('Fraud analysis temporarily unavailable');
      expect(result.error).toBeDefined(); // The exact error message may vary
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
    });

    it('should handle IP reputation update errors', async () => {
      db.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(
        FraudDetectionService.updateIPReputation('192.168.1.1', 'suspicious', 'Test')
      ).rejects.toThrow('Database error');
    });
  });

  describe('getFraudStatistics', () => {
    it('should get basic fraud statistics', async () => {
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

      db.query
        .mockResolvedValueOnce({ rows: mockBreakdown })
        .mockResolvedValueOnce({ rows: [mockOverall] });

      const result = await FraudDetectionService.getFraudStatistics(7);

      expect(result.success).toBe(true);
      expect(result.period).toBe('7 days');
      expect(result.overall.totalIncidents).toBe(10);
      expect(result.overall.accuracy).toBe('60.00');
      expect(result.breakdown).toHaveLength(1);
      expect(result.breakdown[0].count).toBe(5);
    });

    it('should handle statistics query errors', async () => {
      db.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(
        FraudDetectionService.getFraudStatistics()
      ).rejects.toThrow('Failed to get fraud statistics');
    });
  });
});