const request = require('supertest');
const app = require('../../app');
const db = require('../../src/config/database.config');
const jwt = require('jsonwebtoken');

// Mock the database and User model
jest.mock('../../src/config/database.config');
jest.mock('../../src/models/user.model');
jest.mock('../../src/services/product.service');

describe('Vendor Endpoints', () => {
  let buyerToken, vendorToken, adminToken, buyerId, vendorId, adminId;
  let mockBuyer, mockVendor, mockAdmin;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock user IDs
    buyerId = '123e4567-e89b-12d3-a456-426614174000';
    vendorId = '123e4567-e89b-12d3-a456-426614174001';
    adminId = '123e4567-e89b-12d3-a456-426614174002';
    
    // Create mock tokens
    buyerToken = 'buyer-valid-token';
    vendorToken = 'vendor-valid-token';
    adminToken = 'admin-valid-token';
    
    // Reset JWT mock to return valid tokens for each role
    jwt.verify.mockImplementation((token) => {
      if (token.includes('buyer')) {
        return { userId: buyerId, email: 'buyer@example.com', role: 'buyer' };
      }
      if (token.includes('vendor')) {
        return { userId: vendorId, email: 'vendor@example.com', role: 'vendor' };
      }
      if (token.includes('admin')) {
        return { userId: adminId, email: 'admin@example.com', role: 'admin' };
      }
      throw new Error('Invalid token');
    });
    
    // Create mock user instances
    mockBuyer = {
      id: buyerId,
      email: 'buyer@example.com',
      role: 'buyer',
      status: 'active',
      applyAsVendor: jest.fn(),
      isVendor: jest.fn(() => false),
      updateStatus: jest.fn(),
      toJSON: jest.fn(() => ({
        id: buyerId,
        email: 'buyer@example.com',
        role: 'vendor',
        status: 'pending'
      }))
    };
    
    mockVendor = {
      id: vendorId,
      email: 'vendor@example.com',
      role: 'vendor',
      status: 'active',
      businessName: 'Vendor Business 1',
      verification: { businessLicense: true, identity: true },
      address: { coordinates: {} },
      createdAt: new Date(),
      isVendor: jest.fn(() => true),
      updateStatus: jest.fn(),
      updateProfile: jest.fn(),
      toJSON: jest.fn(() => ({
        id: vendorId,
        email: 'vendor@example.com',
        role: 'vendor',
        status: 'active',
        businessName: 'Vendor Business 1',
        verification: { businessLicense: true, identity: true },
        address: { coordinates: {} },
        createdAt: new Date()
      }))
    };
    
    mockAdmin = {
      id: adminId,
      email: 'admin@example.com',
      role: 'admin',
      status: 'active',
      isVendor: jest.fn(() => false),
      updateStatus: jest.fn(),
      toJSON: jest.fn(() => ({
        id: adminId,
        email: 'admin@example.com',
        role: 'admin',
        status: 'active'
      }))
    };
    
    // Mock User model methods
    const User = require('../../src/models/user.model');
    User.findById = jest.fn().mockImplementation((userId) => {
      if (userId === buyerId) return Promise.resolve(mockBuyer);
      if (userId === vendorId) return Promise.resolve(mockVendor);
      if (userId === adminId) return Promise.resolve(mockAdmin);
      return Promise.resolve(null);
    });
    
    const mockVendor2 = {
      id: 'vendor-2',
      role: 'vendor',
      status: 'active',
      businessName: 'Vendor Business 2',
      verification: { businessLicense: false, identity: true },
      address: { coordinates: {} },
      createdAt: new Date(),
      toJSON: () => ({
        id: 'vendor-2',
        role: 'vendor',
        status: 'active',
        businessName: 'Vendor Business 2',
        verification: { businessLicense: false, identity: true },
        address: { coordinates: {} },
        createdAt: new Date()
      })
    };
    
    User.getVendors = jest.fn().mockImplementation((options = {}) => {
      const allVendors = [mockVendor, mockVendor2];
      
      if (options.verified === true) {
        return Promise.resolve([mockVendor]); // Only mockVendor has businessLicense: true
      }
      if (options.verified === false) {
        return Promise.resolve([mockVendor2]); // Only mockVendor2 has businessLicense: false
      }
      
      return Promise.resolve(allVendors);
    });
    
    // Mock ProductService for vendor products
    const ProductService = require('../../src/services/product.service');
    ProductService.getByVendor = jest.fn().mockResolvedValue([
      { id: 'product-1', title: 'Product 1', vendorId },
      { id: 'product-2', title: 'Product 2', vendorId }
    ]);
    
    // Mock user lookup queries for auth middleware
    db.query.mockImplementation((query, params) => {
      const queryLower = query.toLowerCase();
      
      // User lookup for auth middleware
      if (queryLower.includes('select') && queryLower.includes('users') && params && params[0]) {
        const userId = params[0];
        if (userId === buyerId) {
          return Promise.resolve({
            rows: [{
              id: buyerId,
              email: 'buyer@example.com',
              role: 'buyer',
              status: 'active'
            }]
          });
        }
        if (userId === vendorId) {
          return Promise.resolve({
            rows: [{
              id: vendorId,
              email: 'vendor@example.com',
              role: 'vendor',
              status: 'active'
            }]
          });
        }
        if (userId === adminId) {
          return Promise.resolve({
            rows: [{
              id: adminId,
              email: 'admin@example.com',
              role: 'admin',
              status: 'active'
            }]
          });
        }
      }
      
      return Promise.resolve({ rows: [] });
    });
  });

  describe('POST /api/vendors/apply', () => {
    it('should allow buyer to apply as vendor', async () => {
      // Setup the applyAsVendor mock to succeed
      mockBuyer.applyAsVendor.mockResolvedValueOnce(mockBuyer);
      
      const response = await request(app)
        .post('/api/vendors/apply')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          businessName: 'My Business',
          nationalId: 'ID123456'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Vendor application submitted successfully');
      expect(mockBuyer.applyAsVendor).toHaveBeenCalledWith({
        businessName: 'My Business',
        nationalId: 'ID123456'
      });
    });

    it('should require business name and national ID', async () => {
      const response = await request(app)
        .post('/api/vendors/apply')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          businessName: 'My Business'
          // Missing nationalId
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Business name and national ID are required');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/vendors/apply')
        .send({
          businessName: 'My Business',
          nationalId: 'ID123456'
        });

      expect(response.status).toBe(401);
      expect(response.body.message).toContain('No token provided');
    });
  });

  describe('GET /api/vendors', () => {
    it('should get list of vendors', async () => {
      db.query.mockResolvedValueOnce({
        rows: [
          {
            id: vendorId,
            role: 'vendor',
            status: 'active',
            business_name: 'Vendor Business 1',
            identity_verified: true,
            business_license_verified: true,
            created_at: new Date()
          },
          {
            id: 'vendor-2',
            role: 'vendor', 
            status: 'active',
            business_name: 'Vendor Business 2',
            identity_verified: true,
            business_license_verified: false,
            created_at: new Date()
          }
        ]
      });

      const response = await request(app)
        .get('/api/vendors');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.vendors).toHaveLength(2);
      expect(response.body.data.pagination).toBeDefined();
    });

    it('should filter verified vendors', async () => {
      db.query.mockResolvedValueOnce({
        rows: [
          {
            id: vendorId,
            role: 'vendor',
            status: 'active',
            business_name: 'Verified Vendor',
            identity_verified: true,
            business_license_verified: true,
            created_at: new Date()
          }
        ]
      });

      const response = await request(app)
        .get('/api/vendors?verified=true');

      expect(response.status).toBe(200);
      expect(response.body.data.vendors).toHaveLength(1);
      expect(response.body.data.vendors[0].businessName).toBe('Verified Vendor');
    });
  });

  describe('GET /api/vendors/:id', () => {
    it('should get vendor profile', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{
          id: vendorId,
          role: 'vendor',
          status: 'active',
          business_name: 'Test Vendor',
          first_name: 'John',
          last_name: 'Doe',
          identity_verified: true,
          business_license_verified: true,
          created_at: new Date()
        }]
      });

      const response = await request(app)
        .get(`/api/vendors/${vendorId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.vendor.businessName).toBe('Test Vendor');
      expect(response.body.data.vendor.id).toBe(vendorId);
    });

    it('should return 404 for non-vendor user', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{
          id: buyerId,
          role: 'buyer',
          status: 'active'
        }]
      });

      const response = await request(app)
        .get(`/api/vendors/${buyerId}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toContain('Vendor not found');
    });
  });

  describe('GET /api/vendors/:id/products', () => {
    it('should get vendor products', async () => {
      db.query
        // Mock vendor lookup
        .mockResolvedValueOnce({
          rows: [{
            id: vendorId,
            role: 'vendor',
            business_name: 'Test Vendor',
            first_name: 'John',
            last_name: 'Doe'
          }]
        })
        // Mock vendor products
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'product-1',
              vendor_id: vendorId,
              title: 'Product 1',
              price: '29.99',
              status: 'active',
              created_at: new Date()
            },
            {
              id: 'product-2',
              vendor_id: vendorId,
              title: 'Product 2',
              price: '39.99',
              status: 'active',
              created_at: new Date()
            }
          ]
        })
        // Mock count
        .mockResolvedValueOnce({
          rows: [{ total: '2' }]
        });

      const response = await request(app)
        .get(`/api/vendors/${vendorId}/products`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.products).toHaveLength(2);
      expect(response.body.data.vendor.businessName).toBe('Test Vendor');
    });
  });

  describe('GET /api/vendors/me/dashboard', () => {
    it('should get vendor dashboard', async () => {
      db.query
        // Mock user lookup
        .mockResolvedValueOnce({
          rows: [{
            id: vendorId,
            role: 'vendor',
            status: 'active',
            business_name: 'My Business'
          }]
        })
        // Mock product stats
        .mockResolvedValueOnce({
          rows: [{
            active_products: '5',
            draft_products: '2',
            archived_products: '1',
            total_products: '8',
            average_price: '45.50',
            total_inventory: '150'
          }]
        })
        // Mock recent products
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'product-1',
              vendor_id: vendorId,
              title: 'Recent Product',
              status: 'active',
              created_at: new Date()
            }
          ]
        })
        // Mock count for pagination
        .mockResolvedValueOnce({
          rows: [{ total: '1' }]
        });

      const response = await request(app)
        .get('/api/vendors/me/dashboard')
        .set('Authorization', `Bearer ${vendorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.vendor.businessName).toBe('My Business');
      expect(response.body.data.stats.products.totalProducts).toBe(8);
      expect(response.body.data.recentProducts).toHaveLength(1);
    });

    it('should fail for non-vendor', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{
          id: buyerId,
          role: 'buyer',
          status: 'active'
        }]
      });

      const response = await request(app)
        .get('/api/vendors/me/dashboard')
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('Access denied. Vendors only.');
    });
  });

  describe('PUT /api/vendors/me/profile', () => {
    it('should update vendor profile', async () => {
      db.query
        // Mock user lookup
        .mockResolvedValueOnce({
          rows: [{
            id: vendorId,
            role: 'vendor',
            status: 'active',
            business_name: 'Old Business Name'
          }]
        })
        // Mock profile update
        .mockResolvedValueOnce({
          rows: [{
            id: vendorId,
            role: 'vendor',
            business_name: 'New Business Name',
            first_name: 'John',
            last_name: 'Doe Updated',
            updated_at: new Date()
          }]
        });

      const response = await request(app)
        .put('/api/vendors/me/profile')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({
          businessName: 'New Business Name',
          lastName: 'Doe Updated'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Profile updated successfully');
    });

    it('should fail for non-vendor', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{
          id: buyerId,
          role: 'buyer',
          status: 'active'
        }]
      });

      const response = await request(app)
        .put('/api/vendors/me/profile')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          businessName: 'New Business Name'
        });

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('Only vendors can update vendor profile');
    });
  });

  describe('PUT /api/vendors/:id/approve', () => {
    it('should approve vendor (admin only)', async () => {
      db.query
        // Mock admin lookup
        .mockResolvedValueOnce({
          rows: [{
            id: adminId,
            role: 'admin',
            status: 'active'
          }]
        })
        // Mock vendor lookup
        .mockResolvedValueOnce({
          rows: [{
            id: vendorId,
            role: 'vendor',
            status: 'pending',
            business_name: 'Pending Vendor'
          }]
        })
        // Mock status update
        .mockResolvedValueOnce({
          rows: [{
            id: vendorId,
            role: 'vendor',
            status: 'active',
            business_name: 'Pending Vendor'
          }]
        })
        // Mock identity verification
        .mockResolvedValueOnce({
          rows: [{
            id: vendorId,
            identity_verified: true
          }]
        })
        // Mock business license verification
        .mockResolvedValueOnce({
          rows: [{
            id: vendorId,
            business_license_verified: true
          }]
        });

      const response = await request(app)
        .put(`/api/vendors/${vendorId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Vendor approved successfully');
    });

    it('should fail for non-admin', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{
          id: vendorId,
          role: 'vendor',
          status: 'active'
        }]
      });

      const response = await request(app)
        .put(`/api/vendors/${vendorId}/approve`)
        .set('Authorization', `Bearer ${vendorToken}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('Admin access required');
    });
  });

  describe('PUT /api/vendors/:id/suspend', () => {
    it('should suspend vendor (admin only)', async () => {
      db.query
        // Mock admin lookup
        .mockResolvedValueOnce({
          rows: [{
            id: adminId,
            role: 'admin',
            status: 'active'
          }]
        })
        // Mock vendor lookup
        .mockResolvedValueOnce({
          rows: [{
            id: vendorId,
            role: 'vendor',
            status: 'active',
            business_name: 'Active Vendor'
          }]
        })
        // Mock status update
        .mockResolvedValueOnce({
          rows: [{
            id: vendorId,
            status: 'suspended'
          }]
        });

      const response = await request(app)
        .put(`/api/vendors/${vendorId}/suspend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reason: 'Policy violation'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Vendor suspended successfully');
      expect(response.body.data.reason).toBe('Policy violation');
    });

    it('should fail for non-admin', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{
          id: buyerId,
          role: 'buyer',
          status: 'active'
        }]
      });

      const response = await request(app)
        .put(`/api/vendors/${vendorId}/suspend`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          reason: 'Some reason'
        });

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('Admin access required');
    });
  });
});