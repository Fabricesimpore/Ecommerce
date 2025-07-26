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
    // Mock password validation - always return true for testing
    return password === 'password123';
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
    return new MockUser({
      id: `user-${Date.now()}`,
      email,
      role: 'buyer',
      firstName: 'Test',
      lastName: 'User'
    });
  }

  static async findByPhone(phone) {
    return new MockUser({
      id: `user-${Date.now()}`,
      phone,
      role: 'buyer',
      firstName: 'Test',
      lastName: 'User'
    });
  }

  async save() {
    return this;
  }

  toJSON() {
    const { password, ...userWithoutPassword } = this;
    return userWithoutPassword;
  }
}

module.exports = MockUser;
