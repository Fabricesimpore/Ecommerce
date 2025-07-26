// Mock Payment Service
const crypto = require('crypto');

class MockPaymentService {
  constructor() {
    this.mockMode = true;
    this.orangeMoneyConfig = {
      apiUrl: 'https://api.orange.com/orange-money-webpay/dev/v1',
      merchantKey: 'test_merchant_key',
      notifUrl: 'http://localhost:3000/api/payments/orange-money/webhook',
      returnUrl: 'http://localhost:3000/payment-success',
      cancelUrl: 'http://localhost:3000/payment-cancel',
      webhookSecret: 'test_webhook_secret'
    };
  }

  // Validate payment methods
  isValidPaymentMethod(method) {
    const validMethods = ['orange_money', 'cash_on_delivery', 'bank_transfer'];
    return validMethods.includes(method);
  }

  // Generate Orange Money authentication header
  generateOrangeMoneyAuth() {
    const credentials = `${this.orangeMoneyConfig.merchantKey}:test_password`;
    return `Basic ${Buffer.from(credentials).toString('base64')}`;
  }

  // Initiate payment based on method
  async initiatePayment(paymentData) {
    const {
      orderId, paymentMethod, customerPhone, customerName, customerEmail, userId, ipAddress, userAgent
    } = paymentData;

    // Get order model
    const Order = require('../../models/order.model');
    const order = await Order.findById(orderId);

    if (!order) {
      throw new Error('Order not found');
    }

    if (order.paymentStatus === 'paid') {
      throw new Error('Order is already paid');
    }

    if (!this.isValidPaymentMethod(paymentMethod)) {
      throw new Error(`Invalid payment method: ${paymentMethod}`);
    }

    // Create payment record
    const Payment = require('../../models/payment.model');
    const payment = await Payment.create({
      orderId,
      paymentMethod,
      amount: order.totalAmount,
      currency: order.currency || 'XOF',
      customerPhone,
      customerName,
      customerEmail,
      status: 'pending',
      ipAddress,
      userAgent
    });

    // Fraud detection
    const fraudResult = payment.detectFraud();
    if (fraudResult.recommendation === 'block') {
      await payment.updateStatus('failed', {
        errorDetails: { reason: 'fraud_detected', flags: fraudResult.flags },
        updatedBy: userId
      });
      throw new Error('Payment blocked due to fraud detection');
    }

    // Process payment based on method
    let result;
    switch (paymentMethod) {
      case 'orange_money':
        result = await this.processOrangeMoneyPayment(payment);
        break;
      case 'cash_on_delivery':
        result = await this.processCashOnDeliveryPayment(payment);
        break;
      case 'bank_transfer':
        result = await this.processBankTransferPayment(payment);
        break;
      default:
        throw new Error(`Unsupported payment method: ${paymentMethod}`);
    }

    return result;
  }

  // Mock Orange Money payment processing
  async processMockOrangeMoneyPayment(payment, otp = null) {
    const { customerPhone } = payment;
    const lastDigit = customerPhone.slice(-1);

    // Simulate different scenarios based on phone number
    switch (lastDigit) {
      case '0':
        // Simulate insufficient balance
        await payment.updateStatus('failed', {
          errorDetails: { reason: 'insufficient_balance' },
          providerResponse: { error: 'Insufficient balance' }
        });
        return {
          success: false,
          status: 'error',
          message: 'Payment failed: Insufficient balance'
        };

      case '9':
        // Simulate OTP requirement
        if (!otp) {
          return {
            success: true,
            requiresOtp: true,
            paymentToken: `TOKEN_${Date.now()}`,
            message: 'OTP required for payment verification'
          };
        } if (otp === '1234') {
          // Valid OTP
          await payment.updateStatus('processing', { providerResponse: { transaction_id: `TXN_${Date.now()}` } });
          return {
            success: true,
            status: 'processing',
            paymentReference: payment.paymentReference,
            message: 'Payment processing with valid OTP'
          };
        }
        // Invalid OTP
        await payment.updateStatus('failed', {
          errorDetails: { reason: 'invalid_otp' },
          providerResponse: { error: 'Invalid OTP' }
        });
        return {
          success: false,
          status: 'error',
          message: 'Payment failed: Invalid OTP'
        };

      default:
        // Simulate successful payment
        await payment.updateStatus('processing', {
          providerResponse: {
            transaction_id: `TXN_${Date.now()}`,
            payment_url: `https://payment.orangemoney.com/${payment.id}`
          }
        });
        return {
          success: true,
          status: 'processing',
          paymentReference: payment.paymentReference,
          paymentUrl: `https://payment.orangemoney.com/${payment.id}`,
          message: 'Payment initiated successfully'
        };
    }
  }

