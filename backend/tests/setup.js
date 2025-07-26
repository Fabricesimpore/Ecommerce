// Test setup file
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-testing-purposes-only';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-for-testing-purposes-only';
process.env.JWT_EXPIRE = '7d';
process.env.JWT_REFRESH_EXPIRE = '30d';
process.env.PAYMENT_MOCK_MODE = 'true';
process.env.BCRYPT_SALT_ROUNDS = '10';

// Mock database configuration first
jest.mock('../src/config/database.config');

// Mock ALL models
jest.mock('../src/models/user.model');
jest.mock('../src/models/product.model');  
jest.mock('../src/models/order.model');
jest.mock('../src/models/payment.model');
jest.mock('../src/models/cart.model');
jest.mock('../src/models/delivery.model');

// Mock JWT utilities with manual implementation
jest.mock('../src/utils/jwt', () => {
  return {
    verifyToken: jest.fn().mockImplementation((token, isRefreshToken = false) => {
      console.log('DEBUG: Direct JWT mock called with token:', token?.substring(0, 20) + '...');
      
      // Handle mock tokens
      if (token.includes('vendor')) {
        console.log('DEBUG: Returning vendor user');
        return {
          userId: '123e4567-e89b-12d3-a456-426614174000',
          email: 'vendor@example.com',
          role: 'vendor'
        };
      } else if (token.includes('buyer')) {
        console.log('DEBUG: Returning buyer user');
        return {
          userId: '123e4567-e89b-12d3-a456-426614174001',
          email: 'buyer@example.com',
          role: 'buyer'
        };
      } else if (token.includes('admin')) {
        console.log('DEBUG: Returning admin user');
        return {
          userId: '123e4567-e89b-12d3-a456-426614174002',
          email: 'admin@example.com',
          role: 'admin'
        };
      }
      
      console.log('DEBUG: No pattern match, returning default');
      return {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        role: 'buyer'
      };
    }),
    generateAccessToken: jest.fn(),
    generateRefreshToken: jest.fn(),
    decodeToken: jest.fn()
  };
});

// Mock all models
jest.mock('../src/models/user.model');
jest.mock('../src/models/product.model');
jest.mock('../src/models/order.model');
jest.mock('../src/models/cart.model');
jest.mock('../src/models/delivery.model');
jest.mock('../src/models/payment.model');

// Mock all services
jest.mock('../src/services/auth.service');
jest.mock('../src/services/product.service');
jest.mock('../src/services/order.service');
jest.mock('../src/services/delivery.service');
jest.mock('../src/services/payment.service');

// Mock axios for API calls
jest.mock('axios', () => ({
  default: {
    post: jest.fn().mockResolvedValue({ data: { success: true } }),
    get: jest.fn().mockResolvedValue({ data: { success: true } }),
    put: jest.fn().mockResolvedValue({ data: { success: true } }),
    delete: jest.fn().mockResolvedValue({ data: { success: true } })
  },
  post: jest.fn().mockResolvedValue({ data: { success: true } }),
  get: jest.fn().mockResolvedValue({ data: { success: true } }),
  put: jest.fn().mockResolvedValue({ data: { success: true } }),
  delete: jest.fn().mockResolvedValue({ data: { success: true } })
}));

// Mock bcrypt for consistent password hashing
jest.mock('bcrypt', () => ({
  compare: jest.fn().mockImplementation((password, hash) => {
    // Always return true for 'password123', false for others
    return Promise.resolve(password === 'password123');
  }),
  hash: jest.fn().mockResolvedValue('$2b$10$mockHashedPassword'),
  hashSync: jest.fn(() => '$2b$10$mockHashedPassword'),
  compareSync: jest.fn((password) => password === 'password123')
}));

