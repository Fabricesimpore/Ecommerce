// Test setup file
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRE = '7d';
process.env.PAYMENT_MOCK_MODE = 'true';

// Mock database configuration
jest.mock('../src/config/database.config');

// Global mock setup
const mockDb = {
  query: jest.fn(),
  getClient: jest.fn(),
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

// Make mock data available globally
global.mockDb = mockDb;
global.mockUsers = mockUsers;

// Add any global test setup here
beforeAll(() => {
  // Setup before all tests
  require('../src/config/database.config').query = mockDb.query;
  require('../src/config/database.config').getClient = mockDb.getClient;
  require('../src/config/database.config').end = mockDb.end;
  require('../src/config/database.config').pool = mockDb.pool;
});

afterAll(() => {
  // Cleanup after all tests
  jest.clearAllMocks();
});

beforeEach(() => {
  // Reset mocks before each test
  jest.clearAllMocks();
});

// Increase timeout for slower tests
jest.setTimeout(10000);