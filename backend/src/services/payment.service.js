const Payment = require('../models/payment.model');
const Order = require('../models/order.model');
const crypto = require('crypto');
const axios = require('axios');

class PaymentService {
  constructor() {
    this.orangeMoneyConfig = {
      mode: process.env.ORANGE_MONEY_MODE || 'development',
      apiUrl: process.env.ORANGE_MONEY_API_URL,
      username: process.env.ORANGE_MONEY_USERNAME,
      password: process.env.ORANGE_MONEY_PASSWORD,
      merchantNumber: process.env.ORANGE_MONEY_MERCHANT_NUMBER,
      webhookSecret: process.env.ORANGE_MONEY_WEBHOOK_SECRET,
      callbackUrl: process.env.ORANGE_MONEY_CALLBACK_URL,
      returnUrl: process.env.ORANGE_MONEY_RETURN_URL,
      cancelUrl: process.env.ORANGE_MONEY_CANCEL_URL
    };

    this.mockMode = process.env.PAYMENT_MOCK_MODE === 'true';
    this.autoConfirmDelay = parseInt(process.env.PAYMENT_AUTO_CONFIRM_DELAY) || 5000;
  }

  // Initiate payment process
  async initiatePayment(paymentData) {
    const {
      orderId,
      paymentMethod,
      customerPhone,
      customerName,
      customerEmail,
      otpCode,
      userId,
      ipAddress,
      userAgent
    } = paymentData;

    // Get order details
    const order = await Order.findById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    if (order.paymentStatus === 'paid') {
      throw new Error('Order is already paid');
    }

    // Validate payment method
    if (!this.isValidPaymentMethod(paymentMethod)) {
      throw new Error(`Invalid payment method: ${paymentMethod}`);
    }

    // Create payment record
    const payment = await Payment.create({
      orderId,
      paymentMethod,
      amount: order.totalAmount,
      currency: order.currency || 'XOF',
      customerPhone,
      customerName,
      customerEmail,
      returnUrl: this.orangeMoneyConfig.returnUrl,
      cancelUrl: this.orangeMoneyConfig.cancelUrl,
      createdBy: userId,
      ipAddress,
      userAgent
    });

    // Fraud detection
    const fraudCheck = payment.detectFraud();
    if (fraudCheck.recommendation === 'block') {
      await payment.updateStatus('failed', {
        errorDetails: { reason: 'fraud_detected', flags: fraudCheck.flags },
        updatedBy: userId
      });
      throw new Error('Payment blocked due to fraud detection');
    }

    // Process payment based on method
    let result;
    switch (paymentMethod) {
      case 'orange_money':
        result = await this.processOrangeMoneyPayment(payment, otpCode);
        break;
      case 'cash_on_delivery':
        result = await this.processCashOnDeliveryPayment(payment);
        break;
      case 'bank_transfer':
        result = await this.processBankTransferPayment(payment);
        break;
      default:
        throw new Error(`Payment method ${paymentMethod} not implemented`);
    }

    return result;
  }

  // Process Orange Money payment
  async processOrangeMoneyPayment(payment, otpCode) {
    try {
      if (this.mockMode) {
        return await this.processMockOrangeMoneyPayment(payment, otpCode);
      }

      // Real Orange Money API integration
      const paymentRequest = {
        merchant_key: this.orangeMoneyConfig.merchantNumber,
        currency: payment.currency,
        order_id: payment.paymentReference,
        amount: payment.amount,
        return_url: payment.returnUrl,
        cancel_url: payment.cancelUrl,
        notif_url: this.orangeMoneyConfig.callbackUrl,
        lang: 'fr',
        reference: payment.paymentReference,
        customer_msisdn: payment.customerPhone,
        customer_name: payment.customerName,
        customer_email: payment.customerEmail
      };

      // Add OTP if provided (for direct payment)
      if (otpCode) {
        paymentRequest.otp = otpCode;
      }

      const response = await this.makeOrangeMoneyRequest('POST', '/webpayment', paymentRequest);

      if (response.status === 'success') {
        // Update payment with Orange Money response
        await payment.updateStatus('processing', {
          gatewayResponse: response,
          externalTransactionId: response.transaction_id,
          paymentToken: response.payment_token
        });

        // Update payment URL if redirect is needed
        if (response.payment_url) {
          await payment.updatePaymentUrl(response.payment_url, response.payment_token);
        }

        return {
          success: true,
          paymentReference: payment.paymentReference,
          paymentUrl: response.payment_url,
          status: 'processing',
          message: 'Payment initiated successfully'
        };
      } else {
        await payment.updateStatus('failed', {
          errorDetails: response,
          gatewayResponse: response
        });

        throw new Error(response.message || 'Payment initiation failed');
      }
    } catch (error) {
      await payment.updateStatus('failed', {
        errorDetails: { error: error.message }
      });
      throw error;
    }
  }

