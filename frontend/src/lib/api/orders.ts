import { apiClient } from './client'
import { Product } from './products'

// Types
export interface OrderItem {
  productId: number
  quantity: number
  price: number
  product?: Product
}

export interface ShippingAddress {
  firstName: string
  lastName: string
  email: string
  phone: string
  address: string
  city: string
  region: string
  postalCode?: string
}

export interface Order {
  id: number
  customerId: number
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
  items: OrderItem[]
  shippingAddress: ShippingAddress
  paymentMethod: 'orange_money' | 'moov_money' | 'cash_on_delivery'
  subtotal: number
  shipping: number
  tax: number
  total: number
  notes?: string
  trackingNumber?: string
  createdAt: string
  updatedAt?: string
  deliveredAt?: string
}

export interface OrderCreateRequest {
  items: OrderItem[]
  shippingAddress: ShippingAddress
  paymentMethod: 'orange_money' | 'moov_money' | 'cash_on_delivery'
  notes?: string
}

export interface OrdersResponse {
  orders: Order[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export interface OrderSearchParams {
  page?: number
  limit?: number
  status?: string
  startDate?: string
  endDate?: string
}

// Order API functions
export const orderApi = {
  // Create a new order
  async createOrder(orderData: OrderCreateRequest): Promise<Order> {
    return apiClient.post<Order>('/orders', orderData)
  },

  // Get user's orders
  async getMyOrders(params?: OrderSearchParams): Promise<OrdersResponse> {
    const queryParams = new URLSearchParams()
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString())
        }
      })
    }
    
    return apiClient.get<OrdersResponse>(`/orders/me?${queryParams.toString()}`)
  },

  // Get single order by ID
  async getOrder(id: number): Promise<Order> {
    return apiClient.get<Order>(`/orders/${id}`)
  },

  // Cancel an order
  async cancelOrder(id: number): Promise<Order> {
    return apiClient.put<Order>(`/orders/${id}/cancel`, {})
  },

  // Track an order
  async trackOrder(trackingNumber: string): Promise<Order> {
    return apiClient.get<Order>(`/orders/track/${trackingNumber}`)
  },

  // Get order status history
  async getOrderHistory(id: number): Promise<any[]> {
    return apiClient.get<any[]>(`/orders/${id}/history`)
  }
}

export default orderApi