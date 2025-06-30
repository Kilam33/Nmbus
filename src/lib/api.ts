import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { toast } from 'react-hot-toast';

// Types
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

export interface User {
  id: string;
  email: string;
  created_at: string;
  email_confirmed_at?: string;
  last_sign_in_at?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  password: string;
}

export interface ResetPasswordRequest {
  email: string;
}

export interface UpdatePasswordRequest {
  password: string;
}

// API Client Class
class ApiClient {
  private client: AxiosInstance;
  private baseURL: string;
  private refreshTokenInProgress: boolean = false;
  private failedQueue: Array<{
    resolve: (value?: any) => void;
    reject: (error?: any) => void;
  }> = [];

  constructor() {
    this.baseURL = 'https://api.nmbus.ip-ddns.com';
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        const token = this.getAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.refreshTokenInProgress) {
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            }).then(() => {
              return this.client(originalRequest);
            }).catch((err) => {
              return Promise.reject(err);
            });
          }

          originalRequest._retry = true;
          this.refreshTokenInProgress = true;

          try {
            const refreshToken = this.getRefreshToken();
            if (!refreshToken) {
              throw new Error('No refresh token available');
            }

            const response = await this.refreshAuthToken(refreshToken);
            this.setTokens(response.data.session);
            
            // Retry failed requests
            this.failedQueue.forEach(({ resolve }) => {
              resolve();
            });
            this.failedQueue = [];

            return this.client(originalRequest);
          } catch (refreshError) {
            this.failedQueue.forEach(({ reject }) => {
              reject(refreshError);
            });
            this.failedQueue = [];
            
            // Clear tokens and redirect to login
            this.clearTokens();
            window.location.href = '/login';
            return Promise.reject(refreshError);
          } finally {
            this.refreshTokenInProgress = false;
          }
        }

        return Promise.reject(error);
      }
    );
  }

  // Token management
  private getAccessToken(): string | null {
    return localStorage.getItem('access_token');
  }

  private getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  }

  private setTokens(session: AuthTokens): void {
    localStorage.setItem('access_token', session.access_token);
    localStorage.setItem('refresh_token', session.refresh_token);
    localStorage.setItem('expires_at', session.expires_at.toString());
  }

  private clearTokens(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('expires_at');
  }

  private isTokenExpired(): boolean {
    const expiresAt = localStorage.getItem('expires_at');
    if (!expiresAt) return true;
    return Date.now() >= parseInt(expiresAt) * 1000;
  }

  // Authentication methods
  async signIn(credentials: LoginRequest): Promise<ApiResponse<{ user: User; session: AuthTokens }>> {
    try {
      const response = await this.client.post('/auth/signin', credentials);
      const { data } = response.data;
      this.setTokens(data.session);
      return response.data;
    } catch (error: any) {
      this.handleError(error, 'Sign in failed');
      throw error;
    }
  }

  async signUp(credentials: SignupRequest): Promise<ApiResponse<{ user: User; session: AuthTokens }>> {
    try {
      const response = await this.client.post('/auth/signup', credentials);
      const { data } = response.data;
      this.setTokens(data.session);
      return response.data;
    } catch (error: any) {
      this.handleError(error, 'Sign up failed');
      throw error;
    }
  }

  async signOut(): Promise<void> {
    try {
      await this.client.post('/auth/signout');
    } catch (error: any) {
      console.error('Sign out error:', error);
    } finally {
      this.clearTokens();
    }
  }

  async resetPassword(request: ResetPasswordRequest): Promise<ApiResponse> {
    try {
      const response = await this.client.post('/auth/reset-password', request);
      return response.data;
    } catch (error: any) {
      this.handleError(error, 'Password reset failed');
      throw error;
    }
  }

  async updatePassword(request: UpdatePasswordRequest): Promise<ApiResponse> {
    try {
      const response = await this.client.post('/auth/update-password', request);
      return response.data;
    } catch (error: any) {
      this.handleError(error, 'Password update failed');
      throw error;
    }
  }

  async refreshAuthToken(refreshToken: string): Promise<ApiResponse<{ session: AuthTokens }>> {
    try {
      const response = await this.client.post('/auth/refresh', { refresh_token: refreshToken });
      return response.data;
    } catch (error: any) {
      this.handleError(error, 'Token refresh failed');
      throw error;
    }
  }

  // Generic API methods
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.get(url, config);
      return response.data;
    } catch (error: any) {
      this.handleError(error, 'Request failed');
      throw error;
    }
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.post(url, data, config);
      return response.data;
    } catch (error: any) {
      this.handleError(error, 'Request failed');
      throw error;
    }
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.put(url, data, config);
      return response.data;
    } catch (error: any) {
      this.handleError(error, 'Request failed');
      throw error;
    }
  }

  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.patch(url, data, config);
      return response.data;
    } catch (error: any) {
      this.handleError(error, 'Request failed');
      throw error;
    }
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.delete(url, config);
      return response.data;
    } catch (error: any) {
      this.handleError(error, 'Request failed');
      throw error;
    }
  }

  // Error handling
  private handleError(error: any, defaultMessage: string): void {
    let message = defaultMessage;

    if (error.response?.data?.message) {
      message = error.response.data.message;
    } else if (error.response?.data?.error) {
      message = error.response.data.error;
    } else if (error.message) {
      message = error.message;
    }

    // Don't show toast for 401 errors (handled by interceptor)
    if (error.response?.status !== 401) {
      toast.error(message);
    }

    console.error('API Error:', {
      message,
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url,
    });
  }

  // Health check
  async healthCheck(): Promise<ApiResponse> {
    try {
      const response = await this.client.get('/health');
      return response.data;
    } catch (error: any) {
      console.error('Health check failed:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export types for use in components 