  // Mock Orange Money payment for development
  async processMockOrangeMoneyPayment(payment, otpCode) {
    console.log(`[MOCK] Processing Orange Money payment for ${payment.paymentReference}`);

    // Simulate different scenarios based on phone number
    const lastDigit = payment.customerPhone.slice(-1);
    let mockResponse;

    if (lastDigit === '0') {
      // Simulate failure
      mockResponse = {
        status: 'error',
        message: 'Insufficient balance',
        error_code: 'INSUFFICIENT_BALANCE'
      };
    } else if (lastDigit === '9') {
      // Simulate OTP required
      if (!otpCode) {
        mockResponse = {
          status: 'otp_required',
          message: 'OTP code required',
          payment_token: `MOCK_TOKEN_${Date.now()}`
        };
      } else if (otpCode !== '1234') {
        mockResponse = {
          status: 'error',
          message: 'Invalid OTP code',
          error_code: 'INVALID_OTP'
        };
      } else {
        mockResponse = {
          status: 'success',
          transaction_id: `MOCK_TXN_${Date.now()}`,
          payment_token: `MOCK_TOKEN_${Date.now()}`,
          message: 'Payment successful'
        };
      }
    } else {
      // Simulate redirect flow
      mockResponse = {
        status: 'success',
        transaction_id: `MOCK_TXN_${Date.now()}`,
        payment_url: `${process.env.FRONTEND_URL}/mock-payment/${payment.paymentReference}`,
        payment_token: `MOCK_TOKEN_${Date.now()}`,
        message: 'Redirect to Orange Money'
      };
    }

    // Update payment based on mock response
    if (mockResponse.status === 'success') {
      await payment.updateStatus('processing', {
        gatewayResponse: mockResponse,
        externalTransactionId: mockResponse.transaction_id,
        paymentToken: mockResponse.payment_token
      });

      if (mockResponse.payment_url) {
        await payment.updatePaymentUrl(mockResponse.payment_url, mockResponse.payment_token);
      }

      // Auto-confirm after delay (simulate user completing payment)
      if (!mockResponse.payment_url) {
        setTimeout(async () => {
          try {
            await this.confirmMockPayment(payment.paymentReference);
          } catch (error) {
            console.error('Error auto-confirming mock payment:', error);
          }
        }, this.autoConfirmDelay);
      }
    } else if (mockResponse.status === 'otp_required') {
      await payment.updateStatus('processing', {
        gatewayResponse: mockResponse,
        paymentToken: mockResponse.payment_token
      });
    } else {
      await payment.updateStatus('failed', {
        errorDetails: mockResponse,
        gatewayResponse: mockResponse
      });
    }

    return {
      success: mockResponse.status !== 'error',
      paymentReference: payment.paymentReference,
      paymentUrl: mockResponse.payment_url,
      paymentToken: mockResponse.payment_token,
      status: mockResponse.status === 'success' ? 'processing' : mockResponse.status,
      message: mockResponse.message,
      requiresOtp: mockResponse.status === 'otp_required'
    };
  }

