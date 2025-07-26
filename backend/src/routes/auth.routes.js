const express = require('express');
const AuthController = require('../controllers/auth.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { validateRegister, validateLogin, validateChangePassword } = require('../middlewares/validation.middleware');

const router = express.Router();

// Public routes
router.post('/register', validateRegister, AuthController.register);
router.post('/login', validateLogin, AuthController.login);
router.post('/refresh', AuthController.refreshToken);

// Protected routes
router.post('/logout', authenticate, AuthController.logout);
router.get('/profile', authenticate, AuthController.getProfile);
router.post('/change-password', authenticate, validateChangePassword, AuthController.changePassword);
router.post('/verify-email', authenticate, AuthController.verifyEmail);
router.post('/verify-phone', authenticate, AuthController.verifyPhone);

module.exports = router;