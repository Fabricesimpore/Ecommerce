const request = require('supertest');
const app = require('../../app');
const db = require('../../src/config/database.config');
const User = require('../../src/models/user.model');

// Mock the database
jest.mock('../../src/config/database.config');

// Mock JWT utilities for auth tests
jest.mock('../../src/utils/jwt', () => ({
  verifyToken: jest.fn(),
  generateAccessToken: jest.fn(),
  generateRefreshToken: jest.fn(),
  decodeToken: jest.fn()
}));

// Get the mocked module for setup
const { verifyToken: mockVerifyToken } = require('../../src/utils/jwt');

describe('Auth Endpoints', () => {
  beforeAll(() => {
    // Suppress console.error during tests to prevent CI exit on unhandled errors
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    // Restore console.error after tests
    console.error.mockRestore();
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      // Mock successful user creation
      db.query.mockResolvedValueOnce({
        rows: [{
          id: '123e4567-e89b-12d3-a456-426614174000',
          email: 'test@example.com',
          phone: '+22670000000',
          role: 'buyer',
          first_name: 'Test',
          last_name: 'User',
          status: 'pending',
          created_at: new Date(),
          updated_at: new Date()
        }]
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          phone: '+22670000000',
          password: 'Test123!',
          firstName: 'Test',
          lastName: 'User',
          role: 'buyer'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('tokens');
      expect(response.body.data.tokens).toHaveProperty('accessToken');
      expect(response.body.data.tokens).toHaveProperty('refreshToken');
      expect(response.body.data.user.email).toBe('test@example.com');
      expect(response.body.data.user).not.toHaveProperty('password');
    });

    it('should fail with duplicate email', async () => {
      // Mock duplicate email error
      db.query.mockRejectedValueOnce({
        code: '23505',
        constraint: 'users_email_key'
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'existing@example.com',
          phone: '+22670000001',
          password: 'Test123!',
          firstName: 'Test',
          lastName: 'User',
          role: 'buyer'
        });

      expect(response.status).toBe(500);
      expect(response.body.error.message).toContain('Email already exists');
    });

    it('should fail with invalid role', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          phone: '+22670000000',
          password: 'Test123!',
          firstName: 'Test',
          lastName: 'User',
          role: 'superadmin' // Invalid role
        });

      expect(response.status).toBe(400);
      expect(response.body.errors[0].message).toContain('Invalid role');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with email successfully', async () => {
      // Mock user lookup
      db.query.mockResolvedValueOnce({
        rows: [{
          id: '123e4567-e89b-12d3-a456-426614174000',
          email: 'test@example.com',
          phone: '+22670000000',
          password: '$2b$10$YourHashedPasswordHere', // This would be a real bcrypt hash
          role: 'buyer',
          status: 'active',
          created_at: new Date(),
          updated_at: new Date()
        }]
      });

      // Mock password validation
      const bcrypt = require('bcrypt');
      jest.spyOn(bcrypt, 'compare').mockResolvedValueOnce(true);

      // Mock update last login
      db.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Test123!'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('tokens');
      expect(response.body.data.user).not.toHaveProperty('password');
    });

    it('should fail with invalid credentials', async () => {
      // Mock user not found
      db.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Test123!'
        });

      expect(response.status).toBe(500);
      expect(response.body.error.message).toContain('Invalid credentials');
    });

    it('should fail with suspended account', async () => {
      // Mock suspended user
      db.query.mockResolvedValueOnce({
        rows: [{
          id: '123e4567-e89b-12d3-a456-426614174000',
          email: 'suspended@example.com',
          password: '$2b$10$YourHashedPasswordHere',
          status: 'suspended',
          created_at: new Date(),
          updated_at: new Date()
        }]
      });

      const bcrypt = require('bcrypt');
      jest.spyOn(bcrypt, 'compare').mockResolvedValueOnce(true);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'suspended@example.com',
          password: 'Test123!'
        });

      expect(response.status).toBe(500);
      expect(response.body.error.message).toContain('Account is suspended');
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh tokens successfully', async () => {
      const jwt = require('jsonwebtoken');
      
      // Mock token verification
      jest.spyOn(jwt, 'verify').mockReturnValueOnce({
        userId: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        role: 'buyer'
      });

      // Mock user lookup
      db.query.mockResolvedValueOnce({
        rows: [{
          id: '123e4567-e89b-12d3-a456-426614174000',
          email: 'test@example.com',
          role: 'buyer',
          status: 'active',
          created_at: new Date(),
          updated_at: new Date()
        }]
      });

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: 'valid-refresh-token'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('tokens');
      expect(response.body.data.tokens).toHaveProperty('accessToken');
      expect(response.body.data.tokens).toHaveProperty('refreshToken');
    });

    it('should fail with missing refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Refresh token required');
    });

    it('should fail with expired refresh token', async () => {
      const jwt = require('jsonwebtoken');
      
      jest.spyOn(jwt, 'verify').mockImplementationOnce(() => {
        const error = new Error('Token expired');
        error.name = 'TokenExpiredError';
        throw error;
      });

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: 'expired-refresh-token'
        });

      expect(response.status).toBe(401);
      expect(response.body.error.message).toContain('Refresh token expired');
    });
  });

  describe('Protected Routes', () => {
    const validToken = 'Bearer valid-jwt-token';

    beforeEach(() => {
      // Setup JWT mock implementation for auth tests
      mockVerifyToken.mockImplementation((token) => {
        if (token === 'valid-jwt-token') {
          return {
            userId: '123e4567-e89b-12d3-a456-426614174000',
            email: 'test@example.com',
            role: 'buyer'
          };
        }
        throw new Error('Invalid token');
      });

      // Mock user lookup - not needed since we use User model mock
    });

    describe('GET /api/auth/profile', () => {
      it('should get profile with valid token', async () => {
        const response = await request(app)
          .get('/api/auth/profile')
          .set('Authorization', validToken);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.user).toHaveProperty('email', 'test@example.com');
      });

      it('should fail without token', async () => {
        const response = await request(app)
          .get('/api/auth/profile');

        expect(response.status).toBe(401);
        expect(response.body.message).toContain('No token provided');
      });
    });

    describe('POST /api/auth/logout', () => {
      it('should logout successfully', async () => {
        const response = await request(app)
          .post('/api/auth/logout')
          .set('Authorization', validToken);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('Logout successful');
      });
    });
  });
});