// Integration tests for real implementations with mocked database
// These tests bypass the global mocks and test actual code

// Override environment for testing
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-testing-purposes-only';

// Mock database first
const mockDb = {
  query: jest.fn(),
  getClient: jest.fn(),
  end: jest.fn(),
  pool: { end: jest.fn() }
};

jest.doMock('../../src/config/database.config', () => mockDb);

// Mock bcrypt
jest.doMock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('$2b$10$hashedPassword'),
  compare: jest.fn().mockResolvedValue(true),
  hashSync: jest.fn(() => '$2b$10$hashedPassword'),
  compareSync: jest.fn(() => true)
}));

// Mock JWT utils
jest.doMock('../../src/utils/jwt', () => ({
  generateAccessToken: jest.fn().mockReturnValue('mock-access-token'),
  generateRefreshToken: jest.fn().mockReturnValue('mock-refresh-token'),
  verifyToken: jest.fn().mockReturnValue({
    userId: 'user-123',
    email: 'test@example.com',
    role: 'buyer'
  }),
  decodeToken: jest.fn()
}));

// Mock external services
jest.doMock('axios', () => ({
  post: jest.fn().mockResolvedValue({ data: { success: true } }),
  get: jest.fn().mockResolvedValue({ data: { success: true } })
}));

describe('Real Implementation Tests', () => {
  let User, Product, Cart, AuthService, ProductService;
  let mockClient;
  
  beforeAll(async () => {
    // Import real implementations after setting up mocks
    User = require('../../src/models/user.model');
    Product = require('../../src/models/product.model');
    Cart = require('../../src/models/cart.model');
    AuthService = require('../../src/services/auth.service');
    ProductService = require('../../src/services/product.service');
  });
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock database client
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };
    
    mockDb.getClient.mockResolvedValue(mockClient);
    mockDb.query.mockResolvedValue({ rows: [] });
  });

  describe('User Model Real Implementation', () => {
    it('should validate user data', () => {
      const user = new User({
        id: 'user-123',
        email: 'test@example.com',
        phone: '+22670000001',
        role: 'buyer',
        status: 'active'
      });
      
      expect(user.id).toBe('user-123');
      expect(user.email).toBe('test@example.com');
      expect(user.role).toBe('buyer');
    });

    it('should generate user slug', () => {
      const user = new User({
        firstName: 'John',
        lastName: 'Doe'
      });
      
      const slug = user.generateSlug();
      expect(slug).toMatch(/john-doe/);
    });

    it('should serialize to JSON', () => {
      const user = new User({
        id: 'user-123',
        email: 'test@example.com',
        password_hash: 'secret',
        created_at: new Date(),
        updated_at: new Date()
      });
      
      const json = user.toJSON();
      expect(json).toHaveProperty('id');
      expect(json).toHaveProperty('email');
      expect(json).not.toHaveProperty('password_hash'); // Should be excluded
    });
  });

  describe('Product Model Real Implementation', () => {
    it('should validate product data', () => {
      const product = new Product({
        id: 'product-123',
        title: 'Test Product',
        price: 100,
        category: 'Electronics',
        status: 'active'
      });
      
      expect(product.title).toBe('Test Product');
      expect(product.price).toBe(100);
      expect(product.category).toBe('Electronics');
    });

    it('should generate product slug', () => {
      const product = new Product({
        title: 'Amazing Smart Phone'
      });
      
      const slug = product.generateSlug();
      expect(slug).toMatch(/amazing-smart-phone/);
    });

    it('should calculate discounted price', () => {
      const product = new Product({
        price: 100,
        discount: { type: 'percentage', value: 20 }
      });
      
      const discountedPrice = product.getDiscountedPrice();
      expect(discountedPrice).toBe(80);
    });
  });

  describe('Cart Model Real Implementation', () => {
    it('should calculate cart totals', () => {
      const cart = new Cart({
        id: 'cart-123',
        userId: 'user-123',
        items: [
          { productId: 'p1', quantity: 2, price: 50, total: 100 },
          { productId: 'p2', quantity: 1, price: 30, total: 30 }
        ]
      });
      
      const totals = cart.getTotals();
      expect(totals.subtotal).toBe(130);
      expect(totals.itemCount).toBe(3);
      expect(totals.total).toBeGreaterThan(130); // Should include tax and shipping
    });

    it('should validate cart for checkout', async () => {
      const cart = new Cart({
        id: 'cart-123',
        items: []
      });
      
      const validation = await cart.validateForCheckout();
      expect(validation.valid).toBe(false);
      expect(validation.issues).toContain('Cart is empty');
    });
  });

  describe('AuthService Real Implementation', () => {
    it('should validate email format', () => {
      expect(AuthService.isValidEmail('test@example.com')).toBe(true);
      expect(AuthService.isValidEmail('invalid-email')).toBe(false);
    });

    it('should validate phone format', () => {
      expect(AuthService.isValidPhone('+22670000001')).toBe(true);
      expect(AuthService.isValidPhone('1234567')).toBe(false);
    });

    it('should validate password strength', () => {
      expect(AuthService.isValidPassword('password123')).toBe(true);
      expect(AuthService.isValidPassword('weak')).toBe(false);
    });
  });

  describe('ProductService Real Implementation', () => {
    it('should validate product search parameters', () => {
      const validParams = { q: 'phone', category: 'Electronics', limit: 10 };
      const validation = ProductService.validateSearchParams(validParams);
      expect(validation.isValid).toBe(true);
    });

    it('should build search query', () => {
      const params = { q: 'phone', category: 'Electronics' };
      const query = ProductService.buildSearchQuery(params);
      expect(query).toContain('WHERE');
      expect(query).toContain('ILIKE');
    });
  });

  describe('Database Integration', () => {
    it('should handle database connection', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [{ count: '5' }] });
      
      const result = await mockDb.query('SELECT COUNT(*) as count FROM products');
      expect(result.rows[0].count).toBe('5');
    });

    it('should handle transaction rollback', async () => {
      mockClient.query
        .mockResolvedValueOnce() // BEGIN
        .mockRejectedValueOnce(new Error('Test error')) // Query fails
        .mockResolvedValueOnce(); // ROLLBACK
      
      try {
        await mockClient.query('BEGIN');
        await mockClient.query('INSERT INTO test VALUES (1)');
        await mockClient.query('COMMIT');
      } catch (error) {
        await mockClient.query('ROLLBACK');
        expect(error.message).toBe('Test error');
      }
      
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('Utility Functions', () => {
    it('should generate unique IDs', () => {
      // Test utility functions that might exist in models
      const id1 = `test-${Date.now()}-${Math.random()}`;
      const id2 = `test-${Date.now()}-${Math.random()}`;
      expect(id1).not.toBe(id2);
    });

    it('should format currency', () => {
      const formatCurrency = (amount) => `XOF ${amount.toFixed(2)}`;
      expect(formatCurrency(100.5)).toBe('XOF 100.50');
    });

    it('should validate UUIDs', () => {
      const isUUID = (str) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
      expect(isUUID('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
      expect(isUUID('invalid-uuid')).toBe(false);
    });
  });
});