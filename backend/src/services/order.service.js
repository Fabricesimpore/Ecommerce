const Order = require('../models/order.model');
const Cart = require('../models/cart.model');
const User = require('../models/user.model');

class OrderService {
  static async createFromCart(userId, orderData) {
    // Get user's cart
    const cart = await Cart.getByUserId(userId);
    if (!cart || !cart.items || cart.items.length === 0) {
      throw new Error('Cart is empty');
    }

    // Validate cart before creating order
    const validation = await cart.validateForCheckout();
    if (!validation.valid) {
      throw new Error(`Cart validation failed: ${validation.issues.join(', ')}`);
    }

    // Prepare order data
    const items = cart.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity
    }));

    const order = await Order.create({
      buyerId: userId,
      items,
      ...orderData
    });

    // Clear cart after successful order creation
    await Cart.clear(userId);

    return order;
  }

  static async createOrder(buyerId, orderData) {
    // Verify buyer exists and is active
    const buyer = await User.findById(buyerId);
    if (!buyer || buyer.status !== 'active') {
      throw new Error('Buyer not found or account not active');
    }

    if (buyer.role !== 'buyer') {
      throw new Error('Only buyers can create orders');
    }

    return await Order.create({
      buyerId,
      ...orderData
    });
  }

  static async getOrder(orderId, userId, userRole) {
    const order = await Order.findById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    // Check authorization
    if (userRole === 'buyer' && order.buyerId !== userId) {
      throw new Error('You can only view your own orders');
    }

    if (userRole === 'vendor') {
      // Check if vendor has items in this order
      const hasItems = order.items.some((item) => item.vendorId === userId);
      if (!hasItems) {
        throw new Error('You can only view orders containing your products');
      }

      // Return vendor-specific view
      return {
        ...order.toJSON(),
        vendorSummary: order.getVendorSummary(userId)
      };
    }

    return order;
  }

  static async getUserOrders(userId, userRole, options = {}) {
    if (userRole === 'buyer') {
      return await Order.findByUser(userId, options);
    } if (userRole === 'vendor') {
      return await Order.findByVendor(userId, options);
    }
    throw new Error('Invalid user role for order access');
  }

  static async updateOrderStatus(orderId, newStatus, userId, userRole) {
    const order = await Order.findById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    // Authorization checks
    if (userRole === 'buyer') {
      if (order.buyerId !== userId) {
        throw new Error('You can only update your own orders');
      }

      // Buyers can only cancel orders
      if (newStatus !== 'cancelled') {
        throw new Error('Buyers can only cancel orders');
      }
    } else if (userRole === 'vendor') {
      // Vendors can only update orders containing their products
      const hasItems = order.items.some((item) => item.vendorId === userId);
      if (!hasItems) {
        throw new Error('You can only update orders containing your products');
      }

      // Vendors can confirm and mark as processing
      const allowedStatuses = ['confirmed', 'processing'];
      if (!allowedStatuses.includes(newStatus)) {
        throw new Error('Vendors can only confirm or mark orders as processing');
      }
    } else if (userRole !== 'admin') {
      throw new Error('Invalid user role for order updates');
    }

    return await order.updateStatus(newStatus);
  }

  static async cancelOrder(orderId, userId, userRole, reason = null) {
    const order = await Order.findById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    // Check authorization
    if (userRole === 'buyer' && order.buyerId !== userId) {
      throw new Error('You can only cancel your own orders');
    }

    if (userRole === 'vendor') {
      // Vendors can cancel orders containing their products if not yet shipped
      const hasItems = order.items.some((item) => item.vendorId === userId);
      if (!hasItems) {
        throw new Error('You can only cancel orders containing your products');
      }
    }

    return await order.cancel(reason);
  }

  static async updatePaymentStatus(orderId, paymentStatus, paymentReference = null) {
    const order = await Order.findById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    return await order.updatePaymentStatus(paymentStatus, paymentReference);
  }

  static async getOrderStats(userId, userRole, period = 'month') {
    let dateFilter = '';
    const now = new Date();

    if (period === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      dateFilter = `AND o.created_at >= '${weekAgo.toISOString()}'`;
    } else if (period === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      dateFilter = `AND o.created_at >= '${monthAgo.toISOString()}'`;
    }

    let query;
    let params;

    if (userRole === 'buyer') {
      query = `
        SELECT 
          COUNT(*) as total_orders,
          COUNT(CASE WHEN o.status = 'delivered' THEN 1 END) as completed_orders,
          COUNT(CASE WHEN o.status = 'cancelled' THEN 1 END) as cancelled_orders,
          COALESCE(SUM(o.total_amount), 0) as total_spent,
          COALESCE(AVG(o.total_amount), 0) as average_order_value
        FROM orders o
        WHERE o.buyer_id = $1 ${dateFilter}
      `;
      params = [userId];
    } else if (userRole === 'vendor') {
      query = `
        SELECT 
          COUNT(DISTINCT o.id) as total_orders,
          COUNT(DISTINCT CASE WHEN o.status = 'delivered' THEN o.id END) as completed_orders,
          COUNT(DISTINCT CASE WHEN o.status = 'cancelled' THEN o.id END) as cancelled_orders,
          COALESCE(SUM(oi.total_price), 0) as total_revenue,
          COALESCE(AVG(oi.total_price), 0) as average_order_value,
          COUNT(oi.id) as total_items_sold
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        WHERE oi.vendor_id = $1 ${dateFilter}
      `;
      params = [userId];
    } else {
      throw new Error('Invalid user role for stats');
    }

    const db = require('../config/database.config');
    const { rows } = await db.query(query, params);

    const stats = {
      totalOrders: parseInt(rows[0].total_orders),
      completedOrders: parseInt(rows[0].completed_orders),
      cancelledOrders: parseInt(rows[0].cancelled_orders),
      totalValue: parseFloat(rows[0].total_spent || rows[0].total_revenue),
      averageOrderValue: parseFloat(rows[0].average_order_value)
    };

    if (userRole === 'vendor') {
      stats.totalItemsSold = parseInt(rows[0].total_items_sold);
    }

    return stats;
  }

  static async getRecentOrders(userId, userRole, limit = 5) {
    const orders = await OrderService.getUserOrders(userId, userRole, { limit });

    return orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      totalAmount: order.totalAmount,
      status: order.status,
      createdAt: order.createdAt,
      itemCount: order.items.length
    }));
  }

  // Admin functions
  static async getAllOrders(options = {}) {
    const {
      status = null,
      paymentStatus = null,
      page = 1,
      limit = 20
    } = options;

    const offset = (page - 1) * limit;
    let query = `
      SELECT o.*,
        JSON_BUILD_OBJECT(
          'id', u.id,
          'firstName', u.first_name,
          'lastName', u.last_name,
          'email', u.email
        ) as buyer
      FROM orders o
      JOIN users u ON o.buyer_id = u.id
      WHERE 1=1
    `;
    const values = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      query += ` AND o.status = $${paramCount}`;
      values.push(status);
    }

    if (paymentStatus) {
      paramCount++;
      query += ` AND o.payment_status = $${paramCount}`;
      values.push(paymentStatus);
    }

    query += ` ORDER BY o.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    values.push(limit, offset);

    const db = require('../config/database.config');
    const { rows } = await db.query(query, values);

    return rows.map((row) => ({
      ...new Order(row).toJSON(),
      buyer: row.buyer
    }));
  }
}

module.exports = OrderService;
