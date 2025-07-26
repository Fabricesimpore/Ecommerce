// Mock Delivery Service
class MockDeliveryService {
  static async createDelivery(deliveryData) {
    return {
      id: `delivery-${Date.now()}`,
      orderId: deliveryData.orderId,
      driverId: deliveryData.driverId || 'driver-123',
      status: 'assigned',
      estimatedDeliveryTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      pickupAddress: deliveryData.pickupAddress,
      deliveryAddress: deliveryData.deliveryAddress,
      created_at: new Date(),
      updated_at: new Date()
    };
  }

  static async updateDeliveryStatus(deliveryId, status, location = null) {
    return {
      id: deliveryId,
      status,
      currentLocation: location,
      updated_at: new Date()
    };
  }

  static async assignDriver(deliveryId, driverId) {
    return {
      id: deliveryId,
      driverId,
      status: 'assigned',
      assignedAt: new Date(),
      updated_at: new Date()
    };
  }

  static async getDeliveryById(deliveryId) {
    return {
      id: deliveryId,
      orderId: 'order-123',
      driverId: 'driver-123',
      status: 'in_transit',
      estimatedDeliveryTime: new Date(Date.now() + 12 * 60 * 60 * 1000),
      pickupAddress: {
        street: '456 Vendor St',
        city: 'Ouagadougou',
        region: 'Centre'
      },
      deliveryAddress: {
        street: '123 Customer Ave',
        city: 'Ouagadougou',
        region: 'Centre'
      },
      currentLocation: {
        latitude: 12.3714,
        longitude: -1.5197
      },
      created_at: new Date(),
      updated_at: new Date()
    };
  }

  static async getDriverDeliveries(driverId, options = {}) {
    return {
      deliveries: [
        {
          id: 'delivery-driver-123',
          orderId: 'order-456',
          driverId,
          status: 'assigned',
          estimatedDeliveryTime: new Date(Date.now() + 6 * 60 * 60 * 1000),
          created_at: new Date()
        }
      ],
      total: 1,
      page: options.page || 1
    };
  }

  static async calculateDeliveryFee(pickupAddress, deliveryAddress) {
    // Mock calculation based on distance
    return {
      baseFee: 1000, // XOF
      distanceFee: 500, // XOF
      totalFee: 1500, // XOF
      estimatedTime: 30 // minutes
    };
  }

  static async trackDelivery(deliveryId) {
    return {
      id: deliveryId,
      status: 'in_transit',
      currentLocation: {
        latitude: 12.3714,
        longitude: -1.5197,
        address: 'Near Rond Point des Nations Unies, Ouagadougou'
      },
      estimatedArrival: new Date(Date.now() + 45 * 60 * 1000), // 45 minutes
      deliveryHistory: [
        {
          status: 'assigned',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
          location: 'Vendor Location'
        },
        {
          status: 'picked_up',
          timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
          location: 'Vendor Location'
        },
        {
          status: 'in_transit',
          timestamp: new Date(Date.now() - 30 * 60 * 1000),
          location: 'En route to customer'
        }
      ]
    };
  }

  static async getDeliveryAnalytics() {
    return {
      totalDeliveries: 150,
      completedDeliveries: 140,
      pendingDeliveries: 10,
      averageDeliveryTime: 45, // minutes
      successRate: 93.3, // percentage
      topDrivers: [
        {
          driverId: 'driver-123',
          name: 'John Doe',
          completedDeliveries: 25,
          rating: 4.8
        }
      ]
    };
  }
}

module.exports = MockDeliveryService;
