// Mock Analytics Service
class MockAnalyticsService {
  static async calculateDailyStats() {
    return {
      totalOrders: 50,
      totalRevenue: 1250.00,
      newUsers: 12,
      activeUsers: 120,
      conversionRate: 3.2
    };
  }
}

module.exports = MockAnalyticsService;