// Global mock setup with comprehensive query handling
const mockDb = {
  query: jest.fn().mockImplementation((text, params) => {
    // Handle different query types
    if (text.includes('SELECT * FROM users WHERE email')) {
      return Promise.resolve({
        rows: [{
          id: '123e4567-e89b-12d3-a456-426614174000',
          email: params?.[0] || 'test@example.com',
          role: 'buyer',
          status: 'active',
          password_hash: '$2b$10$mockHashedPassword',
          first_name: 'Test',
          last_name: 'User',
          phone: '+22670000001',
          created_at: new Date(),
          updated_at: new Date()
        }]
      });
    }
    if (text.includes('SELECT * FROM users WHERE phone')) {
      return Promise.resolve({
        rows: [{
          id: '123e4567-e89b-12d3-a456-426614174000',
          phone: params?.[0] || '+22670000001',
          role: 'buyer',
          status: 'active',
          password_hash: '$2b$10$mockHashedPassword',
          email: 'test@example.com',
          first_name: 'Test',
          last_name: 'User'
        }]
      });
    }
    if (text.includes('SELECT * FROM users WHERE id')) {
      return Promise.resolve({
        rows: [{
          id: params?.[0] || '123e4567-e89b-12d3-a456-426614174000',
          email: 'test@example.com',
          role: 'buyer',
          status: 'active',
          first_name: 'Test',
          last_name: 'User'
        }]
      });
    }
    if (text.includes('INSERT INTO users')) {
      return Promise.resolve({
        rows: [{
          id: `user-${Date.now()}`,
          email: 'new@example.com',
          role: 'buyer',
          status: 'active',
          created_at: new Date(),
          updated_at: new Date()
        }]
      });
    }
    if (text.includes('UPDATE users')) {
      return Promise.resolve({
        rows: [{
          id: params?.[params.length - 1] || 'user-123',
          updated_at: new Date()
        }]
      });
    }
    // Default empty response
    return Promise.resolve({ rows: [] });
  }),
  getClient: jest.fn(() => ({
    query: jest.fn().mockResolvedValue({ rows: [] }),
    release: jest.fn()
  })),
  end: jest.fn(),
  pool: {
    end: jest.fn()
  }
};

// Mock user records for consistent testing
const mockUsers = {
  buyer: {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'buyer@test.com',
    phone: '+22670000001',
    password: '$2b$10$YourHashedPasswordHere',
    role: 'buyer',
    firstName: 'Test',
    lastName: 'Buyer',
    status: 'active',
    created_at: new Date(),
    updated_at: new Date()
  },
  vendor: {
    id: '123e4567-e89b-12d3-a456-426614174001',
    email: 'vendor@test.com',
    phone: '+22670000002',
    password: '$2b$10$YourHashedPasswordHere',
    role: 'vendor',
    firstName: 'Test',
    lastName: 'Vendor',
    businessName: 'Test Store',
    nationalId: '123456789',
    status: 'active',
    created_at: new Date(),
    updated_at: new Date()
  },
  admin: {
    id: '123e4567-e89b-12d3-a456-426614174002',
    email: 'admin@test.com',
    phone: '+22670000003',
    password: '$2b$10$YourHashedPasswordHere',
    role: 'admin',
    firstName: 'Test',
    lastName: 'Admin',
    status: 'active',
    created_at: new Date(),
    updated_at: new Date()
  }
};

// Mock JWT tokens
const mockTokens = {
  validAccessToken: 'valid-access-token-for-testing',
  validRefreshToken: 'valid-refresh-token-for-testing',
  expiredToken: 'expired-token-for-testing',
  invalidToken: 'invalid-token-for-testing'
};

// Make mock data available globally
global.mockDb = mockDb;
global.mockUsers = mockUsers;
global.mockTokens = mockTokens;

// Setup database mocks
const databaseConfig = require('../src/config/database.config');
databaseConfig.query = mockDb.query;
databaseConfig.getClient = mockDb.getClient;
databaseConfig.end = mockDb.end;
databaseConfig.pool = mockDb.pool;

// JWT mock removed - handled by JWT utils mock instead

// Add any global test setup here
beforeAll(() => {
  // Setup before all tests
  jest.clearAllTimers();
});

afterAll(() => {
  // Cleanup after all tests
  jest.clearAllMocks();
  jest.restoreAllMocks();
});

beforeEach(() => {
  // Reset mocks before each test
  jest.clearAllMocks();
  
  // Reset database mock to default successful responses
  mockDb.query.mockResolvedValue({ rows: [], rowCount: 0 });
  mockDb.getClient.mockResolvedValue({
    query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    release: jest.fn()
  });
});

// Increase timeout for slower tests
jest.setTimeout(30000);

// Suppress console noise during tests (commented out for debugging)
// const originalConsole = global.console;
// global.console = {
//   ...originalConsole,
//   warn: jest.fn(),
//   log: jest.fn(),
//   error: jest.fn()
// };