const db = require('../config/database.config');

class Payment {
  constructor(data) {
    this.id = data.id;
    this.orderId = data.order_id;
    this.paymentMethod = data.payment_method;
    this.paymentProvider = data.payment_provider;
    this.transactionId = data.transaction_id;
    this.externalTransactionId = data.external_transaction_id;
    this.paymentReference = data.payment_reference;
    this.amount = parseFloat(data.amount);
    this.currency = data.currency;
    this.fees = parseFloat(data.fees || 0);
    this.netAmount = parseFloat(data.net_amount);
    this.status = data.status;
    this.customerPhone = data.customer_phone;
    this.customerName = data.customer_name;
    this.customerEmail = data.customer_email;
    this.paymentUrl = data.payment_url;
    this.returnUrl = data.return_url;
    this.cancelUrl = data.cancel_url;
    this.webhookUrl = data.webhook_url;
    this.otpCode = data.otp_code;
    this.paymentToken = data.payment_token;
    this.authorizationCode = data.authorization_code;
    this.webhookData = data.webhook_data || {};
    this.gatewayResponse = data.gateway_response || {};
    this.errorDetails = data.error_details || {};
    this.riskScore = data.risk_score || 0;
    this.fraudFlags = data.fraud_flags || [];
    this.initiatedAt = data.initiated_at;
    this.expiresAt = data.expires_at;
    this.completedAt = data.completed_at;
    this.failedAt = data.failed_at;
    this.cancelledAt = data.cancelled_at;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
    this.createdBy = data.created_by;
    this.updatedBy = data.updated_by;
    this.ipAddress = data.ip_address;
    this.userAgent = data.user_agent;
  }

  static async create(paymentData) {
    const {
      orderId,
      paymentMethod,
      amount,
      currency = 'XOF',
      customerPhone,
      customerName,
      customerEmail,
      returnUrl,
      cancelUrl,
      createdBy,
      ipAddress,
      userAgent,
      paymentReference
    } = paymentData;

    // Calculate fees based on payment method
    const fees = Payment.calculateFees(paymentMethod, amount);
    const netAmount = amount - fees;

    const query = `
      INSERT INTO payments (
        order_id, payment_method, amount, currency, fees, net_amount,
        customer_phone, customer_name, customer_email, return_url, cancel_url,
        payment_reference, expires_at, created_by, ip_address, user_agent
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
        COALESCE($12, generate_payment_reference()),
        calculate_payment_expiry($2),
        $13, $14, $15
      ) RETURNING *
    `;

    const values = [
      orderId, paymentMethod, amount, currency, fees, netAmount,
      customerPhone, customerName, customerEmail, returnUrl, cancelUrl,
      paymentReference, createdBy, ipAddress, userAgent
    ];

    const { rows } = await db.query(query, values);
    return new Payment(rows[0]);
  }

  static async findById(id) {
    const query = 'SELECT * FROM payments WHERE id = $1';
    const { rows } = await db.query(query, [id]);
    return rows.length ? new Payment(rows[0]) : null;
  }

  static async findByReference(paymentReference) {
    const query = 'SELECT * FROM payments WHERE payment_reference = $1';
    const { rows } = await db.query(query, [paymentReference]);
    return rows.length ? new Payment(rows[0]) : null;
  }

  static async findByOrderId(orderId) {
    const query = 'SELECT * FROM payments WHERE order_id = $1 ORDER BY created_at DESC';
    const { rows } = await db.query(query, [orderId]);
    return rows.map((row) => new Payment(row));
  }

  static async findByTransactionId(transactionId) {
    const query = 'SELECT * FROM payments WHERE transaction_id = $1 OR external_transaction_id = $1';
    const { rows } = await db.query(query, [transactionId]);
    return rows.length ? new Payment(rows[0]) : null;
  }

