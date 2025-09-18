import { 
  Product, 
  Transaction, 
  User, 
  AuthResponse, 
  ApiResponse,
  InventoryAlert,
  DashboardMetrics 
} from '../types';

const API_BASE_URL = 'http://localhost:3001/api/v1';

class ApiService {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    // Load tokens from localStorage on initialization
    this.accessToken = localStorage.getItem('access_token');
    this.refreshToken = localStorage.getItem('refresh_token');
  }

  // Clear all tokens
  public clearTokens(): void {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }

  // Check if tokens are valid
  private isTokenValid(token: string | null): boolean {
    if (!token) return false;
    try {
      // Basic JWT validation - check if it's not expired
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Math.floor(Date.now() / 1000);
      return payload.exp > now;
    } catch {
      return false;
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    console.log(`Making API request to: ${url}`);
    
    // Validate access token before making request
    // Temporarily disabled for debugging
    // if (this.accessToken && !this.isTokenValid(this.accessToken)) {
    //   console.log('Access token is invalid, clearing tokens');
    //   this.clearTokens();
    // }
    
    const config: RequestInit = {
      headers: {
        // Only set Content-Type for JSON, not for FormData
        ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...(this.accessToken && { Authorization: `Bearer ${this.accessToken}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(url, {
        ...config,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      console.log(`API response received: ${response.status} ${response.statusText}`);
      
      // Check if response has content before trying to parse JSON
      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        try {
          data = await response.json();
        } catch (jsonError) {
          // If JSON parsing fails, create a generic error response
          data = {
            success: false,
            error: {
              message: response.statusText || 'Unknown error occurred',
              statusCode: response.status
            }
          };
        }
      } else {
        // If not JSON, create a generic error response
        data = {
          success: false,
          error: {
            message: response.statusText || 'Unknown error occurred',
            statusCode: response.status
          }
        };
      }

      if (!response.ok) {
        if (response.status === 401) {
          if (this.refreshToken && this.isTokenValid(this.refreshToken)) {
            // Try to refresh token
            const refreshed = await this.refreshAccessToken();
            if (refreshed) {
              // Retry the original request
              config.headers = {
                ...config.headers,
                Authorization: `Bearer ${this.accessToken}`,
              };
              const retryResponse = await fetch(url, config);
              return await retryResponse.json();
            }
          }
          // If refresh fails or no refresh token, clear all tokens
          this.clearTokens();
        }
        throw new Error(data.error?.message || 'Request failed');
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      
      // Handle different types of errors
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.error('Request timed out after 10 seconds');
          throw new Error('Request timed out. Please check your connection and try again.');
        } else if (error.message.includes('Failed to fetch')) {
          console.error('Network error - server might be down');
          throw new Error('Unable to connect to server. Please check if the backend is running.');
        }
      }
      
      throw error;
    }
  }

  private async refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken) return false;

    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        this.setTokens(data.data.accessToken, data.data.refreshToken);
        return true;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
    }

    this.clearTokens();
    return false;
  }

  setTokens(accessToken: string, refreshToken: string) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
  }


  // Authentication
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await this.request<AuthResponse['data']>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (response.success) {
      this.setTokens(response.data.accessToken, response.data.refreshToken);
    }

    return response as AuthResponse;
  }

  async register(userData: {
    email: string;
    password: string;
    role: string;
    first_name: string;
    last_name: string;
    phone?: string;
    store_id?: string;
  }): Promise<AuthResponse> {
    const response = await this.request<AuthResponse['data']>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });

    if (response.success) {
      this.setTokens(response.data.accessToken, response.data.refreshToken);
    }

    return response as AuthResponse;
  }

  async getCurrentUser(): Promise<User> {
    const response = await this.request<{ success: boolean; data: { user: User } }>('/auth/me');
    return (response as any).data.user;
  }

  async logout() {
    this.clearTokens();
  }

  // Products
  async getProducts(params?: {
    store_id?: string;
    search?: string;
    category?: string;
    page?: number;
    limit?: number;
  }): Promise<{ products: Product[]; total: number; page: number; pages: number; limit: number }> {
    const queryParams = new URLSearchParams();
    if (params?.store_id) queryParams.append('store_id', params.store_id);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.category) queryParams.append('category', params.category);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const response = await this.request<{ success: boolean; data: { products: Product[]; total: number; page: number; pages: number } }>(`/products?${queryParams}`) as any;
    
    // Debug logging to see the actual response structure
    console.log('=== API DEBUG INFO ===');
    console.log('Full API Response:', response);
    console.log('Response type:', typeof response);
    console.log('Response keys:', Object.keys(response || {}));
    console.log('response.data:', response.data);
    console.log('response.data type:', typeof response.data);
    console.log('response.data keys:', response.data ? Object.keys(response.data) : 'response.data is null/undefined');
    console.log('response.data.data:', response.data?.data);
    console.log('response.data.data type:', typeof response.data?.data);
    console.log('response.data.data keys:', response.data?.data ? Object.keys(response.data.data) : 'response.data.data is null/undefined');
    console.log('=== END API DEBUG INFO ===');
    
    // Try different possible response structures
    let data;
    if (response.data?.products) {
      // Structure: { success: true, data: { products: [...], total: 897, ... } }
      data = response.data;
      console.log('Using response.data structure (nested data)');
    } else if (response.products) {
      // Structure: { products: [...], total: 897, ... } directly
      data = response;
      console.log('Using direct response structure');
    } else {
      console.error('No recognizable data structure found in API response:', response);
      throw new Error('Invalid API response structure - no products data found');
    }
    
    return {
      products: data.products || [],
      total: data.total || 0,
      page: data.page || 1,
      pages: data.pages || 1,
      limit: params?.limit || 20,
    };
  }

  async getProduct(id: string): Promise<Product> {
    const response = await this.request<Product>(`/products/${id}`);
    return response.data;
  }

  async getProductByBarcode(barcode: string): Promise<Product> {
    const response = await this.request<Product>(`/products/barcode/${barcode}`);
    return response.data;
  }

  async createProduct(productData: Partial<Product>, images?: File[]): Promise<Product> {
    console.log('Creating product with images:', images?.length || 0);
    
    // If there are images, use FormData, otherwise use JSON
    if (images && images.length > 0) {
      console.log('Using FormData for image upload');
      const formData = new FormData();
      
      // Add each product field individually to FormData
      console.log('Product data being sent:', productData);
      Object.keys(productData).forEach(key => {
        const value = productData[key as keyof Product];
        if (value !== undefined && value !== null) {
          if (typeof value === 'object') {
            formData.append(key, JSON.stringify(value));
            console.log(`Added ${key} as JSON:`, JSON.stringify(value));
          } else {
            formData.append(key, String(value));
            console.log(`Added ${key} as string:`, String(value));
          }
        }
      });
      
      // Add each image file
      images.forEach((image, index) => {
        console.log(`Adding image ${index + 1}:`, image.name, image.size, 'bytes');
        formData.append(`images`, image);
      });
      
      const response = await this.request<Product>('/products', {
        method: 'POST',
        body: formData,
      });
      console.log('Product created with images:', response.data);
      return response.data;
    } else {
      console.log('Using JSON request (no images)');
      // No images, use regular JSON request
      const response = await this.request<Product>('/products', {
        method: 'POST',
        body: JSON.stringify(productData),
      });
      console.log('Product created without images:', response.data);
      return response.data;
    }
  }

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product> {
    const response = await this.request<Product>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return response.data;
  }

  async deleteProduct(id: string): Promise<void> {
    await this.request(`/products/${id}`, {
      method: 'DELETE',
    });
  }

  async deleteAllProducts(storeId: string): Promise<{ deletedCount: number }> {
    const response = await this.request<{ success: boolean; data: { deletedCount: number } }>(`/products/bulk/all?store_id=${storeId}`, {
      method: 'DELETE',
    });
    
    console.log('Delete all products response:', response);
    
    // Handle the nested response structure
    const data = response.data?.data || response.data;
    
    if (!data || typeof data.deletedCount === 'undefined') {
      console.error('Invalid delete all products response:', response);
      throw new Error('Invalid response from delete all products API');
    }
    
    return { deletedCount: data.deletedCount };
  }

  // Export products to JSON file
  async exportProducts(storeId: string): Promise<Blob> {
    console.log('Exporting products for store:', storeId);
    
    const response = await fetch(`${API_BASE_URL}/products/export?store_id=${storeId}`, {
      method: 'GET',
      headers: {
        ...(this.accessToken && { Authorization: `Bearer ${this.accessToken}` }),
      },
    });

    if (!response.ok) {
      throw new Error(`Export failed: ${response.statusText}`);
    }

    return await response.blob();
  }

  // Import products from JSON file
  async importProducts(storeId: string, file: File): Promise<{ imported: number; errors: string[] }> {
    console.log('Importing products for store:', storeId);
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('store_id', storeId);

    const response = await this.request<{ success: boolean; data: { imported: number; errors: string[] } }>('/products/import', {
      method: 'POST',
      body: formData,
    });

    console.log('Import response:', response);
    
    // Handle the nested response structure
    const data = response.data?.data || response.data;
    
    if (!data) {
      console.error('Invalid import response:', response);
      throw new Error('Invalid response from import API');
    }
    
    return { imported: data.imported, errors: data.errors || [] };
  }

  // Inventory
  async getInventory(params?: {
    store_id?: string;
    page?: number;
    limit?: number;
  }): Promise<Product[]> {
    const queryParams = new URLSearchParams();
    if (params?.store_id) queryParams.append('store_id', params.store_id);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const response = await this.request<Product[]>(`/inventory?${queryParams}`);
    return response.data;
  }

  async getLowStockItems(store_id?: string): Promise<InventoryAlert[]> {
    const queryParams = new URLSearchParams();
    if (store_id) queryParams.append('store_id', store_id);

    const response = await this.request<InventoryAlert[]>(`/inventory/low-stock?${queryParams}`);
    return response.data;
  }

  async adjustInventory(
    productId: string,
    data: {
      store_id: string;
      movement_type: 'in' | 'out';
      quantity: number;
      reason: string;
      cost_per_unit?: number;
      notes?: string;
    }
  ): Promise<void> {
    await this.request(`/inventory/${productId}/adjust`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Transactions
  async getTransactions(params?: {
    store_id?: string;
    start_date?: string;
    end_date?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ transactions: Transaction[]; total: number; page: number; limit: number }> {
    const queryParams = new URLSearchParams();
    if (params?.store_id) queryParams.append('store_id', params.store_id);
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const response = await this.request<Transaction[]>(`/transactions?${queryParams}`);
    return {
      transactions: response.data,
      total: response.data.length,
      page: params?.page || 1,
      limit: params?.limit || 20,
    };
  }

  async createTransaction(transactionData: {
    store_id: string;
    customer_id?: string;
    items: Array<{
      product_id: string;
      quantity: number;
      unit_price: number;
    }>;
    discount_amount?: number;
    payment_method: 'cash' | 'card' | 'transfer';
    notes?: string;
  }): Promise<Transaction> {
    const response = await this.request<Transaction>('/transactions', {
      method: 'POST',
      body: JSON.stringify(transactionData),
    });
    return response.data;
  }

  async completeTransaction(transactionId: string): Promise<Transaction> {
    const response = await this.request<Transaction>(`/transactions/${transactionId}/complete`, {
      method: 'POST',
    });
    return response.data;
  }

  // Analytics
  async getDashboardAnalytics(store_id?: string, period?: string): Promise<DashboardMetrics> {
    const queryParams = new URLSearchParams();
    if (store_id) queryParams.append('store_id', store_id);
    if (period) queryParams.append('period', period);

    const response = await this.request<DashboardMetrics>(`/analytics/dashboard?${queryParams}`);
    return response.data;
  }

  async getSalesAnalytics(params?: {
    store_id?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<any> {
    const queryParams = new URLSearchParams();
    if (params?.store_id) queryParams.append('store_id', params.store_id);
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);

    const response = await this.request(`/analytics/sales?${queryParams}`);
    return response.data;
  }

  async getProductPerformance(store_id?: string, period?: string): Promise<any> {
    const queryParams = new URLSearchParams();
    if (store_id) queryParams.append('store_id', store_id);
    if (period) queryParams.append('period', period);

    const response = await this.request(`/analytics/products?${queryParams}`);
    return response.data;
  }

  async getInventoryAnalytics(store_id?: string): Promise<any> {
    const queryParams = new URLSearchParams();
    if (store_id) queryParams.append('store_id', store_id);

    const response = await this.request(`/analytics/inventory?${queryParams}`);
    return response.data;
  }

  // User Management Methods
  async getUsers(params?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    store_id?: string;
  }): Promise<{ users: User[]; total: number; page: number; pages: number }> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.role) queryParams.append('role', params.role);
    if (params?.store_id) queryParams.append('store_id', params.store_id);

    const response = await this.request<{ success: boolean; data: { users: User[]; total: number; page: number; pages: number } }>(`/users?${queryParams}`);
    return (response as any).data;
  }

  async getUserById(userId: string): Promise<User> {
    const response = await this.request<{ success: boolean; data: User }>(`/users/${userId}`);
    return (response as any).data;
  }

  async createUser(userData: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    role: 'admin' | 'cashier' | 'manager' | 'owner';
    phone?: string;
    store_id?: string;
  }): Promise<User> {
    const response = await this.request<{ success: boolean; data: User }>('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    return (response as any).data;
  }

  async updateUser(userId: string, userData: {
    email?: string;
    first_name?: string;
    last_name?: string;
    role?: 'admin' | 'cashier' | 'manager' | 'owner';
    phone?: string;
    is_active?: boolean;
    store_id?: string;
  }): Promise<User> {
    const response = await this.request<{ success: boolean; data: User }>(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
    return (response as any).data;
  }

  async updateUserPassword(userId: string, password: string): Promise<void> {
    await this.request(`/users/${userId}/password`, {
      method: 'PUT',
      body: JSON.stringify({ password }),
    });
  }

  async deleteUser(userId: string): Promise<void> {
    await this.request(`/users/${userId}`, {
      method: 'DELETE',
    });
  }

  async toggleUserStatus(userId: string): Promise<User> {
    const response = await this.request<{ success: boolean; data: User }>(`/users/${userId}/toggle-status`, {
      method: 'PATCH',
    });
    return (response as any).data;
  }

  async getUsersByRole(role: string): Promise<User[]> {
    const response = await this.request<{ success: boolean; data: User[] }>(`/users/role/${role}`);
    return (response as any).data;
  }

  // Expense Management Methods
  async getExpenses(params?: {
    page?: number;
    limit?: number;
    store_id?: string;
    category?: string;
    payment_method?: string;
    start_date?: string;
    end_date?: string;
    search?: string;
  }): Promise<{ expenses: any[]; total: number; page: number; pages: number }> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.store_id) queryParams.append('store_id', params.store_id);
    if (params?.category) queryParams.append('category', params.category);
    if (params?.payment_method) queryParams.append('payment_method', params.payment_method);
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);
    if (params?.search) queryParams.append('search', params.search);

    const response = await this.request<{ success: boolean; data: any[]; pagination: any }>(`/expenses?${queryParams}`);
    return {
      expenses: (response as any).data || [],
      total: (response as any).pagination?.total || 0,
      page: (response as any).pagination?.page || 1,
      pages: (response as any).pagination?.pages || 1,
    };
  }

  async getExpenseById(expenseId: string): Promise<any> {
    const response = await this.request<{ success: boolean; data: any }>(`/expenses/${expenseId}`);
    return (response as any).data;
  }

  async createExpense(expenseData: {
    store_id: string;
    date: string;
    product_name: string;
    unit: string;
    quantity: number;
    amount: number;
    currency?: string;
    payment_method: string;
    category?: string;
    description?: string;
    receipt_number?: string;
    vendor_name?: string;
  }): Promise<any> {
    const response = await this.request<{ success: boolean; data: any }>('/expenses', {
      method: 'POST',
      body: JSON.stringify(expenseData),
    });
    return (response as any).data;
  }

  async updateExpense(expenseId: string, expenseData: {
    date?: string;
    product_name?: string;
    unit?: string;
    quantity?: number;
    amount?: number;
    currency?: string;
    payment_method?: string;
    category?: string;
    description?: string;
    receipt_number?: string;
    vendor_name?: string;
  }): Promise<any> {
    const response = await this.request<{ success: boolean; data: any }>(`/expenses/${expenseId}`, {
      method: 'PUT',
      body: JSON.stringify(expenseData),
    });
    return (response as any).data;
  }

  async deleteExpense(expenseId: string): Promise<void> {
    await this.request(`/expenses/${expenseId}`, {
      method: 'DELETE',
    });
  }

  async getExpenseStats(params?: {
    store_id?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<any> {
    const queryParams = new URLSearchParams();
    if (params?.store_id) queryParams.append('store_id', params.store_id);
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);

    const response = await this.request<{ success: boolean; data: any }>(`/expenses/stats?${queryParams}`);
    return (response as any).data;
  }

  async getMonthlyExpenseSummary(year: number, storeId?: string): Promise<any[]> {
    const queryParams = new URLSearchParams();
    if (storeId) queryParams.append('store_id', storeId);

    const response = await this.request<{ success: boolean; data: any[] }>(`/expenses/monthly/${year}?${queryParams}`);
    return (response as any).data || [];
  }
}

export const apiService = new ApiService();
