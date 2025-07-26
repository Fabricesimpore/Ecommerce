// Integration tests for models with mocked database
const db = require('../../src/config/database.config');

// Mock database before importing models
jest.mock('../../src/config/database.config');

// Import actual models (not mocks)
const User = require('../../src/models/user.model');
const Product = require('../../src/models/product.model');
const Order = require('../../src/models/order.model');
const Cart = require('../../src/models/cart.model');
const Payment = require('../../src/models/payment.model');
const Delivery = require('../../src/models/delivery.model');

// Mock bcrypt
jest.mock('bcrypt');
const bcrypt = require('bcrypt');

describe('Model Integration Tests', () => {
  let mockClient;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock database client
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };
    
    db.getClient = jest.fn().mockResolvedValue(mockClient);
    db.query = jest.fn();
    
    // Setup bcrypt mocks
    bcrypt.hash = jest.fn().mockResolvedValue('$2b$10$hashedPassword');
    bcrypt.compare = jest.fn().mockResolvedValue(true);
  });

  describe('User Model', () => {
    it('should create a new user', async () => {
      const userData = {
        email: 'test@example.com',
        phone: '+22670000001',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        role: 'buyer'
      };
      
      db.query.mockResolvedValueOnce({
        rows: [{
          id: 'user-123',
          ...userData,
          password_hash: '$2b$10$hashedPassword',
          status: 'active',
          created_at: new Date(),
          updated_at: new Date()
        }]
      });
      
      const user = await User.create(userData);
      
      expect(user).toBeInstanceOf(User);
      expect(user.id).toBe('user-123');
      expect(user.email).toBe(userData.email);
      expect(bcrypt.hash).toHaveBeenCalledWith(userData.password, 10);
    });

    it('should find user by email', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{
          id: 'user-123',
          email: 'test@example.com',
          role: 'buyer',
          status: 'active'
        }]
      });
      
      const user = await User.findByEmail('test@example.com');
      
      expect(user).toBeInstanceOf(User);
      expect(user.email).toBe('test@example.com');
    });

    it('should verify password', async () => {
      const user = new User({
        id: 'user-123',
        email: 'test@example.com',
        password_hash: '$2b$10$hashedPassword'
      });
      
      const isValid = await user.verifyPassword('password123');
      
      expect(isValid).toBe(true);
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', '$2b$10$hashedPassword');
    });
  });

  describe('Product Model', () => {
    it('should create a new product', async () => {
      const productData = {
        title: 'Test Product',
        description: 'Test Description',
        price: 100,
        category: 'Electronics',
        vendorId: 'vendor-123'
      };
      
      mockClient.query
        .mockResolvedValueOnce() // BEGIN
        .mockResolvedValueOnce({
          rows: [{
            id: 'product-123',
            ...productData,
            slug: 'test-product',
            status: 'active',
            created_at: new Date(),
            updated_at: new Date()
          }]
        }) // Insert product
        .mockResolvedValueOnce({
          rows: [{
            id: 'inventory-123',
            product_id: 'product-123',
            quantity: 0,
            track_inventory: true
          }]
        }) // Insert inventory
        .mockResolvedValueOnce(); // COMMIT
      
      const product = await Product.create(productData);
      
      expect(product).toBeInstanceOf(Product);
      expect(product.title).toBe(productData.title);
      expect(product.slug).toBe('test-product');
    });

    it('should find product by id', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{
          id: 'product-123',
          title: 'Test Product',
          price: 100,
          status: 'active'
        }]
      });
      
      const product = await Product.findById('product-123');
      
      expect(product).toBeInstanceOf(Product);
      expect(product.id).toBe('product-123');
    });

    it('should update inventory', async () => {
      const product = new Product({
        id: 'product-123',
        title: 'Test Product',
        inventory: { quantity: 10 }
      });
      
      db.query.mockResolvedValueOnce({
        rows: [{
          quantity: 15,
          track_inventory: true
        }]
      });
      
      await product.updateInventory(5);
      
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE inventory'),
        expect.arrayContaining([15, 'product-123'])
      );
    });
  });

  describe('Order Model', () => {
    it('should create a new order', async () => {
      const orderData = {
        userId: 'user-123',
        items: [
          { productId: 'product-1', quantity: 2, price: 50 }
        ],
        shippingAddress: { street: '123 Main St' },
        paymentMethod: 'orange_money'
      };
      
      mockClient.query
        .mockResolvedValueOnce() // BEGIN
        .mockResolvedValueOnce({
          rows: [{
            id: 'order-123',
            order_number: 'ORD-001',
            user_id: orderData.userId,
            status: 'pending',
            total_amount: 100,
            created_at: new Date()
          }]
        }) // Insert order
        .mockResolvedValueOnce() // Insert order items
        .mockResolvedValueOnce(); // COMMIT
      
      const order = await Order.create(orderData);
      
      expect(order).toBeInstanceOf(Order);
      expect(order.orderNumber).toBe('ORD-001');
      expect(order.status).toBe('pending');
    });

    it('should update order status', async () => {
      const order = new Order({
        id: 'order-123',
        status: 'pending'
      });
      
      db.query.mockResolvedValueOnce({
        rows: [{ status: 'confirmed' }]
      });
      
      await order.updateStatus('confirmed');
      
      expect(order.status).toBe('confirmed');
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE orders'),
        expect.arrayContaining(['confirmed', 'order-123'])
      );
    });
  });

  describe('Cart Model', () => {
    it('should get or create cart for user', async () => {
      db.query
        .mockResolvedValueOnce({
          rows: [{ cart_id: 'cart-123' }]
        }) // Get or create cart
        .mockResolvedValueOnce({
          rows: [{
            id: 'cart-123',
            user_id: 'user-123',
            created_at: new Date(),
            updated_at: new Date(),
            items: []
          }]
        }); // Get cart with items
      
      const cart = await Cart.getByUserId('user-123');
      
      expect(cart).toBeInstanceOf(Cart);
      expect(cart.id).toBe('cart-123');
      expect(cart.userId).toBe('user-123');
    });

    it('should add item to cart', async () => {
      mockClient.query
        .mockResolvedValueOnce() // BEGIN
        .mockResolvedValueOnce({ rows: [{ cart_id: 'cart-123' }] }) // Get cart
        .mockResolvedValueOnce({
          rows: [{
            id: 'product-123',
            price: 50,
            quantity: 10,
            track_inventory: true,
            status: 'active'
          }]
        }) // Get product
        .mockResolvedValueOnce({ rows: [] }) // Check existing item
        .mockResolvedValueOnce({
          rows: [{ id: 'item-123' }]
        }) // Insert item
        .mockResolvedValueOnce(); // COMMIT
      
      db.query.mockResolvedValueOnce({
        rows: [{
          id: 'cart-123',
          user_id: 'user-123',
          items: [{
            id: 'item-123',
            productId: 'product-123',
            quantity: 2,
            price: 50
          }]
        }]
      });
      
      const cart = await Cart.addItem('user-123', 'product-123', 2);
      
      expect(cart).toBeInstanceOf(Cart);
      expect(cart.items).toHaveLength(1);
      expect(cart.items[0].quantity).toBe(2);
    });
  });

  describe('Payment Model', () => {
    it('should create a payment', async () => {
      const paymentData = {
        orderId: 'order-123',
        amount: 100,
        paymentMethod: 'orange_money',
        userId: 'user-123'
      };
      
      db.query.mockResolvedValueOnce({
        rows: [{
          id: 'payment-123',
          payment_reference: 'PAY-123',
          ...paymentData,
          status: 'pending',
          created_at: new Date()
        }]
      });
      
      const payment = await Payment.create(paymentData);
      
      expect(payment).toBeInstanceOf(Payment);
      expect(payment.paymentReference).toBe('PAY-123');
      expect(payment.status).toBe('pending');
    });

    it('should update payment status', async () => {
      const payment = new Payment({
        id: 'payment-123',
        status: 'pending'
      });
      
      db.query.mockResolvedValueOnce({
        rows: [{
          status: 'completed',
          updated_at: new Date()
        }]
      });
      
      await payment.updateStatus('completed', { transactionId: 'TXN-123' });
      
      expect(payment.status).toBe('completed');
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE payments'),
        expect.any(Array)
      );
    });
  });

  describe('Delivery Model', () => {
    it('should create a delivery', async () => {
      const deliveryData = {
        orderId: 'order-123',
        driverId: 'driver-123'
      };
      
      db.query.mockResolvedValueOnce({
        rows: [{
          id: 'delivery-123',
          ...deliveryData,
          status: 'assigned',
          created_at: new Date()
        }]
      });
      
      const delivery = await Delivery.create(deliveryData);
      
      expect(delivery).toBeInstanceOf(Delivery);
      expect(delivery.id).toBe('delivery-123');
      expect(delivery.status).toBe('assigned');
    });

    it('should update delivery status', async () => {
      const delivery = new Delivery({
        id: 'delivery-123',
        status: 'assigned'
      });
      
      db.query.mockResolvedValueOnce({
        rows: [{
          status: 'in_progress',
          updated_at: new Date()
        }]
      });
      
      await delivery.updateStatus('in_progress', { location: { lat: 0, lng: 0 } });
      
      expect(delivery.status).toBe('in_progress');
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE deliveries'),
        expect.any(Array)
      );
    });
  });
});