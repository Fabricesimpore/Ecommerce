const db = require('../config/database.config');

class Product {
  constructor(data) {
    this.id = data.id;
    this.vendorId = data.vendor_id;
    this.title = data.title;
    this.description = data.description;
    this.price = parseFloat(data.price);
    this.compareAtPrice = data.compare_at_price ? parseFloat(data.compare_at_price) : null;
    this.currency = data.currency;
    this.category = data.category;
    this.subcategory = data.subcategory;
    this.tags = data.tags || [];
    this.images = data.images || [];
    this.quantity = parseInt(data.quantity);
    this.trackInventory = data.track_inventory;
    this.allowBackorder = data.allow_backorder;
    this.weight = data.weight ? parseFloat(data.weight) : null;
    this.dimensions = data.dimensions;
    this.freeShipping = data.free_shipping;
    this.shippingPrice = parseFloat(data.shipping_price);
    this.status = data.status;
    this.metadata = data.metadata || {};
    this.slug = data.slug;
    this.metaTitle = data.meta_title;
    this.metaDescription = data.meta_description;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
    this.publishedAt = data.published_at;
  }

  static async create(productData) {
    const {
      vendorId,
      title,
      description,
      price,
      compareAtPrice,
      currency = 'XOF',
      category,
      subcategory,
      tags = [],
      images = [],
      quantity = 0,
      trackInventory = true,
      allowBackorder = false,
      weight,
      dimensions,
      freeShipping = false,
      shippingPrice = 0,
      status = 'draft',
      metadata = {},
      metaTitle,
      metaDescription
    } = productData;

    const query = `
      INSERT INTO products (
        vendor_id, title, description, price, compare_at_price,
        currency, category, subcategory, tags, images,
        quantity, track_inventory, allow_backorder,
        weight, dimensions, free_shipping, shipping_price,
        status, metadata, meta_title, meta_description
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
      )
      RETURNING *
    `;

    const values = [
      vendorId, title, description, price, compareAtPrice,
      currency, category, subcategory, tags, JSON.stringify(images),
      quantity, trackInventory, allowBackorder,
      weight, dimensions ? JSON.stringify(dimensions) : null,
      freeShipping, shippingPrice, status,
      JSON.stringify(metadata), metaTitle, metaDescription
    ];

    const { rows } = await db.query(query, values);
    return new Product(rows[0]);
  }

  static async findById(id) {
    const query = 'SELECT * FROM products WHERE id = $1';
    const { rows } = await db.query(query, [id]);
    return rows.length ? new Product(rows[0]) : null;
  }

  static async findByVendor(vendorId, options = {}) {
    const { status = null, limit = 50, offset = 0 } = options;
    
    let query = 'SELECT * FROM products WHERE vendor_id = $1';
    const values = [vendorId];
    
    if (status) {
      query += ' AND status = $2';
      values.push(status);
    }
    
    query += ' ORDER BY created_at DESC LIMIT $' + (values.length + 1) + ' OFFSET $' + (values.length + 2);
    values.push(limit, offset);
    
    const { rows } = await db.query(query, values);
    return rows.map(row => new Product(row));
  }

  static async findAll(options = {}) {
    const {
      status = 'active',
      category = null,
      subcategory = null,
      vendorId = null,
      minPrice = null,
      maxPrice = null,
      tags = [],
      search = null,
      sortBy = 'created_at',
      sortOrder = 'DESC',
      limit = 50,
      offset = 0
    } = options;

    let query = 'SELECT * FROM products WHERE 1=1';
    const values = [];
    let paramCount = 0;

    // Status filter
    if (status) {
      paramCount++;
      query += ` AND status = $${paramCount}`;
      values.push(status);
    }

    // Category filter
    if (category) {
      paramCount++;
      query += ` AND category = $${paramCount}`;
      values.push(category);
    }

    // Subcategory filter
    if (subcategory) {
      paramCount++;
      query += ` AND subcategory = $${paramCount}`;
      values.push(subcategory);
    }

    // Vendor filter
    if (vendorId) {
      paramCount++;
      query += ` AND vendor_id = $${paramCount}`;
      values.push(vendorId);
    }

    // Price range filter
    if (minPrice !== null) {
      paramCount++;
      query += ` AND price >= $${paramCount}`;
      values.push(minPrice);
    }

    if (maxPrice !== null) {
      paramCount++;
      query += ` AND price <= $${paramCount}`;
      values.push(maxPrice);
    }

    // Tags filter
    if (tags.length > 0) {
      paramCount++;
      query += ` AND tags && $${paramCount}`;
      values.push(tags);
    }

    // Search filter
    if (search) {
      paramCount++;
      query += ` AND to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '')) @@ plainto_tsquery('english', $${paramCount})`;
      values.push(search);
    }

    // Sorting
    const allowedSortFields = ['created_at', 'price', 'title', 'updated_at'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
    const sortDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    query += ` ORDER BY ${sortField} ${sortDirection}`;

    // Pagination
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    values.push(limit);
    
    paramCount++;
    query += ` OFFSET $${paramCount}`;
    values.push(offset);

    const { rows } = await db.query(query, values);
    return rows.map(row => new Product(row));
  }

  static async count(options = {}) {
    const {
      status = 'active',
      category = null,
      vendorId = null,
      search = null
    } = options;

    let query = 'SELECT COUNT(*) as total FROM products WHERE 1=1';
    const values = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      query += ` AND status = $${paramCount}`;
      values.push(status);
    }

    if (category) {
      paramCount++;
      query += ` AND category = $${paramCount}`;
      values.push(category);
    }

    if (vendorId) {
      paramCount++;
      query += ` AND vendor_id = $${paramCount}`;
      values.push(vendorId);
    }

    if (search) {
      paramCount++;
      query += ` AND to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '')) @@ plainto_tsquery('english', $${paramCount})`;
      values.push(search);
    }

    const { rows } = await db.query(query, values);
    return parseInt(rows[0].total);
  }

