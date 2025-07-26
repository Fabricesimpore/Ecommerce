// Mock Delivery class
class MockDelivery {
  constructor(data) {
    Object.assign(this, data);
    this.id = data.id || `delivery-${Date.now()}-${Math.random()}`;
    this.status = data.status || 'assigned';
    this.estimatedDeliveryTime = data.estimatedDeliveryTime || new Date(Date.now() + 24 * 60 * 60 * 1000);
  }

  static async create(deliveryData) {
    return new MockDelivery({
      ...deliveryData,
      id: `delivery-${Date.now()}`,
      status: 'assigned',
      estimatedDeliveryTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
      created_at: new Date(),
      updated_at: new Date()
    });
  }

  static async findById(id) {
    return new MockDelivery({
      id,
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
      }
    });
  }

  static async findByOrder(orderId) {
    return new MockDelivery({
      id: `delivery-order-${orderId}`,
      orderId,
      driverId: 'driver-123',
      status: 'assigned',
      estimatedDeliveryTime: new Date(Date.now() + 6 * 60 * 60 * 1000)
    });
  }

  static async findByDriver(driverId) {
    return [
      new MockDelivery({
        id: 'delivery-driver-1',
        orderId: 'order-456',
        driverId,
        status: 'assigned',
        estimatedDeliveryTime: new Date(Date.now() + 6 * 60 * 60 * 1000)
      })
    ];
  }

  async updateStatus(status, location = null) {
    this.status = status;
    if (location) {
      this.currentLocation = location;
    }
    this.updated_at = new Date();
    return this;
  }

  async assignDriver(driverId) {
    this.driverId = driverId;
    this.status = 'assigned';
    this.assignedAt = new Date();
    this.updated_at = new Date();
    return this;
  }

  async updateLocation(latitude, longitude) {
    this.currentLocation = { latitude, longitude };
    this.updated_at = new Date();
    return this;
  }

  getEstimatedArrival() {
    return new Date(Date.now() + 45 * 60 * 1000); // 45 minutes from now
  }

  calculateDeliveryFee() {
    return {
      baseFee: 1000, // XOF
      distanceFee: 500, // XOF
      totalFee: 1500, // XOF
      estimatedTime: 30 // minutes
    };
  }

  getTrackingInfo() {
    return {
      id: this.id,
      status: this.status,
      currentLocation: this.currentLocation,
      estimatedArrival: this.getEstimatedArrival(),
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

  async save() {
    this.updated_at = new Date();
    return this;
  }

  toJSON() {
    return {
      id: this.id,
      orderId: this.orderId,
      driverId: this.driverId,
      status: this.status,
      estimatedDeliveryTime: this.estimatedDeliveryTime,
      pickupAddress: this.pickupAddress,
      deliveryAddress: this.deliveryAddress,
      currentLocation: this.currentLocation,
      assignedAt: this.assignedAt,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}

module.exports = MockDelivery;