  // Process Cash on Delivery payment
  async processCashOnDeliveryPayment(payment) {
    // COD payments are confirmed manually by delivery driver
    await payment.updateStatus('processing', {
      gatewayResponse: { method: 'cash_on_delivery', status: 'pending_delivery' }
    });

    return {
      success: true,
      paymentReference: payment.paymentReference,
      status: 'processing',
      message: 'Cash on delivery payment registered. Payment will be collected upon delivery.'
    };
  }

  // Process Bank Transfer payment
  async processBankTransferPayment(payment) {
    // Generate bank transfer details
    const transferDetails = {
      accountName: 'E-Commerce Platform',
      accountNumber: '0123456789',
      bankName: 'Ecobank Burkina Faso',
      swiftCode: 'ECOCBFBF',
      reference: payment.paymentReference,
      amount: payment.amount,
      currency: payment.currency
    };

    await payment.updateStatus('processing', {
      gatewayResponse: { method: 'bank_transfer', transferDetails }
    });

    return {
      success: true,
      paymentReference: payment.paymentReference,
      status: 'processing',
      transferDetails,
      message: 'Please make the bank transfer using the provided details'
    };
  }

  // Handle webhook notifications
  async handleWebhook(webhookData, signature, ipAddress, userAgent) {
    // Validate webhook signature
    if (!this.validateWebhookSignature(webhookData, signature)) {
      throw new Error('Invalid webhook signature');
    }

    const { reference, status, transaction_id, error_message } = webhookData;

    // Find payment by reference
    const payment = await Payment.findByReference(reference);
    if (!payment) {
      throw new Error(`Payment not found for reference: ${reference}`);
    }

    // Log webhook data
    console.log(`[WEBHOOK] Received notification for ${reference}: ${status}`);

    const updateData = {
      webhookData,
      ipAddress,
      userAgent
    };

    // Update payment status based on webhook
    switch (status.toLowerCase()) {
      case 'success':
      case 'completed':
        if (payment.status !== 'completed') {
          await payment.updateStatus('completed', {
            ...updateData,
            externalTransactionId: transaction_id,
            authorizationCode: webhookData.authorization_code
          });

          // Update order payment status
          const order = await Order.findById(payment.orderId);
          if (order) {
            await order.updatePaymentStatus('paid', payment.paymentReference);
          }
        }
        break;

      case 'failed':
      case 'error':
        if (payment.status === 'processing') {
          await payment.updateStatus('failed', {
            ...updateData,
            errorDetails: { error_message, webhook_data: webhookData }
          });
        }
        break;

      case 'cancelled':
        if (['pending', 'processing'].includes(payment.status)) {
          await payment.updateStatus('cancelled', updateData);
        }
        break;

      default:
        console.warn(`[WEBHOOK] Unknown status: ${status} for ${reference}`);
    }

    return { success: true, processed: true };
  }

  // Verify payment status
  async verifyPayment(paymentReference) {
    const payment = await Payment.findByReference(paymentReference);
    if (!payment) {
      throw new Error('Payment not found');
    }

    if (this.mockMode) {
      return this.verifyMockPayment(payment);
    }

    try {
      // Query Orange Money API for payment status
      const response = await this.makeOrangeMoneyRequest('GET', `/webpayment/${paymentReference}`);

      // Update payment status based on API response
      const updateData = { gatewayResponse: response };

      switch (response.status?.toLowerCase()) {
        case 'success':
        case 'completed':
          if (payment.status !== 'completed') {
            await payment.updateStatus('completed', {
              ...updateData,
              externalTransactionId: response.transaction_id
            });
          }
          break;

        case 'failed':
        case 'error':
          if (payment.status === 'processing') {
            await payment.updateStatus('failed', {
              ...updateData,
              errorDetails: response
            });
          }
          break;

        case 'pending':
        case 'processing':
          // Status hasn't changed, just update gateway response
          break;

        default:
          console.warn(`[VERIFY] Unknown status: ${response.status} for ${paymentReference}`);
      }

      return payment.toJSON();
    } catch (error) {
      console.error(`[VERIFY] Error verifying payment ${paymentReference}:`, error);
      throw new Error('Payment verification failed');
    }
  }

