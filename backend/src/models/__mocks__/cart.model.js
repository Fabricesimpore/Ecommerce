// Mock Cart class
const mockCartStore = new Map();

class MockCart {
  constructor(data) {
    this.id = data.id || `cart-${Date.now()}-${Math.random()}`;
    this.userId = data.user_id || data.userId;
    this.createdAt = data.created_at || data.createdAt;
    this.updatedAt = data.updated_at || data.updatedAt;
    this.items = data.items || [];
    this.totalAmount = data.totalAmount || 0;
  }

  static async getByUserId(userId) {
    // Return existing cart if available
    if (mockCartStore.has(userId)) {
      return mockCartStore.get(userId);
    }

    // Create new cart with initial items
    const cart = new MockCart({
      id: `cart-${userId}`,
      user_id: userId,
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

    mockCartStore.set(userId, cart);
    return cart;
  }

  static async findByUser(userId) {
    return MockCart.getByUserId(userId);
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

  static async addItem(userId, productId, quantity, options = {}) {
    const cart = await MockCart.getByUserId(userId);

    const existingItem = cart.items.find((item) => item.productId === productId);

    if (existingItem) {
      existingItem.quantity += quantity;
      existingItem.total = existingItem.quantity * existingItem.price;
    } else {
      cart.items.push({
        productId,
        quantity,
        price: options.price || 29.99,
        total: quantity * (options.price || 29.99)
      });
    }

    cart.recalculateTotal();
    cart.updated_at = new Date();
    return cart;
  }

  async addItem(productId, quantity, price) {
    const existingItem = this.items.find((item) => item.productId === productId);

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

  static async updateItem(userId, productId, quantity) {
    const cart = await MockCart.getByUserId(userId);

    const item = cart.items.find((cartItem) => cartItem.productId === productId);

    if (item) {
      if (quantity <= 0) {
        cart.items = cart.items.filter((cartItem) => cartItem.productId !== productId);
      } else {
        item.quantity = quantity;
        item.total = quantity * item.price;
      }
    }

    cart.recalculateTotal();
    cart.updated_at = new Date();
    return cart;
  }

  async updateItem(productId, quantity) {
    const item = this.items.find((cartItem) => cartItem.productId === productId);

    if (item) {
      if (quantity <= 0) {
        this.items = this.items.filter((cartItem) => cartItem.productId !== productId);
      } else {
        item.quantity = quantity;
        item.total = quantity * item.price;
      }
    }

    this.recalculateTotal();
    this.updated_at = new Date();
    return this;
  }

  static async removeItem(userId, productId) {
    const cart = await MockCart.getByUserId(userId);
    cart.items = cart.items.filter((item) => item.productId !== productId);
    cart.recalculateTotal();
    cart.updated_at = new Date();
    return cart;
  }

  async removeItem(productId) {
    this.items = this.items.filter((item) => item.productId !== productId);
    this.recalculateTotal();
    this.updated_at = new Date();
    return this;
  }

  static async clear(userId) {
    const cart = await MockCart.getByUserId(userId);
    cart.items = [];
    cart.totalAmount = 0;
    cart.updated_at = new Date();
    return cart;
  }

  async clear() {
    this.items = [];
    this.totalAmount = 0;
    this.updated_at = new Date();
    return this;
  }

  getTotals() {
    const subtotal = this.items.reduce((total, item) => total + (item.total || item.quantity * item.price), 0);
    const tax = subtotal * 0.1; // 10% tax
    const shipping = subtotal > 50 ? 0 : 5.99;
    const total = subtotal + tax + shipping;

    return {
      subtotal,
      tax,
      shipping,
      total,
      itemCount: this.getItemCount()
    };
  }

  validateForCheckout() {
    if (!this.items || this.items.length === 0) {
      return {
        valid: false,
        issues: ['Cart is empty']
      };
    }

    const unavailableItems = this.items.filter((item) => item.quantity > 10);

    if (unavailableItems.length > 0) {
      return {
        valid: false,
        issues: ['Some items are unavailable or have insufficient inventory']
      };
    }

    return {
      valid: true,
      issues: []
    };
  }

  recalculateTotal() {
    this.totalAmount = this.items.reduce((total, item) => total + (item.total || item.quantity * item.price), 0);
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

  static clearMockStore() {
    mockCartStore.clear();
  }
}

module.exports = MockCart;