  async updateStatus(newStatus, updateData = {}) {
    const allowedTransitions = {
      pending: ['processing', 'failed', 'cancelled', 'expired'],
      processing: ['completed', 'failed', 'cancelled'],
      completed: ['refunded'],
      failed: [],
      cancelled: [],
      refunded: [],
      expired: []
    };

    if (!allowedTransitions[this.status].includes(newStatus)) {
      throw new Error(`Cannot transition from ${this.status} to ${newStatus}`);
    }

    let query = `
      UPDATE payments 
      SET status = $1, updated_at = CURRENT_TIMESTAMP, updated_by = $2
    `;
    const values = [newStatus, updateData.updatedBy || null, this.id];
    let paramCount = 2;

    // Set timestamp fields based on status
    if (newStatus === 'completed') {
      query += ', completed_at = CURRENT_TIMESTAMP';
      if (updateData.externalTransactionId) {
        paramCount++;
        query += `, external_transaction_id = $${paramCount}`;
        values.splice(-1, 0, updateData.externalTransactionId);
      }
      if (updateData.authorizationCode) {
        paramCount++;
        query += `, authorization_code = $${paramCount}`;
        values.splice(-1, 0, updateData.authorizationCode);
      }
    } else if (newStatus === 'failed') {
      query += ', failed_at = CURRENT_TIMESTAMP';
      if (updateData.errorDetails) {
        paramCount++;
        query += `, error_details = $${paramCount}`;
        values.splice(-1, 0, JSON.stringify(updateData.errorDetails));
      }
    } else if (newStatus === 'cancelled') {
      query += ', cancelled_at = CURRENT_TIMESTAMP';
    }

    // Update gateway response if provided
    if (updateData.gatewayResponse) {
      paramCount++;
      query += `, gateway_response = $${paramCount}`;
      values.splice(-1, 0, JSON.stringify(updateData.gatewayResponse));
    }

    // Update webhook data if provided
    if (updateData.webhookData) {
      paramCount++;
      query += `, webhook_data = $${paramCount}`;
      values.splice(-1, 0, JSON.stringify(updateData.webhookData));
    }

    // Update fraud score if provided
    if (updateData.riskScore !== undefined) {
      paramCount++;
      query += `, risk_score = $${paramCount}`;
      values.splice(-1, 0, updateData.riskScore);
    }

    // Update IP and user agent for audit trail
    if (updateData.ipAddress) {
      paramCount++;
      query += `, ip_address = $${paramCount}`;
      values.splice(-1, 0, updateData.ipAddress);
    }

    if (updateData.userAgent) {
      paramCount++;
      query += `, user_agent = $${paramCount}`;
      values.splice(-1, 0, updateData.userAgent);
    }

    query += ` WHERE id = $${values.length} RETURNING *`;

    const { rows } = await db.query(query, values);
    Object.assign(this, new Payment(rows[0]));
    return this;
  }

