import { apiClient } from './client'

// Types
export interface Product {
  id: number
  title?: string
  name?: string // Fallback for compatibility
  description: string
  price: number
  compareAtPrice?: number
  category: string
  vendorId: number
  tags: string[]
  images: ProductImage[]
  image?: string // For simple single image fallback
  inventory: {
    quantity: number | null
  }
  shipping: {
    weight: number | null
    shippingPrice: number | null
  }
  status: 'active' | 'inactive' | 'draft'
  metadata: Record<string, any>
  seo: Record<string, any>
  createdAt: string
  updatedAt?: string
}

export interface ProductImage {
  id: number
  url: string
  altText?: string
  isMain: boolean
}

export interface ProductsResponse {
  products: Product[]
  pagination: {
    page: number
    limit: number
    total: number | null
    totalPages: number | null
    hasNext: boolean
    hasPrev: boolean
  }
}

export interface ProductSearchParams {
  page?: number
  limit?: number
  category?: string
  search?: string
  minPrice?: number
  maxPrice?: number
  sortBy?: 'price' | 'name' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
  status?: string
}

// Product API functions
export const productApi = {
  // Get all products with filtering and pagination
  async getProducts(params?: ProductSearchParams): Promise<ProductsResponse> {
    const queryParams = new URLSearchParams()
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString())
        }
      })
    }
    
    const response = await apiClient.get<ProductsResponse>(
      `/products?${queryParams.toString()}`
    )
    return response
  },

  // Get single product by ID
  async getProduct(id: number): Promise<Product> {
    return apiClient.get<Product>(`/products/${id}`)
  },

  // Get products by category
  async getProductsByCategory(category: string, params?: Omit<ProductSearchParams, 'category'>): Promise<ProductsResponse> {
    return this.getProducts({ ...params, category })
  },

  // Search products
  async searchProducts(query: string, params?: Omit<ProductSearchParams, 'search'>): Promise<ProductsResponse> {
    return this.getProducts({ ...params, search: query })
  },

  // Get featured products (for homepage)
  async getFeaturedProducts(limit: number = 8): Promise<Product[]> {
    const response = await this.getProducts({ limit, sortBy: 'createdAt', sortOrder: 'desc' })
    return response.products
  },

  // Get product categories
  async getCategories(): Promise<string[]> {
    return apiClient.get<string[]>('/products/categories')
  },

  // Vendor-specific endpoints (require authentication)
  async getMyProducts(params?: ProductSearchParams): Promise<ProductsResponse> {
    const queryParams = new URLSearchParams()
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString())
        }
      })
    }
    
    return apiClient.get<ProductsResponse>(`/products/me/products?${queryParams.toString()}`)
  },

  async createProduct(productData: Partial<Product>): Promise<Product> {
    return apiClient.post<Product>('/products', productData)
  },

  async updateProduct(id: number, productData: Partial<Product>): Promise<Product> {
    return apiClient.put<Product>(`/products/${id}`, productData)
  },

  async deleteProduct(id: number): Promise<void> {
    return apiClient.delete<void>(`/products/${id}`)
  }
}

export default productApi