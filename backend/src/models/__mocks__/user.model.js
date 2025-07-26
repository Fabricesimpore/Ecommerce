// Mock User class with proper methods
class MockUser {
  constructor(data) {
    Object.assign(this, data);
    this.id = data.id || `user-${Date.now()}-${Math.random()}`;
    this.status = data.status || 'active';
    this.password = data.password || '$2b$10$mockHashedPassword';
  }

  async updateStatus(status) {
    this.status = status;
    return this;
  }

  async validatePassword(password) {
    // Mock password validation - use bcrypt for consistency
    const bcrypt = require('bcrypt');
    return await bcrypt.compare(password, this.password || '$2b$10$mockHashedPassword');
  }

  async updateLastLogin() {
    // Mock update last login - just update the timestamp
    this.lastLogin = new Date();
    return this;
  }

  static async create(userData) {
    const user = new MockUser(userData);
    return user;
  }

  static async findById(id) {
    // Return a mock user for testing
    return new MockUser({
      id,
      email: 'test@example.com',
      role: 'buyer',
      firstName: 'Test',
      lastName: 'User'
    });
  }

  static async findByEmail(email) {
    if (email === 'buyer@test.com') {
      return new MockUser({
        id: '123e4567-e89b-12d3-a456-426614174000',
        email,
        role: 'buyer',
        firstName: 'Test',
        lastName: 'Buyer',
        status: 'active'
      });
    }
    if (email === 'vendor@test.com') {
      return new MockUser({
        id: '123e4567-e89b-12d3-a456-426614174001',
        email,
        role: 'vendor',
        firstName: 'Test',
        lastName: 'Vendor',
        businessName: 'Test Store',
        status: 'active'
      });
    }
    if (email === 'admin@test.com') {
      return new MockUser({
        id: '123e4567-e89b-12d3-a456-426614174002',
        email,
        role: 'admin',
        firstName: 'Test',
        lastName: 'Admin',
        status: 'active'
      });
    }
    return null; // User not found
  }

  static async findByPhone(phone) {
    if (phone === '+22670000001') {
      return new MockUser({
        id: '123e4567-e89b-12d3-a456-426614174000',
        phone,
        email: 'buyer@test.com',
        role: 'buyer',
        firstName: 'Test',
        lastName: 'Buyer',
        status: 'active'
      });
    }
    if (phone === '+22670000002') {
      return new MockUser({
        id: '123e4567-e89b-12d3-a456-426614174001',
        phone,
        email: 'vendor@test.com',
        role: 'vendor',
        firstName: 'Test',
        lastName: 'Vendor',
        status: 'active'
      });
    }
    return null; // User not found
  }

  async save() {
    return this;
  }

  toJSON() {
    // eslint-disable-next-line no-unused-vars
    const { password, ...userWithoutPassword } = this;
    return userWithoutPassword;
  }
}

module.exports = MockUser;
