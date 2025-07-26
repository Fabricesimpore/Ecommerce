const User = require('../models/user.model');
const { generateAccessToken, generateRefreshToken, verifyToken } = require('../utils/jwt');

class AuthService {
  static async register(userData) {
    const { email, phone, password, role = 'buyer', ...profile } = userData;

    // Validate role
    const allowedRoles = ['buyer', 'vendor', 'driver', 'admin'];
    if (!allowedRoles.includes(role)) {
      throw new Error('Invalid role');
    }

    // Create user
    const user = await User.create({
      email,
      phone,
      password,
      role,
      ...profile
    });

    // Generate tokens
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    return {
      user: user.toJSON(),
      tokens: {
        accessToken,
        refreshToken
      }
    };
  }

  static async login(credentials) {
    const { email, phone, password } = credentials;

    // Find user by email or phone
    let user;
    if (email) {
      user = await User.findByEmail(email);
    } else if (phone) {
      user = await User.findByPhone(phone);
    } else {
      throw new Error('Email or phone number required');
    }

    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Check password
    const isValidPassword = await user.validatePassword(password);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Check if account is active
    if (user.status !== 'active' && user.status !== 'pending') {
      throw new Error('Account is suspended');
    }

    // Update last login
    await user.updateLastLogin();

    // Generate tokens
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    return {
      user: user.toJSON(),
      tokens: {
        accessToken,
        refreshToken
      }
    };
  }

  static async refreshTokens(refreshToken) {
    try {
      // Verify refresh token
      const decoded = verifyToken(refreshToken, true);
      
      // Get user
      const user = await User.findById(decoded.userId);
      if (!user) {
        throw new Error('User not found');
      }

      if (user.status !== 'active' && user.status !== 'pending') {
        throw new Error('Account is suspended');
      }

      // Generate new tokens
      const payload = {
        userId: user.id,
        email: user.email,
        role: user.role
      };

      const newAccessToken = generateAccessToken(payload);
      const newRefreshToken = generateRefreshToken(payload);

      return {
        user: user.toJSON(),
        tokens: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken
        }
      };
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Refresh token expired');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid refresh token');
      }
      throw error;
    }
  }

  static async validateToken(token) {
    try {
      const decoded = verifyToken(token);
      const user = await User.findById(decoded.userId);
      
      if (!user) {
        throw new Error('User not found');
      }

      if (user.status !== 'active' && user.status !== 'pending') {
        throw new Error('Account is suspended');
      }

      return {
        valid: true,
        user: user.toJSON(),
        decoded
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }

  static async changePassword(userId, currentPassword, newPassword) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Validate current password
    const isValidPassword = await user.validatePassword(currentPassword);
    if (!isValidPassword) {
      throw new Error('Invalid current password');
    }

    // Update password
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    const db = require('../config/database.config');
    await db.query(
      'UPDATE users SET password = $1 WHERE id = $2',
      [hashedPassword, userId]
    );

    return { message: 'Password updated successfully' };
  }
}

module.exports = AuthService;