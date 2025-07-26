// Integration tests for services with mocked database
const db = require('../../src/config/database.config');

// Mock database before importing services
jest.mock('../../src/config/database.config');

// Import actual services (not mocks)
const AuthService = require('../../src/services/auth.service');
const ProductService = require('../../src/services/product.service');
const OrderService = require('../../src/services/order.service');
const PaymentService = require('../../src/services/payment.service');
const DeliveryService = require('../../src/services/delivery.service');

// Mock axios for external API calls
jest.mock('axios');
const axios = require('axios');

// Mock bcrypt
jest.mock('bcrypt');
const bcrypt = require('bcrypt');

// Mock JWT utils
jest.mock('../../src/utils/jwt');
const jwt = require('../../src/utils/jwt');

describe('Service Integration Tests', () => {
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
    
    // Setup JWT mocks
    jwt.generateAccessToken = jest.fn().mockReturnValue('mock-access-token');
    jwt.generateRefreshToken = jest.fn().mockReturnValue('mock-refresh-token');
    jwt.verifyToken = jest.fn().mockReturnValue({
      userId: 'user-123',
      email: 'test@example.com',
      role: 'buyer'
    });
  });

  describe('AuthService', () => {
    it('should register a new user', async () => {
      // Mock database responses
      db.query
        .mockResolvedValueOnce({ rows: [] }) // Check email doesn't exist
        .mockResolvedValueOnce({ rows: [] }) // Check phone doesn't exist
        .mockResolvedValueOnce({ 
          rows: [{
            id: 'user-123',
            email: 'test@example.com',
            phone: '+22670000001',
            role: 'buyer',
            status: 'active',
            created_at: new Date(),
            updated_at: new Date()
          }]
        }); // Insert user
      
      const userData = {
        email: 'test@example.com',
        phone: '+22670000001',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        role: 'buyer'
      };
      
      const result = await AuthService.register(userData);
      
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe(userData.email);
    });

    it('should login a user', async () => {
      // Mock database response
      db.query.mockResolvedValueOnce({
        rows: [{
          id: 'user-123',
          email: 'test@example.com',
          password_hash: '$2b$10$hashedPassword',
          role: 'buyer',
          status: 'active',
          first_name: 'Test',
          last_name: 'User'
        }]
      });
      
      const result = await AuthService.login({ email: 'test@example.com', password: 'password123' });
      
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });
  });

  describe('ProductService', () => {
    it('should create a product', async () => {
      const productData = {
        title: 'Test Product',
        description: 'Test Description',
        price: 100,
        category: 'Electronics',
        vendorId: 'vendor-123'
      };
      
      // Mock transaction
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
        .mockResolvedValueOnce() // Insert inventory
        .mockResolvedValueOnce(); // COMMIT
      
      const result = await ProductService.createProduct('vendor-123', productData);
      
      expect(result).toHaveProperty('id');
      expect(result.title).toBe(productData.title);
    });

    it('should get all products', async () => {
      db.query.mockResolvedValueOnce({
        rows: [
          { id: 'product-1', title: 'Product 1', price: 100 },
          { id: 'product-2', title: 'Product 2', price: 200 }
        ]
      });
      
      const result = await ProductService.getAllProducts();
      
      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Product 1');
    });
  });

  describe('OrderService', () => {
    it('should create an order', async () => {
      const orderData = {
        userId: 'user-123',
        items: [
          { productId: 'product-1', quantity: 2, price: 50 }
        ],
        shippingAddress: { street: '123 Main St' },
        paymentMethod: 'orange_money'
      };
      
      // Mock transaction
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
      
      const result = await OrderService.createOrder(orderData);
      
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('orderNumber');
      expect(result.status).toBe('pending');
    });
  });

  describe('PaymentService', () => {
    it('should validate payment methods', () => {
      expect(PaymentService.isValidPaymentMethod('orange_money')).toBe(true);
      expect(PaymentService.isValidPaymentMethod('cash_on_delivery')).toBe(true);
      expect(PaymentService.isValidPaymentMethod('invalid')).toBe(false);
    });

    it('should generate Orange Money auth header', () => {
      process.env.ORANGE_MONEY_CLIENT_ID = 'client123';
      process.env.ORANGE_MONEY_CLIENT_SECRET = 'secret123';
      
      const auth = PaymentService.generateOrangeMoneyAuth();
      
      expect(auth).toMatch(/^Basic /);
    });
  });

  describe('DeliveryService', () => {
    it('should assign delivery to driver', async () => {
      mockClient.query
        .mockResolvedValueOnce() // BEGIN
        .mockResolvedValueOnce({
          rows: [{
            id: 'order-123',
            status: 'confirmed',
            order_number: 'ORD-001'
          }]
        }) // Get order
        .mockResolvedValueOnce({
          rows: [{
            id: 'driver-123',
            is_available: true
          }]
        }) // Get driver
        .mockResolvedValueOnce({
          rows: [{
            id: 'delivery-123',
            order_id: 'order-123',
            driver_id: 'driver-123',
            status: 'assigned'
          }]
        }) // Create delivery
        .mockResolvedValueOnce() // Update order
        .mockResolvedValueOnce() // Update driver availability
        .mockResolvedValueOnce(); // COMMIT
      
      const result = await DeliveryService.assignDelivery('order-123', 'driver-123');
      
      expect(result).toHaveProperty('id');
      expect(result.status).toBe('assigned');
    });
  });
});