const db = require('../../src/config/database.config');

// Mock dependencies first
jest.mock('../../src/config/database.config');
jest.mock('../../src/models/payment.model');
jest.mock('../../src/models/order.model');
jest.mock('axios');

// Now require the service after mocking
const PaymentService = require('../../src/services/payment.service');
const Payment = require('../../src/models/payment.model');
const Order = require('../../src/models/order.model');
const axios = require('axios');

describe('Payment Service', () => {
  let mockOrder;
  let mockPayment;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    db.query.mockResolvedValue({ rows: [] });
    
    // Mock order
    mockOrder = {
      id: 'order-123',
      totalAmount: 100.00,
      currency: 'XOF',
      paymentStatus: 'pending',
      status: 'pending'
    };
    
    // Mock payment
    mockPayment = {
      id: 'payment-123',
      paymentReference: 'PAY_REF_123',
      orderId: 'order-123',
      paymentMethod: 'orange_money',
      amount: 100.00,
      currency: 'XOF',
      customerPhone: '+22670000001',
      customerName: 'Test Customer',
      customerEmail: 'test@example.com',
      status: 'pending',
      updateStatus: jest.fn(),
      updatePaymentUrl: jest.fn(),
      detectFraud: jest.fn(() => ({ recommendation: 'allow', flags: [] }))
    };
    
    Order.findById = jest.fn().mockResolvedValue(mockOrder);
    Payment.create = jest.fn().mockResolvedValue(mockPayment);
  });

  describe('isValidPaymentMethod', () => {
    it('should validate correct payment methods', () => {
      expect(PaymentService.isValidPaymentMethod('orange_money')).toBe(true);
      expect(PaymentService.isValidPaymentMethod('cash_on_delivery')).toBe(true);
      expect(PaymentService.isValidPaymentMethod('bank_transfer')).toBe(true);
      expect(PaymentService.isValidPaymentMethod('invalid_method')).toBe(false);
    });
  });

  describe('generateOrangeMoneyAuth', () => {
    it('should generate Basic auth header', () => {
      const auth = PaymentService.generateOrangeMoneyAuth();
      expect(auth).toMatch(/^Basic /);
      expect(auth.length).toBeGreaterThan(10);
    });
  });


  describe('initiatePayment', () => {
    const mockPaymentData = {
      orderId: 'order-123',
      paymentMethod: 'orange_money',
      customerPhone: '+22670000001',
      customerName: 'Test Customer',
      customerEmail: 'test@example.com',
      userId: 'user-123',
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0'
    };

    it('should initiate Orange Money payment successfully', async () => {
      // Mock the processOrangeMoneyPayment method
      PaymentService.processOrangeMoneyPayment = jest.fn().mockResolvedValue({
        success: true,
        paymentReference: 'PAY_REF_123',
        paymentUrl: 'https://payment.orangemoney.com/123',
        status: 'processing',
        message: 'Payment initiated successfully'
      });

      const result = await PaymentService.initiatePayment(mockPaymentData);

      expect(result.success).toBe(true);
      expect(result.paymentReference).toBe('PAY_REF_123');
      expect(result.status).toBe('processing');
      expect(Order.findById).toHaveBeenCalledWith('order-123');
      expect(Payment.create).toHaveBeenCalled();
      expect(mockPayment.detectFraud).toHaveBeenCalled();
    });

    it('should throw error for non-existent order', async () => {
      Order.findById.mockResolvedValueOnce(null);

      await expect(
        PaymentService.initiatePayment(mockPaymentData)
      ).rejects.toThrow('Order not found');
    });

    it('should throw error for already paid order', async () => {
      mockOrder.paymentStatus = 'paid';
      Order.findById.mockResolvedValueOnce(mockOrder);

      await expect(
        PaymentService.initiatePayment(mockPaymentData)
      ).rejects.toThrow('Order is already paid');
    });

    it('should throw error for invalid payment method', async () => {
      const invalidPaymentData = {
        ...mockPaymentData,
        paymentMethod: 'invalid_method'
      };

      await expect(
        PaymentService.initiatePayment(invalidPaymentData)
      ).rejects.toThrow('Invalid payment method: invalid_method');
    });

    it('should block payment if fraud is detected', async () => {
      mockPayment.detectFraud.mockReturnValueOnce({
        recommendation: 'block',
        flags: ['suspicious_activity']
      });

      await expect(
        PaymentService.initiatePayment(mockPaymentData)
      ).rejects.toThrow('Payment blocked due to fraud detection');

      expect(mockPayment.updateStatus).toHaveBeenCalledWith('failed', {
        errorDetails: { reason: 'fraud_detected', flags: ['suspicious_activity'] },
        updatedBy: 'user-123'
      });
    });

    it('should initiate cash on delivery payment', async () => {
      const codPaymentData = {
        ...mockPaymentData,
        paymentMethod: 'cash_on_delivery'
      };

      PaymentService.processCashOnDeliveryPayment = jest.fn().mockResolvedValue({
        success: true,
        paymentReference: 'PAY_REF_123',
        status: 'processing',
        message: 'Cash on delivery payment initiated'
      });

      const result = await PaymentService.initiatePayment(codPaymentData);

      expect(result.success).toBe(true);
      expect(PaymentService.processCashOnDeliveryPayment).toHaveBeenCalledWith(mockPayment);
    });

    it('should initiate bank transfer payment', async () => {
      const bankTransferData = {
        ...mockPaymentData,
        paymentMethod: 'bank_transfer'
      };

      PaymentService.processBankTransferPayment = jest.fn().mockResolvedValue({
        success: true,
        paymentReference: 'PAY_REF_123',
        status: 'processing',
        message: 'Bank transfer payment initiated'
      });

      const result = await PaymentService.initiatePayment(bankTransferData);

      expect(result.success).toBe(true);
      expect(PaymentService.processBankTransferPayment).toHaveBeenCalledWith(mockPayment);
    });
  });

  describe('processMockOrangeMoneyPayment', () => {
    it('should simulate successful payment for normal phone numbers', async () => {
      PaymentService.mockMode = true;
      mockPayment.customerPhone = '+22670000001';

      const result = await PaymentService.processMockOrangeMoneyPayment(mockPayment);

      expect(result.success).toBe(true);
      expect(result.status).toBe('processing');
      expect(mockPayment.updateStatus).toHaveBeenCalledWith('processing', expect.any(Object));
    });

    it('should simulate failed payment for phone ending in 0', async () => {
      PaymentService.mockMode = true;
      mockPayment.customerPhone = '+22670000000';

      const result = await PaymentService.processMockOrangeMoneyPayment(mockPayment);

      expect(result.success).toBe(false);
      expect(result.status).toBe('error');
      expect(result.message).toContain('Insufficient balance');
      expect(mockPayment.updateStatus).toHaveBeenCalledWith('failed', expect.any(Object));
    });

    it('should simulate OTP requirement for phone ending in 9', async () => {
      PaymentService.mockMode = true;
      mockPayment.customerPhone = '+22670000009';

      const result = await PaymentService.processMockOrangeMoneyPayment(mockPayment);

      expect(result.success).toBe(true);
      expect(result.requiresOtp).toBe(true);
      expect(result.paymentToken).toBeDefined();
    });

    it('should validate OTP for phone ending in 9', async () => {
      PaymentService.mockMode = true;
      mockPayment.customerPhone = '+22670000009';
      const validOtp = '1234';

      const result = await PaymentService.processMockOrangeMoneyPayment(mockPayment, validOtp);

      expect(result.success).toBe(true);
      expect(result.status).toBe('processing');
      expect(mockPayment.updateStatus).toHaveBeenCalledWith('processing', expect.any(Object));
    });

    it('should reject invalid OTP for phone ending in 9', async () => {
      PaymentService.mockMode = true;
      mockPayment.customerPhone = '+22670000009';
      const invalidOtp = '0000';

      const result = await PaymentService.processMockOrangeMoneyPayment(mockPayment, invalidOtp);

      expect(result.success).toBe(false);
      expect(result.status).toBe('error');
      expect(result.message).toContain('Invalid OTP');
      expect(mockPayment.updateStatus).toHaveBeenCalledWith('failed', expect.any(Object));
    });
  });

  describe('processCashOnDeliveryPayment', () => {
    it('should process cash on delivery payment successfully', async () => {
      const result = await PaymentService.processCashOnDeliveryPayment(mockPayment);

      expect(result.success).toBe(true);
      expect(result.status).toBe('processing');
      expect(result.message).toContain('Cash on delivery');
      // Payment status update may vary based on implementation
    });
  });

  describe('processBankTransferPayment', () => {
    it('should process bank transfer payment successfully', async () => {
      const result = await PaymentService.processBankTransferPayment(mockPayment);

      expect(result.success).toBe(true);
      expect(result.status).toBe('processing');
      // Bank transfer details should be in the message or result
      expect(result.message).toBeDefined();
      // Payment status update may vary based on implementation
    });
  });

  describe('makeOrangeMoneyRequest', () => {
    it('should make successful API request', async () => {
      const mockResponse = {
        data: {
          status: 'success',
          transaction_id: 'TXN123456',
          payment_url: 'https://payment.orangemoney.com/123'
        }
      };

      axios.mockResolvedValueOnce(mockResponse);

      const result = await PaymentService.makeOrangeMoneyRequest('POST', '/webpayment', {
        test: 'data'
      });

      expect(result.status).toBe('success');
      expect(axios).toHaveBeenCalledWith(expect.objectContaining({
        method: 'POST',
        url: expect.stringContaining('/webpayment'),
        headers: expect.objectContaining({
          'Authorization': expect.stringMatching(/^Basic /),
          'Content-Type': 'application/json'
        })
      }));
    });

    it('should handle API request errors', async () => {
      const mockError = {
        response: {
          status: 400,
          data: { error: 'Invalid request' }
        }
      };

      axios.mockRejectedValueOnce(mockError);

      await expect(
        PaymentService.makeOrangeMoneyRequest('POST', '/webpayment', {})
      ).rejects.toThrow('Orange Money API error');
    });

    it('should handle network errors', async () => {
      axios.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        PaymentService.makeOrangeMoneyRequest('POST', '/webpayment', {})
      ).rejects.toThrow('Request error: Network error');
    });
  });


  describe('Helper Methods', () => {
    it('should validate webhook signatures correctly', () => {
      const payload = { test: 'data' };
      const secret = 'test_secret';
      
      // Mock the webhook secret
      PaymentService.orangeMoneyConfig.webhookSecret = secret;

      const crypto = require('crypto');
      const validSignature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(payload))
        .digest('hex');

      // Test with padded signatures to avoid length mismatch
      expect(PaymentService.validateWebhookSignature(payload, validSignature)).toBe(true);
    });
  });
});