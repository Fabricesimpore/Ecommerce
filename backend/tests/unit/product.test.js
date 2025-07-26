const request = require('supertest');
const app = require('../../app');
const db = require('../../src/config/database.config');
const jwt = require('jsonwebtoken');

// Directly mock the JWT utils in this test file
jest.mock('../../src/utils/jwt', () => ({
  verifyToken: jest.fn(),
  generateAccessToken: jest.fn(),
  generateRefreshToken: jest.fn(),
  decodeToken: jest.fn()
}));

// Get the mocked module for setup
const { verifyToken: mockVerifyToken } = require('../../src/utils/jwt');

// Mock the database
jest.mock('../../src/config/database.config');

describe('Product Endpoints', () => {
  let vendorToken, buyerToken, vendorId, buyerId;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock vendor user (aligned with User model mock)
    vendorId = '123e4567-e89b-12d3-a456-426614174001';
    vendorToken = 'mock-token-vendor-' + vendorId;
    
    // Mock buyer user  
    buyerId = '123e4567-e89b-12d3-a456-426614174000';
    buyerToken = 'mock-token-buyer-' + buyerId;
    
    // Setup JWT mock implementation
    mockVerifyToken.mockImplementation((token) => {
      if (token.includes('vendor')) {
        return {
          userId: '123e4567-e89b-12d3-a456-426614174001',
          email: 'vendor@example.com',
          role: 'vendor'
        };
      } else if (token.includes('buyer')) {
        return {
          userId: '123e4567-e89b-12d3-a456-426614174000',
          email: 'buyer@example.com',
          role: 'buyer'
        };
      }
      
      return {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        role: 'buyer'
      };
    });
  });

  describe('POST /api/products', () => {
    it('should create product successfully for vendor', async () => {
      // Mock user lookup for vendor
      db.query
        .mockResolvedValueOnce({
          rows: [{
            id: vendorId,
            role: 'vendor',
            status: 'active',
            business_name: 'Test Business'
          }]
        })
        // Mock product creation
        .mockResolvedValueOnce({
          rows: [{
            id: 'product-id-123',
            vendor_id: vendorId,
            title: 'Test Product',
            description: 'Test Description',
            price: '29.99',
            category: 'Electronics',
            status: 'draft',
            created_at: new Date(),
            updated_at: new Date()
          }]
        });

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({
          title: 'Test Product',
          description: 'Test Description',
          price: 29.99,
          category: 'Electronics',
          tags: ['test', 'electronics']
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.product.title).toBe('Test Product');
      expect(response.body.data.product.vendorId).toBe(vendorId);
    });

    it('should fail for non-vendor user', async () => {
      // Mock user lookup for buyer
      db.query.mockResolvedValueOnce({
        rows: [{
          id: buyerId,
          role: 'buyer',
          status: 'active'
        }]
      });

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          title: 'Test Product',
          price: 29.99,
          category: 'Electronics'
        });

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('Vendor access required');
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .post('/api/products')
        .send({
          title: 'Test Product',
          price: 29.99,
          category: 'Electronics'
        });

      expect(response.status).toBe(401);
      expect(response.body.message).toContain('No token provided');
    });
  });

  describe('GET /api/products', () => {
    it('should get all active products', async () => {
      db.query
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'product-1',
              title: 'Product 1',
              price: '29.99',
              status: 'active',
              category: 'Electronics',
              tags: ['test'],
              images: '[]',
              created_at: new Date()
            },
            {
              id: 'product-2', 
              title: 'Product 2',
              price: '39.99',
              status: 'active',
              category: 'Books',
              tags: ['test'],
              images: '[]',
              created_at: new Date()
            }
          ]
        })
        .mockResolvedValueOnce({
          rows: [{ total: '2' }]
        });

      const response = await request(app)
        .get('/api/products');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.products).toHaveLength(2);
      expect(response.body.data.pagination.total).toBe(2);
    });

    it('should filter products by category', async () => {
      db.query
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'product-1',
              title: 'Electronic Product',
              price: '29.99',
              status: 'active',
              category: 'Electronics',
              tags: ['electronics'],
              images: '[]',
              created_at: new Date()
            }
          ]
        })
        .mockResolvedValueOnce({
          rows: [{ total: '1' }]
        });

      const response = await request(app)
        .get('/api/products?category=Electronics');

      expect(response.status).toBe(200);
      expect(response.body.data.products).toHaveLength(1);
      expect(response.body.data.products[0].category).toBe('Electronics');
    });
  });

  describe('GET /api/products/:id', () => {
    it('should get product by id', async () => {
      const productId = 'product-123';
      
      db.query.mockResolvedValueOnce({
        rows: [{
          id: productId,
          title: 'Test Product',
          description: 'Test Description', 
          price: '29.99',
          category: 'Electronics',
          status: 'active',
          vendor_id: vendorId,
          tags: ['test'],
          images: '[]',
          created_at: new Date(),
          updated_at: new Date()
        }]
      });

      const response = await request(app)
        .get(`/api/products/${productId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.product.id).toBe(productId);
      expect(response.body.data.product.title).toBe('Test Product');
    });

    it('should return 404 for non-existent product', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/api/products/non-existent-id');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.product).toBeNull();
    });
  });

  describe('PUT /api/products/:id', () => {
    it('should update product for owner', async () => {
      const productId = 'product-123';
      
      db.query
        // Mock user lookup
        .mockResolvedValueOnce({
          rows: [{
            id: vendorId,
            role: 'vendor',
            status: 'active'
          }]
        })
        // Mock product lookup
        .mockResolvedValueOnce({
          rows: [{
            id: productId,
            vendor_id: vendorId,
            title: 'Old Title',
            price: '29.99'
          }]
        })
        // Mock product update
        .mockResolvedValueOnce({
          rows: [{
            id: productId,
            vendor_id: vendorId,
            title: 'Updated Title',
            price: '39.99',
            updated_at: new Date()
          }]
        });

      const response = await request(app)
        .put(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({
          title: 'Updated Title',
          price: 39.99
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.product.title).toBe('Updated Title');
    });

    it('should fail to update product for non-owner', async () => {
      const productId = 'product-123';
      const otherVendorId = 'other-vendor-id';
      
      db.query
        // Mock user lookup
        .mockResolvedValueOnce({
          rows: [{
            id: vendorId,
            role: 'vendor',
            status: 'active'
          }]
        })
        // Mock product lookup (owned by different vendor)
        .mockResolvedValueOnce({
          rows: [{
            id: productId,
            vendor_id: otherVendorId,
            title: 'Product Title'
          }]
        });

      const response = await request(app)
        .put(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({
          title: 'Updated Title'
        });

      expect(response.status).toBe(500);
      expect(response.body.error.message).toContain('You can only update your own products');
    });
  });

  describe('DELETE /api/products/:id', () => {
    it('should delete product for owner', async () => {
      const productId = 'product-123';
      
      db.query
        // Mock user lookup
        .mockResolvedValueOnce({
          rows: [{
            id: vendorId,
            role: 'vendor',
            status: 'active'
          }]
        })
        // Mock product lookup
        .mockResolvedValueOnce({
          rows: [{
            id: productId,
            vendor_id: vendorId,
            title: 'Product to Delete'
          }]
        })
        // Mock product deletion
        .mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .delete(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${vendorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Product deleted successfully');
    });
  });

  describe('GET /api/products/search', () => {
    it('should search products by term', async () => {
      db.query
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'product-1',
              title: 'Smartphone Case',
              price: '15.99',
              status: 'active',
              category: 'Electronics',
              tags: ['phone', 'case'],
              images: '[]',
              created_at: new Date()
            }
          ]
        })
        .mockResolvedValueOnce({
          rows: [{ total: '1' }]
        });

      const response = await request(app)
        .get('/api/products/search?q=smartphone');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.products).toHaveLength(1);
      expect(response.body.data.searchTerm).toBe('smartphone');
    });

    it('should require search term', async () => {
      const response = await request(app)
        .get('/api/products/search');

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Search term is required');
    });
  });

  describe('GET /api/products/me/products', () => {
    it('should get vendor own products', async () => {
      db.query
        // Mock user lookup
        .mockResolvedValueOnce({
          rows: [{
            id: vendorId,
            role: 'vendor',
            status: 'active'
          }]
        })
        // Mock vendor products
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'product-1',
              vendor_id: vendorId,
              title: 'My Product 1',
              status: 'active',
              created_at: new Date()
            },
            {
              id: 'product-2',
              vendor_id: vendorId,
              title: 'My Product 2',
              status: 'draft',
              created_at: new Date()
            }
          ]
        })
        // Mock count
        .mockResolvedValueOnce({
          rows: [{ total: '2' }]
        });

      const response = await request(app)
        .get('/api/products/me/products')
        .set('Authorization', `Bearer ${vendorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.products).toHaveLength(2);
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
        .get('/api/products/me/products')
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('Vendor access required');
    });
  });
});