const db = require('../config/database.config');

class Delivery {
  constructor(data) {
    this.id = data.id;
    this.orderId = data.order_id;
    this.driverId = data.driver_id;
    this.pickupAddress = data.pickup_address;
    this.deliveryAddress = data.delivery_address;
    this.estimatedDistance = data.estimated_distance ? parseFloat(data.estimated_distance) : null;
    this.estimatedDuration = data.estimated_duration;
    this.status = data.status;
    this.assignedAt = data.assigned_at;
    this.pickupTime = data.pickup_time;
    this.deliveryTime = data.delivery_time;
    this.deliverySignature = data.delivery_signature;
    this.deliveryPhotoUrl = data.delivery_photo_url;
    this.deliveryNotes = data.delivery_notes;
    this.deliveryFee = data.delivery_fee ? parseFloat(data.delivery_fee) : 0;
    this.driverEarnings = data.driver_earnings ? parseFloat(data.driver_earnings) : 0;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
    this.order = data.order || null;
    this.driver = data.driver || null;
  }

  static async findById(id) {
    const query = `
      SELECT d.*,
        JSON_BUILD_OBJECT(
          'id', o.id,
          'orderNumber', o.order_number,
          'buyerId', o.buyer_id,
          'totalAmount', o.total_amount,
          'status', o.status
        ) as order,
        JSON_BUILD_OBJECT(
          'id', u.id,
          'firstName', u.first_name,
          'lastName', u.last_name,
          'phone', u.phone
        ) as driver
      FROM deliveries d
      LEFT JOIN orders o ON d.order_id = o.id
      LEFT JOIN users u ON d.driver_id = u.id
      WHERE d.id = $1
    `;

    const { rows } = await db.query(query, [id]);
    return rows.length ? new Delivery(rows[0]) : null;
  }

  static async findByOrder(orderId) {
    const query = 'SELECT * FROM deliveries WHERE order_id = $1';
    const { rows } = await db.query(query, [orderId]);
    return rows.length ? new Delivery(rows[0]) : null;
  }

  static async findAvailableDeliveries(driverRegion = null, limit = 20) {
    let query = `
      SELECT d.*,
        JSON_BUILD_OBJECT(
          'id', o.id,
          'orderNumber', o.order_number,
          'totalAmount', o.total_amount,
          'shippingAddress', o.shipping_address,
          'createdAt', o.created_at
        ) as order
      FROM deliveries d
      JOIN orders o ON d.order_id = o.id
      WHERE d.status = 'pending' AND d.driver_id IS NULL
        AND o.status IN ('confirmed', 'processing')
      ORDER BY d.created_at ASC
      LIMIT $1
    `;

    const { rows } = await db.query(query, [limit]);
    return rows.map(row => new Delivery(row));
  }

  static async findByDriver(driverId, options = {}) {
    const { status = null, limit = 20, offset = 0 } = options;
    
    let query = `
      SELECT d.*,
        JSON_BUILD_OBJECT(
          'id', o.id,
          'orderNumber', o.order_number,
          'buyerId', o.buyer_id,
          'totalAmount', o.total_amount,
          'status', o.status,
          'shippingAddress', o.shipping_address
        ) as order
      FROM deliveries d
      JOIN orders o ON d.order_id = o.id
      WHERE d.driver_id = $1
    `;
    
    const values = [driverId];
    
    if (status) {
      query += ' AND d.status = $2';
      values.push(status);
    }
    
    query += ` 
      ORDER BY d.created_at DESC 
      LIMIT $${values.length + 1} OFFSET $${values.length + 2}
    `;
    values.push(limit, offset);
    
    const { rows } = await db.query(query, values);
    return rows.map(row => new Delivery(row));
  }

  async assignToDriver(driverId) {
    if (this.status !== 'pending') {
      throw new Error('Delivery is not available for assignment');
    }

    if (this.driverId) {
      throw new Error('Delivery is already assigned');
    }

    // Verify driver exists and is active
    const driverQuery = `
      SELECT * FROM users 
      WHERE id = $1 AND role = 'driver' AND status = 'active'
    `;
    const { rows: driverRows } = await db.query(driverQuery, [driverId]);
    
    if (!driverRows.length) {
      throw new Error('Driver not found or not active');
    }

    // Calculate delivery fee and driver earnings (simplified)
    const deliveryFee = this.estimatedDistance ? Math.max(2.00, this.estimatedDistance * 0.5) : 3.00;
    const driverEarnings = deliveryFee * 0.8; // Driver gets 80%

    const query = `
      UPDATE deliveries 
      SET driver_id = $1, status = 'assigned', assigned_at = CURRENT_TIMESTAMP,
          delivery_fee = $2, driver_earnings = $3, updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `;

    const { rows } = await db.query(query, [driverId, deliveryFee, driverEarnings, this.id]);
    Object.assign(this, new Delivery(rows[0]));
    return this;
  }

