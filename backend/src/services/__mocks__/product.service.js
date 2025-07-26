// Mock Product Service
class MockProductService {
  static async getAllProducts(options = {}) {
    return {
      products: [
        {
          id: 'product-123',
          title: 'Test Product',
          description: 'Test Description',
          price: 29.99,
          category: 'electronics',
          vendorId: 'vendor-123',
          quantity: 10,
          status: 'active'
        }
      ],
      total: 1,
      page: options.page || 1,
      limit: options.limit || 10
    };
  }

  static async getProductById(id) {
    return {
      id,
      title: 'Test Product',
      description: 'Test Description',
      price: 29.99,
      category: 'electronics',
      vendorId: 'vendor-123',
      quantity: 10,
      status: 'active'
    };
  }

  static async createProduct(productData) {
    return {
      id: `product-${Date.now()}`,
      ...productData,
      status: 'active',
      created_at: new Date(),
      updated_at: new Date()
    };
  }

  static async updateProduct(id, updates) {
    return {
      id,
      ...updates,
      updated_at: new Date()
    };
  }

  static async deleteProduct(id) {
    return { success: true, id };
  }

  static async searchProducts(query, options = {}) {
    return {
      products: [
        {
          id: 'product-search-123',
          title: `Test Product matching ${query}`,
          description: 'Test Description',
          price: 29.99,
          category: 'electronics'
        }
      ],
      total: 1,
      query
    };
  }

  static async getProductsByVendor(vendorId, options = {}) {
    return {
      products: [
        {
          id: 'vendor-product-123',
          title: 'Vendor Product',
          vendorId,
          price: 39.99,
          status: 'active'
        }
      ],
      total: 1
    };
  }

  static async updateInventory(productId, quantity) {
    return {
      id: productId,
      quantity,
      updated_at: new Date()
    };
  }

  static async getAnalytics(vendorId) {
    return {
      totalProducts: 5,
      activeProducts: 4,
      totalSales: 1500.00,
      topProducts: [
        { id: 'product-123', title: 'Top Product', sales: 50 }
      ]
    };
  }
}

module.exports = MockProductService;