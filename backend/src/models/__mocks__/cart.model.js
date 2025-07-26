// Mock Cart class
class MockCart {
  constructor(data) {
    Object.assign(this, data);
    this.id = data.id || `cart-${Date.now()}-${Math.random()}`;
    this.items = data.items || [];
    this.totalAmount = data.totalAmount || 0;
  }

  static async findByUser(userId) {
    return new MockCart({
      id: `cart-${userId}`,
      userId,
      items: [
        {
          productId: 'product-123',
          quantity: 2,
          price: 29.99,
          total: 59.98
        }
      ],
      totalAmount: 59.98,
      created_at: new Date(),
      updated_at: new Date()
    });
  }

  static async create(cartData) {
    return new MockCart({
      ...cartData,
      id: `cart-${Date.now()}`,
      items: [],
      totalAmount: 0,
      created_at: new Date(),
      updated_at: new Date()
    });
  }

  static async findById(id) {
    return new MockCart({
      id,
      userId: 'buyer-123',
      items: [
        {
          productId: 'product-123',
          quantity: 1,
          price: 29.99,
          total: 29.99
        }
      ],
      totalAmount: 29.99
    });
  }

  async addItem(productId, quantity, price) {
    const existingItem = this.items.find(item => item.productId === productId);
    
    if (existingItem) {
      existingItem.quantity += quantity;
      existingItem.total = existingItem.quantity * existingItem.price;
    } else {
      this.items.push({
        productId,
        quantity,
        price,
        total: quantity * price
      });
    }
    
    this.recalculateTotal();
    this.updated_at = new Date();
    return this;
  }

  async updateItem(productId, quantity) {
    const item = this.items.find(item => item.productId === productId);
    
    if (item) {
      if (quantity <= 0) {
        this.items = this.items.filter(item => item.productId !== productId);
      } else {
        item.quantity = quantity;
        item.total = quantity * item.price;
      }
    }
    
    this.recalculateTotal();
    this.updated_at = new Date();
    return this;
  }

  async removeItem(productId) {
    this.items = this.items.filter(item => item.productId !== productId);
    this.recalculateTotal();
    this.updated_at = new Date();
    return this;
  }

  async clear() {
    this.items = [];
    this.totalAmount = 0;
    this.updated_at = new Date();
    return this;
  }

  recalculateTotal() {
    this.totalAmount = this.items.reduce((total, item) => total + item.total, 0);
  }

  getItemCount() {
    return this.items.reduce((count, item) => count + item.quantity, 0);
  }

  async validate() {
    // Mock validation - always return valid
    return {
      isValid: true,
      errors: []
    };
  }

  async save() {
    this.updated_at = new Date();
    return this;
  }

  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      items: this.items,
      totalAmount: this.totalAmount,
      itemCount: this.getItemCount(),
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}

module.exports = MockCart;