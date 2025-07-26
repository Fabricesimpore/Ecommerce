const AuthService = require('../services/auth.service');

class AuthController {
  static async register(req, res, next) {
    try {
      const result = await AuthService.register(req.body);

      res.status(201).json({
        success: true,
        message: 'Registration successful',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  static async login(req, res, next) {
    try {
      const result = await AuthService.login(req.body);

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  static async refreshToken(req, res, next) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          message: 'Refresh token required'
        });
      }

      const result = await AuthService.refreshTokens(refreshToken);

      res.status(200).json({
        success: true,
        message: 'Tokens refreshed successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  static async logout(req, res, next) {
    try {
      // In a production app, you might want to:
      // 1. Invalidate the refresh token in database
      // 2. Add the access token to a blacklist
      // For now, we'll just return success

      res.status(200).json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error) {
      next(error);
    }
  }

  static async getProfile(req, res, next) {
    try {
      res.status(200).json({
        success: true,
        data: { user: req.user }
      });
    } catch (error) {
      next(error);
    }
  }

  static async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;

      const result = await AuthService.changePassword(
        req.user.id,
        currentPassword,
        newPassword
      );

      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  static async verifyEmail(req, res, next) {
    try {
      // TODO: Implement email verification logic
      // This would typically involve:
      // 1. Generating a verification token
      // 2. Sending an email with the token
      // 3. Verifying the token when user clicks the link

      res.status(200).json({
        success: true,
        message: 'Email verification sent'
      });
    } catch (error) {
      next(error);
    }
  }

  static async verifyPhone(req, res, next) {
    try {
      // TODO: Implement phone verification logic
      // This would typically involve:
      // 1. Generating an OTP
      // 2. Sending SMS with the OTP
      // 3. Verifying the OTP

      res.status(200).json({
        success: true,
        message: 'Phone verification code sent'
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AuthController;
