// Mock JWT utilities
console.log('DEBUG: JWT Mock file loaded!!!');

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
  }),

  verifyToken: jest.fn().mockImplementation((token, isRefreshToken = false) => {
    console.log('DEBUG: JWT mock verifyToken called with token:', token?.substring(0, 20) + '...');
    
    // Handle the valid-jwt-token from tests
    if (token === 'valid-jwt-token') {
      console.log('DEBUG: Returning valid-jwt-token user');
      return {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        role: 'buyer'
      };
    }
    
    // Handle real JWT tokens by decoding them (mocking successful verification)
    if (token.includes('.')) {
      console.log('DEBUG: Processing real JWT token');
      try {
        const jwt = require('jsonwebtoken');
        // First try to verify with issuer (real JWT utils behavior)
        try {
          const secret = isRefreshToken
            ? (process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET)
            : process.env.JWT_SECRET;
          console.log('DEBUG: Trying to verify with issuer');
          return jwt.verify(token, secret, { issuer: 'ecommerce-api' });
        } catch (verifyError) {
          console.log('DEBUG: Issuer verification failed, trying decode:', verifyError.message);
          // If verification with issuer fails, just decode the token
          const decoded = jwt.decode(token);
          console.log('DEBUG: Decoded token:', JSON.stringify(decoded, null, 2));
          if (decoded && decoded.userId) {
            console.log('DEBUG: Returning decoded token');
            return decoded;
          }
        }
      } catch (e) {
        console.log('DEBUG: Decode failed:', e.message);
        // If decode fails, fall through to pattern matching
      }
    }
    
    // Use same logic as verifyAccessToken for other tokens
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
    
    // Default fallback
    return {
      userId: 'user-123',
      email: 'test@example.com',
      role: 'buyer'
    };
  })
};

module.exports = mockJwt;
