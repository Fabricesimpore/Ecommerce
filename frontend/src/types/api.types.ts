// User & Authentication Types
export interface User {
  id: string
  email: string
  phone: string
  role: 'buyer' | 'vendor' | 'driver' | 'admin'
  profile: {
    firstName: string
    lastName: string
    businessName?: string
    nationalId?: string
    address?: {
      street: string
      city: string
      region: string
      coordinates?: { lat: number; lng: number }
    }
  }
  verification: {
    email: boolean
    phone: boolean
    identity: boolean
    businessLicense?: boolean
  }
  status: 'pending' | 'active' | 'suspended'
  createdAt: string
  updatedAt: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  phone: string
  password: string
  role: 'buyer' | 'vendor' | 'driver'
  profile: {
    firstName: string
    lastName: string
    businessName?: string
  }
}

export interface AuthResponse {
  user: User
  accessToken: string
  refreshToken: string
}

// Product Types
export interface Product {
  id: string
  vendorId: string
  title: string
  description: string
  price: number
  compareAtPrice?: number
  currency: string
  category: string
  subcategory: string
  tags: string[]
  images: Array<{
    url: string
    alt: string
    isPrimary: boolean
  }>
  inventory: {
    quantity: number
    trackInventory: boolean
    allowBackorder: boolean
  }
  shipping: {
    weight: number
    dimensions: { length: number; width: number; height: number }
    freeShipping: boolean
    shippingPrice: number
  }
  status: 'draft' | 'active' | 'archived'
  metadata?: Record<string, any>
  createdAt: string
  updatedAt: string
}

export interface ProductFilters {
  category?: string
  subcategory?: string
  minPrice?: number
  maxPrice?: number
  search?: string
  vendorId?: string
  tags?: string[]
  inStock?: boolean
  page?: number
  limit?: number
  sortBy?: 'createdAt' | 'price' | 'title'
  sortOrder?: 'asc' | 'desc'
}

export interface ProductsResponse {
  products: Product[]
  pagination: {
    total: number
    page: number
    limit: number
    pages: number
  }
}

// Cart Types
export interface CartItem {
  id: string
  productId: string
  vendorId: string
  title: string
  price: number
  quantity: number
  subtotal: number
  image?: string
}

export interface Cart {
  id: string
  userId: string
  items: CartItem[]
  totals: {
    subtotal: number
    shipping: number
    tax: number
    total: number
  }
  updatedAt: string
}

export interface AddToCartRequest {
  productId: string
  quantity: number
}

export interface UpdateCartItemRequest {
  quantity: number
}

// Order Types
export interface Order {
  id: string
  orderNumber: string
  buyerId: string
  items: Array<{
    productId: string
    vendorId: string
    title: string
    price: number
    quantity: number
    subtotal: number
  }>
  totals: {
    subtotal: number
    shipping: number
    tax: number
    total: number
  }
  shipping: {
    method: 'standard' | 'express' | 'pickup'
    address: Address
    trackingNumber?: string
    estimatedDelivery?: string
  }
  payment: {
    method: 'orange_money' | 'cash_on_delivery'
    status: 'pending' | 'processing' | 'paid' | 'failed' | 'refunded'
    transactionId?: string
    paidAt?: string
  }
  delivery?: {
    driverId?: string
    status: 'pending' | 'assigned' | 'picked_up' | 'in_transit' | 'delivered'
    assignedAt?: string
    pickedUpAt?: string
    deliveredAt?: string
    signature?: string
  }
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface Address {
  street: string
  city: string
  region: string
  coordinates?: { lat: number; lng: number }
}

export interface CreateOrderRequest {
  items: Array<{
    productId: string
    quantity: number
  }>
  shipping: {
    method: 'standard' | 'express' | 'pickup'
    address: Address
  }
  payment: {
    method: 'orange_money' | 'cash_on_delivery'
  }
  notes?: string
}

// Vendor Types
export interface Vendor {
  id: string
  businessName: string
  email: string
  phone: string
  address: Address
  verification: {
    identity: boolean
    businessLicense: boolean
  }
  status: 'pending' | 'active' | 'suspended'
  rating: number
  totalProducts: number
  totalOrders: number
  createdAt: string
}

// API Response wrapper
export interface ApiResponse<T = any> {
  data: T
  message?: string
  success: boolean
}

// Pagination
export interface PaginationParams {
  page?: number
  limit?: number
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    total: number
    page: number
    limit: number
    pages: number
  }
}