  // Mock payment verification
  async verifyMockPayment(payment) {
    // Simulate different verification results
    const shouldSucceed = Math.random() > 0.1; // 90% success rate

    if (shouldSucceed && payment.status === 'processing') {
      await payment.updateStatus('completed', {
        externalTransactionId: `MOCK_VERIFIED_${Date.now()}`,
        gatewayResponse: { verified: true, mock: true }
      });

      // Update order payment status
      const order = await Order.findById(payment.orderId);
      if (order) {
        await order.updatePaymentStatus('paid', payment.paymentReference);
      }
    }

    return payment.toJSON();
  }

  // Confirm mock payment (for testing)
  async confirmMockPayment(paymentReference) {
    const payment = await Payment.findByReference(paymentReference);
    if (!payment) {
      throw new Error('Payment not found');
    }

    if (payment.status === 'processing') {
      await payment.updateStatus('completed', {
        externalTransactionId: `MOCK_CONFIRMED_${Date.now()}`,
        gatewayResponse: { confirmed: true, mock: true }
      });

      // Update order payment status
      const order = await Order.findById(payment.orderId);
      if (order) {
        await order.updatePaymentStatus('paid', payment.paymentReference);
      }

      console.log(`[MOCK] Auto-confirmed payment: ${paymentReference}`);
    }

    return payment.toJSON();
  }

  // Make request to Orange Money API
  async makeOrangeMoneyRequest(method, endpoint, data = null) {
    const url = `${this.orangeMoneyConfig.apiUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': this.generateOrangeMoneyAuth()
    };

    const config = {
      method,
      url,
      headers,
      timeout: 30000
    };

    if (data) {
      config.data = data;
    }

    try {
      const response = await axios(config);
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(`Orange Money API error: ${error.response.data?.message || error.response.statusText}`);
      } else if (error.request) {
        throw new Error('Orange Money API is not responding');
      } else {
        throw new Error(`Request error: ${error.message}`);
      }
    }
  }

  // Generate Orange Money authentication
  generateOrangeMoneyAuth() {
    const credentials = `${this.orangeMoneyConfig.username}:${this.orangeMoneyConfig.password}`;
    return `Basic ${Buffer.from(credentials).toString('base64')}`;
  }

  // Validate webhook signature
  validateWebhookSignature(payload, signature) {
    if (!this.orangeMoneyConfig.webhookSecret) {
      console.warn('[WEBHOOK] No webhook secret configured, skipping signature validation');
      return true; // Allow for development
    }

    const expectedSignature = crypto
      .createHmac('sha256', this.orangeMoneyConfig.webhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }

  // Validate payment method
  isValidPaymentMethod(method) {
    const validMethods = ['orange_money', 'cash_on_delivery', 'bank_transfer'];
    return validMethods.includes(method);
  }

  // Get payment statistics
  async getPaymentStatistics(options = {}) {
    return await Payment.getStatistics(options);
  }

  // Clean up expired payments
  async cleanupExpiredPayments() {
    return await Payment.cleanupExpiredPayments();
  }

  // Refund payment
  async refundPayment(paymentReference, refundAmount = null, reason = null, userId = null) {
    const payment = await Payment.findByReference(paymentReference);
    if (!payment) {
      throw new Error('Payment not found');
    }

    if (payment.status !== 'completed') {
      throw new Error('Only completed payments can be refunded');
    }

    // In a real implementation, you would call the Orange Money refund API
    if (!this.mockMode) {
      // TODO: Implement actual Orange Money refund API call
      console.log(`[REFUND] Would initiate refund for ${paymentReference}`);
    }

    await payment.refund(refundAmount, reason);

    // Update order status if needed
    const order = await Order.findById(payment.orderId);
    if (order) {
      await order.updatePaymentStatus('refunded', payment.paymentReference);
    }

    return payment.toJSON();
  }
}

module.exports = new PaymentService();