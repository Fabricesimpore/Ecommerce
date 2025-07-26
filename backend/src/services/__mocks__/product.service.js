// Mock Product Service
class MockProductService {
  static async getProducts(options = {}) {
    const page = options.page || 1;
    const limit = options.limit || 10;
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
          status: 'active',
          toJSON() { return this; }
        },
        {
          id: 'product-456',
          title: 'Test Product 2',
          description: 'Test Description 2',
          price: 49.99,
          category: 'clothing',
          vendorId: 'vendor-456',
          quantity: 5,
          status: 'active',
          toJSON() { return this; }
        }
      ],
      pagination: {
        page,
        limit,
        total: 2,
        totalPages: 1,
        hasNext: false,
        hasPrevious: false
      }
    };
  }

  static async getProduct(id, includeVendor = false) {
    const product = {
      id,
      title: 'Test Product',
      description: 'Test Description',
      price: 29.99,
      category: 'electronics',
      vendorId: 'vendor-123',
      quantity: 10,
      status: 'active',
      toJSON() { return this; }
    };
    
    if (includeVendor) {
      return {
        ...product,
        vendor: {
          id: 'vendor-123',
          businessName: 'Test Vendor',
          email: 'vendor@test.com'
        }
      };
    }
    
    return product;
  }

  static async createProduct(vendorId, productData) {
    return {
      id: `product-${Date.now()}`,
      vendorId,
      ...productData,
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
      toJSON() {
        return {
          id: this.id,
          vendorId: this.vendorId,
          title: this.title,
          description: this.description,
          price: this.price,
          category: this.category,
          tags: this.tags,
          status: this.status,
          created_at: this.created_at,
          updated_at: this.updated_at
        };
      }
    };
  }

  static async updateProduct(id, vendorId, updates) {
    return {
      id,
      vendorId,
      ...updates,
      updated_at: new Date(),
      toJSON() {
        return {
          id: this.id,
          vendorId: this.vendorId,
          title: this.title,
          description: this.description,
          price: this.price,
          category: this.category,
          status: this.status,
          updated_at: this.updated_at
        };
      }
    };
  }

  static async deleteProduct(id, vendorId) {
    return { success: true, id, vendorId };
  }

  static async searchProducts(query, options = {}) {
    const page = options.page || 1;
    const limit = options.limit || 10;
    return {
      products: [
        {
          id: 'product-search-123',
          title: `Test Product matching ${query}`,
          description: 'Test Description',
          price: 29.99,
          category: 'electronics',
          vendorId: 'vendor-123',
          status: 'active',
          toJSON() { return this; }
        }
      ],
      pagination: {
        page,
        limit,
        total: 1,
        totalPages: 1,
        hasNext: false,
        hasPrevious: false
      },
      query
    };
  }

  static async getVendorProducts(vendorId, options = {}) {
    const page = options.page || 1;
    const limit = options.limit || 10;
    return {
      products: [
        {
          id: 'vendor-product-123',
          title: 'Vendor Product',
          vendorId,
          price: 39.99,
          status: options.status || 'active',
          toJSON() { return this; }
        }
      ],
      pagination: {
        page,
        limit,
        total: 1,
        totalPages: 1,
        hasNext: false,
        hasPrevious: false
      }
    };
  }

  static async updateInventory(productId, quantity) {
    return {
      id: productId,
      quantity,
      updated_at: new Date()
    };
  }

  static async getAnalytics() {
    return {
      totalProducts: 5,
      activeProducts: 4,
      totalSales: 1500.00,
      topProducts: [
        { id: 'product-123', title: 'Top Product', sales: 50 }
      ]
    };
  }

  static async getFeaturedProducts(limit = 10) {
    return [
      {
        id: 'featured-product-1',
        title: 'Featured Product',
        price: 99.99,
        category: 'electronics',
        featured: true,
        toJSON() { return this; }
      }
    ];
  }

  static async getCategories() {
    return [
      { name: 'Electronics', count: 25 },
      { name: 'Clothing', count: 15 },
      { name: 'Books', count: 8 }
    ];
  }

  static async getTags() {
    return ['electronics', 'clothing', 'books', 'gadgets'];
  }

  static async checkAvailability(productId, quantity) {
    return {
      available: true,
      quantity: 10,
      requested: quantity,
      inStock: quantity <= 10
    };
  }
}

module.exports = MockProductService;
