const ProductService = require('../services/product.service');

class ProductController {
  static async createProduct(req, res, next) {
    try {
      const product = await ProductService.createProduct(req.userId, req.body);

      res.status(201).json({
        success: true,
        message: 'Product created successfully',
        data: { product: product.toJSON() }
      });
    } catch (error) {
      next(error);
    }
  }

  static async getProduct(req, res, next) {
    try {
      const { id } = req.params;
      const includeVendor = req.query.include === 'vendor';

      const product = await ProductService.getProduct(id, includeVendor);

      let productData = null;
      if (product) {
        productData = product.toJSON ? product.toJSON() : product;
      }

      res.status(200).json({
        success: true,
        data: { product: productData }
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateProduct(req, res, next) {
    try {
      const { id } = req.params;
      const product = await ProductService.updateProduct(id, req.userId, req.body);

      res.status(200).json({
        success: true,
        message: 'Product updated successfully',
        data: { product: product.toJSON() }
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteProduct(req, res, next) {
    try {
      const { id } = req.params;
      await ProductService.deleteProduct(id, req.userId);

      res.status(200).json({
        success: true,
        message: 'Product deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async getProducts(req, res, next) {
    try {
      const {
        page = 1,
        limit = 20,
        category,
        subcategory,
        minPrice,
        maxPrice,
        tags,
        search,
        sortBy = 'created_at',
        sortOrder = 'DESC'
      } = req.query;

      // Parse tags if provided
      let parsedTags = [];
      if (tags) {
        parsedTags = Array.isArray(tags) ? tags : tags.split(',');
      }

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        category,
        subcategory,
        minPrice: minPrice ? parseFloat(minPrice) : null,
        maxPrice: maxPrice ? parseFloat(maxPrice) : null,
        tags: parsedTags,
        search,
        sortBy,
        sortOrder: sortOrder.toUpperCase(),
        status: 'active' // Only show active products to public
      };

      const result = await ProductService.getProducts(options);

      res.status(200).json({
        success: true,
        data: {
          products: result.products.map((p) => p.toJSON()),
          pagination: result.pagination
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async searchProducts(req, res, next) {
    try {
      const { q: searchTerm, ...options } = req.query;

      if (!searchTerm) {
        return res.status(400).json({
          success: false,
          message: 'Search term is required'
        });
      }

      const result = await ProductService.searchProducts(searchTerm, {
        page: parseInt(options.page) || 1,
        limit: parseInt(options.limit) || 20,
        category: options.category,
        minPrice: options.minPrice ? parseFloat(options.minPrice) : null,
        maxPrice: options.maxPrice ? parseFloat(options.maxPrice) : null,
        sortBy: options.sortBy || 'created_at',
        sortOrder: (options.sortOrder || 'DESC').toUpperCase()
      });

      res.status(200).json({
        success: true,
        data: {
          products: result.products.map((p) => p.toJSON()),
          pagination: result.pagination,
          searchTerm
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async getProductsByCategory(req, res, next) {
    try {
      const { category } = req.params;
      const { page = 1, limit = 20, ...options } = req.query;

      const result = await ProductService.getProductsByCategory(category, {
        page: parseInt(page),
        limit: parseInt(limit),
        ...options
      });

      res.status(200).json({
        success: true,
        data: {
          products: result.products.map((p) => p.toJSON()),
          pagination: result.pagination,
          category
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async getFeaturedProducts(req, res, next) {
    try {
      const { limit = 10 } = req.query;

      const products = await ProductService.getFeaturedProducts(parseInt(limit));

      res.status(200).json({
        success: true,
        data: { products: products.map((p) => p.toJSON()) }
      });
    } catch (error) {
      next(error);
    }
  }

  static async getCategories(req, res, next) {
    try {
      const categories = await ProductService.getCategories();

      res.status(200).json({
        success: true,
        data: { categories }
      });
    } catch (error) {
      next(error);
    }
  }

  static async getTags(req, res, next) {
    try {
      const tags = await ProductService.getTags();

      res.status(200).json({
        success: true,
        data: { tags }
      });
    } catch (error) {
      next(error);
    }
  }

  static async checkAvailability(req, res, next) {
    try {
      const { id } = req.params;
      const { quantity = 1 } = req.query;

      const availability = await ProductService.checkAvailability(id, parseInt(quantity));

      res.status(200).json({
        success: true,
        data: { availability }
      });
    } catch (error) {
      next(error);
    }
  }

  // Vendor-specific endpoints
  static async getMyProducts(req, res, next) {
    try {
      const { page = 1, limit = 20, status } = req.query;

      const result = await ProductService.getVendorProducts(req.userId, {
        page: parseInt(page),
        limit: parseInt(limit),
        status
      });

      res.status(200).json({
        success: true,
        data: {
          products: result.products.map((p) => p.toJSON()),
          pagination: result.pagination
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async getMyProductStats(req, res, next) {
    try {
      const stats = await ProductService.getProductStats(req.userId);

      res.status(200).json({
        success: true,
        data: { stats }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ProductController;
