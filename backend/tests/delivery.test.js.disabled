const request = require('supertest');
const app = require('../app');
const db = require('../src/config/database.config');
const User = require('../src/models/user.model');
const Product = require('../src/models/product.model');
const Order = require('../src/models/order.model');
const Delivery = require('../src/models/delivery.model');

describe('Delivery System', () => {
  let buyerToken;
  let vendorToken;
  let driverToken;
  let adminToken;
  let buyerUser;
  let vendorUser;
  let driverUser;
  let adminUser;
  let testProduct;
  let testOrder;
  let testDelivery;

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

    driverUser = await User.create({
      email: 'driver@test.com',
      phone: '+22670000003',
      password: 'password123',
      role: 'driver',
      firstName: 'Test',
      lastName: 'Driver'
    });

    adminUser = await User.create({
      email: 'admin@test.com',
      phone: '+22670000004',
      password: 'password123',
      role: 'admin',
      firstName: 'Test',
      lastName: 'Admin'
    });

    // Set users as active
    await vendorUser.updateStatus('active');
    await driverUser.updateStatus('active');
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

    const driverLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'driver@test.com',
        password: 'password123'
      });
    driverToken = driverLogin.body.data.accessToken;

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
    // Clear deliveries and orders between tests
    await db.query('DELETE FROM deliveries');
    await db.query('DELETE FROM order_items');
    await db.query('DELETE FROM orders');
    
    // Create a test order with delivery
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

    // Get the delivery that was created with the order
    testDelivery = await Delivery.findByOrder(testOrder.id);
  });

  describe('POST /api/delivery/apply', () => {
    it('should allow user to apply as driver', async () => {
      // Create a regular user first
      const regularUser = await User.create({
        email: 'regular@test.com',
        phone: '+22670000010',
        password: 'password123',
        role: 'buyer',
        firstName: 'Regular',
        lastName: 'User'
      });

      const regularLogin = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'regular@test.com',
          password: 'password123'
        });
      const regularToken = regularLogin.body.data.accessToken;

      const applicationData = {
        vehicleType: 'motorcycle',
        licenseNumber: 'DL123456',
        vehicleRegistration: 'VR789012',
        workingRegions: ['Centre', 'Kadiogo']
      };

      const response = await request(app)
        .post('/api/delivery/apply')
        .set('Authorization', `Bearer ${regularToken}`)
        .send(applicationData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Application submitted');

      // Clean up
      await db.query('DELETE FROM users WHERE email = $1', ['regular@test.com']);
    });

    it('should not allow existing drivers to apply again', async () => {
      const response = await request(app)
        .post('/api/delivery/apply')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({
          vehicleType: 'motorcycle',
          licenseNumber: 'DL123456'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already a driver');
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/delivery/apply')
        .send({
          vehicleType: 'motorcycle',
          licenseNumber: 'DL123456'
        })
        .expect(401);
    });
  });

  describe('GET /api/delivery/jobs', () => {
    beforeEach(async () => {
      // Confirm order to make delivery available
      await testOrder.updateStatus('confirmed');
    });

    it('should get available delivery jobs for driver', async () => {
      const response = await request(app)
        .get('/api/delivery/jobs')
        .set('Authorization', `Bearer ${driverToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].id).toBe(testDelivery.id);
      expect(response.body.data[0].status).toBe('pending');
      expect(response.body.data[0].order).toBeDefined();
    });

    it('should not show already assigned deliveries', async () => {
      // Assign delivery to current driver
      await testDelivery.assignToDriver(driverUser.id);

      const response = await request(app)
        .get('/api/delivery/jobs')
        .set('Authorization', `Bearer ${driverToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(0);
    });

    it('should require driver role', async () => {
      await request(app)
        .get('/api/delivery/jobs')
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(403);
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/delivery/jobs')
        .expect(401);
    });
  });

  describe('POST /api/delivery/accept/:deliveryId', () => {
    beforeEach(async () => {
      await testOrder.updateStatus('confirmed');
    });

    it('should allow driver to accept delivery', async () => {
      const response = await request(app)
        .post(`/api/delivery/accept/${testDelivery.id}`)
        .set('Authorization', `Bearer ${driverToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('assigned');
      expect(response.body.data.driverId).toBe(driverUser.id);
      expect(response.body.data.timeline.assignedAt).toBeDefined();
      expect(response.body.data.payment.deliveryFee).toBeGreaterThan(0);
      expect(response.body.data.payment.driverEarnings).toBeGreaterThan(0);
    });

    it('should not allow accepting already assigned delivery', async () => {
      // Accept delivery first
      await testDelivery.assignToDriver(driverUser.id);

      const response = await request(app)
        .post(`/api/delivery/accept/${testDelivery.id}`)
        .set('Authorization', `Bearer ${driverToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already assigned');
    });

    it('should not allow non-drivers to accept deliveries', async () => {
      await request(app)
        .post(`/api/delivery/accept/${testDelivery.id}`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(403);
    });

    it('should handle non-existent delivery', async () => {
      const response = await request(app)
        .post('/api/delivery/accept/999999')
        .set('Authorization', `Bearer ${driverToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Delivery not found');
    });

    it('should require authentication', async () => {
      await request(app)
        .post(`/api/delivery/accept/${testDelivery.id}`)
        .expect(401);
    });
  });

  describe('PUT /api/delivery/status/:deliveryId', () => {
    beforeEach(async () => {
      await testOrder.updateStatus('confirmed');
      await testDelivery.assignToDriver(driverUser.id);
    });

    it('should allow driver to update delivery status to picked up', async () => {
      const response = await request(app)
        .put(`/api/delivery/status/${testDelivery.id}`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ status: 'picked_up' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('picked_up');
      expect(response.body.data.timeline.pickupTime).toBeDefined();
    });

    it('should allow updating to in transit', async () => {
      // First update to picked up
      await testDelivery.updateStatus('picked_up');

      const response = await request(app)
        .put(`/api/delivery/status/${testDelivery.id}`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ status: 'in_transit' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('in_transit');
    });

    it('should allow completing delivery with confirmation data', async () => {
      // Progress delivery to in_transit
      await testDelivery.updateStatus('picked_up');
      await testDelivery.updateStatus('in_transit');

      const response = await request(app)
        .put(`/api/delivery/status/${testDelivery.id}`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({
          status: 'delivered',
          deliveryNotes: 'Package delivered successfully',
          deliverySignature: {
            signature: 'base64-signature-data',
            signedBy: 'John Doe'
          }
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('delivered');
      expect(response.body.data.timeline.deliveryTime).toBeDefined();
      expect(response.body.data.confirmation.notes).toBe('Package delivered successfully');
    });

    it('should validate status transitions', async () => {
      const response = await request(app)
        .put(`/api/delivery/status/${testDelivery.id}`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ status: 'delivered' }) // Can't go directly from assigned to delivered
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Cannot transition');
    });

    it('should not allow other drivers to update delivery', async () => {
      // Create another driver
      const otherDriver = await User.create({
        email: 'other-driver@test.com',
        phone: '+22670000011',
        password: 'password123',
        role: 'driver',
        firstName: 'Other',
        lastName: 'Driver'
      });

      const otherDriverLogin = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'other-driver@test.com',
          password: 'password123'
        });
      const otherDriverToken = otherDriverLogin.body.data.accessToken;

      const response = await request(app)
        .put(`/api/delivery/status/${testDelivery.id}`)
        .set('Authorization', `Bearer ${otherDriverToken}`)
        .send({ status: 'picked_up' })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Access denied');

      // Clean up
      await db.query('DELETE FROM users WHERE email = $1', ['other-driver@test.com']);
    });

    it('should require driver role', async () => {
      await request(app)
        .put(`/api/delivery/status/${testDelivery.id}`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ status: 'picked_up' })
        .expect(403);
    });

    it('should require authentication', async () => {
      await request(app)
        .put(`/api/delivery/status/${testDelivery.id}`)
        .send({ status: 'picked_up' })
        .expect(401);
    });
  });

  describe('GET /api/delivery/my-deliveries', () => {
    beforeEach(async () => {
      await testOrder.updateStatus('confirmed');
      await testDelivery.assignToDriver(driverUser.id);
    });

    it('should get driver\'s assigned deliveries', async () => {
      const response = await request(app)
        .get('/api/delivery/my-deliveries')
        .set('Authorization', `Bearer ${driverToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].id).toBe(testDelivery.id);
      expect(response.body.data[0].driverId).toBe(driverUser.id);
      expect(response.body.data[0].order).toBeDefined();
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get('/api/delivery/my-deliveries?status=assigned')
        .set('Authorization', `Bearer ${driverToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].status).toBe('assigned');
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/delivery/my-deliveries?limit=10&offset=0')
        .set('Authorization', `Bearer ${driverToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
    });

    it('should require driver role', async () => {
      await request(app)
        .get('/api/delivery/my-deliveries')
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(403);
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/delivery/my-deliveries')
        .expect(401);
    });
  });

  describe('GET /api/delivery/my-stats', () => {
    beforeEach(async () => {
      await testOrder.updateStatus('confirmed');
      await testDelivery.assignToDriver(driverUser.id);
      await testDelivery.updateStatus('picked_up');
      await testDelivery.updateStatus('in_transit');
      await testDelivery.updateStatus('delivered');
    });

    it('should get driver statistics', async () => {
      const response = await request(app)
        .get('/api/delivery/my-stats')
        .set('Authorization', `Bearer ${driverToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalDeliveries).toBe(1);
      expect(response.body.data.completedDeliveries).toBe(1);
      expect(response.body.data.failedDeliveries).toBe(0);
      expect(response.body.data.totalEarnings).toBeGreaterThan(0);
      expect(response.body.data.successRate).toBe('100.00');
    });

    it('should support different time periods', async () => {
      const response = await request(app)
        .get('/api/delivery/my-stats?period=week')
        .set('Authorization', `Bearer ${driverToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalDeliveries).toBe(1);
    });

    it('should require driver role', async () => {
      await request(app)
        .get('/api/delivery/my-stats')
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(403);
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/delivery/my-stats')
        .expect(401);
    });
  });

  describe('GET /api/delivery/track/:deliveryId', () => {
    beforeEach(async () => {
      await testOrder.updateStatus('confirmed');
      await testDelivery.assignToDriver(driverUser.id);
    });

    it('should allow buyer to track their delivery', async () => {
      const response = await request(app)
        .get(`/api/delivery/track/${testDelivery.id}`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testDelivery.id);
      expect(response.body.data.status).toBe('assigned');
      expect(response.body.data.order.id).toBe(testOrder.id);
    });

    it('should allow assigned driver to track delivery', async () => {
      const response = await request(app)
        .get(`/api/delivery/track/${testDelivery.id}`)
        .set('Authorization', `Bearer ${driverToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testDelivery.id);
    });

    it('should not allow unauthorized access', async () => {
      const response = await request(app)
        .get(`/api/delivery/track/${testDelivery.id}`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Access denied');
    });

    it('should handle non-existent delivery', async () => {
      const response = await request(app)
        .get('/api/delivery/track/999999')
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Delivery not found');
    });

    it('should require authentication', async () => {
      await request(app)
        .get(`/api/delivery/track/${testDelivery.id}`)
        .expect(401);
    });
  });

  describe('Admin Routes', () => {
    beforeEach(async () => {
      await testOrder.updateStatus('confirmed');
      await testDelivery.assignToDriver(driverUser.id);
    });

    describe('GET /api/delivery/admin/all', () => {
      it('should get all deliveries for admin', async () => {
        const response = await request(app)
          .get('/api/delivery/admin/all')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0].id).toBe(testDelivery.id);
      });

      it('should require admin role', async () => {
        await request(app)
          .get('/api/delivery/admin/all')
          .set('Authorization', `Bearer ${driverToken}`)
          .expect(403);
      });
    });

    describe('PUT /api/delivery/admin/drivers/:driverId/approve', () => {
      it('should approve driver application', async () => {
        const response = await request(app)
          .put(`/api/delivery/admin/drivers/${driverUser.id}/approve`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('approved');
      });

      it('should require admin role', async () => {
        await request(app)
          .put(`/api/delivery/admin/drivers/${driverUser.id}/approve`)
          .set('Authorization', `Bearer ${driverToken}`)
          .expect(403);
      });
    });

    describe('GET /api/delivery/admin/analytics', () => {
      it('should get delivery analytics', async () => {
        const response = await request(app)
          .get('/api/delivery/admin/analytics')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.totalDeliveries).toBeDefined();
        expect(response.body.data.averageDeliveryTime).toBeDefined();
        expect(response.body.data.statusBreakdown).toBeDefined();
      });

      it('should require admin role', async () => {
        await request(app)
          .get('/api/delivery/admin/analytics')
          .set('Authorization', `Bearer ${driverToken}`)
          .expect(403);
      });
    });
  });

  describe('Delivery Model Methods', () => {
    beforeEach(async () => {
      await testOrder.updateStatus('confirmed');
    });

    it('should find delivery by order', async () => {
      const delivery = await Delivery.findByOrder(testOrder.id);
      
      expect(delivery).toBeDefined();
      expect(delivery.orderId).toBe(testOrder.id);
      expect(delivery.status).toBe('pending');
    });

    it('should find available deliveries', async () => {
      const deliveries = await Delivery.findAvailableDeliveries();
      
      expect(deliveries).toHaveLength(1);
      expect(deliveries[0].id).toBe(testDelivery.id);
      expect(deliveries[0].status).toBe('pending');
    });

    it('should assign delivery to driver', async () => {
      await testDelivery.assignToDriver(driverUser.id);
      
      expect(testDelivery.status).toBe('assigned');
      expect(testDelivery.driverId).toBe(driverUser.id);
      expect(testDelivery.deliveryFee).toBeGreaterThan(0);
      expect(testDelivery.driverEarnings).toBeGreaterThan(0);
    });

    it('should validate status transitions', async () => {
      await testDelivery.assignToDriver(driverUser.id);
      
      await testDelivery.updateStatus('picked_up');
      expect(testDelivery.status).toBe('picked_up');
      expect(testDelivery.pickupTime).toBeDefined();

      await expect(testDelivery.updateStatus('delivered')).rejects.toThrow('Cannot transition');
    });

    it('should calculate route information', async () => {
      await testDelivery.calculateRoute();
      
      expect(testDelivery.estimatedDistance).toBeGreaterThan(0);
      expect(testDelivery.estimatedDuration).toBeGreaterThan(0);
    });

    it('should get driver statistics', async () => {
      await testDelivery.assignToDriver(driverUser.id);
      await testDelivery.updateStatus('picked_up');
      await testDelivery.updateStatus('in_transit');
      await testDelivery.updateStatus('delivered');

      const stats = await Delivery.getDriverStats(driverUser.id);
      
      expect(stats.totalDeliveries).toBe(1);
      expect(stats.completedDeliveries).toBe(1);
      expect(stats.failedDeliveries).toBe(0);
      expect(stats.totalEarnings).toBeGreaterThan(0);
      expect(stats.successRate).toBe('100.00');
    });

    it('should find deliveries by driver', async () => {
      await testDelivery.assignToDriver(driverUser.id);
      
      const deliveries = await Delivery.findByDriver(driverUser.id);
      
      expect(deliveries).toHaveLength(1);
      expect(deliveries[0].id).toBe(testDelivery.id);
      expect(deliveries[0].driverId).toBe(driverUser.id);
    });

    it('should update order status when delivery is completed', async () => {
      await testDelivery.assignToDriver(driverUser.id);
      await testDelivery.updateStatus('picked_up');
      await testDelivery.updateStatus('in_transit');
      await testDelivery.updateStatus('delivered');

      // Check that order status was updated
      const updatedOrder = await Order.findById(testOrder.id);
      expect(updatedOrder.status).toBe('delivered');
      expect(updatedOrder.deliveredAt).toBeDefined();
    });
  });
});