  async update(updates) {
    const allowedUpdates = [
      'title', 'description', 'price', 'compare_at_price',
      'category', 'subcategory', 'tags', 'images',
      'quantity', 'track_inventory', 'allow_backorder',
      'weight', 'dimensions', 'free_shipping', 'shipping_price',
      'status', 'metadata', 'meta_title', 'meta_description'
    ];

    const updateFields = [];
    const values = [];
    let paramCount = 1;

    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        updateFields.push(`${dbKey} = $${paramCount}`);
        
        if (key === 'images' || key === 'dimensions' || key === 'metadata') {
          values.push(JSON.stringify(updates[key]));
        } else {
          values.push(updates[key]);
        }
        
        paramCount++;
      }
    });

    if (updateFields.length === 0) {
      return this;
    }

    // Add published_at if status is changing to active
    if (updates.status === 'active' && this.status !== 'active' && !this.publishedAt) {
      updateFields.push(`published_at = CURRENT_TIMESTAMP`);
    }

    values.push(this.id);
    const query = `
      UPDATE products 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const { rows } = await db.query(query, values);
    Object.assign(this, new Product(rows[0]));
    return this;
  }

  async delete() {
    const query = 'DELETE FROM products WHERE id = $1';
    await db.query(query, [this.id]);
    return true;
  }

  async adjustInventory(quantity, operation = 'decrease') {
    if (!this.trackInventory) {
      return this;
    }

    const newQuantity = operation === 'decrease' 
      ? this.quantity - quantity 
      : this.quantity + quantity;

    if (newQuantity < 0 && !this.allowBackorder) {
      throw new Error('Insufficient inventory');
    }

    const query = 'UPDATE products SET quantity = $1 WHERE id = $2 RETURNING *';
    const { rows } = await db.query(query, [newQuantity, this.id]);
    Object.assign(this, new Product(rows[0]));
    return this;
  }

  static async getCategories() {
    const query = `
      SELECT DISTINCT category, COUNT(*) as count 
      FROM products 
      WHERE status = 'active' 
      GROUP BY category 
      ORDER BY category
    `;
    const { rows } = await db.query(query);
    return rows;
  }

  static async getTags() {
    const query = `
      SELECT DISTINCT unnest(tags) as tag, COUNT(*) as count
      FROM products
      WHERE status = 'active'
      GROUP BY tag
      ORDER BY count DESC, tag
      LIMIT 50
    `;
    const { rows } = await db.query(query);
    return rows;
  }

  toJSON() {
    return {
      id: this.id,
      vendorId: this.vendorId,
      title: this.title,
      description: this.description,
      price: this.price,
      compareAtPrice: this.compareAtPrice,
      currency: this.currency,
      category: this.category,
      subcategory: this.subcategory,
      tags: this.tags,
      images: this.images,
      inventory: {
        quantity: this.quantity,
        trackInventory: this.trackInventory,
        allowBackorder: this.allowBackorder
      },
      shipping: {
        weight: this.weight,
        dimensions: this.dimensions,
        freeShipping: this.freeShipping,
        shippingPrice: this.shippingPrice
      },
      status: this.status,
      metadata: this.metadata,
      slug: this.slug,
      seo: {
        metaTitle: this.metaTitle,
        metaDescription: this.metaDescription
      },
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      publishedAt: this.publishedAt
    };
  }
}

module.exports = Product;