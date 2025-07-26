const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }
    
    next();
  };
};

// Email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Phone validation regex (Burkina Faso format)
const phoneRegex = /^\+226[0-9]{8}$/;

// Password validation (at least 8 chars, 1 uppercase, 1 lowercase, 1 number)
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;

const authValidation = {
  register: {
    email: (value) => {
      if (!value || !emailRegex.test(value)) {
        throw new Error('Invalid email format');
      }
      return value.toLowerCase();
    },
    phone: (value) => {
      if (!value || !phoneRegex.test(value)) {
        throw new Error('Invalid phone number. Format: +226XXXXXXXX');
      }
      return value;
    },
    password: (value) => {
      if (!value || !passwordRegex.test(value)) {
        throw new Error('Password must be at least 8 characters with 1 uppercase, 1 lowercase, and 1 number');
      }
      return value;
    },
    role: (value) => {
      const allowedRoles = ['buyer', 'vendor', 'driver'];
      if (!allowedRoles.includes(value)) {
        throw new Error('Invalid role. Must be: buyer, vendor, or driver');
      }
      return value;
    }
  },
  login: {
    emailOrPhone: (value, isEmail = true) => {
      if (isEmail) {
        if (!value || !emailRegex.test(value)) {
          throw new Error('Invalid email format');
        }
        return value.toLowerCase();
      } else {
        if (!value || !phoneRegex.test(value)) {
          throw new Error('Invalid phone number');
        }
        return value;
      }
    },
    password: (value) => {
      if (!value) {
        throw new Error('Password is required');
      }
      return value;
    }
  }
};

// Manual validation functions for auth routes
const validateRegister = (req, res, next) => {
  try {
    const { email, phone, password, role = 'buyer' } = req.body;
    
    // Validate required fields
    if (!email || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email, phone, and password are required'
      });
    }
    
    // Validate each field
    req.body.email = authValidation.register.email(email);
    req.body.phone = authValidation.register.phone(phone);
    req.body.password = authValidation.register.password(password);
    req.body.role = authValidation.register.role(role);
    
    next();
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: [{ message: error.message }]
    });
  }
};

const validateLogin = (req, res, next) => {
  try {
    const { email, phone, password } = req.body;
    
    // Require either email or phone
    if (!email && !phone) {
      return res.status(400).json({
        success: false,
        message: 'Email or phone number is required'
      });
    }
    
    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required'
      });
    }
    
    // Validate fields
    if (email) {
      req.body.email = authValidation.login.emailOrPhone(email, true);
    }
    if (phone) {
      req.body.phone = authValidation.login.emailOrPhone(phone, false);
    }
    req.body.password = authValidation.login.password(password);
    
    next();
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: [{ message: error.message }]
    });
  }
};

const validateChangePassword = (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }
    
    // Validate new password format
    req.body.newPassword = authValidation.register.password(newPassword);
    
    next();
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: [{ message: error.message }]
    });
  }
};

module.exports = {
  validateRequest,
  validateRegister,
  validateLogin,
  validateChangePassword,
  authValidation
};