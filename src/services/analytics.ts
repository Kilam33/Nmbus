import { apiClient } from '../lib/api';

// Types
export interface DashboardStats {
  totalProducts: number;
  totalCategories: number;
  totalSuppliers: number;
  totalOrders: number;
  revenue: number;
  lowStockItems: number;
  revenueChange: number;
}

export interface OrderStats {
  pending: number;
  processing: number;
  shipped: number;
  delivered: number;
  cancelled: number;
}

export interface RevenueData {
  date: string;
  revenue: number;
  orders: number;
}

export interface CategoryBreakdown {
  name: string;
  value: number;
  color: string;
}

export interface TopProduct {
  id: string;
  name: string;
  sold: number;
  revenue: number;
  in_stock: number;
}

export interface InventoryTrend {
  name: string;
  products: number;
  revenue: number;
}

export interface OrderTrend {
  name: string;
  orders: number;
  revenue: number;
}

export interface AnalyticsFilters {
  start_date?: string;
  end_date?: string;
  category_id?: string;
  supplier_id?: string;
  period?: 'daily' | 'weekly' | 'monthly' | 'yearly';
}

// Analytics Service
class AnalyticsService {
  private baseUrl = '/analytics';

  // Get dashboard statistics
  async getDashboardStats(): Promise<DashboardStats> {
    const response = await apiClient.get<DashboardStats>(`${this.baseUrl}/dashboard`);
    return response.data;
  }

  // Get revenue data
  async getRevenueData(filters: AnalyticsFilters = {}): Promise<RevenueData[]> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    const url = `${this.baseUrl}/revenue?${params.toString()}`;
    const response = await apiClient.get<RevenueData[]>(url);
    return response.data;
  }

  // Get order statistics
  async getOrderStats(filters: AnalyticsFilters = {}): Promise<OrderStats> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    const url = `${this.baseUrl}/orders/stats?${params.toString()}`;
    const response = await apiClient.get<OrderStats>(url);
    return response.data;
  }

  // Get category breakdown
  async getCategoryBreakdown(filters: AnalyticsFilters = {}): Promise<CategoryBreakdown[]> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    const url = `${this.baseUrl}/categories/breakdown?${params.toString()}`;
    const response = await apiClient.get<CategoryBreakdown[]>(url);
    return response.data;
  }

  // Get top selling products
  async getTopProducts(limit: number = 10, filters: AnalyticsFilters = {}): Promise<TopProduct[]> {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    const url = `${this.baseUrl}/products/top?${params.toString()}`;
    const response = await apiClient.get<TopProduct[]>(url);
    return response.data;
  }

  // Get inventory trends
  async getInventoryTrends(filters: AnalyticsFilters = {}): Promise<InventoryTrend[]> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    const url = `${this.baseUrl}/inventory/trends?${params.toString()}`;
    const response = await apiClient.get<InventoryTrend[]>(url);
    return response.data;
  }

  // Get order trends
  async getOrderTrends(filters: AnalyticsFilters = {}): Promise<OrderTrend[]> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    const url = `${this.baseUrl}/orders/trends?${params.toString()}`;
    const response = await apiClient.get<OrderTrend[]>(url);
    return response.data;
  }

  // Get sales report
  async getSalesReport(filters: AnalyticsFilters = {}): Promise<{
    total_sales: number;
    total_orders: number;
    average_order_value: number;
    top_categories: CategoryBreakdown[];
    top_products: TopProduct[];
    revenue_trend: RevenueData[];
  }> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    const url = `${this.baseUrl}/sales/report?${params.toString()}`;
    const response = await apiClient.get<{
      total_sales: number;
      total_orders: number;
      average_order_value: number;
      top_categories: CategoryBreakdown[];
      top_products: TopProduct[];
      revenue_trend: RevenueData[];
    }>(url);
    return response.data;
  }

  // Get inventory turnover
  async getInventoryTurnover(filters: AnalyticsFilters = {}): Promise<{
    turnover_rate: number;
    average_days_to_sell: number;
    slow_moving_items: number;
    fast_moving_items: number;
    turnover_by_category: Array<{
      category: string;
      turnover_rate: number;
      items_count: number;
    }>;
  }> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    const url = `${this.baseUrl}/inventory/turnover?${params.toString()}`;
    const response = await apiClient.get<{
      turnover_rate: number;
      average_days_to_sell: number;
      slow_moving_items: number;
      fast_moving_items: number;
      turnover_by_category: Array<{
        category: string;
        turnover_rate: number;
        items_count: number;
      }>;
    }>(url);
    return response.data;
  }

  // Get supplier performance
  async getSupplierPerformance(filters: AnalyticsFilters = {}): Promise<Array<{
    supplier_id: string;
    supplier_name: string;
    total_orders: number;
    total_value: number;
    average_delivery_time: number;
    on_time_delivery_rate: number;
  }>> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    const url = `${this.baseUrl}/suppliers/performance?${params.toString()}`;
    const response = await apiClient.get<Array<{
      supplier_id: string;
      supplier_name: string;
      total_orders: number;
      total_value: number;
      average_delivery_time: number;
      on_time_delivery_rate: number;
    }>>(url);
    return response.data;
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService(); 