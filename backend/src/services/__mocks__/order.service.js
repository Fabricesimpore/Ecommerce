// Mock Order Service
class MockOrderService {
  static async createOrder(orderData) {
    return {
      id: `order-${Date.now()}`,
      ...orderData,
      status: 'pending',
      paymentStatus: 'pending',
      totalAmount: orderData.totalAmount || 100.00,
      created_at: new Date(),
      updated_at: new Date()
    };
  }

  static async getOrderById(orderId) {
    return {
      id: orderId,
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
      },
      created_at: new Date(),
      updated_at: new Date()
    };
  }

  static async updateOrderStatus(orderId, status) {
    return {
      id: orderId,
      status,
      updated_at: new Date()
    };
  }

  static async updatePaymentStatus(orderId, paymentStatus) {
    return {
      id: orderId,
      paymentStatus,
      updated_at: new Date()
    };
  }

  static async getUserOrders(userId, options = {}) {
    return {
      orders: [
        {
          id: 'order-user-123',
          buyerId: userId,
          totalAmount: 75.50,
          status: 'completed',
          paymentStatus: 'paid',
          created_at: new Date()
        }
      ],
      total: 1,
      page: options.page || 1
    };
  }

  static async getVendorOrders(vendorId, options = {}) {
    return {
      orders: [
        {
          id: 'order-vendor-123',
          vendorId,
          totalAmount: 125.00,
          status: 'processing',
          paymentStatus: 'paid',
          created_at: new Date()
        }
      ],
      total: 1,
      page: options.page || 1
    };
  }

  static async cancelOrder(orderId, reason) {
    return {
      id: orderId,
      status: 'cancelled',
      cancellationReason: reason,
      updated_at: new Date()
    };
  }

  static async calculateOrderTotal(items) {
    const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    return {
      subtotal: total,
      tax: total * 0.1,
      shipping: 5.00,
      total: total + (total * 0.1) + 5.00
    };
  }

  static async validateOrder() {
    return {
      isValid: true,
      errors: []
    };
  }
}

module.exports = MockOrderService;
