// Mock Payment class
class MockPayment {
  constructor(data) {
    Object.assign(this, data);
    this.id = data.id || `payment-${Date.now()}-${Math.random()}`;
    this.status = data.status || 'pending';
    this.amount = data.amount || 100.00;
    this.paymentMethod = data.paymentMethod || 'orange_money';
  }

  static async create(paymentData) {
    return new MockPayment({
      ...paymentData,
      id: `payment-${Date.now()}`,
      status: 'pending',
      paymentReference: `PAY_${Date.now()}`,
      created_at: new Date(),
      updated_at: new Date()
    });
  }

  static async findById(id) {
    return new MockPayment({
      id,
      paymentReference: 'PAY_TEST_REF_123',
      orderId: 'order-123',
      paymentMethod: 'orange_money',
      amount: 100.00,
      status: 'pending',
      customerPhone: '+22670000001',
      customerName: 'Test Customer',
      createdBy: 'buyer-123'
    });
  }

  static async findByOrder(orderId) {
    return [
      new MockPayment({
        id: 'payment-order-1',
        orderId,
        amount: 100.00,
        status: 'completed',
        paymentMethod: 'orange_money'
      })
    ];
  }

  static async findByReference(reference) {
    return new MockPayment({
      id: 'payment-ref-1',
      paymentReference: reference,
      amount: 100.00,
      status: 'pending'
    });
  }

  async updateStatus(status, metadata = {}) {
    this.status = status;
    this.metadata = { ...this.metadata, ...metadata };
    this.updated_at = new Date();
    return this;
  }

  async cancel(reason) {
    this.status = 'cancelled';
    this.cancellationReason = reason;
    this.updated_at = new Date();
    return this;
  }

  canRetry() {
    return this.status === 'failed' && this.retryCount < 3;
  }

  isExpired() {
    const expireTime = new Date(this.created_at);
    expireTime.setMinutes(expireTime.getMinutes() + 30);
    return new Date() > expireTime;
  }

  getFormattedAmount() {
    return `${this.amount} XOF`;
  }

  detectFraud() {
    return {
      riskScore: 10,
      flags: [],
      recommendation: 'approve'
    };
  }

  async save() {
    this.updated_at = new Date();
    return this;
  }

  toJSON() {
    return {
      id: this.id,
      paymentReference: this.paymentReference,
      orderId: this.orderId,
      paymentMethod: this.paymentMethod,
      amount: this.amount,
      status: this.status,
      customerPhone: this.customerPhone,
      customerName: this.customerName,
      createdBy: this.createdBy,
      metadata: this.metadata,
      cancellationReason: this.cancellationReason,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}

module.exports = MockPayment;
