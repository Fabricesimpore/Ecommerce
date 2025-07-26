// Mock Order class
class MockOrder {
  constructor(data) {
    Object.assign(this, data);
    this.id = data.id || `order-${Date.now()}-${Math.random()}`;
    this.status = data.status || 'pending';
    this.paymentStatus = data.paymentStatus || 'pending';
    this.totalAmount = data.totalAmount || 100.00;
  }

  static async create(orderData) {
    return new MockOrder({
      ...orderData,
      id: `order-${Date.now()}`,
      status: 'pending',
      paymentStatus: 'pending',
      created_at: new Date(),
      updated_at: new Date()
    });
  }

  static async findById(id) {
    return new MockOrder({
      id,
      buyerId: 'buyer-123',
      totalAmount: 100.00,
      status: 'pending',
      paymentStatus: 'pending',
      items: [
        {
          productId: 'product-123',
          quantity: 2,
          price: 50.00
        }
      ],
      shippingAddress: {
        street: '123 Test St',
        city: 'Ouagadougou',
        region: 'Centre',
        country: 'Burkina Faso'
      }
    });
  }

  static async findByBuyer(buyerId, options = {}) {
    return [
      new MockOrder({
        id: 'buyer-order-1',
        buyerId,
        totalAmount: 75.50,
        status: 'completed',
        paymentStatus: 'paid'
      })
    ];
  }

  static async findByVendor(vendorId, options = {}) {
    return [
      new MockOrder({
        id: 'vendor-order-1',
        vendorId,
        totalAmount: 125.00,
        status: 'processing',
        paymentStatus: 'paid'
      })
    ];
  }

  async updateStatus(status) {
    this.status = status;
    this.updated_at = new Date();
    return this;
  }

  async updatePaymentStatus(paymentStatus) {
    this.paymentStatus = paymentStatus;
    this.updated_at = new Date();
    return this;
  }

  async cancel(reason) {
    this.status = 'cancelled';
    this.cancellationReason = reason;
    this.updated_at = new Date();
    return this;
  }

  async save() {
    this.updated_at = new Date();
    return this;
  }

  toJSON() {
    return {
      id: this.id,
      buyerId: this.buyerId,
      vendorId: this.vendorId,
      totalAmount: this.totalAmount,
      status: this.status,
      paymentStatus: this.paymentStatus,
      items: this.items,
      shippingAddress: this.shippingAddress,
      cancellationReason: this.cancellationReason,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}

module.exports = MockOrder;