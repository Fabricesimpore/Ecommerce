const bcrypt = require('bcrypt');
const db = require('../config/database.config');

class User {
  constructor(data) {
    this.id = data.id;
    this.email = data.email;
    this.phone = data.phone;
    this.password = data.password;
    this.role = data.role;
    this.firstName = data.first_name;
    this.lastName = data.last_name;
    this.businessName = data.business_name;
    this.nationalId = data.national_id;
    this.address = {
      street: data.address_street,
      city: data.address_city,
      region: data.address_region,
      coordinates: {
        lat: data.address_lat,
        lng: data.address_lng
      }
    };
    this.verification = {
      email: data.email_verified,
      phone: data.phone_verified,
      identity: data.identity_verified,
      businessLicense: data.business_license_verified
    };
    this.status = data.status;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
    this.lastLoginAt = data.last_login_at;
  }

  static async create(userData) {
    const {
      email,
      phone,
      password,
      role,
      firstName,
      lastName,
      businessName,
      nationalId
    } = userData;

    const hashedPassword = await bcrypt.hash(password, 10);

    const query = `
      INSERT INTO users (
        email, phone, password, role, 
        first_name, last_name, business_name, national_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const values = [
      email.toLowerCase(),
      phone,
      hashedPassword,
      role,
      firstName,
      lastName,
      businessName,
      nationalId
    ];

    try {
      const { rows } = await db.query(query, values);
      return new User(rows[0]);
    } catch (error) {
      if (error.code === '23505') { // Unique violation
        if (error.constraint === 'users_email_key') {
          throw new Error('Email already exists');
        }
        if (error.constraint === 'users_phone_key') {
          throw new Error('Phone number already exists');
        }
      }
      throw error;
    }
  }

  static async findById(id) {
    const query = 'SELECT * FROM users WHERE id = $1';
    const { rows } = await db.query(query, [id]);
    return rows.length ? new User(rows[0]) : null;
  }

  static async findByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = $1';
    const { rows } = await db.query(query, [email.toLowerCase()]);
    return rows.length ? new User(rows[0]) : null;
  }

  static async findByPhone(phone) {
    const query = 'SELECT * FROM users WHERE phone = $1';
    const { rows } = await db.query(query, [phone]);
    return rows.length ? new User(rows[0]) : null;
  }

  async validatePassword(password) {
    return bcrypt.compare(password, this.password);
  }

  async updateLastLogin() {
    const query = 'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1';
    await db.query(query, [this.id]);
    this.lastLoginAt = new Date();
  }

  async updateStatus(status) {
    const query = 'UPDATE users SET status = $1 WHERE id = $2 RETURNING *';
    const { rows } = await db.query(query, [status, this.id]);
    Object.assign(this, new User(rows[0]));
    return this;
  }

  async update(updates) {
    const allowedUpdates = [
      'first_name', 'last_name', 'business_name',
      'address_street', 'address_city', 'address_region',
      'address_lat', 'address_lng'
    ];

    const updateFields = [];
    const values = [];
    let paramCount = 1;

    Object.keys(updates).forEach((key) => {
      if (allowedUpdates.includes(key)) {
        updateFields.push(`${key} = $${paramCount}`);
        values.push(updates[key]);
        paramCount++;
      }
    });

    if (updateFields.length === 0) {
      return this;
    }

    values.push(this.id);
    const query = `
      UPDATE users 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const { rows } = await db.query(query, values);
    Object.assign(this, new User(rows[0]));
    return this;
  }

  async verifyEmail() {
    const query = 'UPDATE users SET email_verified = TRUE WHERE id = $1 RETURNING *';
    const { rows } = await db.query(query, [this.id]);
    Object.assign(this, new User(rows[0]));
    return this;
  }

  async verifyPhone() {
    const query = 'UPDATE users SET phone_verified = TRUE WHERE id = $1 RETURNING *';
    const { rows } = await db.query(query, [this.id]);
    Object.assign(this, new User(rows[0]));
    return this;
  }

  async verifyIdentity() {
    const query = 'UPDATE users SET identity_verified = TRUE WHERE id = $1 RETURNING *';
    const { rows } = await db.query(query, [this.id]);
    Object.assign(this, new User(rows[0]));
    return this;
  }

  async verifyBusinessLicense() {
    if (this.role !== 'vendor') {
      throw new Error('Only vendors can have business license verified');
    }
    const query = 'UPDATE users SET business_license_verified = TRUE WHERE id = $1 RETURNING *';
    const { rows } = await db.query(query, [this.id]);
    Object.assign(this, new User(rows[0]));
    return this;
  }

  isVendor() {
    return this.role === 'vendor';
  }

  isVerifiedVendor() {
    return this.role === 'vendor'
           && this.status === 'active'
           && this.verification.identity
           && this.verification.businessLicense;
  }

  canManageProducts() {
    return this.isVendor() && this.status === 'active';
  }

  async applyAsVendor(vendorData) {
    if (this.role !== 'buyer') {
      throw new Error('Only buyers can apply to become vendors');
    }

    const { businessName, nationalId } = vendorData;

    if (!businessName || !nationalId) {
      throw new Error('Business name and national ID are required');
    }

    const query = `
      UPDATE users 
      SET role = 'vendor', 
          business_name = $1, 
          national_id = $2,
          status = 'pending'
      WHERE id = $3
      RETURNING *
    `;

    const { rows } = await db.query(query, [businessName, nationalId, this.id]);
    Object.assign(this, new User(rows[0]));
    return this;
  }

  static async getVendors(options = {}) {
    const {
      status = 'active',
      verified = null,
      limit = 50,
      offset = 0
    } = options;

    let query = "SELECT * FROM users WHERE role = 'vendor'";
    const values = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      query += ` AND status = $${paramCount}`;
      values.push(status);
    }

    if (verified === true) {
      query += ' AND identity_verified = TRUE AND business_license_verified = TRUE';
    } else if (verified === false) {
      query += ' AND (identity_verified = FALSE OR business_license_verified = FALSE)';
    }

    query += ' ORDER BY created_at DESC';

    paramCount++;
    query += ` LIMIT $${paramCount}`;
    values.push(limit);

    paramCount++;
    query += ` OFFSET $${paramCount}`;
    values.push(offset);

    const { rows } = await db.query(query, values);
    return rows.map((row) => new User(row));
  }

  static async getByRole(role, options = {}) {
    const { status = null, limit = 50, offset = 0 } = options;

    let query = 'SELECT * FROM users WHERE role = $1';
    const values = [role];
    let paramCount = 1;

    if (status) {
      paramCount++;
      query += ` AND status = $${paramCount}`;
      values.push(status);
    }

    query += ' ORDER BY created_at DESC';

    paramCount++;
    query += ` LIMIT $${paramCount}`;
    values.push(limit);

    paramCount++;
    query += ` OFFSET $${paramCount}`;
    values.push(offset);

    const { rows } = await db.query(query, values);
    return rows.map((row) => new User(row));
  }

  toJSON() {
    // eslint-disable-next-line no-unused-vars
    const { password, ...userWithoutPassword } = this;
    return userWithoutPassword;
  }
}

module.exports = User;
