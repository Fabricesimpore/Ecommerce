const request = require('supertest');
const app = require('../app');
const db = require('../src/config/database.config');
const User = require('../src/models/user.model');
const Product = require('../src/models/product.model');
const Order = require('../src/models/order.model');
const Cart = require('../src/models/cart.model');

describe('Order System', () => {
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
  });

  afterAll(async () => {
    // Clean up test data
    await db.query('DELETE FROM deliveries');
    await db.query('DELETE FROM order_items');
    await db.query('DELETE FROM orders');
    await db.query('DELETE FROM cart_items');
    await db.query('DELETE FROM carts');
    await db.query('DELETE FROM products');
    await db.query('DELETE FROM users');
    await db.end();
  });

  beforeEach(async () => {
    // Clear orders between tests
    await db.query('DELETE FROM deliveries');
    await db.query('DELETE FROM order_items');
    await db.query('DELETE FROM orders');
    await db.query('DELETE FROM cart_items');
    
    // Reset product inventory
    await db.query('UPDATE products SET quantity = 10 WHERE id = $1', [testProduct.id]);
  });

  describe('POST /api/orders', () => {
    it('should create order from cart', async () => {
      // Add item to cart first
      await Cart.addItem(buyerUser.id, testProduct.id, 2);

      const orderData = {
        shippingAddress: {
          street: '123 Test St',
          city: 'Ouagadougou',
          region: 'Centre',
          country: 'Burkina Faso',
          postalCode: '01000'
        },
        paymentMethod: 'orange_money'
      };

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(orderData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.buyerId).toBe(buyerUser.id);
      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.items[0].quantity).toBe(2);
      expect(response.body.data.totals.subtotal).toBe(59.98);
      expect(response.body.data.status).toBe('pending');
      expect(response.body.data.payment.method).toBe('orange_money');
      expect(response.body.data.orderNumber).toBeDefined();

      testOrder = response.body.data;
    });

    it('should create order with custom items', async () => {
      const orderData = {
        items: [
          {
            productId: testProduct.id,
            quantity: 3
          }
        ],
        shippingAddress: {
          street: '123 Test St',
          city: 'Ouagadougou',
          region: 'Centre',
          country: 'Burkina Faso'
        },
        paymentMethod: 'cash_on_delivery'
      };

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(orderData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.items[0].quantity).toBe(3);
      expect(response.body.data.totals.subtotal).toBe(89.97);
    });

    it('should validate inventory availability', async () => {
      const orderData = {
        items: [
          {
            productId: testProduct.id,
            quantity: 15 // More than available
          }
        ],
        shippingAddress: {
          street: '123 Test St',
          city: 'Ouagadougou'
        },
        paymentMethod: 'orange_money'
      };

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(orderData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Insufficient inventory');
    });

    it('should require shipping address', async () => {
      await Cart.addItem(buyerUser.id, testProduct.id, 2);

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          paymentMethod: 'orange_money'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Shipping address is required');
    });

    it('should decrease product inventory after order', async () => {
      const orderData = {
        items: [
          {
            productId: testProduct.id,
            quantity: 3
          }
        ],
        shippingAddress: {
          street: '123 Test St',
          city: 'Ouagadougou'
        },
        paymentMethod: 'orange_money'
      };

      await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(orderData)
        .expect(201);

      // Check product inventory
      const updatedProduct = await Product.findById(testProduct.id);
      expect(updatedProduct.quantity).toBe(7); // 10 - 3
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/orders')
        .send({
          items: [{ productId: testProduct.id, quantity: 1 }],
          shippingAddress: { street: '123 Test St' },
          paymentMethod: 'orange_money'
        })
        .expect(401);
    });
  });

  describe('GET /api/orders/my-orders', () => {
    beforeEach(async () => {
      // Create a test order
      const orderData = {
        items: [{ productId: testProduct.id, quantity: 2 }],
        shippingAddress: { street: '123 Test St', city: 'Ouagadougou' },
        paymentMethod: 'orange_money'
      };

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(orderData);
      
      testOrder = response.body.data;
    });

    it('should get user orders', async () => {
      const response = await request(app)
        .get('/api/orders/my-orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].id).toBe(testOrder.id);
      expect(response.body.data[0].buyerId).toBe(buyerUser.id);
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get('/api/orders/my-orders?status=pending')
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].status).toBe('pending');
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/orders/my-orders?limit=10&offset=0')
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/orders/my-orders')
        .expect(401);
    });
  });

  describe('GET /api/orders/:id', () => {
    beforeEach(async () => {
      const orderData = {
        items: [{ productId: testProduct.id, quantity: 2 }],
        shippingAddress: { street: '123 Test St', city: 'Ouagadougou' },
        paymentMethod: 'orange_money'
      };

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(orderData);
      
      testOrder = response.body.data;
    });

    it('should get order details', async () => {
      const response = await request(app)
        .get(`/api/orders/${testOrder.id}`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testOrder.id);
      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.delivery).toBeDefined();
    });

    it('should not allow access to other user orders', async () => {
      const response = await request(app)
        .get(`/api/orders/${testOrder.id}`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Access denied');
    });

    it('should handle non-existent order', async () => {
      const response = await request(app)
        .get('/api/orders/999999')
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Order not found');
    });

    it('should require authentication', async () => {
      await request(app)
        .get(`/api/orders/${testOrder.id}`)
        .expect(401);
    });
  });

  describe('PUT /api/orders/:id/status', () => {
    beforeEach(async () => {
      const orderData = {
        items: [{ productId: testProduct.id, quantity: 2 }],
        shippingAddress: { street: '123 Test St', city: 'Ouagadougou' },
        paymentMethod: 'orange_money'
      };

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(orderData);
      
      testOrder = response.body.data;
    });

    it('should allow buyer to cancel pending order', async () => {
      const response = await request(app)
        .put(`/api/orders/${testOrder.id}/status`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ status: 'cancelled' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('cancelled');
      expect(response.body.data.timestamps.cancelledAt).toBeDefined();
    });

    it('should validate status transitions', async () => {
      const response = await request(app)
        .put(`/api/orders/${testOrder.id}/status`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ status: 'delivered' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Cannot transition');
    });

    it('should restore inventory on cancellation', async () => {
      // Check current inventory
      const productBefore = await Product.findById(testProduct.id);
      const inventoryBefore = productBefore.quantity;

      // Cancel order
      await request(app)
        .put(`/api/orders/${testOrder.id}/status`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ status: 'cancelled' })
        .expect(200);

      // Check inventory after cancellation
      const productAfter = await Product.findById(testProduct.id);
      expect(productAfter.quantity).toBe(inventoryBefore + 2);
    });

    it('should not allow unauthorized status changes', async () => {
      const response = await request(app)
        .put(`/api/orders/${testOrder.id}/status`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({ status: 'cancelled' })
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should require authentication', async () => {
      await request(app)
        .put(`/api/orders/${testOrder.id}/status`)
        .send({ status: 'cancelled' })
        .expect(401);
    });
  });

  describe('PUT /api/orders/:id/cancel', () => {
    beforeEach(async () => {
      const orderData = {
        items: [{ productId: testProduct.id, quantity: 2 }],
        shippingAddress: { street: '123 Test St', city: 'Ouagadougou' },
        paymentMethod: 'orange_money'
      };

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(orderData);
      
      testOrder = response.body.data;
    });

    it('should cancel order with reason', async () => {
      const response = await request(app)
        .put(`/api/orders/${testOrder.id}/cancel`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ reason: 'Changed my mind' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('cancelled');
      expect(response.body.data.notes).toContain('Changed my mind');
    });

    it('should not allow cancelling delivered orders', async () => {
      // Update order to delivered status directly in DB
      await db.query(
        'UPDATE orders SET status = $1, delivered_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['delivered', testOrder.id]
      );

      const response = await request(app)
        .put(`/api/orders/${testOrder.id}/cancel`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ reason: 'Test' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Cannot cancel delivered order');
    });

    it('should require authentication', async () => {
      await request(app)
        .put(`/api/orders/${testOrder.id}/cancel`)
        .send({ reason: 'Test' })
        .expect(401);
    });
  });

  describe('GET /api/orders/track/:orderNumber', () => {
    beforeEach(async () => {
      const orderData = {
        items: [{ productId: testProduct.id, quantity: 2 }],
        shippingAddress: { street: '123 Test St', city: 'Ouagadougou' },
        paymentMethod: 'orange_money'
      };

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(orderData);
      
      testOrder = response.body.data;
    });

    it('should track order by order number', async () => {
      const response = await request(app)
        .get(`/api/orders/track/${testOrder.orderNumber}`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.orderNumber).toBe(testOrder.orderNumber);
      expect(response.body.data.status).toBe('pending');
    });

    it('should handle invalid order number', async () => {
      const response = await request(app)
        .get('/api/orders/track/INVALID123')
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Order not found');
    });

    it('should require authentication', async () => {
      await request(app)
        .get(`/api/orders/track/${testOrder.orderNumber}`)
        .expect(401);
    });
  });

  describe('GET /api/orders/my-stats', () => {
    beforeEach(async () => {
      // Create multiple orders for stats
      const orderData = {
        items: [{ productId: testProduct.id, quantity: 1 }],
        shippingAddress: { street: '123 Test St', city: 'Ouagadougou' },
        paymentMethod: 'orange_money'
      };

      await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(orderData);

      await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(orderData);
    });

    it('should get order statistics', async () => {
      const response = await request(app)
        .get('/api/orders/my-stats')
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalOrders).toBe(2);
      expect(response.body.data.totalSpent).toBeGreaterThan(0);
      expect(response.body.data.statusBreakdown).toBeDefined();
      expect(response.body.data.statusBreakdown.pending).toBe(2);
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/orders/my-stats')
        .expect(401);
    });
  });

  describe('Admin Routes', () => {
    beforeEach(async () => {
      const orderData = {
        items: [{ productId: testProduct.id, quantity: 2 }],
        shippingAddress: { street: '123 Test St', city: 'Ouagadougou' },
        paymentMethod: 'orange_money'
      };

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(orderData);
      
      testOrder = response.body.data;
    });

    describe('GET /api/orders/admin/all', () => {
      it('should get all orders for admin', async () => {
        const response = await request(app)
          .get('/api/orders/admin/all')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0].id).toBe(testOrder.id);
      });

      it('should require admin role', async () => {
        await request(app)
          .get('/api/orders/admin/all')
          .set('Authorization', `Bearer ${buyerToken}`)
          .expect(403);
      });
    });

    describe('PUT /api/orders/admin/:id/payment-status', () => {
      it('should update payment status', async () => {
        const response = await request(app)
          .put(`/api/orders/admin/${testOrder.id}/payment-status`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            paymentStatus: 'paid',
            paymentReference: 'PAY12345'
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.payment.status).toBe('paid');
        expect(response.body.data.payment.reference).toBe('PAY12345');
        expect(response.body.data.payment.paidAt).toBeDefined();
      });

      it('should require admin role', async () => {
        await request(app)
          .put(`/api/orders/admin/${testOrder.id}/payment-status`)
          .set('Authorization', `Bearer ${buyerToken}`)
          .send({ paymentStatus: 'paid' })
          .expect(403);
      });
    });
  });

  describe('Order Model Methods', () => {
    beforeEach(async () => {
      testOrder = await Order.create({
        buyerId: buyerUser.id,
        items: [{ productId: testProduct.id, quantity: 2 }],
        shippingAddress: { street: '123 Test St', city: 'Ouagadougou' },
        paymentMethod: 'orange_money'
      });
    });

    it('should get vendor summary', async () => {
      const summary = testOrder.getVendorSummary(vendorUser.id);
      
      expect(summary.orderId).toBe(testOrder.id);
      expect(summary.items).toHaveLength(1);
      expect(summary.vendorTotal).toBe(59.98);
      expect(summary.status).toBe('pending');
    });

    it('should find orders by user', async () => {
      const orders = await Order.findByUser(buyerUser.id);
      
      expect(orders).toHaveLength(1);
      expect(orders[0].id).toBe(testOrder.id);
      expect(orders[0].buyerId).toBe(buyerUser.id);
    });

    it('should find orders by vendor', async () => {
      const orders = await Order.findByVendor(vendorUser.id);
      
      expect(orders).toHaveLength(1);
      expect(orders[0].id).toBe(testOrder.id);
    });

    it('should validate status transitions', async () => {
      await testOrder.updateStatus('confirmed');
      expect(testOrder.status).toBe('confirmed');
      expect(testOrder.confirmedAt).toBeDefined();

      await expect(testOrder.updateStatus('pending')).rejects.toThrow('Cannot transition');
    });

    it('should update payment status', async () => {
      await testOrder.updatePaymentStatus('paid', 'PAY12345');
      
      expect(testOrder.paymentStatus).toBe('paid');
      expect(testOrder.paymentReference).toBe('PAY12345');
      expect(testOrder.paidAt).toBeDefined();
    });
  });
});