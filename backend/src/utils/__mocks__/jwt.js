// Mock JWT utilities
const mockJwt = {
  generateTokens: jest.fn().mockReturnValue({
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token'
  }),

  verifyAccessToken: jest.fn().mockReturnValue({
    userId: 'user-123',
    email: 'test@example.com',
    role: 'buyer'
  }),

  verifyRefreshToken: jest.fn().mockReturnValue({
    userId: 'user-123',
    email: 'test@example.com',
    role: 'buyer'
  })
};

module.exports = mockJwt;
