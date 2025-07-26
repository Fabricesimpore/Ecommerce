// Mock implementations for models
const mockUsers = {
  buyer: {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'buyer@test.com',
    phone: '+22670000001',
    role: 'buyer',
    firstName: 'Test',
    lastName: 'Buyer',
    status: 'active',
    updateStatus: jest.fn(),
    updateLastLogin: jest.fn().mockResolvedValue(true),
    validatePassword: jest.fn().mockResolvedValue(true),
    toJSON: jest.fn().mockReturnValue({
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'buyer@test.com',
      phone: '+22670000001',
      role: 'buyer',
      firstName: 'Test',
      lastName: 'Buyer',
      status: 'active'
    })
  },
  vendor: {
    id: '123e4567-e89b-12d3-a456-426614174001',
    email: 'vendor@test.com',
    phone: '+22670000002',
    role: 'vendor',
    firstName: 'Test',
    lastName: 'Vendor',
    businessName: 'Test Store',
    status: 'active',
    updateStatus: jest.fn(),
    updateLastLogin: jest.fn().mockResolvedValue(true),
    validatePassword: jest.fn().mockResolvedValue(true),
    toJSON: jest.fn().mockReturnValue({
      id: '123e4567-e89b-12d3-a456-426614174001',
      email: 'vendor@test.com',
      phone: '+22670000002',
      role: 'vendor',
      firstName: 'Test',
      lastName: 'Vendor',
      businessName: 'Test Store',
      status: 'active'
    })
  },
  admin: {
    id: '123e4567-e89b-12d3-a456-426614174002',
    email: 'admin@test.com',
    phone: '+22670000003',
    role: 'admin',
    firstName: 'Test',
    lastName: 'Admin',
    status: 'active',
    updateStatus: jest.fn(),
    updateLastLogin: jest.fn().mockResolvedValue(true),
    validatePassword: jest.fn().mockResolvedValue(true),
    toJSON: jest.fn().mockReturnValue({
      id: '123e4567-e89b-12d3-a456-426614174002',
      email: 'admin@test.com',
      phone: '+22670000003',
      role: 'admin',
      firstName: 'Test',
      lastName: 'Admin',
      status: 'active'
    })
  }
};

const mockProduct = {
  id: '123e4567-e89b-12d3-a456-426614174100',
  title: 'Test Product',
  description: 'Test product description',
  price: 29.99,
  vendorId: mockUsers.vendor.id,
  category: 'electronics',
  quantity: 10,
  trackInventory: true
};

const mockOrder = {
  id: '123e4567-e89b-12d3-a456-426614174200',
  buyerId: mockUsers.buyer.id,
  totalAmount: 59.98,
  paymentStatus: 'pending',
  status: 'pending',
  updatePaymentStatus: jest.fn(),
  cancel: jest.fn()
};

const mockPayment = {
  id: '123e4567-e89b-12d3-a456-426614174300',
  paymentReference: 'PAY_TEST_REF_123',
  orderId: mockOrder.id,
  paymentMethod: 'orange_money',
  amount: mockOrder.totalAmount,
  status: 'pending',
  customerPhone: '+22670000001',
  customerName: 'Test Buyer',
  createdBy: mockUsers.buyer.id,
  updateStatus: jest.fn(),
  canRetry: jest.fn(() => false),
  isExpired: jest.fn(() => false),
  getFormattedAmount: jest.fn(() => '59.98 XOF'),
  detectFraud: jest.fn(() => ({ riskScore: 0, flags: [] }))
};

module.exports = {
  mockUsers,
  mockProduct,
  mockOrder,
  mockPayment
};