  async updateStatus(newStatus, updateData = {}) {
    const allowedTransitions = {
      'pending': ['assigned'],
      'assigned': ['picked_up', 'failed'],
      'picked_up': ['in_transit', 'failed'],
      'in_transit': ['delivered', 'failed'],
      'delivered': [],
      'failed': ['pending'] // Can be reassigned
    };

    if (!allowedTransitions[this.status].includes(newStatus)) {
      throw new Error(`Cannot transition from ${this.status} to ${newStatus}`);
    }

    let query = 'UPDATE deliveries SET status = $1, updated_at = CURRENT_TIMESTAMP';
    const values = [newStatus, this.id];
    let paramCount = 2;

    // Set timestamp fields based on status
    if (newStatus === 'picked_up') {
      query += ', pickup_time = CURRENT_TIMESTAMP';
    } else if (newStatus === 'delivered') {
      query += ', delivery_time = CURRENT_TIMESTAMP';
      
      // Add delivery confirmation data
      if (updateData.deliverySignature) {
        paramCount++;
        query += `, delivery_signature = $${paramCount}`;
        values.splice(-1, 0, JSON.stringify(updateData.deliverySignature));
      }
      
      if (updateData.deliveryPhotoUrl) {
        paramCount++;
        query += `, delivery_photo_url = $${paramCount}`;
        values.splice(-1, 0, updateData.deliveryPhotoUrl);
      }
      
      if (updateData.deliveryNotes) {
        paramCount++;
        query += `, delivery_notes = $${paramCount}`;
        values.splice(-1, 0, updateData.deliveryNotes);
      }
    } else if (newStatus === 'failed') {
      // Reset driver assignment for failed deliveries
      query += ', driver_id = NULL, assigned_at = NULL';
    }

    query += ` WHERE id = $${values.length} RETURNING *`;

    const { rows } = await db.query(query, values);
    Object.assign(this, new Delivery(rows[0]));
    
    // Update order status if delivery is completed
    if (newStatus === 'delivered') {
      await db.query(
        "UPDATE orders SET status = 'delivered', delivered_at = CURRENT_TIMESTAMP WHERE id = $1",
        [this.orderId]
      );
    }

    return this;
  }

  async calculateRoute() {
    // This is a simplified version. In production, you'd use a real routing service
    // like Google Maps API, Mapbox, or OpenRouteService
    
    if (!this.deliveryAddress || !this.pickupAddress) {
      return this;
    }

    // For now, return dummy data
    // In real implementation, you'd call a routing API
    const estimatedDistance = Math.random() * 20 + 5; // 5-25 km
    const estimatedDuration = Math.round(estimatedDistance * 3); // ~3 minutes per km

    const query = `
      UPDATE deliveries 
      SET estimated_distance = $1, estimated_duration = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;

    const { rows } = await db.query(query, [estimatedDistance, estimatedDuration, this.id]);
    Object.assign(this, new Delivery(rows[0]));
    return this;
  }

  // Get delivery statistics for a driver
  static async getDriverStats(driverId, period = 'month') {
    let dateFilter = '';
    const now = new Date();
    
    if (period === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      dateFilter = `AND d.created_at >= '${weekAgo.toISOString()}'`;
    } else if (period === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      dateFilter = `AND d.created_at >= '${monthAgo.toISOString()}'`;
    }

    const query = `
      SELECT 
        COUNT(*) as total_deliveries,
        COUNT(CASE WHEN d.status = 'delivered' THEN 1 END) as completed_deliveries,
        COUNT(CASE WHEN d.status = 'failed' THEN 1 END) as failed_deliveries,
        COALESCE(SUM(CASE WHEN d.status = 'delivered' THEN d.driver_earnings ELSE 0 END), 0) as total_earnings,
        COALESCE(AVG(CASE WHEN d.status = 'delivered' THEN d.estimated_distance END), 0) as avg_distance,
        COALESCE(AVG(CASE WHEN d.status = 'delivered' THEN 
          EXTRACT(EPOCH FROM (d.delivery_time - d.pickup_time))/60 
        END), 0) as avg_delivery_time_minutes
      FROM deliveries d
      WHERE d.driver_id = $1 ${dateFilter}
    `;

    const { rows } = await db.query(query, [driverId]);
    
    return {
      totalDeliveries: parseInt(rows[0].total_deliveries),
      completedDeliveries: parseInt(rows[0].completed_deliveries),
      failedDeliveries: parseInt(rows[0].failed_deliveries),
      totalEarnings: parseFloat(rows[0].total_earnings),
      averageDistance: parseFloat(rows[0].avg_distance),
      averageDeliveryTime: parseFloat(rows[0].avg_delivery_time_minutes),
      successRate: parseInt(rows[0].total_deliveries) > 0 
        ? (parseInt(rows[0].completed_deliveries) / parseInt(rows[0].total_deliveries) * 100).toFixed(2)
        : 0
    };
  }

  toJSON() {
    return {
      id: this.id,
      orderId: this.orderId,
      driverId: this.driverId,
      addresses: {
        pickup: this.pickupAddress,
        delivery: this.deliveryAddress
      },
      route: {
        estimatedDistance: this.estimatedDistance,
        estimatedDuration: this.estimatedDuration
      },
      status: this.status,
      timeline: {
        assignedAt: this.assignedAt,
        pickupTime: this.pickupTime,
        deliveryTime: this.deliveryTime
      },
      confirmation: {
        signature: this.deliverySignature,
        photoUrl: this.deliveryPhotoUrl,
        notes: this.deliveryNotes
      },
      payment: {
        deliveryFee: this.deliveryFee,
        driverEarnings: this.driverEarnings
      },
      order: this.order,
      driver: this.driver,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

module.exports = Delivery;