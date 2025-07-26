const OrderService = require('../services/order.service');

class OrderController {
  static async createOrder(req, res, next) {
    try {
      const { fromCart = true, items, shippingAddress, paymentMethod, notes } = req.body;
      
      if (!shippingAddress) {
        return res.status(400).json({
          success: false,
          message: 'Shipping address is required'
        });
      }

      if (!paymentMethod) {
        return res.status(400).json({
          success: false,
          message: 'Payment method is required'
        });
      }

      let order;
      
      if (fromCart) {
        // Create order from user's cart
        order = await OrderService.createFromCart(req.userId, {
          shippingAddress,
          paymentMethod,
          notes
        });
      } else {
        // Create order from provided items
        if (!items || !Array.isArray(items) || items.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'Items are required when not ordering from cart'
          });
        }

        order = await OrderService.createOrder(req.userId, {
          items,
          shippingAddress,
          paymentMethod,
          notes
        });
      }
      
      res.status(201).json({
        success: true,
        message: 'Order created successfully',
        data: { order: order.toJSON() }
      });
    } catch (error) {
      next(error);
    }
  }

  static async getOrder(req, res, next) {
    try {
      const { id } = req.params;
      
      const order = await OrderService.getOrder(id, req.userId, req.user.role);
      
      res.status(200).json({
        success: true,
        data: { order: order.toJSON ? order.toJSON() : order }
      });
    } catch (error) {
      next(error);
    }
  }

  static async getMyOrders(req, res, next) {
    try {
      const {
        status,
        page = 1,
        limit = 20
      } = req.query;

      const options = {
        status,
        page: parseInt(page),
        limit: parseInt(limit)
      };

      const orders = await OrderService.getUserOrders(req.userId, req.user.role, options);
      
      res.status(200).json({
        success: true,
        data: {
          orders: orders.map(order => order.toJSON()),
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            hasMore: orders.length === parseInt(limit)
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateOrderStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      if (!status) {
        return res.status(400).json({
          success: false,
          message: 'Status is required'
        });
      }

      const order = await OrderService.updateOrderStatus(
        id, 
        status, 
        req.userId, 
        req.user.role
      );
      
      res.status(200).json({
        success: true,
        message: 'Order status updated successfully',
        data: { order: order.toJSON() }
      });
    } catch (error) {
      next(error);
    }
  }

  static async cancelOrder(req, res, next) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      
      const order = await OrderService.cancelOrder(
        id, 
        req.userId, 
        req.user.role, 
        reason
      );
      
      res.status(200).json({
        success: true,
        message: 'Order cancelled successfully',
        data: { order: order.toJSON() }
      });
    } catch (error) {
      next(error);
    }
  }

  static async trackOrder(req, res, next) {
    try {
      const { orderNumber } = req.params;
      
      // Find order by order number
      const db = require('../config/database.config');
      const { rows } = await db.query(
        'SELECT id FROM orders WHERE order_number = $1',
        [orderNumber]
      );
      
      if (!rows.length) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      const order = await OrderService.getOrder(rows[0].id, req.userId, req.user.role);
      
      // Get delivery information
      const Delivery = require('../models/delivery.model');
      const delivery = await Delivery.findByOrder(order.id);
      
      res.status(200).json({
        success: true,
        data: {
          order: {
            orderNumber: order.orderNumber,
            status: order.status,
            totalAmount: order.totalAmount,
            createdAt: order.createdAt,
            estimatedDeliveryDate: order.estimatedDeliveryDate
          },
          delivery: delivery ? delivery.toJSON() : null
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async getOrderStats(req, res, next) {
    try {
      const { period = 'month' } = req.query;
      
      const stats = await OrderService.getOrderStats(req.userId, req.user.role, period);
      
      res.status(200).json({
        success: true,
        data: { stats }
      });
    } catch (error) {
      next(error);
    }
  }

  static async getRecentOrders(req, res, next) {
    try {
      const { limit = 5 } = req.query;
      
      const orders = await OrderService.getRecentOrders(
        req.userId, 
        req.user.role, 
        parseInt(limit)
      );
      
      res.status(200).json({
        success: true,
        data: { orders }
      });
    } catch (error) {
      next(error);
    }
  }

  // Admin endpoints
  static async getAllOrders(req, res, next) {
    try {
      const {
        status,
        paymentStatus,
        page = 1,
        limit = 20
      } = req.query;

      const options = {
        status,
        paymentStatus,
        page: parseInt(page),
        limit: parseInt(limit)
      };

      const orders = await OrderService.getAllOrders(options);
      
      res.status(200).json({
        success: true,
        data: {
          orders,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            hasMore: orders.length === parseInt(limit)
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async updatePaymentStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { paymentStatus, paymentReference } = req.body;
      
      if (!paymentStatus) {
        return res.status(400).json({
          success: false,
          message: 'Payment status is required'
        });
      }

      const order = await OrderService.updatePaymentStatus(
        id, 
        paymentStatus, 
        paymentReference
      );
      
      res.status(200).json({
        success: true,
        message: 'Payment status updated successfully',
        data: { order: order.toJSON() }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = OrderController;