  async updatePaymentUrl(paymentUrl, paymentToken = null) {
    const query = `
      UPDATE payments 
      SET payment_url = $1, payment_token = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;

    const { rows } = await db.query(query, [paymentUrl, paymentToken, this.id]);
    Object.assign(this, new Payment(rows[0]));
    return this;
  }

  async expire() {
    if (this.status !== 'pending') {
      throw new Error('Only pending payments can be expired');
    }

    return await this.updateStatus('expired');
  }

  async cancel(reason = null) {
    if (!['pending', 'processing'].includes(this.status)) {
      throw new Error('Only pending or processing payments can be cancelled');
    }

    const updateData = {};
    if (reason) {
      updateData.errorDetails = { cancellation_reason: reason };
    }

    return await this.updateStatus('cancelled', updateData);
  }

  async refund(refundAmount = null, reason = null) {
    if (this.status !== 'completed') {
      throw new Error('Only completed payments can be refunded');
    }

    const amount = refundAmount || this.amount;
    const updateData = {
      errorDetails: {
        refund_amount: amount,
        refund_reason: reason,
        refunded_at: new Date().toISOString()
      }
    };

    return await this.updateStatus('refunded', updateData);
  }

  // Calculate fees based on payment method and amount
  static calculateFees(paymentMethod, amount) {
    switch (paymentMethod) {
      case 'orange_money':
        // Orange Money typically charges around 1-2% + fixed fee
        return Math.min(amount * 0.015 + 50, amount * 0.02); // 1.5% + 50 XOF, max 2%
      case 'bank_transfer':
        return Math.min(amount * 0.01 + 100, 500); // 1% + 100 XOF, max 500 XOF
      case 'cash_on_delivery':
        return 0; // No processing fees for COD
      default:
        return 0;
    }
  }

  // Get payment statistics
  static async getStatistics(options = {}) {
    const {
      startDate = null,
      endDate = null,
      paymentMethod = null,
      status = null
    } = options;

    let query = `
      SELECT 
        payment_method,
        status,
        COUNT(*) as transaction_count,
        SUM(amount) as total_amount,
        AVG(amount) as average_amount,
        SUM(fees) as total_fees,
        SUM(net_amount) as total_net_amount
      FROM payments
      WHERE 1=1
    `;

    const values = [];
    let paramCount = 0;

    if (startDate) {
      paramCount++;
      query += ` AND created_at >= $${paramCount}`;
      values.push(startDate);
    }

    if (endDate) {
      paramCount++;
      query += ` AND created_at <= $${paramCount}`;
      values.push(endDate);
    }

    if (paymentMethod) {
      paramCount++;
      query += ` AND payment_method = $${paramCount}`;
      values.push(paymentMethod);
    }

    if (status) {
      paramCount++;
      query += ` AND status = $${paramCount}`;
      values.push(status);
    }

    query += ' GROUP BY payment_method, status ORDER BY payment_method, status';

    const { rows } = await db.query(query, values);
    return rows.map((row) => ({
      paymentMethod: row.payment_method,
      status: row.status,
      transactionCount: parseInt(row.transaction_count),
      totalAmount: parseFloat(row.total_amount),
      averageAmount: parseFloat(row.average_amount),
      totalFees: parseFloat(row.total_fees),
      totalNetAmount: parseFloat(row.total_net_amount)
    }));
  }

  // Clean up expired payments
  static async cleanupExpiredPayments() {
    const query = 'SELECT cleanup_expired_payments()';
    const { rows } = await db.query(query);
    return parseInt(rows[0].cleanup_expired_payments);
  }

  // Get payment audit trail
  async getAuditTrail() {
    const query = `
      SELECT 
        pal.old_status,
        pal.new_status,
        pal.changed_at,
        pal.changed_by,
        pal.ip_address,
        pal.user_agent,
        pal.notes,
        u.first_name,
        u.last_name,
        u.email
      FROM payment_audit_log pal
      LEFT JOIN users u ON pal.changed_by = u.id
      WHERE pal.payment_id = $1
      ORDER BY pal.changed_at DESC
    `;

    const { rows } = await db.query(query, [this.id]);
    return rows.map((row) => ({
      oldStatus: row.old_status,
      newStatus: row.new_status,
      changedAt: row.changed_at,
      changedBy: {
        id: row.changed_by,
        name: row.changed_by ? `${row.first_name} ${row.last_name}` : 'System',
        email: row.email
      },
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      notes: row.notes
    }));
  }

  // Check if payment is expired
  isExpired() {
    return this.expiresAt && new Date() > new Date(this.expiresAt);
  }

  // Check if payment can be retried
  canRetry() {
    return ['failed', 'expired', 'cancelled'].includes(this.status);
  }

  // Get formatted amount for display
  getFormattedAmount() {
    return `${this.amount.toLocaleString()} ${this.currency}`;
  }

  // Detect potential fraud
  detectFraud() {
    let riskScore = 0;
    const flags = [];

    // High amount flag
    if (this.amount > 1000000) { // 1M XOF
      riskScore += 30;
      flags.push('high_amount');
    }

    // Multiple failed attempts (would need additional logic)
    // Unusual customer phone patterns
    if (this.customerPhone && !this.customerPhone.match(/^\+226\d{8}$/)) {
      riskScore += 10;
      flags.push('invalid_phone_format');
    }

    // Set fraud indicators
    this.riskScore = Math.min(riskScore, 100);
    this.fraudFlags = flags;

    let recommendation;
    if (riskScore > 70) {
      recommendation = 'block';
    } else if (riskScore > 40) {
      recommendation = 'review';
    } else {
      recommendation = 'approve';
    }

    return {
      riskScore: this.riskScore,
      flags: this.fraudFlags,
      recommendation
    };
  }

  toJSON() {
    return {
      id: this.id,
      orderId: this.orderId,
      paymentMethod: this.paymentMethod,
      paymentProvider: this.paymentProvider,
      transactionId: this.transactionId,
      externalTransactionId: this.externalTransactionId,
      paymentReference: this.paymentReference,
      amount: this.amount,
      currency: this.currency,
      fees: this.fees,
      netAmount: this.netAmount,
      status: this.status,
      customer: {
        phone: this.customerPhone,
        name: this.customerName,
        email: this.customerEmail
      },
      urls: {
        payment: this.paymentUrl,
        return: this.returnUrl,
        cancel: this.cancelUrl,
        webhook: this.webhookUrl
      },
      security: {
        riskScore: this.riskScore,
        fraudFlags: this.fraudFlags
      },
      timestamps: {
        initiatedAt: this.initiatedAt,
        expiresAt: this.expiresAt,
        completedAt: this.completedAt,
        failedAt: this.failedAt,
        cancelledAt: this.cancelledAt,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt
      },
      // Only include sensitive data for internal use
      ...(this.includeInternal && {
        otpCode: this.otpCode,
        paymentToken: this.paymentToken,
        authorizationCode: this.authorizationCode,
        webhookData: this.webhookData,
        gatewayResponse: this.gatewayResponse,
        errorDetails: this.errorDetails
      })
    };
  }
}

module.exports = Payment;
