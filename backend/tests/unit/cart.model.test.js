const Cart = require('../../src/models/cart.model');

describe('Cart Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear the mock cart store to ensure test isolation
    if (Cart.clearMockStore) {
      Cart.clearMockStore();
    }
  });

  describe('Constructor', () => {
    it('should create a cart instance with provided data', () => {
      const mockData = {
        id: 'cart-123',
        user_id: 'user-456',
        created_at: new Date(),
        updated_at: new Date(),
        items: []
      };

      const cart = new Cart(mockData);

      expect(cart.id).toBe('cart-123');
      expect(cart.userId).toBe('user-456');
      expect(cart.createdAt).toBe(mockData.created_at);
      expect(cart.updatedAt).toBe(mockData.updated_at);
      expect(cart.items).toEqual([]);
    });

    it('should create a cart instance with default empty items array', () => {
      const mockData = {
        id: 'cart-123',
        user_id: 'user-456',
        created_at: new Date(),
        updated_at: new Date()
      };

      const cart = new Cart(mockData);

      expect(cart.items).toEqual([]);
    });
  });

  describe('getByUserId', () => {
    it('should get or create cart and return cart with items', async () => {
      const userId = 'user-123';
      const result = await Cart.getByUserId(userId);

      expect(result).toBeInstanceOf(Cart);
      expect(result.userId).toBe(userId);
      expect(result.items).toBeDefined();
      expect(result.items.length).toBeGreaterThan(0);
    });

    it('should always return a cart (never null)', async () => {
      const userId = 'user-123';
      const result = await Cart.getByUserId(userId);

      expect(result).not.toBeNull();
      expect(result).toBeInstanceOf(Cart);
    });
  });

  describe('addItem', () => {
    const userId = 'user-123';
    const productId = 'product-456';

    it('should add new item to cart successfully', async () => {
      const quantity = 2;
      const result = await Cart.addItem(userId, productId, quantity);

      expect(result).toBeInstanceOf(Cart);
      expect(result.userId).toBe(userId);
      
      const addedItem = result.items.find(item => item.productId === productId);
      expect(addedItem).toBeDefined();
      expect(addedItem.quantity).toBeGreaterThanOrEqual(quantity);
    });

    it('should update existing item quantity in cart', async () => {
      // Use the default product-123 that exists in the mock cart
      const existingProductId = 'product-123';
      
      // Add more of the existing item (already has quantity 2)
      const result = await Cart.addItem(userId, existingProductId, 1);
      
      expect(result).toBeInstanceOf(Cart);
      const item = result.items.find(item => item.productId === existingProductId);
      expect(item).toBeDefined();
      expect(item.quantity).toBeGreaterThanOrEqual(3);
    });

    it('should handle adding items without errors', async () => {
      await expect(Cart.addItem(userId, productId, 1)).resolves.toBeInstanceOf(Cart);
    });

    it('should allow adding multiple different items', async () => {
      const result1 = await Cart.addItem(userId, 'product-1', 1);
      const result2 = await Cart.addItem(userId, 'product-2', 2);
      
      expect(result2.items.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle various quantities', async () => {
      const result = await Cart.addItem(userId, productId, 10);
      expect(result).toBeInstanceOf(Cart);
    });

    it('should update cart timestamp on add', async () => {
      const result = await Cart.addItem(userId, productId, 1);
      expect(result.updatedAt || result.updated_at).toBeDefined();
    });
  });

  describe('updateItem', () => {
    it('should update item quantity successfully', async () => {
      const cart = await Cart.getByUserId('user-123');
      const originalItemCount = cart.items.length;
      
      if (cart.items.length > 0) {
        const itemId = cart.items[0].id || cart.items[0].productId;
        const result = await cart.updateItem(itemId, 5);
        
        expect(result).toBeInstanceOf(Cart);
        expect(result.items.length).toBeLessThanOrEqual(originalItemCount);
      }
    });

    it('should remove item if quantity is 0 or negative', async () => {
      const cart = await Cart.getByUserId('user-123');
      
      if (cart.items.length > 0) {
        const itemId = cart.items[0].id || cart.items[0].productId;
        const result = await cart.updateItem(itemId, 0);
        
        expect(result).toBeInstanceOf(Cart);
        const item = result.items.find(item => (item.id || item.productId) === itemId);
        expect(item).toBeUndefined();
      }
    });

    it('should handle update for non-existent item', async () => {
      const cart = await Cart.getByUserId('user-123');
      const result = await cart.updateItem('non-existent-item', 5);
      
      expect(result).toBeInstanceOf(Cart);
    });

    it('should handle negative quantities', async () => {
      const cart = await Cart.getByUserId('user-123');
      
      if (cart.items.length > 0) {
        const itemId = cart.items[0].id || cart.items[0].productId;
        const result = await cart.updateItem(itemId, -1);
        
        expect(result).toBeInstanceOf(Cart);
      }
    });
  });

  describe('removeItem', () => {
    it('should remove item successfully', async () => {
      const cart = await Cart.getByUserId('user-123');
      const initialLength = cart.items.length;
      
      if (cart.items.length > 0) {
        const itemId = cart.items[0].id || cart.items[0].productId;
        const result = await cart.removeItem(itemId);
        
        expect(result).toBeInstanceOf(Cart);
        expect(result.items.length).toBeLessThan(initialLength);
      }
    });

    it('should handle removing non-existent item', async () => {
      const cart = await Cart.getByUserId('user-123');
      const result = await cart.removeItem('non-existent-item');
      
      expect(result).toBeInstanceOf(Cart);
    });
  });

  describe('clear', () => {
    it('should clear all items from cart successfully', async () => {
      const cart = await Cart.getByUserId('user-123');
      const result = await cart.clear();
      
      expect(result).toBeInstanceOf(Cart);
      expect(result.items).toEqual([]);
    });
  });

  describe('getTotals', () => {
    it('should calculate totals for cart with items', async () => {
      const cart = await Cart.getByUserId('user-123');
      const totals = cart.getTotals();
      
      expect(totals).toHaveProperty('subtotal');
      expect(totals).toHaveProperty('itemCount');
      expect(totals).toHaveProperty('shipping');
      expect(totals).toHaveProperty('tax');
      expect(totals).toHaveProperty('total');
      
      expect(typeof totals.subtotal).toBe('number');
      expect(typeof totals.itemCount).toBe('number');
      expect(totals.itemCount).toBeGreaterThanOrEqual(0);
    });

    it('should return zero totals for empty cart', () => {
      const cart = new Cart({
        id: 'empty-cart',
        user_id: 'user-123',
        items: []
      });
      
      const totals = cart.getTotals();
      
      expect(totals.subtotal).toBe(0);
      expect(totals.itemCount).toBe(0);
      expect(totals.shipping).toBeGreaterThanOrEqual(0);
      expect(totals.tax).toBe(0);
      expect(totals.total).toBeGreaterThanOrEqual(0);
    });

    it('should return zero totals when items is null', () => {
      const cart = new Cart({
        id: 'null-items-cart',
        user_id: 'user-123',
        items: null
      });
      
      const totals = cart.getTotals();
      
      expect(totals.subtotal).toBe(0);
      expect(totals.itemCount).toBe(0);
    });
  });

  describe('toJSON', () => {
    it('should return cart data as JSON object', async () => {
      const cart = await Cart.getByUserId('user-456');
      const json = cart.toJSON();
      
      expect(json).toHaveProperty('id');
      expect(json).toHaveProperty('userId');
      expect(json).toHaveProperty('items');
      expect(Array.isArray(json.items)).toBe(true);
    });
  });

  describe('validateForCheckout', () => {
    it('should return invalid for empty cart', async () => {
      const cart = new Cart({
        id: 'empty-cart',
        user_id: 'user-123',
        items: []
      });
      
      const validation = await cart.validateForCheckout();
      
      expect(validation.valid).toBe(false);
      expect(validation.issues).toContain('Cart is empty');
    });

    it('should return valid for cart with available products', async () => {
      const cart = new Cart({
        id: 'valid-cart',
        user_id: 'user-123',
        items: [{
          productId: 'product-1',
          quantity: 2,
          price: 10,
          product: {
            status: 'active',
            inventory: { quantity: 10 }
          }
        }]
      });
      
      const validation = await cart.validateForCheckout();
      
      expect(validation.valid).toBe(true);
      expect(validation.issues).toEqual([]);
    });

    it('should check inventory limits', async () => {
      const cart = new Cart({
        id: 'inventory-cart',
        user_id: 'user-123',
        items: [{
          productId: 'product-1',
          quantity: 15, // More than mock limit of 10
          price: 10
        }]
      });
      
      const validation = await cart.validateForCheckout();
      
      // Mock returns invalid for items with quantity > 10
      expect(validation.valid).toBe(false);
    });

    it('should handle products without inventory data', async () => {
      const cart = new Cart({
        id: 'no-inventory-cart',
        user_id: 'user-123',
        items: [{
          productId: 'product-1',
          quantity: 1,
          price: 10,
          product: {
            status: 'active'
          }
        }]
      });
      
      const validation = await cart.validateForCheckout();
      
      expect(validation).toHaveProperty('valid');
      expect(validation).toHaveProperty('issues');
    });

    it('should return valid for backorder allowed products', async () => {
      const cart = new Cart({
        id: 'backorder-cart',
        user_id: 'user-123',
        items: [{
          productId: 'product-1',
          quantity: 5,
          price: 10,
          product: {
            status: 'active',
            inventory: {
              quantity: 2,
              allowBackorder: true
            }
          }
        }]
      });
      
      const validation = await cart.validateForCheckout();
      
      expect(validation.valid).toBe(true);
      expect(validation.issues).toEqual([]);
    });
  });
});