// Mock Auth Service
class MockAuthService {
  static async register(userData) {
    // Mock duplicate email validation
    if (userData.email === 'existing@example.com') {
      const error = new Error('Email already exists');
      error.code = '23505';
      error.constraint = 'users_email_key';
      throw error;
    }

    // Mock invalid role validation
    const validRoles = ['buyer', 'vendor', 'admin'];
    if (userData.role && !validRoles.includes(userData.role)) {
      throw new Error('Invalid role specified');
    }

    const mockUser = {
      id: `user-${Date.now()}`,
      email: userData.email,
      phone: userData.phone,
      role: userData.role || 'buyer',
      firstName: userData.firstName,
      lastName: userData.lastName,
      businessName: userData.businessName,
      status: 'active',
      created_at: new Date(),
      updated_at: new Date()
    };

    return {
      user: mockUser,
      tokens: {
        accessToken: `mock-access-token-${mockUser.role}`,
        refreshToken: `mock-refresh-token-${mockUser.role}`
      }
    };
  }

  static async login(credentials) {
    const { email, phone, password } = credentials;

    // Mock successful login for known test users
    let mockUser;
    if (email === 'test@example.com') {
      mockUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        role: 'buyer',
        firstName: 'Test',
        lastName: 'User',
        status: 'active'
      };
    } else if (email === 'buyer@test.com' || phone === '+22670000001') {
      mockUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'buyer@test.com',
        phone: '+22670000001',
        role: 'buyer',
        firstName: 'Test',
        lastName: 'Buyer',
        status: 'active'
      };
    } else if (email === 'vendor@test.com' || phone === '+22670000002') {
      mockUser = {
        id: '123e4567-e89b-12d3-a456-426614174001',
        email: 'vendor@test.com',
        phone: '+22670000002',
        role: 'vendor',
        firstName: 'Test',
        lastName: 'Vendor',
        businessName: 'Test Store',
        status: 'active'
      };
    } else if (email === 'admin@test.com' || phone === '+22670000003') {
      mockUser = {
        id: '123e4567-e89b-12d3-a456-426614174002',
        email: 'admin@test.com',
        phone: '+22670000003',
        role: 'admin',
        firstName: 'Test',
        lastName: 'Admin',
        status: 'active'
      };
    } else if (email === 'suspended@example.com') {
      // Mock suspended account
      throw new Error('Account is suspended');
    } else {
      throw new Error('Invalid credentials');
    }

    // Check password - accept common test passwords
    const validPasswords = ['password123', 'Test123!'];
    if (!validPasswords.includes(password)) {
      throw new Error('Invalid credentials');
    }

    return {
      user: mockUser,
      tokens: {
        accessToken: `mock-access-token-${mockUser.role}`,
        refreshToken: `mock-refresh-token-${mockUser.role}`
      }
    };
  }

  static async refreshToken(refreshToken) {
    // Mock token refresh
    let role = 'buyer';
    if (refreshToken.includes('vendor')) role = 'vendor';
    if (refreshToken.includes('admin')) role = 'admin';

    return {
      accessToken: `mock-access-token-${role}`,
      refreshToken: `mock-refresh-token-${role}`
    };
  }

  static async refreshTokens(refreshToken) {
    // Mock expired token
    if (refreshToken === 'expired-refresh-token') {
      const error = new Error('Refresh token expired');
      error.name = 'TokenExpiredError';
      throw error;
    }

    // Mock token refresh (note: plural method name)
    let role = 'buyer';
    if (refreshToken.includes('vendor')) role = 'vendor';
    if (refreshToken.includes('admin')) role = 'admin';

    return {
      tokens: {
        accessToken: `mock-access-token-${role}`,
        refreshToken: `mock-refresh-token-${role}`
      }
    };
  }

  static async logout(refreshToken) {
    return { success: true, message: 'Logout successful' };
  }

  static async verifyToken(token) {
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
  }

  static async changePassword(userId, oldPassword) {
    if (oldPassword !== 'password123') {
      throw new Error('Current password is incorrect');
    }

    return {
      success: true,
      message: 'Password changed successfully'
    };
  }

  static async resetPassword() {
    return {
      success: true,
      message: 'Password reset email sent'
    };
  }
}

module.exports = MockAuthService;
