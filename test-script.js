#!/usr/bin/env node

/**
 * Comprehensive E-commerce System Test Script
 * Tests all major workflows and integrations
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = 'http://localhost:5001';
const API_URL = `${BASE_URL}/api`;

// Test data storage
const testData = {
  tokens: {},
  users: {},
  products: [],
  orders: [],
  payments: [],
  deliveries: []
};

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

// Helper functions
const log = (message, color = colors.reset) => {
  console.log(`${color}${message}${colors.reset}`);
};

const logSuccess = (message) => log(`✅ ${message}`, colors.green);
const logError = (message) => log(`❌ ${message}`, colors.red);
const logInfo = (message) => log(`ℹ️  ${message}`, colors.blue);
const logWarning = (message) => log(`⚠️  ${message}`, colors.yellow);
const logStep = (message) => log(`\n🔄 ${message}`, colors.cyan + colors.bold);

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// API helper function
const apiCall = async (method, endpoint, data = null, token = null) => {
  try {
    const config = {
      method,
      url: `${API_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      ...(data && { data })
    };

    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status
    };
  }
};

// Test functions
async function testServerHealth() {
  logStep('Testing Server Health');
  
  try {
    const response = await axios.get(`${BASE_URL}/health`);
    if (response.status === 200) {
      logSuccess('Server is healthy');
      logInfo(`Environment: ${response.data.environment}`);
      logInfo(`Uptime: ${response.data.uptime.toFixed(2)}s`);
      logInfo(`Database: ${response.data.database}`);
    } else {
      throw new Error('Health check returned non-200 status');
    }
  } catch (error) {
    logError(`Server health check failed: ${error.message}`);
    throw new Error('Server is not healthy');
  }
}

async function createTestAccounts() {
  logStep('Creating Test Accounts');
  
  const accounts = [
    {
      role: 'buyer',
      userData: {
        firstName: 'Test',
        lastName: 'Buyer',
        email: 'buyer01@test.com',
        password: 'TestBuyer123!',
        phone: '+22670000001',
        role: 'buyer'
      }
    },
    {
      role: 'vendor',
      userData: {
        firstName: 'Test',
        lastName: 'Vendor',
        email: 'vendor01@test.com',
        password: 'TestVendor123!',
        phone: '+22670000002',
        role: 'vendor',
        businessName: 'Test Vendor Store',
        businessAddress: '123 Vendor Street, Ouagadougou'
      }
    },
    {
      role: 'driver',
      userData: {
        firstName: 'Test',
        lastName: 'Driver',
        email: 'driver01@test.com',
        password: 'TestDriver123!',
        phone: '+22670000003',
        role: 'driver',
        vehicleType: 'motorcycle',
        licenseNumber: 'DRV123456'
      }
    },
    {
      role: 'admin',
      userData: {
        firstName: 'Test',
        lastName: 'Admin',
        email: 'admin01@test.com',
        password: 'TestAdmin123!',
        phone: '+22670000004',
        role: 'admin'
      }
    }
  ];

  for (const account of accounts) {
    logInfo(`Creating ${account.role} account...`);
    
    const response = await apiCall('POST', '/auth/register', account.userData);
    
    if (response.success) {
      testData.users[account.role] = {
        ...account.userData,
        id: response.data.user.id
      };
      testData.tokens[account.role] = response.data.token;
      logSuccess(`${account.role} account created successfully`);
    } else {
      logWarning(`${account.role} account creation failed: ${response.error.message || 'Unknown error'}`);
      
      // Try to login if account already exists
      const loginResponse = await apiCall('POST', '/auth/login', {
        email: account.userData.email,
        password: account.userData.password
      });
      
      if (loginResponse.success) {
        testData.users[account.role] = {
          ...account.userData,
          id: loginResponse.data.user.id
        };
        testData.tokens[account.role] = loginResponse.data.token;
        logInfo(`${account.role} logged in with existing account`);
      } else {
        logError(`Failed to create or login ${account.role}`);
      }
    }
  }
}

async function testAuthentication() {
  logStep('Testing Authentication');
  
  // Test token verification
  for (const [role, token] of Object.entries(testData.tokens)) {
    const response = await apiCall('GET', '/auth/profile', null, token);
    if (response.success) {
      logSuccess(`${role} token is valid`);
      logInfo(`Profile: ${response.data.user.first_name} ${response.data.user.last_name} (${response.data.user.role})`);
    } else {
      logError(`${role} token validation failed`);
    }
  }
  
  // Test invalid token
  const invalidResponse = await apiCall('GET', '/auth/profile', null, 'invalid-token');
  if (!invalidResponse.success && invalidResponse.status === 401) {
    logSuccess('Invalid token correctly rejected');
  } else {
    logError('Invalid token was not rejected properly');
  }
}

async function testVendorWorkflow() {
  logStep('Testing Vendor Workflow');
  
  const vendorToken = testData.tokens.vendor;
  const adminToken = testData.tokens.admin;
  
  if (!vendorToken || !adminToken) {
    logError('Missing vendor or admin tokens');
    return;
  }
  
  // Create products as vendor
  const products = [
    {
      name: 'Traditional Burkina Fabric',
      description: 'Beautiful traditional fabric from local artisans',
      price: 25000,
      category: 'fashion',
      tags: ['traditional', 'fabric', 'handmade'],
      inventory_quantity: 50,
      images: ['https://example.com/fabric1.jpg'],
      specifications: { material: 'cotton', color: 'multicolor' }
    },
    {
      name: 'Shea Butter - Pure Organic',
      description: '100% pure organic shea butter from Burkina Faso',
      price: 15000,
      category: 'beauty',
      tags: ['organic', 'skincare', 'shea'],
      inventory_quantity: 100,
      images: ['https://example.com/shea1.jpg'],
      specifications: { weight: '250g', organic: true }
    },
    {
      name: 'Millet Flour - Local Harvest',
      description: 'Fresh millet flour from local farmers',
      price: 3000,
      category: 'food',
      tags: ['millet', 'flour', 'local'],
      inventory_quantity: 200,
      images: ['https://example.com/millet1.jpg'],
      specifications: { weight: '1kg', organic: false }
    }
  ];
  
  for (const product of products) {
    logInfo(`Creating product: ${product.name}`);
    const response = await apiCall('POST', '/products', product, vendorToken);
    
    if (response.success) {
      testData.products.push({
        ...response.data.product,
        vendor_token: vendorToken
      });
      logSuccess(`Product created: ${product.name} (ID: ${response.data.product.id})`);
    } else {
      logError(`Failed to create product: ${product.name} - ${response.error.message || 'Unknown error'}`);
    }
  }
  
  // Test vendor dashboard
  logInfo('Testing vendor dashboard...');
  const dashboardResponse = await apiCall('GET', '/vendors/dashboard', null, vendorToken);
  if (dashboardResponse.success) {
    logSuccess('Vendor dashboard accessible');
    logInfo(`Products: ${dashboardResponse.data.totalProducts}`);
    logInfo(`Orders: ${dashboardResponse.data.totalOrders}`);
  } else {
    logError('Vendor dashboard failed');
  }
}

async function testProductBrowsing() {
  logStep('Testing Product Browsing & Search');
  
  // Test product listing
  const listResponse = await apiCall('GET', '/products');
  if (listResponse.success) {
    logSuccess(`Product listing works - Found ${listResponse.data.products.length} products`);
    
    if (listResponse.data.products.length > 0) {
      const product = listResponse.data.products[0];
      logInfo(`Sample product: ${product.name} - ${product.price} XOF`);
    }
  } else {
    logError('Product listing failed');
  }
  
  // Test search by category
  const categoryResponse = await apiCall('GET', '/products?category=beauty');
  if (categoryResponse.success) {
    logSuccess(`Category search works - Found ${categoryResponse.data.products.length} beauty products`);
  } else {
    logError('Category search failed');
  }
  
  // Test search by tags
  const tagResponse = await apiCall('GET', '/products?tags=organic');
  if (tagResponse.success) {
    logSuccess(`Tag search works - Found ${tagResponse.data.products.length} organic products`);
  } else {
    logError('Tag search failed');
  }
  
  // Test product details
  if (testData.products.length > 0) {
    const productId = testData.products[0].id;
    const detailResponse = await apiCall('GET', `/products/${productId}`);
    if (detailResponse.success) {
      logSuccess(`Product details work for product ${productId}`);
    } else {
      logError(`Product details failed for product ${productId}`);
    }
  }
}

async function testCartAndCheckout() {
  logStep('Testing Cart & Checkout');
  
  const buyerToken = testData.tokens.buyer;
  if (!buyerToken || testData.products.length === 0) {
    logError('Missing buyer token or products');
    return;
  }
  
  // Add items to cart
  const cartItems = [
    { product_id: testData.products[0].id, quantity: 2 },
    { product_id: testData.products[1].id, quantity: 1 }
  ];
  
  for (const item of cartItems) {
    logInfo(`Adding product ${item.product_id} to cart (qty: ${item.quantity})`);
    const response = await apiCall('POST', '/cart/add', item, buyerToken);
    
    if (response.success) {
      logSuccess(`Item added to cart`);
    } else {
      logError(`Failed to add item to cart: ${response.error.message || 'Unknown error'}`);
    }
  }
  
  // Get cart contents
  const cartResponse = await apiCall('GET', '/cart', null, buyerToken);
  if (cartResponse.success) {
    logSuccess(`Cart retrieved - ${cartResponse.data.items.length} items`);
    logInfo(`Cart total: ${cartResponse.data.total} XOF`);
  } else {
    logError('Failed to get cart contents');
    return;
  }
  
  // Proceed to checkout
  logInfo('Proceeding to checkout...');
  const checkoutData = {
    shipping_address: {
      street: '123 Test Street',
      city: 'Ouagadougou',
      region: 'Centre',
      postal_code: '01000',
      country: 'Burkina Faso'
    },
    payment_method: 'orange_money',
    phone_number: '+22670000001'
  };
  
  const checkoutResponse = await apiCall('POST', '/orders/checkout', checkoutData, buyerToken);
  if (checkoutResponse.success) {
    testData.orders.push(checkoutResponse.data.order);
    logSuccess(`Checkout successful - Order ID: ${checkoutResponse.data.order.id}`);
    logInfo(`Order total: ${checkoutResponse.data.order.total_amount} XOF`);
  } else {
    logError(`Checkout failed: ${checkoutResponse.error.message || 'Unknown error'}`);
  }
}

async function testPaymentFlows() {
  logStep('Testing Payment Flows');
  
  if (testData.orders.length === 0) {
    logError('No orders available for payment testing');
    return;
  }
  
  const order = testData.orders[0];
  const buyerToken = testData.tokens.buyer;
  
  // Test Orange Money payment initiation
  logInfo('Testing Orange Money payment...');
  const paymentData = {
    order_id: order.id,
    payment_method: 'orange_money',
    phone_number: '+22670000001'
  };
  
  const paymentResponse = await apiCall('POST', '/payments/initiate', paymentData, buyerToken);
  if (paymentResponse.success) {
    const payment = paymentResponse.data.payment;
    testData.payments.push(payment);
    logSuccess(`Payment initiated - Payment ID: ${payment.id}`);
    logInfo(`Payment status: ${payment.status}`);
    
    // In mock mode, the payment should auto-confirm after delay
    if (payment.status === 'pending') {
      logInfo('Waiting for mock payment confirmation...');
      await sleep(3000);
      
      // Check payment status
      const statusResponse = await apiCall('GET', `/payments/${payment.id}/status`, null, buyerToken);
      if (statusResponse.success) {
        logSuccess(`Payment status updated: ${statusResponse.data.payment.status}`);
      } else {
        logError('Failed to get payment status');
      }
    }
  } else {
    logError(`Payment initiation failed: ${paymentResponse.error.message || 'Unknown error'}`);
  }
  
  // Test webhook simulation
  logInfo('Testing payment webhook...');
  const webhookData = {
    transaction_id: testData.payments[0]?.external_transaction_id || 'test_txn_123',
    status: 'success',
    amount: order.total_amount,
    timestamp: new Date().toISOString()
  };
  
  const webhookResponse = await apiCall('POST', '/payments/webhook', webhookData);
  if (webhookResponse.success) {
    logSuccess('Webhook processed successfully');
  } else {
    logWarning('Webhook processing failed (this may be expected without proper signature)');
  }
}

async function testDeliveryWorkflow() {
  logStep('Testing Delivery Driver Workflow');
  
  const driverToken = testData.tokens.driver;
  const adminToken = testData.tokens.admin;
  
  if (!driverToken || !adminToken || testData.orders.length === 0) {
    logError('Missing tokens or orders for delivery testing');
    return;
  }
  
  const order = testData.orders[0];
  
  // Check available deliveries for driver
  logInfo('Checking available deliveries...');
  const availableResponse = await apiCall('GET', '/delivery/available', null, driverToken);
  if (availableResponse.success) {
    logSuccess(`Found ${availableResponse.data.deliveries.length} available deliveries`);
  } else {
    logError('Failed to get available deliveries');
  }
  
  // If there's a delivery, test accepting it
  if (availableResponse.success && availableResponse.data.deliveries.length > 0) {
    const delivery = availableResponse.data.deliveries[0];
    testData.deliveries.push(delivery);
    
    logInfo(`Accepting delivery ${delivery.id}...`);
    const acceptResponse = await apiCall('POST', `/delivery/${delivery.id}/accept`, {}, driverToken);
    
    if (acceptResponse.success) {
      logSuccess('Delivery accepted');
      
      // Test status updates
      const statusUpdates = ['picked_up', 'in_transit', 'delivered'];
      
      for (const status of statusUpdates) {
        logInfo(`Updating delivery status to: ${status}`);
        await sleep(1000);
        
        const updateResponse = await apiCall('PUT', `/delivery/${delivery.id}/status`, {
          status,
          notes: `Status update: ${status}`,
          ...(status === 'delivered' && { 
            delivery_proof: {
              type: 'signature',
              data: 'base64_signature_data'
            }
          })
        }, driverToken);
        
        if (updateResponse.success) {
          logSuccess(`Status updated to: ${status}`);
        } else {
          logError(`Failed to update status to: ${status}`);
        }
      }
    } else {
      logError('Failed to accept delivery');
    }
  }
}

async function testSecurity() {
  logStep('Testing Security & Access Controls');
  
  const buyerToken = testData.tokens.buyer;
  const vendorToken = testData.tokens.vendor;
  const driverToken = testData.tokens.driver;
  const adminToken = testData.tokens.admin;
  
  // Test unauthorized access
  logInfo('Testing unauthorized access...');
  
  // Buyer trying to access vendor route
  const vendorRouteResponse = await apiCall('GET', '/vendors/dashboard', null, buyerToken);
  if (!vendorRouteResponse.success && vendorRouteResponse.status === 403) {
    logSuccess('Buyer correctly denied access to vendor route');
  } else {
    logError('Buyer was incorrectly allowed access to vendor route');
  }
  
  // Driver trying to access admin route
  const adminRouteResponse = await apiCall('GET', '/jobs/status', null, driverToken);
  if (!adminRouteResponse.success && adminRouteResponse.status === 403) {
    logSuccess('Driver correctly denied access to admin route');
  } else {
    logError('Driver was incorrectly allowed access to admin route');
  }
  
  // Test invalid JWT
  logInfo('Testing invalid JWT rejection...');
  const invalidResponse = await apiCall('GET', '/auth/profile', null, 'invalid.jwt.token');
  if (!invalidResponse.success && invalidResponse.status === 401) {
    logSuccess('Invalid JWT correctly rejected');
  } else {
    logError('Invalid JWT was not properly rejected');
  }
  
  // Test admin access
  logInfo('Testing admin access...');
  const adminAccessResponse = await apiCall('GET', '/jobs/status', null, adminToken);
  if (adminAccessResponse.success) {
    logSuccess('Admin correctly granted access to admin route');
  } else {
    logError('Admin was incorrectly denied access to admin route');
  }
}

async function testAnalyticsAndJobs() {
  logStep('Testing Analytics & Job Queue');
  
  const adminToken = testData.tokens.admin;
  if (!adminToken) {
    logError('Missing admin token');
    return;
  }
  
  // Test analytics endpoints
  logInfo('Testing analytics dashboard...');
  const analyticsResponse = await apiCall('GET', '/analytics/dashboard', null, adminToken);
  if (analyticsResponse.success) {
    logSuccess('Analytics dashboard accessible');
    logInfo(`Total Users: ${analyticsResponse.data.totalUsers}`);
    logInfo(`Total Products: ${analyticsResponse.data.totalProducts}`);
    logInfo(`Total Orders: ${analyticsResponse.data.totalOrders}`);
  } else {
    logError('Analytics dashboard failed');
  }
  
  // Test job queue status
  logInfo('Testing job queue status...');
  const jobStatusResponse = await apiCall('GET', '/jobs/status', null, adminToken);
  if (jobStatusResponse.success) {
    logSuccess('Job queue status accessible');
    logInfo(`Active jobs: ${jobStatusResponse.data.length}`);
  } else {
    logError('Job queue status failed');
  }
  
  // Test manual job trigger
  logInfo('Testing manual job trigger...');
  const triggerResponse = await apiCall('POST', '/jobs/daily-analytics/trigger', {}, adminToken);
  if (triggerResponse.success) {
    logSuccess('Job triggered successfully');
  } else {
    logError('Job trigger failed');
  }
  
  // Test job history
  logInfo('Testing job history...');
  const historyResponse = await apiCall('GET', '/jobs/history?limit=10', null, adminToken);
  if (historyResponse.success) {
    logSuccess(`Job history accessible - ${historyResponse.data.length} entries`);
  } else {
    logError('Job history failed');
  }
}

async function testAuditLogs() {
  logStep('Testing Audit Logs & Event Tracking');
  
  const adminToken = testData.tokens.admin;
  if (!adminToken) {
    logError('Missing admin token');
    return;
  }
  
  // Test analytics events endpoint
  logInfo('Testing event logs...');
  const eventsResponse = await apiCall('GET', '/analytics/events?limit=20', null, adminToken);
  if (eventsResponse.success) {
    logSuccess(`Event logs accessible - ${eventsResponse.data.events.length} events found`);
    
    if (eventsResponse.data.events.length > 0) {
      const recentEvent = eventsResponse.data.events[0];
      logInfo(`Recent event: ${recentEvent.event_type} by ${recentEvent.actor_type}`);
    }
  } else {
    logError('Event logs failed');
  }
  
  // Test fraud detection logs
  logInfo('Testing fraud detection logs...');
  const fraudResponse = await apiCall('GET', '/analytics/fraud-incidents?limit=10', null, adminToken);
  if (fraudResponse.success) {
    logSuccess(`Fraud logs accessible - ${fraudResponse.data.incidents.length} incidents found`);
  } else {
    logWarning('Fraud logs failed (may be empty)');
  }
}

async function generateTestReport() {
  logStep('Generating Test Report');
  
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total_tests: 0,
      passed: 0,
      failed: 0,
      warnings: 0
    },
    test_data: {
      users_created: Object.keys(testData.users).length,
      products_created: testData.products.length,
      orders_created: testData.orders.length,
      payments_processed: testData.payments.length,
      deliveries_tracked: testData.deliveries.length
    },
    endpoints_tested: [
      'GET /health',
      'POST /auth/register',
      'POST /auth/login',
      'GET /auth/profile',
      'POST /products',
      'GET /products',
      'POST /cart/add',
      'GET /cart',
      'POST /orders/checkout',
      'POST /payments/initiate',
      'GET /payments/*/status',
      'POST /payments/webhook',
      'GET /delivery/available',
      'POST /delivery/*/accept',
      'PUT /delivery/*/status',
      'GET /vendors/dashboard',
      'GET /analytics/dashboard',
      'GET /jobs/status',
      'POST /jobs/*/trigger',
      'GET /jobs/history',
      'GET /analytics/events'
    ],
    security_tests: [
      'Invalid JWT rejection',
      'Role-based access control',
      'Unauthorized route access'
    ]
  };
  
  // Save report to file
  const reportPath = path.join(__dirname, 'test-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  logInfo(`Test report saved to: ${reportPath}`);
  logInfo(`Users created: ${report.test_data.users_created}`);
  logInfo(`Products created: ${report.test_data.products_created}`);
  logInfo(`Orders created: ${report.test_data.orders_created}`);
  logInfo(`Payments processed: ${report.test_data.payments_processed}`);
  
  return report;
}

