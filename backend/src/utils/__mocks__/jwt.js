// Mock JWT utilities
const mockJwt = {
  generateTokens: jest.fn().mockImplementation((payload) => ({
    accessToken: `mock-access-token-${payload.role}`,
    refreshToken: `mock-refresh-token-${payload.role}`
  })),

  verifyAccessToken: jest.fn().mockImplementation((token) => {
    if (token.includes('buyer')) {
      return {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        email: 'buyer@test.com',
        role: 'buyer'
      };
    }
    if (token.includes('vendor')) {
      return {
        userId: '123e4567-e89b-12d3-a456-426614174001',
        email: 'vendor@test.com',
        role: 'vendor'
      };
    }
    if (token.includes('admin')) {
      return {
        userId: '123e4567-e89b-12d3-a456-426614174002',
        email: 'admin@test.com',
        role: 'admin'
      };
    }
    return {
      userId: 'user-123',
      email: 'test@example.com',
      role: 'buyer'
    };
  }),

  verifyRefreshToken: jest.fn().mockImplementation((token) => {
    if (token.includes('buyer')) {
      return {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        email: 'buyer@test.com',
        role: 'buyer'
      };
    }
    if (token.includes('vendor')) {
      return {
        userId: '123e4567-e89b-12d3-a456-426614174001',
        email: 'vendor@test.com',
        role: 'vendor'
      };
    }
    if (token.includes('admin')) {
      return {
        userId: '123e4567-e89b-12d3-a456-426614174002',
        email: 'admin@test.com',
        role: 'admin'
      };
    }
    return {
      userId: 'user-123',
      email: 'test@example.com',
      role: 'buyer'
    };
  })
};

module.exports = mockJwt;
