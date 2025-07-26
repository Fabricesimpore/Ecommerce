const db = require('../config/database.config');

class Order {
  constructor(data) {
    this.id = data.id;
    this.orderNumber = data.order_number;
    this.buyerId = data.buyer_id;
    this.subtotal = parseFloat(data.subtotal);
    this.shippingCost = parseFloat(data.shipping_cost);
    this.taxAmount = parseFloat(data.tax_amount);
    this.totalAmount = parseFloat(data.total_amount);
    this.currency = data.currency;
    this.shippingAddress = data.shipping_address;
    this.shippingMethod = data.shipping_method;
    this.estimatedDeliveryDate = data.estimated_delivery_date;
    this.paymentMethod = data.payment_method;
    this.paymentStatus = data.payment_status;
    this.paymentReference = data.payment_reference;
    this.paidAt = data.paid_at;
    this.status = data.status;
    this.notes = data.notes;
    this.metadata = data.metadata || {};
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
    this.confirmedAt = data.confirmed_at;
    this.shippedAt = data.shipped_at;
    this.deliveredAt = data.delivered_at;
    this.cancelledAt = data.cancelled_at;
    this.items = data.items || [];
    this.delivery = data.delivery || null;
  }

  static async create(orderData) {
    const client = await db.getClient();

    try {
      await client.query('BEGIN');

      const {
        buyerId,
        items,
        shippingAddress,
        shippingMethod = 'standard',
        paymentMethod,
        notes,
        metadata = {}
      } = orderData;

      // Validate items
      if (!items || items.length === 0) {
        throw new Error('Order must contain at least one item');
      }

      // Calculate totals
      let subtotal = 0;
      const processedItems = [];

      // Process each item and verify inventory
      const productChecks = await Promise.all(
        items.map(async (item) => {
          const productQuery = 'SELECT * FROM products WHERE id = $1 AND status = $2';
          const { rows: productRows } = await client.query(productQuery, [item.productId, 'active']);

          if (!productRows.length) {
            throw new Error(`Product ${item.productId} not found or not available`);
          }

          const product = productRows[0];

          // Check inventory
          if (product.track_inventory && product.quantity < item.quantity && !product.allow_backorder) {
            throw new Error(`Insufficient inventory for product "${product.title}"`);
          }

          const itemTotal = parseFloat(product.price) * item.quantity;

          return {
            product,
            item,
            itemTotal,
            processedItem: {
              productId: product.id,
              vendorId: product.vendor_id,
              productTitle: product.title,
              productDescription: product.description,
              quantity: item.quantity,
              unitPrice: parseFloat(product.price),
              totalPrice: itemTotal,
              productSnapshot: {
                title: product.title,
                description: product.description,
                price: product.price,
                images: product.images,
                category: product.category,
                tags: product.tags
              }
            }
          };
        })
      );

      productChecks.forEach(({ itemTotal, processedItem }) => {
        subtotal += itemTotal;
        processedItems.push(processedItem);
      });

      // Calculate shipping and tax (simplified for now)
      const shippingCost = shippingMethod === 'express' ? 5.00 : 2.00;
      const taxAmount = 0; // No tax for now
      const totalAmount = subtotal + shippingCost + taxAmount;

      // Create order
      const orderQuery = `
        INSERT INTO orders (
          buyer_id, subtotal, shipping_cost, tax_amount, total_amount,
          shipping_address, shipping_method, payment_method, notes, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;

      const orderValues = [
        buyerId, subtotal, shippingCost, taxAmount, totalAmount,
        JSON.stringify(shippingAddress), shippingMethod, paymentMethod,
        notes, JSON.stringify(metadata)
      ];

      const { rows: orderRows } = await client.query(orderQuery, orderValues);
      const order = orderRows[0];

      // Add order items
      await Promise.all(
        processedItems.map(async (item) => {
          const itemQuery = `
            INSERT INTO order_items (
              order_id, product_id, vendor_id, product_title, product_description,
              quantity, unit_price, total_price, product_snapshot
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          `;

          await client.query(itemQuery, [
            order.id, item.productId, item.vendorId, item.productTitle,
            item.productDescription, item.quantity, item.unitPrice,
            item.totalPrice, JSON.stringify(item.productSnapshot)
          ]);

          // Decrease inventory if tracking is enabled
          const product = await client.query('SELECT * FROM products WHERE id = $1', [item.productId]);
          if (product.rows[0].track_inventory) {
            await client.query(
              'UPDATE products SET quantity = quantity - $1 WHERE id = $2',
              [item.quantity, item.productId]
            );
          }
        })
      );

      // Create delivery record
      const deliveryQuery = `
        INSERT INTO deliveries (order_id, delivery_address, estimated_distance)
        VALUES ($1, $2, $3)
      `;
      await client.query(deliveryQuery, [
        order.id,
        JSON.stringify(shippingAddress),
        0 // Will be calculated later
      ]);

      await client.query('COMMIT');

      // Return full order with items
      return await Order.findById(order.id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async findById(id) {
    const query = `
      SELECT 
        o.*,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', oi.id,
              'productId', oi.product_id,
              'vendorId', oi.vendor_id,
              'productTitle', oi.product_title,
              'productDescription', oi.product_description,
              'quantity', oi.quantity,
              'unitPrice', oi.unit_price,
              'totalPrice', oi.total_price,
              'productSnapshot', oi.product_snapshot,
              'createdAt', oi.created_at
            )
          ) FILTER (WHERE oi.id IS NOT NULL), 
          '[]'
        ) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.id = $1
      GROUP BY o.id
    `;

    const { rows } = await db.query(query, [id]);
    if (!rows.length) return null;

    // Get delivery info
    const deliveryQuery = 'SELECT * FROM deliveries WHERE order_id = $1';
    const { rows: deliveryRows } = await db.query(deliveryQuery, [id]);

    const orderData = {
      ...rows[0],
      delivery: deliveryRows.length > 0 ? deliveryRows[0] : null
    };

    return new Order(orderData);
  }

  static async findByUser(userId, options = {}) {
    const { status = null, limit = 20, offset = 0 } = options;

    let query = `
      SELECT o.*, 
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', oi.id,
              'productTitle', oi.product_title,
              'quantity', oi.quantity,
              'unitPrice', oi.unit_price,
              'totalPrice', oi.total_price
            )
          ) FILTER (WHERE oi.id IS NOT NULL), 
          '[]'
        ) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.buyer_id = $1
    `;

    const values = [userId];

    if (status) {
      query += ' AND o.status = $2';
      values.push(status);
    }

    query += ` 
      GROUP BY o.id 
      ORDER BY o.created_at DESC 
      LIMIT $${values.length + 1} OFFSET $${values.length + 2}
    `;
    values.push(limit, offset);

    const { rows } = await db.query(query, values);
    return rows.map((row) => new Order(row));
  }

  static async findByVendor(vendorId, options = {}) {
    const { status = null, limit = 20, offset = 0 } = options;

    let query = `
      SELECT DISTINCT o.*, 
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', oi.id,
              'productTitle', oi.product_title,
              'quantity', oi.quantity,
              'unitPrice', oi.unit_price,
              'totalPrice', oi.total_price
            )
          ) FILTER (WHERE oi.vendor_id = $1), 
          '[]'
        ) as items
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      WHERE oi.vendor_id = $1
    `;

    const values = [vendorId];

    if (status) {
      query += ' AND o.status = $2';
      values.push(status);
    }

    query += ` 
      GROUP BY o.id 
      ORDER BY o.created_at DESC 
      LIMIT $${values.length + 1} OFFSET $${values.length + 2}
    `;
    values.push(limit, offset);

    const { rows } = await db.query(query, values);
    return rows.map((row) => new Order(row));
  }

  async updateStatus(newStatus) {
    const allowedTransitions = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['processing', 'cancelled'],
      processing: ['shipped', 'cancelled'],
      shipped: ['delivered', 'cancelled'],
      delivered: [],
      cancelled: []
    };

    if (!allowedTransitions[this.status].includes(newStatus)) {
      throw new Error(`Cannot transition from ${this.status} to ${newStatus}`);
    }

    const timestampField = {
      confirmed: 'confirmed_at',
      shipped: 'shipped_at',
      delivered: 'delivered_at',
      cancelled: 'cancelled_at'
    }[newStatus];

    let query = 'UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP';
    const values = [newStatus, this.id];

    if (timestampField) {
      query += `, ${timestampField} = CURRENT_TIMESTAMP`;
    }

    query += ' WHERE id = $2 RETURNING *';

    const { rows } = await db.query(query, values);
    Object.assign(this, new Order(rows[0]));
    return this;
  }

  async updatePaymentStatus(paymentStatus, paymentReference = null) {
    let query = `
      UPDATE orders 
      SET payment_status = $1, updated_at = CURRENT_TIMESTAMP
    `;
    const values = [paymentStatus, this.id];

    if (paymentReference) {
      query += ', payment_reference = $3';
      values.splice(1, 0, paymentReference);
    }

    if (paymentStatus === 'paid') {
      query += ', paid_at = CURRENT_TIMESTAMP';
    }

    query += ` WHERE id = $${values.length} RETURNING *`;

    const { rows } = await db.query(query, values);
    Object.assign(this, new Order(rows[0]));
    return this;
  }

  async cancel(reason = null) {
    if (this.status === 'delivered') {
      throw new Error('Cannot cancel delivered order');
    }

    if (this.status === 'cancelled') {
      throw new Error('Order is already cancelled');
    }

    const client = await db.getClient();

    try {
      await client.query('BEGIN');

      // Update order status
      await client.query(
        `UPDATE orders 
         SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP, 
             notes = COALESCE(notes || '; ', '') || $1
         WHERE id = $2`,
        [reason || 'Cancelled by user', this.id]
      );

      // Restore inventory
      const itemsQuery = 'SELECT * FROM order_items WHERE order_id = $1';
      const { rows: items } = await client.query(itemsQuery, [this.id]);

      await Promise.all(
        items.map(async (item) => {
          const productQuery = 'SELECT track_inventory FROM products WHERE id = $1';
          const { rows: productRows } = await client.query(productQuery, [item.product_id]);

          if (productRows.length > 0 && productRows[0].track_inventory) {
            await client.query(
              'UPDATE products SET quantity = quantity + $1 WHERE id = $2',
              [item.quantity, item.product_id]
            );
          }
        })
      );

      await client.query('COMMIT');

      // Reload order
      const updatedOrder = await Order.findById(this.id);
      Object.assign(this, updatedOrder);
      return this;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Get order summary for vendor
  getVendorSummary(vendorId) {
    const vendorItems = this.items.filter((item) => item.vendorId === vendorId);
    const vendorTotal = vendorItems.reduce((sum, item) => sum + item.totalPrice, 0);

    return {
      orderId: this.id,
      orderNumber: this.orderNumber,
      buyerId: this.buyerId,
      items: vendorItems,
      vendorTotal: parseFloat(vendorTotal.toFixed(2)),
      status: this.status,
      paymentStatus: this.paymentStatus,
      createdAt: this.createdAt,
      shippingAddress: this.shippingAddress
    };
  }

  toJSON() {
    return {
      id: this.id,
      orderNumber: this.orderNumber,
      buyerId: this.buyerId,
      totals: {
        subtotal: this.subtotal,
        shippingCost: this.shippingCost,
        taxAmount: this.taxAmount,
        totalAmount: this.totalAmount,
        currency: this.currency
      },
      shipping: {
        address: this.shippingAddress,
        method: this.shippingMethod,
        estimatedDeliveryDate: this.estimatedDeliveryDate
      },
      payment: {
        method: this.paymentMethod,
        status: this.paymentStatus,
        reference: this.paymentReference,
        paidAt: this.paidAt
      },
      status: this.status,
      notes: this.notes,
      metadata: this.metadata,
      items: this.items,
      delivery: this.delivery,
      timestamps: {
        createdAt: this.createdAt,
        updatedAt: this.updatedAt,
        confirmedAt: this.confirmedAt,
        shippedAt: this.shippedAt,
        deliveredAt: this.deliveredAt,
        cancelledAt: this.cancelledAt
      }
    };
  }
}

module.exports = Order;
