import { apiClient } from '../lib/api';

export interface Order {
  id: string;
  supplier_id: string;
  product_id: string;
  quantity: number;
  status: 'pending' | 'delivered' | 'cancelled' | 'processing' | 'shipped';
  created_at: string;
  updated_at?: string;
  order_number: string;
  total: number;
  supplier?: { name: string };
  product?: { name: string };
}

export interface CreateOrderRequest {
  supplier_id: string;
  product_id: string;
  quantity: number;
}

export interface UpdateOrderRequest extends Partial<CreateOrderRequest> {
  id: string;
  status?: string;
}

export interface OrderFilters {
  search?: string;
  status?: string;
  supplier?: string;
  page?: number;
  limit?: number;
}

export class OrdersService {
  static async getOrders(filters: OrderFilters = {}) {
    const params = new URLSearchParams();
    
    if (filters.search) params.append('search', filters.search);
    if (filters.status) params.append('status', filters.status);
    if (filters.supplier) params.append('supplier', filters.supplier);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());

    const url = `/orders${params.toString() ? `?${params.toString()}` : ''}`;
    return apiClient.get<Order[]>(url);
  }

  static async getOrder(id: string) {
    return apiClient.get<Order>(`/orders/${id}`);
  }

  static async createOrder(order: CreateOrderRequest) {
    return apiClient.post<Order>('/orders', order);
  }

  static async updateOrder(order: UpdateOrderRequest) {
    const { id, ...data } = order;
    return apiClient.put<Order>(`/orders/${id}`, data);
  }

  static async deleteOrder(id: string) {
    return apiClient.delete(`/orders/${id}`);
  }

  static async updateOrderStatus(id: string, status: string) {
    return apiClient.patch<Order>(`/orders/${id}/status`, { status });
  }
} 