const request = require('supertest');
const app = require('../app');
const db = require('../src/config/database.config');
const User = require('../src/models/user.model');
const Product = require('../src/models/product.model');
const Cart = require('../src/models/cart.model');

describe('Cart System', () => {
  let buyerToken;
  let vendorToken;
  let buyerUser;
  let vendorUser;
  let testProduct;

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

    // Set vendor as active
    await vendorUser.updateStatus('active');

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
    await db.query('DELETE FROM cart_items');
    await db.query('DELETE FROM carts');
    await db.query('DELETE FROM products');
    await db.query('DELETE FROM users');
    await db.end();
  });

  beforeEach(async () => {
    // Clear cart between tests
    await db.query('DELETE FROM cart_items');
  });

  describe('GET /api/cart', () => {
    it('should get empty cart for new user', async () => {
      const response = await request(app)
        .get('/api/cart')
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toHaveLength(0);
      expect(response.body.data.totals.subtotal).toBe(0);
      expect(response.body.data.totals.itemCount).toBe(0);
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/cart')
        .expect(401);
    });
  });

  describe('POST /api/cart/items', () => {
    it('should add item to cart', async () => {
      const response = await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          productId: testProduct.id,
          quantity: 2
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.items[0].quantity).toBe(2);
      expect(response.body.data.items[0].productId).toBe(testProduct.id);
      expect(response.body.data.totals.subtotal).toBe(59.98);
      expect(response.body.data.totals.itemCount).toBe(2);
    });

    it('should add to existing item quantity', async () => {
      // Add item first time
      await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          productId: testProduct.id,
          quantity: 2
        });

      // Add same item again
      const response = await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          productId: testProduct.id,
          quantity: 3
        })
        .expect(200);

      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.items[0].quantity).toBe(5);
      expect(response.body.data.totals.itemCount).toBe(5);
    });

    it('should validate inventory limits', async () => {
      const response = await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          productId: testProduct.id,
          quantity: 15 // More than available (10)
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Only 10 items available');
    });

    it('should require valid product ID', async () => {
      const response = await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          productId: 999999,
          quantity: 1
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Product not found');
    });

    it('should default quantity to 1', async () => {
      const response = await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          productId: testProduct.id
        })
        .expect(200);

      expect(response.body.data.items[0].quantity).toBe(1);
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/cart/items')
        .send({
          productId: testProduct.id,
          quantity: 1
        })
        .expect(401);
    });
  });

  describe('PUT /api/cart/items/:itemId', () => {
    let cartItem;

    beforeEach(async () => {
      // Add item to cart first
      const cart = await Cart.addItem(buyerUser.id, testProduct.id, 2);
      cartItem = cart.items[0];
    });

    it('should update item quantity', async () => {
      const response = await request(app)
        .put(`/api/cart/items/${cartItem.id}`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          quantity: 5
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.items[0].quantity).toBe(5);
      expect(response.body.data.totals.itemCount).toBe(5);
    });

    it('should validate inventory limits', async () => {
      const response = await request(app)
        .put(`/api/cart/items/${cartItem.id}`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          quantity: 15
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Only 10 items available');
    });

    it('should remove item when quantity is 0', async () => {
      const response = await request(app)
        .put(`/api/cart/items/${cartItem.id}`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          quantity: 0
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toHaveLength(0);
    });

    it('should not allow updating other user\'s cart items', async () => {
      // Try to update with vendor token
      const response = await request(app)
        .put(`/api/cart/items/${cartItem.id}`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({
          quantity: 3
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Cart item not found');
    });

    it('should require authentication', async () => {
      await request(app)
        .put(`/api/cart/items/${cartItem.id}`)
        .send({
          quantity: 3
        })
        .expect(401);
    });
  });

  describe('DELETE /api/cart/items/:itemId', () => {
    let cartItem;

    beforeEach(async () => {
      const cart = await Cart.addItem(buyerUser.id, testProduct.id, 2);
      cartItem = cart.items[0];
    });

    it('should remove item from cart', async () => {
      const response = await request(app)
        .delete(`/api/cart/items/${cartItem.id}`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toHaveLength(0);
      expect(response.body.data.totals.itemCount).toBe(0);
    });

    it('should not allow removing other user\'s cart items', async () => {
      const response = await request(app)
        .delete(`/api/cart/items/${cartItem.id}`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Cart item not found');
    });

    it('should handle non-existent item gracefully', async () => {
      const response = await request(app)
        .delete('/api/cart/items/999999')
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Cart item not found');
    });

    it('should require authentication', async () => {
      await request(app)
        .delete(`/api/cart/items/${cartItem.id}`)
        .expect(401);
    });
  });

  describe('DELETE /api/cart/clear', () => {
    beforeEach(async () => {
      // Add multiple items to cart
      await Cart.addItem(buyerUser.id, testProduct.id, 2);
    });

    it('should clear all items from cart', async () => {
      const response = await request(app)
        .delete('/api/cart/clear')
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toHaveLength(0);
      expect(response.body.data.totals.itemCount).toBe(0);
      expect(response.body.data.totals.subtotal).toBe(0);
    });

    it('should handle already empty cart', async () => {
      // Clear first
      await request(app)
        .delete('/api/cart/clear')
        .set('Authorization', `Bearer ${buyerToken}`);

      // Clear again
      const response = await request(app)
        .delete('/api/cart/clear')
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toHaveLength(0);
    });

    it('should require authentication', async () => {
      await request(app)
        .delete('/api/cart/clear')
        .expect(401);
    });
  });

  describe('Cart Model Methods', () => {
    it('should calculate totals correctly', async () => {
      const cart = await Cart.addItem(buyerUser.id, testProduct.id, 3);
      const totals = cart.getTotals();

      expect(totals.subtotal).toBe(89.97);
      expect(totals.itemCount).toBe(3);
      expect(totals.uniqueVendors).toBe(1);
    });

    it('should validate cart for checkout', async () => {
      const cart = await Cart.addItem(buyerUser.id, testProduct.id, 2);
      const validation = await cart.validateForCheckout();

      expect(validation.valid).toBe(true);
      expect(validation.issues).toHaveLength(0);
    });

    it('should detect empty cart in validation', async () => {
      const cart = await Cart.getByUserId(buyerUser.id);
      const validation = await cart.validateForCheckout();

      expect(validation.valid).toBe(false);
      expect(validation.issues).toContain('Cart is empty');
    });

    it('should detect inventory issues in validation', async () => {
      // Update product to have less inventory
      await db.query('UPDATE products SET quantity = 1 WHERE id = $1', [testProduct.id]);
      
      const cart = await Cart.addItem(buyerUser.id, testProduct.id, 5);
      const validation = await cart.validateForCheckout();

      expect(validation.valid).toBe(false);
      expect(validation.issues.length).toBeGreaterThan(0);
      expect(validation.issues[0]).toContain('Only 1 of');

      // Reset inventory
      await db.query('UPDATE products SET quantity = 10 WHERE id = $1', [testProduct.id]);
    });
  });

  describe('Cart Persistence', () => {
    it('should persist cart across sessions', async () => {
      // Add item to cart
      await Cart.addItem(buyerUser.id, testProduct.id, 2);

      // Get cart again (simulating new session)
      const response = await request(app)
        .get('/api/cart')
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.items[0].quantity).toBe(2);
    });

    it('should maintain separate carts for different users', async () => {
      // Add item to buyer's cart
      await Cart.addItem(buyerUser.id, testProduct.id, 2);

      // Check vendor's cart is empty
      const response = await request(app)
        .get('/api/cart')
        .set('Authorization', `Bearer ${vendorToken}`)
        .expect(200);

      expect(response.body.data.items).toHaveLength(0);
    });
  });
});