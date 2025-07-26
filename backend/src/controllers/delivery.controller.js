const DeliveryService = require('../services/delivery.service');

class DeliveryController {
  static async applyAsDriver(req, res, next) {
    try {
      const { nationalId, vehicleType, licenseNumber } = req.body;
      
      if (!nationalId || !vehicleType || !licenseNumber) {
        return res.status(400).json({
          success: false,
          message: 'National ID, vehicle type, and license number are required'
        });
      }

      const user = await DeliveryService.applyAsDriver(req.userId, {
        nationalId,
        vehicleType,
        licenseNumber
      });
      
      res.status(200).json({
        success: true,
        message: 'Driver application submitted successfully. Awaiting approval.',
        data: { user: user.toJSON() }
      });
    } catch (error) {
      next(error);
    }
  }

  static async getAvailableDeliveries(req, res, next) {
    try {
      const { region } = req.query;
      
      const deliveries = await DeliveryService.getAvailableDeliveries(
        req.userId, 
        region
      );
      
      res.status(200).json({
        success: true,
        data: {
          deliveries: deliveries.map(d => d.toJSON())
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async acceptDelivery(req, res, next) {
    try {
      const { deliveryId } = req.params;
      
      const delivery = await DeliveryService.acceptDelivery(deliveryId, req.userId);
      
      res.status(200).json({
        success: true,
        message: 'Delivery accepted successfully',
        data: { delivery: delivery.toJSON() }
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateDeliveryStatus(req, res, next) {
    try {
      const { deliveryId } = req.params;
      const { status, deliverySignature, deliveryPhotoUrl, deliveryNotes } = req.body;
      
      if (!status) {
        return res.status(400).json({
          success: false,
          message: 'Status is required'
        });
      }

      const updateData = {};
      if (deliverySignature) updateData.deliverySignature = deliverySignature;
      if (deliveryPhotoUrl) updateData.deliveryPhotoUrl = deliveryPhotoUrl;
      if (deliveryNotes) updateData.deliveryNotes = deliveryNotes;

      const delivery = await DeliveryService.updateDeliveryStatus(
        deliveryId, 
        status, 
        req.userId, 
        updateData
      );
      
      res.status(200).json({
        success: true,
        message: 'Delivery status updated successfully',
        data: { delivery: delivery.toJSON() }
      });
    } catch (error) {
      next(error);
    }
  }

  static async getMyDeliveries(req, res, next) {
    try {
      const {
        status,
        page = 1,
        limit = 20
      } = req.query;

      const options = {
        status,
        page: parseInt(page),
        limit: parseInt(limit)
      };

      const deliveries = await DeliveryService.getDriverDeliveries(req.userId, options);
      
      res.status(200).json({
        success: true,
        data: {
          deliveries: deliveries.map(d => d.toJSON()),
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            hasMore: deliveries.length === parseInt(limit)
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async getMyStats(req, res, next) {
    try {
      const { period = 'month' } = req.query;
      
      const stats = await DeliveryService.getDriverStats(req.userId, period);
      
      res.status(200).json({
        success: true,
        data: { stats }
      });
    } catch (error) {
      next(error);
    }
  }

  static async trackDelivery(req, res, next) {
    try {
      const { deliveryId } = req.params;
      
      const delivery = await DeliveryService.trackDelivery(
        deliveryId, 
        req.userId, 
        req.user.role
      );
      
      res.status(200).json({
        success: true,
        data: { delivery: delivery.toJSON() }
      });
    } catch (error) {
      next(error);
    }
  }

  // Admin endpoints
  static async getAllDeliveries(req, res, next) {
    try {
      const {
        status,
        driverId,
        page = 1,
        limit = 20
      } = req.query;

      const options = {
        status,
        driverId,
        page: parseInt(page),
        limit: parseInt(limit)
      };

      const deliveries = await DeliveryService.getAllDeliveries(options);
      
      res.status(200).json({
        success: true,
        data: {
          deliveries: deliveries.map(d => d.toJSON()),
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            hasMore: deliveries.length === parseInt(limit)
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async approveDriver(req, res, next) {
    try {
      const { driverId } = req.params;
      
      const driver = await DeliveryService.approveDriver(driverId);
      
      res.status(200).json({
        success: true,
        message: 'Driver approved successfully',
        data: { driver: driver.toJSON() }
      });
    } catch (error) {
      next(error);
    }
  }

  static async suspendDriver(req, res, next) {
    try {
      const { driverId } = req.params;
      const { reason } = req.body;
      
      const driver = await DeliveryService.suspendDriver(driverId, reason);
      
      res.status(200).json({
        success: true,
        message: 'Driver suspended successfully',
        data: { 
          driver: driver.toJSON(),
          reason 
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async getDeliveryAnalytics(req, res, next) {
    try {
      const { period = 'month' } = req.query;
      
      const analytics = await DeliveryService.getDeliveryAnalytics(period);
      
      res.status(200).json({
        success: true,
        data: { analytics }
      });
    } catch (error) {
      next(error);
    }
  }

  static async runAutoMatch(req, res, next) {
    try {
      const matches = await DeliveryService.autoMatchDeliveries();
      
      res.status(200).json({
        success: true,
        message: `Successfully matched ${matches.length} deliveries`,
        data: { matches }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = DeliveryController;