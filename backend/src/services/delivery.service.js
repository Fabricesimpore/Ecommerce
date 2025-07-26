const Delivery = require('../models/delivery.model');
const User = require('../models/user.model');
const Order = require('../models/order.model');

class DeliveryService {
  static async applyAsDriver(userId, applicationData) {
    // Verify user exists and can become a driver
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (user.role !== 'buyer') {
      throw new Error('Only buyers can apply to become drivers');
    }

    const { nationalId, vehicleType, licenseNumber } = applicationData;

    if (!nationalId || !vehicleType || !licenseNumber) {
      throw new Error('National ID, vehicle type, and license number are required');
    }

    // Update user role to driver (pending approval)
    const db = require('../config/database.config');
    await db.query(
      `UPDATE users 
       SET role = 'driver', 
           national_id = $1, 
           status = 'pending',
           metadata = COALESCE(metadata, '{}') || $2
       WHERE id = $3`,
      [
        nationalId,
        JSON.stringify({
          vehicleType,
          licenseNumber,
          applicationDate: new Date().toISOString()
        }),
        userId
      ]
    );

    return await User.findById(userId);
  }

  static async getAvailableDeliveries(driverId, driverRegion = null) {
    // Verify driver is active
    const driver = await User.findById(driverId);
    if (!driver || driver.role !== 'driver' || driver.status !== 'active') {
      throw new Error('Driver not found or not active');
    }

    return await Delivery.findAvailableDeliveries(driverRegion);
  }

  static async assignDelivery(deliveryId, driverId) {
    const delivery = await Delivery.findById(deliveryId);
    if (!delivery) {
      throw new Error('Delivery not found');
    }

    return await delivery.assignToDriver(driverId);
  }

  static async acceptDelivery(deliveryId, driverId) {
    // This is the same as assigning, but from driver's perspective
    return await DeliveryService.assignDelivery(deliveryId, driverId);
  }

  static async updateDeliveryStatus(deliveryId, newStatus, driverId, updateData = {}) {
    const delivery = await Delivery.findById(deliveryId);
    if (!delivery) {
      throw new Error('Delivery not found');
    }

    // Verify driver owns this delivery
    if (delivery.driverId !== driverId) {
      throw new Error('You can only update your own deliveries');
    }

    return await delivery.updateStatus(newStatus, updateData);
  }

  static async getDriverDeliveries(driverId, options = {}) {
    // Verify driver exists
    const driver = await User.findById(driverId);
    if (!driver || driver.role !== 'driver') {
      throw new Error('Driver not found');
    }

    return await Delivery.findByDriver(driverId, options);
  }

  static async getDriverStats(driverId, period = 'month') {
    // Verify driver exists
    const driver = await User.findById(driverId);
    if (!driver || driver.role !== 'driver') {
      throw new Error('Driver not found');
    }

    return await Delivery.getDriverStats(driverId, period);
  }

