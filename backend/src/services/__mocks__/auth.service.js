// Mock Auth Service
const mockAuthService = {
  login: jest.fn().mockResolvedValue({
    user: {
      id: 'user-123',
      email: 'test@example.com',
      role: 'buyer',
      firstName: 'Test',
      lastName: 'User'
    },
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token'
  }),

  register: jest.fn().mockResolvedValue({
    user: {
      id: 'user-123',
      email: 'test@example.com',
      role: 'buyer',
      firstName: 'Test',
      lastName: 'User'
    },
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token'
  }),

  refreshToken: jest.fn().mockResolvedValue({
    accessToken: 'mock-new-access-token',
    refreshToken: 'mock-new-refresh-token'
  }),

  logout: jest.fn().mockResolvedValue(true)
};

module.exports = mockAuthService;