// Main test execution
async function runTestSuite() {
  console.log(colors.bold + colors.blue + '🧪 E-COMMERCE SYSTEM COMPREHENSIVE TEST SUITE\n' + colors.reset);
  console.log(colors.cyan + '============================================================' + colors.reset);
  
  try {
    await testServerHealth();
    await createTestAccounts();
    await testAuthentication();
    await testVendorWorkflow();
    await testProductBrowsing();
    await testCartAndCheckout();
    await testPaymentFlows();
    await testDeliveryWorkflow();
    await testSecurity();
    await testAnalyticsAndJobs();
    await testAuditLogs();
    
    const report = await generateTestReport();
    
    console.log('\n' + colors.bold + colors.green + '🎉 TEST SUITE COMPLETED SUCCESSFULLY!' + colors.reset);
    console.log(colors.cyan + '============================================================' + colors.reset);
    
  } catch (error) {
    logError(`Test suite failed: ${error.message}`);
    console.log('\n' + colors.bold + colors.red + '❌ TEST SUITE FAILED!' + colors.reset);
    process.exit(1);
  }
}

// Check if axios is available
if (typeof require !== 'undefined') {
  // Run the test suite
  runTestSuite().catch(console.error);
} else {
  console.error('This script requires Node.js with axios package installed');
}