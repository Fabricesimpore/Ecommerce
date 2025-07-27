import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios'

// Types
export interface ApiResponse<T = any> {
  data: T
  message?: string
  success: boolean
}

export interface ApiError {
  message: string
  status?: number
  errors?: Record<string, string[]>
}

class ApiClient {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL,
      timeout: Number(process.env.NEXT_PUBLIC_API_TIMEOUT) || 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    this.setupInterceptors()
  }

  private setupInterceptors() {
    // Request interceptor for auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = this.getAuthToken()
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }

        // Log requests in development
        if (process.env.NEXT_PUBLIC_ENABLE_API_LOGGING === 'true') {
          console.log(`🔗 API Request: ${config.method?.toUpperCase()} ${config.url}`)
        }

        return config
      },
      (error) => {
        console.error('❌ Request Error:', error)
        return Promise.reject(error)
      }
    )

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        // Log successful responses in development
        if (process.env.NEXT_PUBLIC_ENABLE_API_LOGGING === 'true') {
          console.log(`✅ API Response: ${response.status} ${response.config.url}`)
        }
        return response
      },
      async (error: AxiosError) => {
        const originalRequest = error.config

        // Handle 401 errors (unauthorized)
        if (error.response?.status === 401 && originalRequest) {
          // Try to refresh token
          const refreshed = await this.refreshToken()
          if (refreshed && originalRequest) {
            // Retry the original request
            return this.client(originalRequest)
          } else {
            // Redirect to login
            this.handleAuthError()
          }
        }

        // Log errors in development
        if (process.env.NEXT_PUBLIC_ENABLE_API_LOGGING === 'true') {
          console.error(`❌ API Error: ${error.response?.status} ${error.config?.url}`, error.response?.data)
        }

        return Promise.reject(this.formatError(error))
      }
    )
  }

  private getAuthToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('auth_token')
  }

  private setAuthToken(token: string): void {
    if (typeof window === 'undefined') return
    localStorage.setItem('auth_token', token)
  }

  private removeAuthToken(): void {
    if (typeof window === 'undefined') return
    localStorage.removeItem('auth_token')
    localStorage.removeItem('refresh_token')
  }

  private async refreshToken(): Promise<boolean> {
    try {
      const refreshToken = localStorage.getItem('refresh_token')
      if (!refreshToken) return false

      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`, {
        refreshToken,
      })

      const { accessToken } = response.data.data
      this.setAuthToken(accessToken)
      return true
    } catch (error) {
      console.error('Token refresh failed:', error)
      return false
    }
  }

  private handleAuthError(): void {
    this.removeAuthToken()
    // Redirect to login page
    if (typeof window !== 'undefined') {
      window.location.href = '/login'
    }
  }

  private formatError(error: AxiosError): ApiError {
    const response = error.response
    
    return {
      message: response?.data?.message || error.message || 'An unexpected error occurred',
      status: response?.status,
      errors: response?.data?.errors,
    }
  }

  // Public methods
  async get<T>(url: string, params?: any): Promise<T> {
    const response = await this.client.get<ApiResponse<T>>(url, { params })
    return response.data.data
  }

  async post<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.post<ApiResponse<T>>(url, data)
    return response.data.data
  }

  async put<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.put<ApiResponse<T>>(url, data)
    return response.data.data
  }

  async delete<T>(url: string): Promise<T> {
    const response = await this.client.delete<ApiResponse<T>>(url)
    return response.data.data
  }

  // Auth specific methods
  setTokens(accessToken: string, refreshToken: string): void {
    this.setAuthToken(accessToken)
    if (typeof window !== 'undefined') {
      localStorage.setItem('refresh_token', refreshToken)
    }
  }

  clearTokens(): void {
    this.removeAuthToken()
  }

  isAuthenticated(): boolean {
    return !!this.getAuthToken()
  }
}

// Export singleton instance
export const apiClient = new ApiClient()
export default apiClient