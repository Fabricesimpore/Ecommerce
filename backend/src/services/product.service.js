const Product = require('../models/product.model');
const User = require('../models/user.model');

class ProductService {
  static async createProduct(vendorId, productData) {
    // Verify vendor can manage products
    const vendor = await User.findById(vendorId);
    if (!vendor || !vendor.canManageProducts()) {
      throw new Error('Only active vendors can create products');
    }

    // Validate required fields
    const { title, price, category } = productData;
    if (!title || !price || !category) {
      throw new Error('Title, price, and category are required');
    }

    if (price <= 0) {
      throw new Error('Price must be greater than 0');
    }

    return Product.create({
      vendorId,
      ...productData
    });
  }

  static async getProduct(id, includeVendor = false) {
    const product = await Product.findById(id);
    if (!product) {
      throw new Error('Product not found');
    }

    if (includeVendor) {
      const vendor = await User.findById(product.vendorId);
      return {
        ...product.toJSON(),
        vendor: vendor ? {
          id: vendor.id,
          businessName: vendor.businessName,
          firstName: vendor.firstName,
          lastName: vendor.lastName,
          verification: vendor.verification
        } : null
      };
    }

    return product;
  }

  static async updateProduct(id, vendorId, updates) {
    const product = await Product.findById(id);
    if (!product) {
      throw new Error('Product not found');
    }

    // Check ownership
    if (product.vendorId !== vendorId) {
      throw new Error('You can only update your own products');
    }

    // Validate price if being updated
    if (updates.price !== undefined && updates.price <= 0) {
      throw new Error('Price must be greater than 0');
    }

    return await product.update(updates);
  }

  static async deleteProduct(id, vendorId) {
    const product = await Product.findById(id);
    if (!product) {
      throw new Error('Product not found');
    }

    // Check ownership
    if (product.vendorId !== vendorId) {
      throw new Error('You can only delete your own products');
    }

    return await product.delete();
  }

  static async getProducts(options = {}) {
    const {
      page = 1,
      limit = 20,
      ...filterOptions
    } = options;

    const offset = (page - 1) * limit;
    const products = await Product.findAll({
      ...filterOptions,
      limit: Math.min(limit, 100), // Cap at 100
      offset
    });

    const total = await Product.count(filterOptions);
    const totalPages = Math.ceil(total / limit);

    return {
      products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  static async getVendorProducts(vendorId, options = {}) {
    const {
      page = 1,
      limit = 20,
      status = null
    } = options;

    const offset = (page - 1) * limit;
    const products = await Product.findByVendor(vendorId, {
      status,
      limit: Math.min(limit, 100),
      offset
    });

    // Count total for pagination
    const countQuery = status
      ? { vendorId, status }
      : { vendorId };
    const total = await Product.count(countQuery);
    const totalPages = Math.ceil(total / limit);

    return {
      products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  static async searchProducts(searchTerm, options = {}) {
    return await this.getProducts({
      search: searchTerm,
      status: 'active',
      ...options
    });
  }

  static async getProductsByCategory(category, options = {}) {
    return await this.getProducts({
      category,
      status: 'active',
      ...options
    });
  }

  static async getProductsByTags(tags, options = {}) {
    return await this.getProducts({
      tags: Array.isArray(tags) ? tags : [tags],
      status: 'active',
      ...options
    });
  }

  static async getFeaturedProducts(limit = 10) {
    // For now, return newest active products
    // In the future, this could be based on sales, ratings, etc.
    return await Product.findAll({
      status: 'active',
      sortBy: 'created_at',
      sortOrder: 'DESC',
      limit
    });
  }

  static async getCategories() {
    return await Product.getCategories();
  }

  static async getTags() {
    return await Product.getTags();
  }

  static async adjustInventory(productId, quantity, operation = 'decrease') {
    const product = await Product.findById(productId);
    if (!product) {
      throw new Error('Product not found');
    }

    return await product.adjustInventory(quantity, operation);
  }

  static async checkAvailability(productId, requestedQuantity) {
    const product = await Product.findById(productId);
    if (!product) {
      throw new Error('Product not found');
    }

    if (product.status !== 'active') {
      return {
        available: false,
        reason: 'Product is not active',
        availableQuantity: 0
      };
    }

    if (!product.trackInventory) {
      return {
        available: true,
        availableQuantity: null // Unlimited
      };
    }

    const available = product.quantity >= requestedQuantity || product.allowBackorder;

    return {
      available,
      availableQuantity: product.quantity,
      reason: available ? null : 'Insufficient inventory'
    };
  }

  static async getProductStats(vendorId) {
    const query = `
      SELECT 
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_products,
        COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_products,
        COUNT(CASE WHEN status = 'archived' THEN 1 END) as archived_products,
        COUNT(*) as total_products,
        COALESCE(AVG(price), 0) as average_price,
        COALESCE(SUM(quantity), 0) as total_inventory
      FROM products 
      WHERE vendor_id = $1
    `;

    const db = require('../config/database.config');
    const { rows } = await db.query(query, [vendorId]);

    return {
      activeProducts: parseInt(rows[0].active_products),
      draftProducts: parseInt(rows[0].draft_products),
      archivedProducts: parseInt(rows[0].archived_products),
      totalProducts: parseInt(rows[0].total_products),
      averagePrice: parseFloat(rows[0].average_price),
      totalInventory: parseInt(rows[0].total_inventory)
    };
  }
}

module.exports = ProductService;
