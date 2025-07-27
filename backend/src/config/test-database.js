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
    // Add test users with password hash for 'Test123!'
    const passwordHash = '$2b$10$IeoN8LjhjFQhdVPJgzmKo.zCIy/9I37UqrpXU04ufk/ShMa7m5NQ6';
    this.tables.users = [
      {
        id: 1,
        first_name: 'Test',
        last_name: 'Admin',
        email: 'admin01@test.com',
        password: passwordHash,
        role: 'admin',
        status: 'active',
        created_at: new Date().toISOString()
      },
      {
        id: 2,
        first_name: 'Test',
        last_name: 'Vendor',
        email: 'vendor01@test.com',
        password: passwordHash,
        role: 'vendor',
        status: 'active',
        created_at: new Date().toISOString()
      },
      {
        id: 3,
        first_name: 'Test',
        last_name: 'Buyer',
        email: 'buyer01@test.com',
        password: passwordHash,
        role: 'buyer',
        status: 'active',
        created_at: new Date().toISOString()
      },
      {
        id: 4,
        first_name: 'Test',
        last_name: 'Driver',
        email: 'driver01@test.com',
        password: passwordHash,
        role: 'driver',
        status: 'active',
        created_at: new Date().toISOString()
      }
    ];

    // Add test products
    this.tables.products = [
      {
        id: 1,
        title: 'Traditional Burkina Fabric',
        description: 'Tissu traditionnel burkinabé aux motifs authentiques, idéal pour confectionner des vêtements élégants',
        price: 25000,
        compare_at_price: 30000,
        currency: 'XOF',
        category: 'fashion',
        vendor_id: 2,
        tags: JSON.stringify(['traditionnel', 'tissu', 'made-in-burkina']),
        images: JSON.stringify([]),
        quantity: 50,
        track_inventory: true,
        allow_backorder: false,
        shipping_price: 2500,
        free_shipping: false,
        status: 'active',
        metadata: JSON.stringify({}),
        created_at: new Date().toISOString()
      },
      {
        id: 2,
        title: 'Beurre de Karité Bio',
        description: 'Beurre de karité 100% naturel et bio, produit localement. Excellent pour la peau et les cheveux',
        price: 15000,
        currency: 'XOF',
        category: 'beauty',
        vendor_id: 2,
        tags: JSON.stringify(['bio', 'naturel', 'beauté', 'karité']),
        images: JSON.stringify([]),
        quantity: 100,
        track_inventory: true,
        allow_backorder: false,
        shipping_price: 2500,
        free_shipping: false,
        status: 'active',
        metadata: JSON.stringify({}),
        created_at: new Date().toISOString()
      },
      {
        id: 3,
        title: 'Panier en Osier Artisanal',
        description: 'Magnifique panier tissé à la main par nos artisans locaux. Parfait pour le marché ou la décoration',
        price: 8000,
        currency: 'XOF',
        category: 'crafts',
        vendor_id: 2,
        tags: JSON.stringify(['artisanal', 'osier', 'fait-main', 'décoration']),
        images: JSON.stringify([]),
        quantity: 25,
        track_inventory: true,
        allow_backorder: false,
        shipping_price: 2500,
        free_shipping: false,
        status: 'active',
        metadata: JSON.stringify({}),
        created_at: new Date().toISOString()
      },
      {
        id: 4,
        title: 'Mil Local Premium',
        description: 'Mil de haute qualité cultivé localement. Idéal pour préparer le tô et autres plats traditionnels',
        price: 3500,
        currency: 'XOF',
        category: 'food',
        vendor_id: 2,
        tags: JSON.stringify(['mil', 'céréale', 'local', 'bio']),
        images: JSON.stringify([]),
        quantity: 200,
        track_inventory: true,
        allow_backorder: false,
        shipping_price: 2500,
        free_shipping: false,
        status: 'active',
        metadata: JSON.stringify({}),
        created_at: new Date().toISOString()
      },
      {
        id: 5,
        title: 'Collier Perles Africaines',
        description: 'Collier artisanal en perles traditionnelles africaines. Accessoire unique et authentique',
        price: 12000,
        compare_at_price: 15000,
        currency: 'XOF',
        category: 'fashion',
        vendor_id: 2,
        tags: JSON.stringify(['bijoux', 'perles', 'artisanal', 'africain']),
        images: JSON.stringify([]),
        quantity: 15,
        track_inventory: true,
        allow_backorder: false,
        shipping_price: 2500,
        free_shipping: false,
        status: 'active',
        metadata: JSON.stringify({}),
        created_at: new Date().toISOString()
      },
      {
        id: 6,
        title: 'Savon Noir Naturel',
        description: 'Savon noir traditionnel 100% naturel, excellent pour tous types de peau',
        price: 2000,
        currency: 'XOF',
        category: 'beauty',
        vendor_id: 2,
        tags: JSON.stringify(['savon', 'naturel', 'traditionnel', 'beauté']),
        images: JSON.stringify([]),
        quantity: 80,
        track_inventory: true,
        allow_backorder: false,
        shipping_price: 2500,
        free_shipping: false,
        status: 'active',
        metadata: JSON.stringify({}),
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
