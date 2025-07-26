const db = require('../../src/config/database.config');

// Mock dependencies before requiring the service
jest.mock('../../src/config/database.config');

// Create mock event logger
const mockEventLogger = {
  log: jest.fn()
};

jest.mock('../../src/services/event-logger.service', () => {
  return jest.fn().mockImplementation(() => mockEventLogger);
});

// Now require the service after mocking
const analyticsService = require('../../src/services/analytics.service');

describe('Analytics Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default database mocks
    db.query.mockResolvedValue({ rows: [] });
  });

  describe('service initialization', () => {
    it('should have eventLogger instance', () => {
      const service = analyticsService;
      expect(service.eventLogger).toBeDefined();
    });

    it('should be callable as a service', () => {
      const service = analyticsService;
      expect(typeof service).toBe('object');
      expect(service.constructor.name).toBe('AnalyticsService');
    });
  });

  describe('calculateDailyStats', () => {
    it('should handle database errors gracefully', async () => {
      db.query.mockRejectedValueOnce(new Error('Database connection failed'));

      const service = analyticsService;
      
      await expect(service.calculateDailyStats('2025-07-26')).rejects.toThrow('Database connection failed');
      
      expect(mockEventLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'analytics_calculation_failed',
          eventCategory: 'system',
          success: false,
          errorMessage: 'Database connection failed'
        })
      );
    });
  });
});