  // Process Orange Money payment (calls mock in test mode)
  async processOrangeMoneyPayment(payment) {
    if (this.mockMode) {
      return await this.processMockOrangeMoneyPayment(payment);
    }

    // Real implementation would make API calls here
    throw new Error('Real Orange Money integration not implemented in test mode');
  }

  // Process cash on delivery payment
  async processCashOnDeliveryPayment(payment) {
    if (payment && payment.updateStatus) {
      await payment.updateStatus('processing', { notes: 'Cash on delivery payment - pending delivery completion' });
    }

    return {
      success: true,
      status: 'processing',
      paymentReference: payment ? payment.paymentReference : 'PAY_REF_COD_123',
      message: 'Cash on delivery payment initiated - payment will be collected upon delivery'
    };
  }

  // Process bank transfer payment
  async processBankTransferPayment(payment) {
    const bankDetails = {
      bankName: 'Test Bank',
      accountNumber: '1234567890',
      accountName: 'Ecommerce Platform',
      reference: payment ? payment.paymentReference : 'PAY_REF_BANK_123'
    };

    if (payment && payment.updateStatus) {
      await payment.updateStatus('processing', {
        bankDetails,
        notes: 'Bank transfer payment - awaiting transfer confirmation'
      });
    }

    return {
      success: true,
      status: 'processing',
      paymentReference: payment ? payment.paymentReference : 'PAY_REF_BANK_123',
      bankDetails,
      message: 'Bank transfer payment initiated - please complete the transfer using the provided details'
    };
  }

  // Make Orange Money API request
  async makeOrangeMoneyRequest(method, endpoint, data = {}) {
    // In test environment, axios is mocked and the test sets up the mock behavior
    const axios = require('axios');

    try {
      const config = {
        method,
        url: `${this.orangeMoneyConfig.apiUrl}${endpoint}`,
        headers: {
          Authorization: this.generateOrangeMoneyAuth(),
          'Content-Type': 'application/json'
        },
        data
      };

      // Call axios as a function since the test mocks it that way
      const response = await axios(config);
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(`Orange Money API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      } else {
        throw new Error(`Request error: ${error.message}`);
      }
    }
  }

  // Validate webhook signature
  validateWebhookSignature(payload, signature) {
    const expectedSignature = crypto
      .createHmac('sha256', this.orangeMoneyConfig.webhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');

    // Use constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }

  // Clean up expired payments
  async cleanupExpiredPayments() {
    // Mock cleanup - return number of cleaned up payments
    const mockCleanupCount = Math.floor(Math.random() * 10);
    console.log(`Mock cleanup: removed ${mockCleanupCount} expired payments`);
    return mockCleanupCount;
  }

  // Handle payment webhook
  async handleWebhook(payload, signature) {
    if (!this.validateWebhookSignature(payload, signature)) {
      throw new Error('Invalid webhook signature');
    }

    // Mock webhook processing
    return {
      success: true,
      message: 'Webhook processed successfully'
    };
  }
}

// Create singleton instance
const paymentService = new MockPaymentService();

module.exports = paymentService;
