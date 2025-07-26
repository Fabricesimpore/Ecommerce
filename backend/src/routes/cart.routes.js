const express = require('express');
const CartController = require('../controllers/cart.controller');
const { authenticate } = require('../middlewares/auth.middleware');

const router = express.Router();

// All cart routes require authentication
router.use(authenticate);

// Cart management routes
router.get('/', CartController.getCart);
router.post('/add', CartController.addToCart);
router.put('/update/:itemId', CartController.updateCartItem);
router.delete('/remove/:itemId', CartController.removeFromCart);
router.delete('/clear', CartController.clearCart);

// Cart validation for checkout
router.get('/validate', CartController.validateCart);

module.exports = router;