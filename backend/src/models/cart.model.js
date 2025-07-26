const db = require('../config/database.config');

class Cart {
  constructor(data) {
    this.id = data.id;
    this.userId = data.user_id;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
    this.items = data.items || [];
  }

  static async getByUserId(userId) {
    // Use the database function to get or create cart
    const cartQuery = 'SELECT get_or_create_cart($1) as cart_id';
    const { rows: cartRows } = await db.query(cartQuery, [userId]);
    const cartId = cartRows[0].cart_id;

    // Get cart details with items
    const query = `
      SELECT 
        c.*,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', ci.id,
              'productId', ci.product_id,
              'vendorId', ci.vendor_id,
              'quantity', ci.quantity,
              'price', ci.price,
              'createdAt', ci.created_at,
              'updatedAt', ci.updated_at,
              'product', JSON_BUILD_OBJECT(
                'id', p.id,
                'title', p.title,
                'description', p.description,
                'images', p.images,
                'slug', p.slug,
                'status', p.status,
                'inventory', JSON_BUILD_OBJECT(
                  'quantity', p.quantity,
                  'trackInventory', p.track_inventory,
                  'allowBackorder', p.allow_backorder
                )
              )
            )
          ) FILTER (WHERE ci.id IS NOT NULL), 
          '[]'
        ) as items
      FROM carts c
      LEFT JOIN cart_items ci ON c.id = ci.cart_id
      LEFT JOIN products p ON ci.product_id = p.id
      WHERE c.id = $1
      GROUP BY c.id
    `;

    const { rows } = await db.query(query, [cartId]);
    if (!rows.length) return null;

    return new Cart(rows[0]);
  }

  static async addItem(userId, productId, quantity = 1) {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');

      // Get or create cart
      const cartQuery = 'SELECT get_or_create_cart($1) as cart_id';
      const { rows: cartRows } = await client.query(cartQuery, [userId]);
      const cartId = cartRows[0].cart_id;

      // Get product details
      const productQuery = 'SELECT * FROM products WHERE id = $1 AND status = $2';
      const { rows: productRows } = await client.query(productQuery, [productId, 'active']);
      
      if (!productRows.length) {
        throw new Error('Product not found or not available');
      }

      const product = productRows[0];

      // Check inventory if tracking is enabled
      if (product.track_inventory && product.quantity < quantity && !product.allow_backorder) {
        throw new Error(`Only ${product.quantity} items available in stock`);
      }

      // Check if item already exists in cart
      const existingItemQuery = `
        SELECT * FROM cart_items 
        WHERE cart_id = $1 AND product_id = $2
      `;
      const { rows: existingItems } = await client.query(existingItemQuery, [cartId, productId]);

      if (existingItems.length > 0) {
        // Update existing item
        const newQuantity = existingItems[0].quantity + quantity;
        
        // Check inventory for new total quantity
        if (product.track_inventory && product.quantity < newQuantity && !product.allow_backorder) {
          throw new Error(`Only ${product.quantity} items available in stock`);
        }

        const updateQuery = `
          UPDATE cart_items 
          SET quantity = $1, updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
          RETURNING *
        `;
        await client.query(updateQuery, [newQuantity, existingItems[0].id]);
      } else {
        // Add new item
        const insertQuery = `
          INSERT INTO cart_items (cart_id, product_id, vendor_id, quantity, price)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING *
        `;
        await client.query(insertQuery, [cartId, productId, product.vendor_id, quantity, product.price]);
      }

      await client.query('COMMIT');
      
      // Return updated cart
      return await Cart.getByUserId(userId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async updateItem(userId, itemId, quantity) {
    if (quantity <= 0) {
      return await Cart.removeItem(userId, itemId);
    }

    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');

      // Verify item belongs to user's cart
      const verifyQuery = `
        SELECT ci.*, p.quantity as stock_quantity, p.track_inventory, p.allow_backorder
        FROM cart_items ci
        JOIN carts c ON ci.cart_id = c.id
        JOIN products p ON ci.product_id = p.id
        WHERE ci.id = $1 AND c.user_id = $2
      `;
      const { rows: itemRows } = await client.query(verifyQuery, [itemId, userId]);
      
      if (!itemRows.length) {
        throw new Error('Cart item not found');
      }

      const item = itemRows[0];

      // Check inventory
      if (item.track_inventory && item.stock_quantity < quantity && !item.allow_backorder) {
        throw new Error(`Only ${item.stock_quantity} items available in stock`);
      }

      // Update quantity
      const updateQuery = `
        UPDATE cart_items 
        SET quantity = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `;
      await client.query(updateQuery, [quantity, itemId]);

      await client.query('COMMIT');
      
      return await Cart.getByUserId(userId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async removeItem(userId, itemId) {
    // Verify item belongs to user's cart and delete
    const query = `
      DELETE FROM cart_items 
      WHERE id = $1 AND cart_id IN (
        SELECT id FROM carts WHERE user_id = $2
      )
      RETURNING *
    `;
    
    const { rows } = await db.query(query, [itemId, userId]);
    
    if (!rows.length) {
      throw new Error('Cart item not found');
    }

    return await Cart.getByUserId(userId);
  }

  static async clear(userId) {
    const query = `
      DELETE FROM cart_items 
      WHERE cart_id IN (
        SELECT id FROM carts WHERE user_id = $1
      )
    `;
    
    await db.query(query, [userId]);
    return await Cart.getByUserId(userId);
  }

  // Calculate cart totals
  getTotals() {
    if (!this.items || this.items.length === 0) {
      return {
        subtotal: 0,
        itemCount: 0,
        uniqueVendors: 0
      };
    }

    const subtotal = this.items.reduce((sum, item) => {
      return sum + (parseFloat(item.price) * item.quantity);
    }, 0);

    const itemCount = this.items.reduce((sum, item) => sum + item.quantity, 0);
    
    const uniqueVendors = [...new Set(this.items.map(item => item.vendorId))].length;

    return {
      subtotal: parseFloat(subtotal.toFixed(2)),
      itemCount,
      uniqueVendors
    };
  }

  // Check if cart is valid for checkout
  async validateForCheckout() {
    const issues = [];

    if (!this.items || this.items.length === 0) {
      issues.push('Cart is empty');
      return { valid: false, issues };
    }

    // Check each item
    for (const item of this.items) {
      const product = item.product;

      // Check if product is still active
      if (product.status !== 'active') {
        issues.push(`Product "${product.title}" is no longer available`);
        continue;
      }

      // Check inventory
      if (product.inventory.trackInventory) {
        if (product.inventory.quantity < item.quantity && !product.inventory.allowBackorder) {
          issues.push(`Only ${product.inventory.quantity} of "${product.title}" available`);
        }
      }
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  toJSON() {
    const totals = this.getTotals();
    
    return {
      id: this.id,
      userId: this.userId,
      items: this.items.map(item => ({
        id: item.id,
        productId: item.productId,
        vendorId: item.vendorId,
        quantity: item.quantity,
        price: parseFloat(item.price),
        subtotal: parseFloat((item.price * item.quantity).toFixed(2)),
        product: item.product,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt
      })),
      totals,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

module.exports = Cart;