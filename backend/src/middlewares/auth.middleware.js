const { verifyToken } = require('../utils/jwt');
const User = require('../models/user.model');

const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7);

    try {
      // Verify token
      const decoded = verifyToken(token);

      // Get user from database
      const user = await User.findById(decoded.userId);

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }

      if (user.status === 'suspended') {
        return res.status(403).json({
          success: false,
          message: 'Account suspended'
        });
      }

      // Attach user to request
      req.user = user.toJSON();
      req.userId = user.id;

      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expired'
        });
      }
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token'
        });
      }
      throw error;
    }
  } catch (error) {
    next(error);
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Insufficient permissions'
    });
  }

  next();
};

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);

    try {
      const decoded = verifyToken(token);
      const user = await User.findById(decoded.userId);

      if (user && user.status !== 'suspended') {
        req.user = user.toJSON();
        req.userId = user.id;
      }
    } catch (error) {
      // Ignore token errors for optional auth
    }

    next();
  } catch (error) {
    next(error);
  }
};

const requireVendor = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (req.user.role !== 'vendor') {
    return res.status(403).json({
      success: false,
      message: 'Vendor access required'
    });
  }

  if (req.user.status !== 'active') {
    return res.status(403).json({
      success: false,
      message: 'Vendor account must be active'
    });
  }

  next();
};

const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }

  next();
};

const requireDriver = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (req.user.role !== 'driver') {
    return res.status(403).json({
      success: false,
      message: 'Driver access required'
    });
  }

  if (req.user.status !== 'active') {
    return res.status(403).json({
      success: false,
      message: 'Driver account must be active'
    });
  }

  next();
};

const requireBuyer = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (req.user.role !== 'buyer') {
    return res.status(403).json({
      success: false,
      message: 'Buyer access required'
    });
  }

  if (req.user.status !== 'active') {
    return res.status(403).json({
      success: false,
      message: 'Account must be active'
    });
  }

  next();
};

module.exports = {
  authenticate,
  authorize,
  optionalAuth,
  requireVendor,
  requireAdmin,
  requireDriver,
  requireBuyer
};
