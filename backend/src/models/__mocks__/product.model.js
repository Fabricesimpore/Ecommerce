// Mock Product class
class MockProduct {
  constructor(data) {
    Object.assign(this, data);
    this.id = data.id || `product-${Date.now()}-${Math.random()}`;
    this.status = data.status || 'active';
    this.quantity = data.quantity || 10;
    this.trackInventory = data.trackInventory !== false;
  }

  static async create(productData) {
    return new MockProduct({
      ...productData,
      id: `product-${Date.now()}`,
      status: 'active',
      created_at: new Date(),
      updated_at: new Date()
    });
  }

  static async findById(id) {
    return new MockProduct({
      id,
      title: 'Test Product',
      description: 'Test product description',
      price: 29.99,
      vendorId: 'vendor-123',
      category: 'electronics',
      quantity: 10,
      status: 'active'
    });
  }

  static async findAll() {
    return [
      new MockProduct({
        id: 'product-1',
        title: 'Test Product 1',
        price: 29.99,
        category: 'electronics',
        status: 'active'
      }),
      new MockProduct({
        id: 'product-2',
        title: 'Test Product 2',
        price: 49.99,
        category: 'clothing',
        status: 'active'
      })
    ];
  }

  static async findByVendor(vendorId) {
    return [
      new MockProduct({
        id: 'vendor-product-1',
        title: 'Vendor Product',
        vendorId,
        price: 39.99,
        status: 'active'
      })
    ];
  }

  static async search(query) {
    return [
      new MockProduct({
        id: 'search-product-1',
        title: `Product matching ${query}`,
        description: 'Search result description',
        price: 25.99,
        status: 'active'
      })
    ];
  }

  async update(updates) {
    Object.assign(this, updates);
    this.updated_at = new Date();
    return this;
  }

  async delete() {
    this.status = 'deleted';
    return this;
  }

  async updateInventory(quantity) {
    this.quantity = quantity;
    this.updated_at = new Date();
    return this;
  }

  async save() {
    this.updated_at = new Date();
    return this;
  }

  toJSON() {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      price: this.price,
      vendorId: this.vendorId,
      category: this.category,
      quantity: this.quantity,
      status: this.status,
      trackInventory: this.trackInventory,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}

module.exports = MockProduct;
