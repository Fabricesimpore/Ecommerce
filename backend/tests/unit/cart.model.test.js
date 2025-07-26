const db = require('../../src/config/database.config');

// Mock database config
jest.mock('../../src/config/database.config');

const Cart = require('../../src/models/cart.model');

describe('Cart Model', () => {
  let mockClient;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock database client
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };
    
    db.getClient = jest.fn().mockResolvedValue(mockClient);
    db.query = jest.fn();
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
      const mockCartId = 'cart-456';
      const mockCartData = {
        id: mockCartId,
        user_id: userId,
        created_at: new Date(),
        updated_at: new Date(),
        items: [
          {
            id: 'item-1',
            productId: 'product-1',
            vendorId: 'vendor-1',
            quantity: 2,
            price: 10.00,
            product: {
              id: 'product-1',
              title: 'Test Product',
              description: 'Test Description',
              images: ['image1.jpg'],
              slug: 'test-product',
              status: 'active',
              inventory: {
                quantity: 10,
                trackInventory: true,
                allowBackorder: false
              }
            }
          }
        ]
      };

      // Mock get or create cart
      db.query
        .mockResolvedValueOnce({ rows: [{ cart_id: mockCartId }] })
        .mockResolvedValueOnce({ rows: [mockCartData] });

      const result = await Cart.getByUserId(userId);

      expect(db.query).toHaveBeenCalledTimes(2);
      expect(db.query).toHaveBeenNthCalledWith(1, 'SELECT get_or_create_cart($1) as cart_id', [userId]);
      expect(result).toBeInstanceOf(Cart);
      expect(result.userId).toBe(userId);
      expect(result.items).toHaveLength(1);
    });

    it('should return null if cart not found', async () => {
      const userId = 'user-123';
      const mockCartId = 'cart-456';

      db.query
        .mockResolvedValueOnce({ rows: [{ cart_id: mockCartId }] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await Cart.getByUserId(userId);

      expect(result).toBeNull();
    });
  });

  describe('addItem', () => {
    const userId = 'user-123';
    const productId = 'product-456';
    const cartId = 'cart-789';

    it('should add new item to cart successfully', async () => {
      const quantity = 2;
      const mockProduct = {
        id: productId,
        vendor_id: 'vendor-123',
        price: 15.99,
        quantity: 10,
        track_inventory: true,
        allow_backorder: false,
        status: 'active'
      };

      // Mock successful transaction
      mockClient.query
        .mockResolvedValueOnce() // BEGIN
        .mockResolvedValueOnce({ rows: [{ cart_id: cartId }] }) // get_or_create_cart
        .mockResolvedValueOnce({ rows: [mockProduct] }) // get product
        .mockResolvedValueOnce({ rows: [] }) // check existing item
        .mockResolvedValueOnce({ rows: [{ id: 'item-123' }] }) // insert new item
        .mockResolvedValueOnce(); // COMMIT

      // Mock getByUserId return
      const mockCart = new Cart({
        id: cartId,
        user_id: userId,
        created_at: new Date(),
        updated_at: new Date(),
        items: []
      });
      jest.spyOn(Cart, 'getByUserId').mockResolvedValueOnce(mockCart);

      const result = await Cart.addItem(userId, productId, quantity);

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
      expect(result).toBeInstanceOf(Cart);
    });

    it('should update existing item quantity in cart', async () => {
      const quantity = 1;
      const existingQuantity = 2;
      const mockProduct = {
        id: productId,
        vendor_id: 'vendor-123',
        price: 15.99,
        quantity: 10,
        track_inventory: true,
        allow_backorder: false,
        status: 'active'
      };
      const existingItem = {
        id: 'item-123',
        quantity: existingQuantity
      };

      mockClient.query
        .mockResolvedValueOnce() // BEGIN
        .mockResolvedValueOnce({ rows: [{ cart_id: cartId }] }) // get_or_create_cart
        .mockResolvedValueOnce({ rows: [mockProduct] }) // get product
        .mockResolvedValueOnce({ rows: [existingItem] }) // check existing item
        .mockResolvedValueOnce({ rows: [existingItem] }) // update existing item
        .mockResolvedValueOnce(); // COMMIT

      const mockCart = new Cart({
        id: cartId,
        user_id: userId,
        created_at: new Date(),
        updated_at: new Date(),
        items: []
      });
      jest.spyOn(Cart, 'getByUserId').mockResolvedValueOnce(mockCart);

      const result = await Cart.addItem(userId, productId, quantity);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE cart_items'),
        [existingQuantity + quantity, existingItem.id]
      );
      expect(result).toBeInstanceOf(Cart);
    });

    it('should throw error if product not found', async () => {
      mockClient.query
        .mockResolvedValueOnce() // BEGIN
        .mockResolvedValueOnce({ rows: [{ cart_id: cartId }] }) // get_or_create_cart
        .mockResolvedValueOnce({ rows: [] }) // product not found
        .mockResolvedValueOnce(); // ROLLBACK

      await expect(Cart.addItem(userId, productId, 1)).rejects.toThrow('Product not found or not available');
      
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw error if insufficient inventory', async () => {
      const quantity = 5;
      const mockProduct = {
        id: productId,
        vendor_id: 'vendor-123',
        price: 15.99,
        quantity: 2, // Only 2 available
        track_inventory: true,
        allow_backorder: false,
        status: 'active'
      };

      mockClient.query
        .mockResolvedValueOnce() // BEGIN
        .mockResolvedValueOnce({ rows: [{ cart_id: cartId }] }) // get_or_create_cart
        .mockResolvedValueOnce({ rows: [mockProduct] }) // get product
        .mockResolvedValueOnce(); // ROLLBACK

      await expect(Cart.addItem(userId, productId, quantity)).rejects.toThrow('Only 2 items available in stock');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should allow backorder if enabled', async () => {
      const quantity = 5;
      const mockProduct = {
        id: productId,
        vendor_id: 'vendor-123',
        price: 15.99,
        quantity: 2, // Only 2 available
        track_inventory: true,
        allow_backorder: true, // But backorder allowed
        status: 'active'
      };

      mockClient.query
        .mockResolvedValueOnce() // BEGIN
        .mockResolvedValueOnce({ rows: [{ cart_id: cartId }] }) // get_or_create_cart
        .mockResolvedValueOnce({ rows: [mockProduct] }) // get product
        .mockResolvedValueOnce({ rows: [] }) // check existing item
        .mockResolvedValueOnce({ rows: [{ id: 'item-123' }] }) // insert new item
        .mockResolvedValueOnce(); // COMMIT

      const mockCart = new Cart({
        id: cartId,
        user_id: userId,
        created_at: new Date(),
        updated_at: new Date(),
        items: []
      });
      jest.spyOn(Cart, 'getByUserId').mockResolvedValueOnce(mockCart);

      const result = await Cart.addItem(userId, productId, quantity);

      expect(result).toBeInstanceOf(Cart);
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should handle inventory check for updated existing item', async () => {
      const quantity = 3;
      const existingQuantity = 2;
      const mockProduct = {
        id: productId,
        vendor_id: 'vendor-123',
        price: 15.99,
        quantity: 4, // Only 4 available
        track_inventory: true,
        allow_backorder: false,
        status: 'active'
      };
      const existingItem = {
        id: 'item-123',
        quantity: existingQuantity
      };

      mockClient.query
        .mockResolvedValueOnce() // BEGIN
        .mockResolvedValueOnce({ rows: [{ cart_id: cartId }] }) // get_or_create_cart
        .mockResolvedValueOnce({ rows: [mockProduct] }) // get product
        .mockResolvedValueOnce({ rows: [existingItem] }) // check existing item - total would be 5, but only 4 available
        .mockResolvedValueOnce(); // ROLLBACK

      await expect(Cart.addItem(userId, productId, quantity)).rejects.toThrow('Only 4 items available in stock');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('updateItem', () => {
    const userId = 'user-123';
    const itemId = 'item-456';

    it('should remove item if quantity is 0 or negative', async () => {
      const mockCart = new Cart({
        id: 'cart-123',
        user_id: userId,
        created_at: new Date(),
        updated_at: new Date()
      });

      jest.spyOn(Cart, 'removeItem').mockResolvedValueOnce(mockCart);

      const result = await Cart.updateItem(userId, itemId, 0);

      expect(Cart.removeItem).toHaveBeenCalledWith(userId, itemId);
      expect(result).toBe(mockCart);
    });

    it('should update item quantity successfully', async () => {
      const newQuantity = 3;
      const mockItem = {
        id: itemId,
        cart_id: 'cart-123',
        product_id: 'product-456',
        quantity: 2,
        stock_quantity: 10,
        track_inventory: true,
        allow_backorder: false
      };

      mockClient.query
        .mockResolvedValueOnce() // BEGIN
        .mockResolvedValueOnce({ rows: [mockItem] }) // verify item
        .mockResolvedValueOnce({ rows: [{ id: itemId }] }) // update item
        .mockResolvedValueOnce(); // COMMIT

      const mockCart = new Cart({
        id: 'cart-123',
        user_id: userId,
        created_at: new Date(),
        updated_at: new Date()
      });
      jest.spyOn(Cart, 'getByUserId').mockResolvedValueOnce(mockCart);

      const result = await Cart.updateItem(userId, itemId, newQuantity);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE cart_items'),
        [newQuantity, itemId]
      );
      expect(result).toBeInstanceOf(Cart);
    });

    it('should throw error if item not found', async () => {
      mockClient.query
        .mockResolvedValueOnce() // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // item not found
        .mockResolvedValueOnce(); // ROLLBACK

      await expect(Cart.updateItem(userId, itemId, 2)).rejects.toThrow('Cart item not found');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should throw error if insufficient inventory for update', async () => {
      const newQuantity = 15;
      const mockItem = {
        id: itemId,
        cart_id: 'cart-123',
        product_id: 'product-456',
        quantity: 2,
        stock_quantity: 10, // Only 10 available
        track_inventory: true,
        allow_backorder: false
      };

      mockClient.query
        .mockResolvedValueOnce() // BEGIN
        .mockResolvedValueOnce({ rows: [mockItem] }) // verify item
        .mockResolvedValueOnce(); // ROLLBACK

      await expect(Cart.updateItem(userId, itemId, newQuantity)).rejects.toThrow('Only 10 items available in stock');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('removeItem', () => {
    const userId = 'user-123';
    const itemId = 'item-456';

    it('should remove item successfully', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ id: itemId }] }); // delete item

      const mockCart = new Cart({
        id: 'cart-123',
        user_id: userId,
        created_at: new Date(),
        updated_at: new Date()
      });
      jest.spyOn(Cart, 'getByUserId').mockResolvedValueOnce(mockCart);

      const result = await Cart.removeItem(userId, itemId);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM cart_items'),
        [itemId, userId]
      );
      expect(result).toBeInstanceOf(Cart);
    });

    it('should throw error if item not found', async () => {
      db.query.mockResolvedValueOnce({ rows: [] }); // item not found

      await expect(Cart.removeItem(userId, itemId)).rejects.toThrow('Cart item not found');
    });
  });

  describe('clear', () => {
    const userId = 'user-123';

    it('should clear all items from cart successfully', async () => {
      db.query.mockResolvedValueOnce(); // delete all items

      const clearedCart = new Cart({
        id: 'cart-123',
        user_id: userId,
        created_at: new Date(),
        updated_at: new Date(),
        items: []
      });
      jest.spyOn(Cart, 'getByUserId').mockResolvedValueOnce(clearedCart);

      const result = await Cart.clear(userId);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM cart_items'),
        [userId]
      );
      expect(result).toBeInstanceOf(Cart);
    });
  });

  describe('getTotals', () => {
    it('should calculate totals for cart with items', () => {
      const cartData = {
        id: 'cart-123',
        user_id: 'user-456',
        created_at: new Date(),
        updated_at: new Date(),
        items: [
          { id: 'item-1', quantity: 2, price: 10.00, vendorId: 'vendor-1' },
          { id: 'item-2', quantity: 1, price: 15.50, vendorId: 'vendor-2' },
          { id: 'item-3', quantity: 3, price: 5.25, vendorId: 'vendor-1' }
        ]
      };

      const cart = new Cart(cartData);
      const totals = cart.getTotals();

      expect(totals).toEqual({
        subtotal: 51.25, // 2 * 10.00 + 1 * 15.50 + 3 * 5.25
        itemCount: 6, // 2 + 1 + 3
        uniqueVendors: 2 // vendor-1 and vendor-2
      });
    });

    it('should return zero totals for empty cart', () => {
      const cartData = {
        id: 'cart-123',
        user_id: 'user-456',
        created_at: new Date(),
        updated_at: new Date(),
        items: []
      };

      const cart = new Cart(cartData);
      const totals = cart.getTotals();

      expect(totals).toEqual({
        subtotal: 0,
        itemCount: 0,
        uniqueVendors: 0
      });
    });

    it('should return zero totals when items is null', () => {
      const cartData = {
        id: 'cart-123',
        user_id: 'user-456',
        created_at: new Date(),
        updated_at: new Date(),
        items: null
      };

      const cart = new Cart(cartData);
      const totals = cart.getTotals();

      expect(totals).toEqual({
        subtotal: 0,
        itemCount: 0,
        uniqueVendors: 0
      });
    });
  });

  describe('toJSON', () => {
    it('should return cart data as JSON object', () => {
      const cartData = {
        id: 'cart-123',
        user_id: 'user-456',
        created_at: new Date(),
        updated_at: new Date(),
        items: [
          { 
            id: 'item-1', 
            productId: 'product-1',
            vendorId: 'vendor-1',
            quantity: 2, 
            price: 10.00,
            product: { title: 'Test Product' },
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ]
      };

      const cart = new Cart(cartData);
      const json = cart.toJSON();

      expect(json).toEqual({
        id: 'cart-123',
        userId: 'user-456',
        items: [
          {
            id: 'item-1',
            productId: 'product-1',
            vendorId: 'vendor-1',
            quantity: 2,
            price: 10.00,
            subtotal: 20.00,
            product: { title: 'Test Product' },
            createdAt: cartData.items[0].createdAt,
            updatedAt: cartData.items[0].updatedAt
          }
        ],
        totals: {
          subtotal: 20.00,
          itemCount: 2,
          uniqueVendors: 1
        },
        createdAt: cartData.created_at,
        updatedAt: cartData.updated_at
      });
    });
  });

  describe('validateForCheckout', () => {
    it('should return invalid for empty cart', async () => {
      const cartData = {
        id: 'cart-123',
        user_id: 'user-456',
        created_at: new Date(),
        updated_at: new Date(),
        items: []
      };

      const cart = new Cart(cartData);
      const validation = await cart.validateForCheckout();

      expect(validation).toEqual({
        valid: false,
        issues: ['Cart is empty']
      });
    });

    it('should return valid for cart with available products', async () => {
      const cartData = {
        id: 'cart-123',
        user_id: 'user-456',
        created_at: new Date(),
        updated_at: new Date(),
        items: [
          {
            id: 'item-1',
            quantity: 2,
            product: {
              title: 'Test Product',
              status: 'active',
              inventory: {
                trackInventory: false
              }
            }
          }
        ]
      };

      const cart = new Cart(cartData);
      const validation = await cart.validateForCheckout();

      expect(validation).toEqual({
        valid: true,
        issues: []
      });
    });

    it('should return invalid for unavailable products', async () => {
      const cartData = {
        id: 'cart-123',
        user_id: 'user-456',
        created_at: new Date(),
        updated_at: new Date(),
        items: [
          {
            id: 'item-1',
            quantity: 2,
            product: {
              title: 'Inactive Product',
              status: 'inactive',
              inventory: {
                trackInventory: false
              }
            }
          }
        ]
      };

      const cart = new Cart(cartData);
      const validation = await cart.validateForCheckout();

      expect(validation).toEqual({
        valid: false,
        issues: ['Product "Inactive Product" is no longer available']
      });
    });

    it('should return invalid for insufficient inventory', async () => {
      const cartData = {
        id: 'cart-123',
        user_id: 'user-456',
        created_at: new Date(),
        updated_at: new Date(),
        items: [
          {
            id: 'item-1',
            quantity: 5,
            product: {
              title: 'Limited Product',
              status: 'active',
              inventory: {
                trackInventory: true,
                quantity: 2,
                allowBackorder: false
              }
            }
          }
        ]
      };

      const cart = new Cart(cartData);
      const validation = await cart.validateForCheckout();

      expect(validation).toEqual({
        valid: false,
        issues: ['Only 2 of "Limited Product" available']
      });
    });

    it('should return valid for backorder allowed products', async () => {
      const cartData = {
        id: 'cart-123',
        user_id: 'user-456',
        created_at: new Date(),
        updated_at: new Date(),
        items: [
          {
            id: 'item-1',
            quantity: 5,
            product: {
              title: 'Backorder Product',
              status: 'active',
              inventory: {
                trackInventory: true,
                quantity: 2,
                allowBackorder: true
              }
            }
          }
        ]
      };

      const cart = new Cart(cartData);
      const validation = await cart.validateForCheckout();

      expect(validation).toEqual({
        valid: true,
        issues: []
      });
    });
  });
});