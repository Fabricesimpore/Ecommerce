const User = require('../models/user.model');
const ProductService = require('../services/product.service');

class VendorController {
  static async applyAsVendor(req, res, next) {
    try {
      const { businessName, nationalId } = req.body;
      
      if (!businessName || !nationalId) {
        return res.status(400).json({
          success: false,
          message: 'Business name and national ID are required'
        });
      }

      const user = await User.findById(req.userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      await user.applyAsVendor({ businessName, nationalId });
      
      res.status(200).json({
        success: true,
        message: 'Vendor application submitted successfully. Awaiting approval.',
        data: { user: user.toJSON() }
      });
    } catch (error) {
      next(error);
    }
  }

  static async getVendors(req, res, next) {
    try {
      const {
        page = 1,
        limit = 20,
        status = 'active',
        verified
      } = req.query;

      const options = {
        status,
        verified: verified === 'true' ? true : verified === 'false' ? false : null,
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit)
      };

      const vendors = await User.getVendors(options);
      
      // Get total count for pagination
      const totalOptions = { status };
      if (options.verified !== null) {
        totalOptions.verified = options.verified;
      }
      const total = await User.getVendors({ ...totalOptions, limit: 999999 });
      const totalCount = total.length;
      const totalPages = Math.ceil(totalCount / parseInt(limit));

      res.status(200).json({
        success: true,
        data: {
          vendors: vendors.map(v => v.toJSON()),
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: totalCount,
            totalPages,
            hasNext: parseInt(page) < totalPages,
            hasPrev: parseInt(page) > 1
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async getVendor(req, res, next) {
    try {
      const { id } = req.params;
      const { includeStats = false } = req.query;
      
      const vendor = await User.findById(id);
      if (!vendor || !vendor.isVendor()) {
        return res.status(404).json({
          success: false,
          message: 'Vendor not found'
        });
      }

      const vendorData = vendor.toJSON();

      // Include product stats if requested
      if (includeStats === 'true') {
        const stats = await ProductService.getProductStats(id);
        vendorData.stats = stats;
      }

      res.status(200).json({
        success: true,
        data: { vendor: vendorData }
      });
    } catch (error) {
      next(error);
    }
  }

  static async getVendorProducts(req, res, next) {
    try {
      const { id } = req.params;
      const { page = 1, limit = 20, status = 'active' } = req.query;
      
      // Verify vendor exists
      const vendor = await User.findById(id);
      if (!vendor || !vendor.isVendor()) {
        return res.status(404).json({
          success: false,
          message: 'Vendor not found'
        });
      }

      const result = await ProductService.getVendorProducts(id, {
        page: parseInt(page),
        limit: parseInt(limit),
        status
      });
      
      res.status(200).json({
        success: true,
        data: {
          vendor: {
            id: vendor.id,
            businessName: vendor.businessName,
            firstName: vendor.firstName,
            lastName: vendor.lastName
          },
          products: result.products.map(p => p.toJSON()),
          pagination: result.pagination
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateVendorProfile(req, res, next) {
    try {
      const allowedUpdates = [
        'firstName', 'lastName', 'businessName',
        'addressStreet', 'addressCity', 'addressRegion',
        'addressLat', 'addressLng'
      ];

      const updates = {};
      Object.keys(req.body).forEach(key => {
        if (allowedUpdates.includes(key)) {
          // Convert camelCase to snake_case for database
          const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
          updates[dbKey] = req.body[key];
        }
      });

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No valid fields to update'
        });
      }

      const user = await User.findById(req.userId);
      if (!user || !user.isVendor()) {
        return res.status(403).json({
          success: false,
          message: 'Only vendors can update vendor profile'
        });
      }

      await user.update(updates);
      
      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: { vendor: user.toJSON() }
      });
    } catch (error) {
      next(error);
    }
  }

  static async getVendorDashboard(req, res, next) {
    try {
      const user = await User.findById(req.userId);
      if (!user || !user.isVendor()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Vendors only.'
        });
      }

      // Get product stats
      const productStats = await ProductService.getProductStats(req.userId);

      // Get recent products
      const recentProducts = await ProductService.getVendorProducts(req.userId, {
        limit: 5,
        page: 1
      });

      const dashboardData = {
        vendor: user.toJSON(),
        stats: {
          products: productStats,
          // Add more stats here as needed (orders, revenue, etc.)
        },
        recentProducts: recentProducts.products.map(p => p.toJSON())
      };

      res.status(200).json({
        success: true,
        data: dashboardData
      });
    } catch (error) {
      next(error);
    }
  }

  // Admin endpoints for vendor management
  static async approveVendor(req, res, next) {
    try {
      const { id } = req.params;
      
      const vendor = await User.findById(id);
      if (!vendor || !vendor.isVendor()) {
        return res.status(404).json({
          success: false,
          message: 'Vendor not found'
        });
      }

      await vendor.updateStatus('active');
      await vendor.verifyIdentity();
      await vendor.verifyBusinessLicense();
      
      res.status(200).json({
        success: true,
        message: 'Vendor approved successfully',
        data: { vendor: vendor.toJSON() }
      });
    } catch (error) {
      next(error);
    }
  }

  static async suspendVendor(req, res, next) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      
      const vendor = await User.findById(id);
      if (!vendor || !vendor.isVendor()) {
        return res.status(404).json({
          success: false,
          message: 'Vendor not found'
        });
      }

      await vendor.updateStatus('suspended');
      
      // TODO: Log suspension reason in audit table
      // TODO: Send notification to vendor
      
      res.status(200).json({
        success: true,
        message: 'Vendor suspended successfully',
        data: { 
          vendor: vendor.toJSON(),
          reason 
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = VendorController;