const paymentService = require('../services/payment.service');
const Payment = require('../models/payment.model');

class PaymentController {
  // POST /api/payments/initiate
  static async initiatePayment(req, res) {
    try {
      const {
        orderId,
        paymentMethod,
        customerPhone,
        customerName,
        customerEmail,
        otpCode
      } = req.body;

      // Validation
      if (!orderId || !paymentMethod) {
        return res.status(400).json({
          success: false,
          message: 'Order ID and payment method are required'
        });
      }

      if (paymentMethod === 'orange_money' && !customerPhone) {
        return res.status(400).json({
          success: false,
          message: 'Customer phone number is required for Orange Money payments'
        });
      }

      // Validate phone number format for Burkina Faso
      if (customerPhone && !customerPhone.match(/^\+226\d{8}$/)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid phone number format. Use +226XXXXXXXX format for Burkina Faso'
        });
      }

      const paymentData = {
        orderId,
        paymentMethod,
        customerPhone,
        customerName: customerName || `${req.user.firstName} ${req.user.lastName}`,
        customerEmail: customerEmail || req.user.email,
        otpCode,
        userId: req.user.id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      };

      const result = await paymentService.initiatePayment(paymentData);

      res.status(201).json({
        success: true,
        message: 'Payment initiated successfully',
        data: result
      });
    } catch (error) {
      console.error('Payment initiation error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Payment initiation failed'
      });
    }
  }

  // POST /api/payments/webhook
  static async handleWebhook(req, res) {
    try {
      const webhookData = req.body;
      const signature = req.get('X-Orange-Signature') || req.get('X-Hub-Signature-256');
      const ipAddress = req.ip;
      const userAgent = req.get('User-Agent');

      console.log('[WEBHOOK] Received notification:', {
        reference: webhookData.reference,
        status: webhookData.status,
        signature: signature ? 'Present' : 'Missing'
      });

      const result = await paymentService.handleWebhook(
        webhookData,
        signature,
        ipAddress,
        userAgent
      );

      res.status(200).json({
        success: true,
        message: 'Webhook processed successfully',
        data: result
      });
    } catch (error) {
      console.error('Webhook processing error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Webhook processing failed'
      });
    }
  }

  // GET /api/payments/verify/:reference
  static async verifyPayment(req, res) {
    try {
      const { reference } = req.params;

      if (!reference) {
        return res.status(400).json({
          success: false,
          message: 'Payment reference is required'
        });
      }

      const payment = await paymentService.verifyPayment(reference);

      res.json({
        success: true,
        message: 'Payment verification completed',
        data: payment
      });
    } catch (error) {
      console.error('Payment verification error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Payment verification failed'
      });
    }
  }

  // GET /api/payments/:reference
  static async getPayment(req, res) {
    try {
      const { reference } = req.params;
      const payment = await Payment.findByReference(reference);

      if (!payment) {
        return res.status(404).json({
          success: false,
          message: 'Payment not found'
        });
      }

      // Check if user has access to this payment
      const hasAccess = await PaymentController.checkPaymentAccess(payment, req.user);
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this payment'
        });
      }

      res.json({
        success: true,
        data: payment.toJSON()
      });
    } catch (error) {
      console.error('Get payment error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve payment'
      });
    }
  }

  // GET /api/payments/order/:orderId
  static async getOrderPayments(req, res) {
    try {
      const { orderId } = req.params;
      const payments = await Payment.findByOrderId(orderId);

      // Check access to at least one payment (they should all belong to same order)
      if (payments.length > 0) {
        const hasAccess = await PaymentController.checkPaymentAccess(payments[0], req.user);
        if (!hasAccess) {
          return res.status(403).json({
            success: false,
            message: 'Access denied to these payments'
          });
        }
      }

      res.json({
        success: true,
        data: payments.map((payment) => payment.toJSON())
      });
    } catch (error) {
      console.error('Get order payments error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve order payments'
      });
    }
  }

  // PUT /api/payments/:reference/cancel
  static async cancelPayment(req, res) {
    try {
      const { reference } = req.params;
      const { reason } = req.body;

      const payment = await Payment.findByReference(reference);
      if (!payment) {
        return res.status(404).json({
          success: false,
          message: 'Payment not found'
        });
      }

      // Check access
      const hasAccess = await PaymentController.checkPaymentAccess(payment, req.user);
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this payment'
        });
      }

      await payment.cancel(reason);

      res.json({
        success: true,
        message: 'Payment cancelled successfully',
        data: payment.toJSON()
      });
    } catch (error) {
      console.error('Cancel payment error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Payment cancellation failed'
      });
    }
  }

  // POST /api/payments/:reference/retry
  static async retryPayment(req, res) {
    try {
      const { reference } = req.params;
      const { otpCode } = req.body;

      const oldPayment = await Payment.findByReference(reference);
      if (!oldPayment) {
        return res.status(404).json({
          success: false,
          message: 'Payment not found'
        });
      }

      // Check access
      const hasAccess = await PaymentController.checkPaymentAccess(oldPayment, req.user);
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this payment'
        });
      }

      if (!oldPayment.canRetry()) {
        return res.status(400).json({
          success: false,
          message: 'This payment cannot be retried'
        });
      }

      // Create new payment with same details
      const paymentData = {
        orderId: oldPayment.orderId,
        paymentMethod: oldPayment.paymentMethod,
        customerPhone: oldPayment.customerPhone,
        customerName: oldPayment.customerName,
        customerEmail: oldPayment.customerEmail,
        otpCode,
        userId: req.user.id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      };

      const result = await paymentService.initiatePayment(paymentData);

      res.status(201).json({
        success: true,
        message: 'Payment retry initiated successfully',
        data: result
      });
    } catch (error) {
      console.error('Retry payment error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Payment retry failed'
      });
    }
  }

  // GET /api/payments/statistics
  static async getPaymentStatistics(req, res) {
    try {
      // Only admins can view payment statistics
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Admin access required'
        });
      }

      const {
        startDate,
        endDate,
        paymentMethod,
        status
      } = req.query;

      const options = {};
      if (startDate) options.startDate = new Date(startDate);
      if (endDate) options.endDate = new Date(endDate);
      if (paymentMethod) options.paymentMethod = paymentMethod;
      if (status) options.status = status;

      const statistics = await paymentService.getPaymentStatistics(options);

      res.json({
        success: true,
        data: {
          statistics,
          filters: options
        }
      });
    } catch (error) {
      console.error('Get payment statistics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve payment statistics'
      });
    }
  }

  // POST /api/payments/:reference/refund
  static async refundPayment(req, res) {
    try {
      // Only admins can initiate refunds
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Admin access required for refunds'
        });
      }

      const { reference } = req.params;
      const { amount, reason } = req.body;

      const result = await paymentService.refundPayment(
        reference,
        amount,
        reason,
        req.user.id
      );

      res.json({
        success: true,
        message: 'Refund initiated successfully',
        data: result
      });
    } catch (error) {
      console.error('Refund payment error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Refund initiation failed'
      });
    }
  }

  // GET /api/payments/:reference/audit
  static async getPaymentAudit(req, res) {
    try {
      // Only admins can view audit trails
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Admin access required'
        });
      }

      const { reference } = req.params;
      const payment = await Payment.findByReference(reference);

      if (!payment) {
        return res.status(404).json({
          success: false,
          message: 'Payment not found'
        });
      }

      const auditTrail = await payment.getAuditTrail();

      res.json({
        success: true,
        data: {
          payment: payment.toJSON(),
          auditTrail
        }
      });
    } catch (error) {
      console.error('Get payment audit error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve payment audit trail'
      });
    }
  }

  // POST /api/payments/cleanup-expired
  static async cleanupExpiredPayments(req, res) {
    try {
      // Only admins can trigger cleanup
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Admin access required'
        });
      }

      const expiredCount = await paymentService.cleanupExpiredPayments();

      res.json({
        success: true,
        message: `Cleaned up ${expiredCount} expired payments`,
        data: { expiredCount }
      });
    } catch (error) {
      console.error('Cleanup expired payments error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to cleanup expired payments'
      });
    }
  }

  // Mock payment confirmation endpoint (for testing)
  static async confirmMockPayment(req, res) {
    try {
      if (process.env.NODE_ENV === 'production') {
        return res.status(404).json({
          success: false,
          message: 'Endpoint not available in production'
        });
      }

      const { reference } = req.params;
      const result = await paymentService.confirmMockPayment(reference);

      res.json({
        success: true,
        message: 'Mock payment confirmed',
        data: result
      });
    } catch (error) {
      console.error('Mock payment confirmation error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Mock payment confirmation failed'
      });
    }
  }

  // Check if user has access to payment
  static async checkPaymentAccess(payment, user) {
    if (user.role === 'admin') {
      return true; // Admins have access to all payments
    }

    // Users can access their own payments
    const Order = require('../models/order.model');
    const order = await Order.findById(payment.orderId);

    if (!order) {
      return false;
    }

    // Buyers can access payments for their orders
    if (user.role === 'buyer' && order.buyerId === user.id) {
      return true;
    }

    // Vendors can access payments for orders containing their products
    if (user.role === 'vendor') {
      const vendorOrders = await Order.findByVendor(user.id);
      return vendorOrders.some((vendorOrder) => vendorOrder.id === order.id);
    }

    return false;
  }
}

module.exports = PaymentController;
