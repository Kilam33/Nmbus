import { apiClient } from '../lib/api';

// Types
export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  quantity: number;
  low_stock_threshold: number;
  category_id: string;
  supplier_id: string;
  sku?: string;
  created_at: string;
  updated_at?: string;
  categories?: { name: string };
  suppliers?: { name: string };
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  created_at: string;
  updated_at: string;
}

export interface ProductFilters {
  search?: string;
  category?: string;
  supplier?: string;
  lowStock?: boolean;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  limit?: number;
}

export interface CreateProductRequest {
  name: string;
  description?: string;
  price: number;
  quantity: number;
  low_stock_threshold?: number;
  category_id: string;
  supplier_id: string;
  sku?: string;
}

export interface UpdateProductRequest extends Partial<CreateProductRequest> {
  id: string;
}

export interface ProductsResponse {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

// Products Service
export class ProductsService {
  static async getProducts(filters: ProductFilters = {}) {
    const params = new URLSearchParams();
    
    if (filters.search) params.append('search', filters.search);
    if (filters.category) params.append('category', filters.category);
    if (filters.supplier) params.append('supplier', filters.supplier);
    if (filters.lowStock) params.append('lowStock', 'true');
    if (filters.minPrice) params.append('minPrice', filters.minPrice.toString());
    if (filters.maxPrice) params.append('maxPrice', filters.maxPrice.toString());
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());

    const url = `/products${params.toString() ? `?${params.toString()}` : ''}`;
    return apiClient.get<Product[]>(url);
  }

  static async getProduct(id: string) {
    return apiClient.get<Product>(`/products/${id}`);
  }

  static async createProduct(product: CreateProductRequest) {
    return apiClient.post<Product>('/products', product);
  }

  static async updateProduct(product: UpdateProductRequest) {
    const { id, ...data } = product;
    return apiClient.put<Product>(`/products/${id}`, data);
  }

  static async deleteProduct(id: string) {
    return apiClient.delete(`/products/${id}`);
  }

  static async updateStock(id: string, quantity: number) {
    return apiClient.patch<Product>(`/products/${id}/stock`, { quantity });
  }

  // Get low stock products
  static async getLowStockProducts(limit: number = 10): Promise<Product[]> {
    const response = await apiClient.get<Product[]>(`/products/low-stock?limit=${limit}`);
    return response.data;
  }

  // Get expiring products
  static async getExpiringProducts(days: number = 30, limit: number = 10): Promise<Product[]> {
    const response = await apiClient.get<Product[]>(`/products/expiring?days=${days}&limit=${limit}`);
    return response.data;
  }

  // Bulk operations
  static async bulkUpdate(products: Array<{ id: string; updates: Partial<CreateProductRequest> }>): Promise<Product[]> {
    const response = await apiClient.post<Product[]>(`/products/bulk-update`, { products });
    return response.data;
  }

  static async bulkDelete(ids: string[]): Promise<void> {
    await apiClient.post(`/products/bulk-delete`, { ids });
  }

  // Search products
  static async searchProducts(query: string, filters: Omit<ProductFilters, 'search'> = {}) {
    return ProductsService.getProducts({ ...filters, search: query });
  }

  // Get product statistics
  static async getStats(): Promise<{
    total_products: number;
    low_stock_count: number;
    out_of_stock_count: number;
    expiring_soon_count: number;
  }> {
    const response = await apiClient.get<{
      total_products: number;
      low_stock_count: number;
      out_of_stock_count: number;
      expiring_soon_count: number;
    }>('/products/stats');
    return response.data;
  }
} 