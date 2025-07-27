import { apiClient } from './client'
import type { 
  LoginRequest, 
  RegisterRequest, 
  AuthResponse, 
  User 
} from '@/types/api.types'

export const authApi = {
  // Login user
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/login', credentials)
    
    // Store tokens
    apiClient.setTokens(response.accessToken, response.refreshToken)
    
    return response
  },

  // Register new user
  async register(userData: RegisterRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/register', userData)
    
    // Store tokens
    apiClient.setTokens(response.accessToken, response.refreshToken)
    
    return response
  },

  // Logout user
  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout')
    } finally {
      // Always clear tokens even if logout request fails
      apiClient.clearTokens()
    }
  },

  // Get current user profile
  async getProfile(): Promise<User> {
    return apiClient.get<User>('/users/profile')
  },

  // Update user profile
  async updateProfile(profileData: Partial<User['profile']>): Promise<User> {
    return apiClient.put<User>('/users/profile', { profile: profileData })
  },

  // Change password
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    return apiClient.post('/users/change-password', {
      currentPassword,
      newPassword,
    })
  },

  // Request password reset
  async forgotPassword(email: string): Promise<void> {
    return apiClient.post('/auth/forgot-password', { email })
  },

  // Reset password with token
  async resetPassword(token: string, newPassword: string): Promise<void> {
    return apiClient.post('/auth/reset-password', {
      token,
      newPassword,
    })
  },

  // Verify email
  async verifyEmail(token: string): Promise<void> {
    return apiClient.post('/auth/verify-email', { token })
  },

  // Verify phone
  async verifyPhone(code: string): Promise<void> {
    return apiClient.post('/auth/verify-phone', { code })
  },

  // Resend verification email
  async resendEmailVerification(): Promise<void> {
    return apiClient.post('/auth/resend-email-verification')
  },

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return apiClient.isAuthenticated()
  },

  // Refresh token
  async refreshToken(): Promise<AuthResponse> {
    const refreshToken = typeof window !== 'undefined' 
      ? localStorage.getItem('refresh_token') 
      : null

    if (!refreshToken) {
      throw new Error('No refresh token available')
    }

    const response = await apiClient.post<AuthResponse>('/auth/refresh', {
      refreshToken,
    })

    // Update stored tokens
    apiClient.setTokens(response.accessToken, response.refreshToken)

    return response
  },
}

export default authApi