/**
 * Mock Database for Testing
 * Simulates database operations without requiring PostgreSQL
 */

class MockDatabase {
  constructor() {
    this.tables = {
      users: [],
      products: [],
      orders: [],
      payments: [],
      deliveries: [],
      cart_items: [],
      event_logs: [],
      fraud_incidents: [],
      user_behavior_tracking: [],
      analytics_cache: []
    };
    this.idCounters = {};
  }

  // Generate unique ID for a table
  generateId(tableName) {
    if (!this.idCounters[tableName]) {
      this.idCounters[tableName] = 1;
    }
    this.idCounters[tableName] += 1;
    return this.idCounters[tableName] - 1;
  }

  // Mock query method
  async query(text, params = []) {
    if (process.env.NODE_ENV !== 'test') {
      // eslint-disable-next-line no-console
      console.log(`Mock DB Query: ${text}`);
      // eslint-disable-next-line no-console
      console.log('Params:', params);
    }

    // Simple pattern matching for common queries
    const textLower = text.toLowerCase().trim();

    // Handle SELECT queries
    if (textLower.startsWith('select')) {
      if (textLower.includes('users')) {
        // Handle email/phone lookups
        if (params.length > 0) {
          const email = params[0];
          const user = this.tables.users.find((u) => u.email === email || u.phone === email);
          return { rows: user ? [user] : [] };
        }
        return { rows: this.tables.users };
      }
      if (textLower.includes('products')) {
        return { rows: this.tables.products };
      }
      if (textLower.includes('orders')) {
        return { rows: this.tables.orders };
      }
      if (textLower.includes('payments')) {
        return { rows: this.tables.payments };
      }
      if (textLower.includes('event_logs')) {
        return { rows: this.tables.event_logs };
      }
      // Default: return empty result
      return { rows: [] };
    }

    // Handle INSERT queries
    if (textLower.startsWith('insert')) {
      const tableName = this.extractTableName(text);
      if (tableName && this.tables[tableName]) {
        const id = this.generateId(tableName);
        const newRecord = { id, ...this.createMockRecord(tableName, params) };
        this.tables[tableName].push(newRecord);
        return { rows: [newRecord], insertId: id };
      }
      return { rows: [], insertId: 1 };
    }

    // Handle UPDATE queries
    if (textLower.startsWith('update')) {
      const tableName = this.extractTableName(text);
      if (tableName && this.tables[tableName]) {
        // Simple update - just return success
        return { rows: [{ id: 1 }], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    }

    // Handle DELETE queries
    if (textLower.startsWith('delete')) {
      return { rows: [], rowCount: 0 };
    }

    // Default response
    return { rows: [] };
  }

  // eslint-disable-next-line class-methods-use-this
  extractTableName(query) {
    const match = query.match(/(?:from|into|update)\s+(\w+)/i);
    return match ? match[1] : null;
  }

  // eslint-disable-next-line class-methods-use-this
  createMockRecord(tableName, params) {
    const timestamp = new Date().toISOString();

    switch (tableName) {
      case 'users': {
        // Use params for user data if provided
        // eslint-disable-next-line camelcase
        const [first_name, last_name, email, phone, password_hash, role] = params || [];
        return {
          // eslint-disable-next-line camelcase
          first_name: first_name || 'Test',
          // eslint-disable-next-line camelcase
          last_name: last_name || 'User',
          email: email || 'test@example.com',
          phone: phone || '+22670000000',
          // eslint-disable-next-line camelcase
          password_hash: password_hash || '$2b$10$hashedpassword',
          role: role || 'buyer',
          status: 'active',
          created_at: timestamp,
          updated_at: timestamp
        };
      }

      case 'products':
        return {
          name: 'Test Product',
          description: 'Test Description',
          price: 10000,
          category: 'test',
          vendor_id: 1,
          inventory_quantity: 100,
          status: 'active',
          created_at: timestamp,
          updated_at: timestamp
        };

      case 'orders':
        return {
          buyer_id: 1,
          status: 'pending',
          total_amount: 25000,
          shipping_address: JSON.stringify({}),
          created_at: timestamp,
          updated_at: timestamp
        };

      case 'payments':
        return {
          order_id: 1,
          payment_method: 'orange_money',
          amount: 25000,
          status: 'pending',
          created_at: timestamp,
          updated_at: timestamp
        };

      case 'event_logs':
        return {
          event_type: 'test_event',
          event_category: 'system',
          actor_type: 'user',
          event_data: JSON.stringify({}),
          created_at: timestamp
        };

      default:
        return {
          created_at: timestamp,
          updated_at: timestamp
        };
    }
  }

  // Helper method to add test data
  addTestData() {
    // Add test users
    this.tables.users = [
      {
        id: 1,
        first_name: 'Test',
        last_name: 'Admin',
        email: 'admin01@test.com',
        role: 'admin',
        status: 'active',
        created_at: new Date().toISOString()
      },
      {
        id: 2,
        first_name: 'Test',
        last_name: 'Vendor',
        email: 'vendor01@test.com',
        role: 'vendor',
        status: 'active',
        created_at: new Date().toISOString()
      },
      {
        id: 3,
        first_name: 'Test',
        last_name: 'Buyer',
        email: 'buyer01@test.com',
        role: 'buyer',
        status: 'active',
        created_at: new Date().toISOString()
      },
      {
        id: 4,
        first_name: 'Test',
        last_name: 'Driver',
        email: 'driver01@test.com',
        role: 'driver',
        status: 'active',
        created_at: new Date().toISOString()
      }
    ];

    // Add test products
    this.tables.products = [
      {
        id: 1,
        name: 'Traditional Burkina Fabric',
        description: 'Beautiful fabric',
        price: 25000,
        category: 'fashion',
        vendor_id: 2,
        inventory_quantity: 50,
        status: 'active',
        created_at: new Date().toISOString()
      },
      {
        id: 2,
        name: 'Shea Butter - Pure Organic',
        description: 'Organic shea butter',
        price: 15000,
        category: 'beauty',
        vendor_id: 2,
        inventory_quantity: 100,
        status: 'active',
        created_at: new Date().toISOString()
      }
    ];

    // eslint-disable-next-line no-console
    console.log('✅ Mock test data loaded');
  }

  // Get client method for compatibility
  async getClient() {
    return {
      query: this.query.bind(this),
      release: () => {}
    };
  }
}

// Create singleton instance
const mockDb = new MockDatabase();

// Initialize with test data
mockDb.addTestData();

module.exports = {
  pool: mockDb,
  query: mockDb.query.bind(mockDb),
  getClient: mockDb.getClient.bind(mockDb)
};
