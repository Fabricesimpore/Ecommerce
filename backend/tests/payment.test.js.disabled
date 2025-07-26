const request = require('supertest');
const app = require('../app');
const db = require('../src/config/database.config');

// Mock all model dependencies
jest.mock('../src/models/user.model');
jest.mock('../src/models/product.model');
jest.mock('../src/models/order.model');
jest.mock('../src/models/payment.model');
jest.mock('../src/services/payment.service');

const User = require('../src/models/user.model');
const Product = require('../src/models/product.model');
const Order = require('../src/models/order.model');
const Payment = require('../src/models/payment.model');
const paymentService = require('../src/services/payment.service');

describe('Payment System', () => {
  let buyerToken;
  let vendorToken;
  let adminToken;
  let buyerUser;
  let vendorUser;
  let adminUser;
  let testProduct;
  let testOrder;

  beforeAll(async () => {
    // Create test users
    buyerUser = await User.create({
      email: 'buyer@test.com',
      phone: '+22670000001',
      password: 'password123',
      role: 'buyer',
      firstName: 'Test',
      lastName: 'Buyer'
    });

    vendorUser = await User.create({
      email: 'vendor@test.com',
      phone: '+22670000002',
      password: 'password123',
      role: 'vendor',
      firstName: 'Test',
      lastName: 'Vendor',
      businessName: 'Test Store',
      nationalId: '123456789'
    });

    adminUser = await User.create({
      email: 'admin@test.com',
      phone: '+22670000003',
      password: 'password123',
      role: 'admin',
      firstName: 'Test',
      lastName: 'Admin'
    });

    // Set users as active
    await vendorUser.updateStatus('active');
    await adminUser.updateStatus('active');

    // Get auth tokens
    const buyerLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'buyer@test.com',
        password: 'password123'
      });
    buyerToken = buyerLogin.body.data.accessToken;

    const vendorLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'vendor@test.com',
        password: 'password123'
      });
    vendorToken = vendorLogin.body.data.accessToken;

    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@test.com',
        password: 'password123'
      });
    adminToken = adminLogin.body.data.accessToken;

    // Create test product
    testProduct = await Product.create({
      title: 'Test Product',
      description: 'Test product description',
      price: 29.99,
      vendorId: vendorUser.id,
      category: 'electronics',
      quantity: 10,
      trackInventory: true
    });

    // Set mock mode for testing
    process.env.PAYMENT_MOCK_MODE = 'true';
  });

  afterAll(async () => {
    // Clean up test data - using mocks so no real DB cleanup needed
    jest.clearAllMocks();
  });

  beforeEach(async () => {
    // Reset mocks between tests
    jest.clearAllMocks();

    // Create a test order for payment tests
    testOrder = await Order.create({
      buyerId: buyerUser.id,
      items: [{ productId: testProduct.id, quantity: 2 }],
      shippingAddress: {
        street: '123 Test St',
        city: 'Ouagadougou',
        region: 'Centre',
        country: 'Burkina Faso'
      },
      paymentMethod: 'orange_money'
    });
  });

  describe('POST /api/payments/initiate', () => {
    it('should initiate Orange Money payment successfully', async () => {
      const paymentData = {
        orderId: testOrder.id,
        paymentMethod: 'orange_money',
        customerPhone: '+22670000001',
        customerName: 'Test Buyer',
        customerEmail: 'buyer@test.com'
      };

      const response = await request(app)
        .post('/api/payments/initiate')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(paymentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.paymentReference).toBeDefined();
      expect(response.body.data.status).toBe('processing');
      expect(response.body.data.paymentUrl).toBeDefined();
    });

    it('should initiate cash on delivery payment', async () => {
      const paymentData = {
        orderId: testOrder.id,
        paymentMethod: 'cash_on_delivery'
      };

      const response = await request(app)
        .post('/api/payments/initiate')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(paymentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('processing');
      expect(response.body.message).toContain('cash on delivery');
    });

    it('should initiate bank transfer payment', async () => {
      const paymentData = {
        orderId: testOrder.id,
        paymentMethod: 'bank_transfer'
      };

      const response = await request(app)
        .post('/api/payments/initiate')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(paymentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('processing');
      expect(response.body.data.transferDetails).toBeDefined();
      expect(response.body.data.transferDetails.accountNumber).toBeDefined();
    });

    it('should require phone number for Orange Money', async () => {
      const paymentData = {
        orderId: testOrder.id,
        paymentMethod: 'orange_money'
      };

      const response = await request(app)
        .post('/api/payments/initiate')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(paymentData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('phone number is required');
    });

    it('should validate phone number format', async () => {
      const paymentData = {
        orderId: testOrder.id,
        paymentMethod: 'orange_money',
        customerPhone: '1234567890' // Invalid format
      };

      const response = await request(app)
        .post('/api/payments/initiate')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(paymentData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid phone number format');
    });

    it('should reject invalid payment method', async () => {
      const paymentData = {
        orderId: testOrder.id,
        paymentMethod: 'invalid_method'
      };

      const response = await request(app)
        .post('/api/payments/initiate')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(paymentData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid payment method');
    });

    it('should prevent duplicate payments for paid orders', async () => {
      // First payment
      await request(app)
        .post('/api/payments/initiate')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          orderId: testOrder.id,
          paymentMethod: 'orange_money',
          customerPhone: '+22670000001'
        })
        .expect(201);

      // Mark order as paid
      await testOrder.updatePaymentStatus('paid', 'TEST_REF');

      // Second payment attempt
      const response = await request(app)
        .post('/api/payments/initiate')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          orderId: testOrder.id,
          paymentMethod: 'orange_money',
          customerPhone: '+22670000001'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already paid');
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/payments/initiate')
        .send({
          orderId: testOrder.id,
          paymentMethod: 'orange_money',
          customerPhone: '+22670000001'
        })
        .expect(401);
    });

    it('should simulate failed payment for phone ending in 0', async () => {
      const paymentData = {
        orderId: testOrder.id,
        paymentMethod: 'orange_money',
        customerPhone: '+22670000000' // Ends in 0 = failure
      };

      const response = await request(app)
        .post('/api/payments/initiate')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(paymentData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Insufficient balance');
    });

    it('should simulate OTP requirement for phone ending in 9', async () => {
      const paymentData = {
        orderId: testOrder.id,
        paymentMethod: 'orange_money',
        customerPhone: '+22670000009' // Ends in 9 = OTP required
      };

      const response = await request(app)
        .post('/api/payments/initiate')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(paymentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.requiresOtp).toBe(true);
      expect(response.body.data.paymentToken).toBeDefined();
    });

    it('should handle OTP validation', async () => {
      const paymentData = {
        orderId: testOrder.id,
        paymentMethod: 'orange_money',
        customerPhone: '+22670000009',
        otpCode: '1234' // Correct OTP
      };

      const response = await request(app)
        .post('/api/payments/initiate')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(paymentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('processing');
    });

    it('should reject invalid OTP', async () => {
      const paymentData = {
        orderId: testOrder.id,
        paymentMethod: 'orange_money',
        customerPhone: '+22670000009',
        otpCode: '0000' // Invalid OTP
      };

      const response = await request(app)
        .post('/api/payments/initiate')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(paymentData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid OTP');
    });
  });

  describe('POST /api/payments/webhook', () => {
    let testPayment;

    beforeEach(async () => {
      testPayment = await Payment.create({
        orderId: testOrder.id,
        paymentMethod: 'orange_money',
        amount: testOrder.totalAmount,
        customerPhone: '+22670000001',
        customerName: 'Test Buyer',
        createdBy: buyerUser.id
      });

      await testPayment.updateStatus('processing');
    });

    it('should handle successful payment webhook', async () => {
      const webhookData = {
        reference: testPayment.paymentReference,
        status: 'success',
        transaction_id: 'TXN123456',
        amount: testOrder.totalAmount,
        authorization_code: 'AUTH123'
      };

      const response = await request(app)
        .post('/api/payments/webhook')
        .send(webhookData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.processed).toBe(true);

      // Verify payment was updated
      const updatedPayment = await Payment.findByReference(testPayment.paymentReference);
      expect(updatedPayment.status).toBe('completed');
      expect(updatedPayment.externalTransactionId).toBe('TXN123456');
    });

    it('should handle failed payment webhook', async () => {
      const webhookData = {
        reference: testPayment.paymentReference,
        status: 'failed',
        error_message: 'Payment failed'
      };

      const response = await request(app)
        .post('/api/payments/webhook')
        .send(webhookData)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify payment was updated
      const updatedPayment = await Payment.findByReference(testPayment.paymentReference);
      expect(updatedPayment.status).toBe('failed');
      expect(updatedPayment.errorDetails.error_message).toBe('Payment failed');
    });

    it('should handle cancelled payment webhook', async () => {
      const webhookData = {
        reference: testPayment.paymentReference,
        status: 'cancelled'
      };

      const response = await request(app)
        .post('/api/payments/webhook')
        .send(webhookData)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify payment was updated
      const updatedPayment = await Payment.findByReference(testPayment.paymentReference);
      expect(updatedPayment.status).toBe('cancelled');
    });

    it('should reject webhook for non-existent payment', async () => {
      const webhookData = {
        reference: 'INVALID_REF',
        status: 'success'
      };

      const response = await request(app)
        .post('/api/payments/webhook')
        .send(webhookData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Payment not found');
    });

    it('should update order payment status on successful payment', async () => {
      const webhookData = {
        reference: testPayment.paymentReference,
        status: 'success',
        transaction_id: 'TXN123456'
      };

      await request(app)
        .post('/api/payments/webhook')
        .send(webhookData)
        .expect(200);

      // Verify order payment status was updated
      const updatedOrder = await Order.findById(testOrder.id);
      expect(updatedOrder.paymentStatus).toBe('paid');
    });
  });

  describe('GET /api/payments/verify/:reference', () => {
    let testPayment;

    beforeEach(async () => {
      testPayment = await Payment.create({
        orderId: testOrder.id,
        paymentMethod: 'orange_money',
        amount: testOrder.totalAmount,
        customerPhone: '+22670000001',
        customerName: 'Test Buyer',
        createdBy: buyerUser.id
      });
    });

    it('should verify payment status successfully', async () => {
      const response = await request(app)
        .get(`/api/payments/verify/${testPayment.paymentReference}`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.paymentReference).toBe(testPayment.paymentReference);
    });

    it('should handle non-existent payment reference', async () => {
      const response = await request(app)
        .get('/api/payments/verify/INVALID_REF')
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Payment not found');
    });

    it('should require authentication', async () => {
      await request(app)
        .get(`/api/payments/verify/${testPayment.paymentReference}`)
        .expect(401);
    });
  });

  describe('GET /api/payments/:reference', () => {
    let testPayment;

    beforeEach(async () => {
      testPayment = await Payment.create({
        orderId: testOrder.id,
        paymentMethod: 'orange_money',
        amount: testOrder.totalAmount,
        customerPhone: '+22670000001',
        customerName: 'Test Buyer',
        createdBy: buyerUser.id
      });
    });

    it('should get payment details for authorized user', async () => {
      const response = await request(app)
        .get(`/api/payments/${testPayment.paymentReference}`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.paymentReference).toBe(testPayment.paymentReference);
      expect(response.body.data.amount).toBe(testOrder.totalAmount);
    });

    it('should deny access to unauthorized user', async () => {
      const response = await request(app)
        .get(`/api/payments/${testPayment.paymentReference}`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Access denied');
    });

    it('should allow admin access to any payment', async () => {
      const response = await request(app)
        .get(`/api/payments/${testPayment.paymentReference}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.paymentReference).toBe(testPayment.paymentReference);
    });

    it('should handle non-existent payment', async () => {
      const response = await request(app)
        .get('/api/payments/INVALID_REF')
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Payment not found');
    });
  });

  describe('PUT /api/payments/:reference/cancel', () => {
    let testPayment;

    beforeEach(async () => {
      testPayment = await Payment.create({
        orderId: testOrder.id,
        paymentMethod: 'orange_money',
        amount: testOrder.totalAmount,
        customerPhone: '+22670000001',
        customerName: 'Test Buyer',
        createdBy: buyerUser.id
      });
    });

    it('should cancel pending payment', async () => {
      const response = await request(app)
        .put(`/api/payments/${testPayment.paymentReference}/cancel`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ reason: 'User requested cancellation' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('cancelled');
    });

    it('should not allow cancelling completed payment', async () => {
      await testPayment.updateStatus('completed');

      const response = await request(app)
        .put(`/api/payments/${testPayment.paymentReference}/cancel`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ reason: 'Test' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('cannot be cancelled');
    });

    it('should require authorization', async () => {
      const response = await request(app)
        .put(`/api/payments/${testPayment.paymentReference}/cancel`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({ reason: 'Test' })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Access denied');
    });
  });

  describe('POST /api/payments/:reference/retry', () => {
    let failedPayment;

    beforeEach(async () => {
      failedPayment = await Payment.create({
        orderId: testOrder.id,
        paymentMethod: 'orange_money',
        amount: testOrder.totalAmount,
        customerPhone: '+22670000001',
        customerName: 'Test Buyer',
        createdBy: buyerUser.id
      });

      await failedPayment.updateStatus('failed');
    });

    it('should retry failed payment', async () => {
      const response = await request(app)
        .post(`/api/payments/${failedPayment.paymentReference}/retry`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ otpCode: '1234' })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.paymentReference).toBeDefined();
      expect(response.body.data.paymentReference).not.toBe(failedPayment.paymentReference);
    });

    it('should not allow retrying completed payment', async () => {
      await failedPayment.updateStatus('processing');
      await failedPayment.updateStatus('completed');

      const response = await request(app)
        .post(`/api/payments/${failedPayment.paymentReference}/retry`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('cannot be retried');
    });
  });

  describe('GET /api/payments/order/:orderId', () => {
    let testPayment;

    beforeEach(async () => {
      testPayment = await Payment.create({
        orderId: testOrder.id,
        paymentMethod: 'orange_money',
        amount: testOrder.totalAmount,
        customerPhone: '+22670000001',
        customerName: 'Test Buyer',
        createdBy: buyerUser.id
      });
    });

    it('should get all payments for order', async () => {
      const response = await request(app)
        .get(`/api/payments/order/${testOrder.id}`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].paymentReference).toBe(testPayment.paymentReference);
    });

    it('should require authorization', async () => {
      const response = await request(app)
        .get(`/api/payments/order/${testOrder.id}`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Access denied');
    });
  });

  describe('Admin Routes', () => {
    let testPayment;

    beforeEach(async () => {
      testPayment = await Payment.create({
        orderId: testOrder.id,
        paymentMethod: 'orange_money',
        amount: testOrder.totalAmount,
        customerPhone: '+22670000001',
        customerName: 'Test Buyer',
        createdBy: buyerUser.id
      });

      await testPayment.updateStatus('completed');
    });

    describe('GET /api/payments/statistics', () => {
      it('should get payment statistics for admin', async () => {
        const response = await request(app)
          .get('/api/payments/statistics')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.statistics).toBeDefined();
        expect(Array.isArray(response.body.data.statistics)).toBe(true);
      });

      it('should require admin role', async () => {
        await request(app)
          .get('/api/payments/statistics')
          .set('Authorization', `Bearer ${buyerToken}`)
          .expect(403);
      });
    });

    describe('POST /api/payments/:reference/refund', () => {
      it('should initiate refund for admin', async () => {
        const response = await request(app)
          .post(`/api/payments/${testPayment.paymentReference}/refund`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            amount: 10.00,
            reason: 'Customer complaint'
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.status).toBe('refunded');
      });

      it('should require admin role', async () => {
        await request(app)
          .post(`/api/payments/${testPayment.paymentReference}/refund`)
          .set('Authorization', `Bearer ${buyerToken}`)
          .send({ reason: 'Test' })
          .expect(403);
      });
    });

    describe('GET /api/payments/:reference/audit', () => {
      it('should get payment audit trail for admin', async () => {
        const response = await request(app)
          .get(`/api/payments/${testPayment.paymentReference}/audit`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.payment).toBeDefined();
        expect(response.body.data.auditTrail).toBeDefined();
        expect(Array.isArray(response.body.data.auditTrail)).toBe(true);
      });

      it('should require admin role', async () => {
        await request(app)
          .get(`/api/payments/${testPayment.paymentReference}/audit`)
          .set('Authorization', `Bearer ${buyerToken}`)
          .expect(403);
      });
    });

    describe('POST /api/payments/cleanup-expired', () => {
      it('should cleanup expired payments for admin', async () => {
        const response = await request(app)
          .post('/api/payments/cleanup-expired')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.expiredCount).toBeDefined();
        expect(typeof response.body.data.expiredCount).toBe('number');
      });

      it('should require admin role', async () => {
        await request(app)
          .post('/api/payments/cleanup-expired')
          .set('Authorization', `Bearer ${buyerToken}`)
          .expect(403);
      });
    });
  });

  describe('Order Payment Integration', () => {
    describe('POST /api/orders/:id/pay', () => {
      it('should initiate payment for order', async () => {
        const response = await request(app)
          .post(`/api/orders/${testOrder.id}/pay`)
          .set('Authorization', `Bearer ${buyerToken}`)
          .send({
            paymentMethod: 'orange_money',
            customerPhone: '+22670000001'
          })
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.payment.paymentReference).toBeDefined();
        expect(response.body.data.order.id).toBe(testOrder.id);
      });

      it('should not allow payment for paid order', async () => {
        await testOrder.updatePaymentStatus('paid', 'TEST_REF');

        const response = await request(app)
          .post(`/api/orders/${testOrder.id}/pay`)
          .set('Authorization', `Bearer ${buyerToken}`)
          .send({
            paymentMethod: 'orange_money',
            customerPhone: '+22670000001'
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('already paid');
      });

      it('should not allow payment for cancelled order', async () => {
        await testOrder.cancel('Test cancellation');

        const response = await request(app)
          .post(`/api/orders/${testOrder.id}/pay`)
          .set('Authorization', `Bearer ${buyerToken}`)
          .send({
            paymentMethod: 'orange_money',
            customerPhone: '+22670000001'
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('cancelled order');
      });
    });
  });

  describe('Payment Model', () => {
    it('should calculate fees correctly', async () => {
      const orangeMoneyFees = Payment.calculateFees('orange_money', 1000);
      const bankTransferFees = Payment.calculateFees('bank_transfer', 1000);
      const codFees = Payment.calculateFees('cash_on_delivery', 1000);

      expect(orangeMoneyFees).toBeGreaterThan(0);
      expect(bankTransferFees).toBeGreaterThan(0);
      expect(codFees).toBe(0);
    });

    it('should detect fraud correctly', async () => {
      const payment = await Payment.create({
        orderId: testOrder.id,
        paymentMethod: 'orange_money',
        amount: 2000000, // High amount
        customerPhone: 'invalid_phone', // Invalid format
        customerName: 'Test Buyer',
        createdBy: buyerUser.id
      });

      const fraudCheck = payment.detectFraud();

      expect(fraudCheck.riskScore).toBeGreaterThan(0);
      expect(fraudCheck.flags).toContain('high_amount');
      expect(fraudCheck.flags).toContain('invalid_phone_format');
    });

    it('should check if payment can be retried', async () => {
      const payment = await Payment.create({
        orderId: testOrder.id,
        paymentMethod: 'orange_money',
        amount: testOrder.totalAmount,
        customerPhone: '+22670000001',
        customerName: 'Test Buyer',
        createdBy: buyerUser.id
      });

      expect(payment.canRetry()).toBe(false); // pending status

      await payment.updateStatus('failed');
      expect(payment.canRetry()).toBe(true);

      await payment.updateStatus('pending');
      await payment.updateStatus('processing');
      await payment.updateStatus('completed');
      expect(payment.canRetry()).toBe(false);
    });

    it('should check if payment is expired', async () => {
      const payment = await Payment.create({
        orderId: testOrder.id,
        paymentMethod: 'orange_money',
        amount: testOrder.totalAmount,
        customerPhone: '+22670000001',
        customerName: 'Test Buyer',
        createdBy: buyerUser.id
      });

      expect(payment.isExpired()).toBe(false);

      // Manually set expired date
      await db.query(
        'UPDATE payments SET expires_at = $1 WHERE id = $2',
        [new Date(Date.now() - 1000), payment.id]
      );

      const expiredPayment = await Payment.findById(payment.id);
      expect(expiredPayment.isExpired()).toBe(true);
    });

    it('should get formatted amount', async () => {
      const payment = await Payment.create({
        orderId: testOrder.id,
        paymentMethod: 'orange_money',
        amount: 1234.56,
        customerPhone: '+22670000001',
        customerName: 'Test Buyer',
        createdBy: buyerUser.id
      });

      const formatted = payment.getFormattedAmount();
      expect(formatted).toContain('1,234.56');
      expect(formatted).toContain('XOF');
    });
  });

  describe('Payment Service', () => {
    it('should validate payment methods', () => {
      expect(paymentService.isValidPaymentMethod('orange_money')).toBe(true);
      expect(paymentService.isValidPaymentMethod('cash_on_delivery')).toBe(true);
      expect(paymentService.isValidPaymentMethod('bank_transfer')).toBe(true);
      expect(paymentService.isValidPaymentMethod('invalid_method')).toBe(false);
    });

    it('should generate Orange Money auth header', () => {
      const auth = paymentService.generateOrangeMoneyAuth();
      expect(auth).toMatch(/^Basic /);
      expect(auth.length).toBeGreaterThan(10);
    });

    it('should validate webhook signatures', () => {
      const payload = { test: 'data' };
      const secret = 'test_secret';
      
      // Mock the webhook secret
      const originalSecret = paymentService.orangeMoneyConfig.webhookSecret;
      paymentService.orangeMoneyConfig.webhookSecret = secret;

      const crypto = require('crypto');
      const validSignature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(payload))
        .digest('hex');

      expect(paymentService.validateWebhookSignature(payload, validSignature)).toBe(true);
      expect(paymentService.validateWebhookSignature(payload, 'invalid_signature')).toBe(false);

      // Restore original secret
      paymentService.orangeMoneyConfig.webhookSecret = originalSecret;
    });
  });
});