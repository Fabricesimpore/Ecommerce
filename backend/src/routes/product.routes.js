const express = require('express');
const ProductController = require('../controllers/product.controller');
const { authenticate, optionalAuth, requireVendor } = require('../middlewares/auth.middleware');

const router = express.Router();

// Public routes (no auth required)
router.get('/', ProductController.getProducts);
router.get('/search', ProductController.searchProducts);
router.get('/featured', ProductController.getFeaturedProducts);
router.get('/categories', ProductController.getCategories);
router.get('/tags', ProductController.getTags);
router.get('/category/:category', ProductController.getProductsByCategory);
router.get('/:id', optionalAuth, ProductController.getProduct);
router.get('/:id/availability', ProductController.checkAvailability);

// Vendor-only routes (require authentication + vendor role)
router.post('/', authenticate, requireVendor, ProductController.createProduct);
router.put('/:id', authenticate, requireVendor, ProductController.updateProduct);
router.delete('/:id', authenticate, requireVendor, ProductController.deleteProduct);

// Vendor dashboard routes
router.get('/me/products', authenticate, requireVendor, ProductController.getMyProducts);
router.get('/me/stats', authenticate, requireVendor, ProductController.getMyProductStats);

module.exports = router;