  static async trackDelivery(deliveryId, userId, userRole) {
    const delivery = await Delivery.findById(deliveryId);
    if (!delivery) {
      throw new Error('Delivery not found');
    }

    // Check authorization
    if (userRole === 'buyer') {
      // Verify buyer owns the order
      const order = await Order.findById(delivery.orderId);
      if (!order || order.buyerId !== userId) {
        throw new Error('You can only track your own deliveries');
      }
    } else if (userRole === 'driver') {
      // Verify driver owns the delivery
      if (delivery.driverId !== userId) {
        throw new Error('You can only track your own deliveries');
      }
    } else if (userRole === 'vendor') {
      // Verify vendor has items in the order
      const order = await Order.findById(delivery.orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      const hasItems = order.items.some((item) => item.vendorId === userId);
      if (!hasItems) {
        throw new Error('You can only track deliveries for your products');
      }
    } else if (userRole !== 'admin') {
      throw new Error('Unauthorized to track this delivery');
    }

    return delivery;
  }

  // Auto-matching system for deliveries
  static async autoMatchDeliveries() {
    // Get all pending deliveries
    const pendingDeliveries = await Delivery.findAvailableDeliveries();

    // Get all active drivers
    const activeDrivers = await User.getByRole('driver', { status: 'active' });

    const matches = [];

    // Get busy drivers before the loop
    const busyDriverQuery = `
      SELECT DISTINCT driver_id 
      FROM deliveries 
      WHERE status IN ('assigned', 'picked_up', 'in_transit')
    `;

    const db = require('../config/database.config');
    const { rows: busyDrivers } = await db.query(busyDriverQuery);
    const busyDriverIds = busyDrivers.map((row) => row.driver_id);

    const availableDrivers = activeDrivers.filter(
      (driver) => !busyDriverIds.includes(driver.id)
    );

    // Process deliveries sequentially to avoid conflicts
    let driverIndex = 0;
    const assignmentPromises = pendingDeliveries.map(async (delivery) => {
      // Simple matching algorithm - in production, this would be more sophisticated
      // considering location, driver capacity, etc.

      if (driverIndex < availableDrivers.length) {
        // For now, assign to next available driver
        // In production, you'd consider proximity, ratings, etc.
        const selectedDriver = availableDrivers[driverIndex];
        driverIndex += 1;

        try {
          await delivery.assignToDriver(selectedDriver.id);
          return {
            deliveryId: delivery.id,
            driverId: selectedDriver.id,
            orderId: delivery.orderId
          };
        } catch (error) {
          console.error(`Failed to assign delivery ${delivery.id}:`, error.message);
          return null;
        }
      }
      return null;
    });

    const results = await Promise.all(assignmentPromises);
    results.forEach((match) => {
      if (match) matches.push(match);
    });

    return matches;
  }

  // Get delivery analytics for admin
  static async getDeliveryAnalytics(period = 'month') {
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
        COUNT(CASE WHEN d.status = 'pending' THEN 1 END) as pending_deliveries,
        COALESCE(AVG(CASE WHEN d.status = 'delivered' THEN d.delivery_fee END), 0) as avg_delivery_fee,
        COALESCE(SUM(CASE WHEN d.status = 'delivered' THEN d.delivery_fee END), 0) as total_delivery_fees,
        COALESCE(SUM(CASE WHEN d.status = 'delivered' THEN d.driver_earnings END), 0) as total_driver_earnings,
        COALESCE(AVG(CASE WHEN d.status = 'delivered' THEN 
          EXTRACT(EPOCH FROM (d.delivery_time - d.pickup_time))/60 
        END), 0) as avg_delivery_time_minutes
      FROM deliveries d
      WHERE 1=1 ${dateFilter}
    `;

    const db = require('../config/database.config');
    const { rows } = await db.query(query);

    return {
      totalDeliveries: parseInt(rows[0].total_deliveries),
      completedDeliveries: parseInt(rows[0].completed_deliveries),
      failedDeliveries: parseInt(rows[0].failed_deliveries),
      pendingDeliveries: parseInt(rows[0].pending_deliveries),
      averageDeliveryFee: parseFloat(rows[0].avg_delivery_fee),
      totalDeliveryFees: parseFloat(rows[0].total_delivery_fees),
      totalDriverEarnings: parseFloat(rows[0].total_driver_earnings),
      averageDeliveryTime: parseFloat(rows[0].avg_delivery_time_minutes),
      successRate: parseInt(rows[0].total_deliveries) > 0
        ? ((parseInt(rows[0].completed_deliveries) / parseInt(rows[0].total_deliveries)) * 100).toFixed(2)
        : 0
    };
  }

  // Admin functions
  static async approveDriver(driverId) {
    const driver = await User.findById(driverId);
    if (!driver || driver.role !== 'driver') {
      throw new Error('Driver not found');
    }

    return await driver.updateStatus('active');
  }

  static async suspendDriver(driverId) {
    const driver = await User.findById(driverId);
    if (!driver || driver.role !== 'driver') {
      throw new Error('Driver not found');
    }

    // Cancel any active deliveries
    const activeDeliveries = await Delivery.findByDriver(driverId, { status: ['assigned', 'picked_up', 'in_transit'] });

    await Promise.all(
      activeDeliveries.map((delivery) => delivery.updateStatus('failed'))
    );

    return await driver.updateStatus('suspended');
  }

  static async getAllDeliveries(options = {}) {
    const {
      status = null,
      driverId = null,
      page = 1,
      limit = 20
    } = options;

    const offset = (page - 1) * limit;
    let query = `
      SELECT d.*,
        JSON_BUILD_OBJECT(
          'id', o.id,
          'orderNumber', o.order_number,
          'buyerId', o.buyer_id,
          'totalAmount', o.total_amount
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
      WHERE 1=1
    `;
    const values = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      query += ` AND d.status = $${paramCount}`;
      values.push(status);
    }

    if (driverId) {
      paramCount++;
      query += ` AND d.driver_id = $${paramCount}`;
      values.push(driverId);
    }

    query += ` ORDER BY d.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    values.push(limit, offset);

    const db = require('../config/database.config');
    const { rows } = await db.query(query, values);

    return rows.map((row) => new Delivery(row));
  }
}

module.exports = DeliveryService;
