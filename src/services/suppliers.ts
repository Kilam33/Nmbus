import { apiClient } from '../lib/api';

export interface Supplier {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  created_at: string;
  status: 'pending' | 'completed' | 'active' | 'cancelled' | 'processing' | 'shipped';
  reliability_score: number;
  avg_lead_time: number;
  last_order_date?: string;
  on_time_delivery_rate: number;
  contact_person: string | null;
}

export interface CreateSupplierRequest {
  name: string;
  email: string;
  phone: string;
  address: string;
  contact_person?: string;
}

export interface UpdateSupplierRequest extends Partial<CreateSupplierRequest> {
  id: string;
}

export interface SupplierFilters {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export class SuppliersService {
  static async getSuppliers(filters: SupplierFilters = {}) {
    const params = new URLSearchParams();
    
    if (filters.search) params.append('search', filters.search);
    if (filters.status) params.append('status', filters.status);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());

    const url = `/suppliers${params.toString() ? `?${params.toString()}` : ''}`;
    return apiClient.get<Supplier[]>(url);
  }

  static async getSupplier(id: string) {
    return apiClient.get<Supplier>(`/suppliers/${id}`);
  }

  static async createSupplier(supplier: CreateSupplierRequest) {
    return apiClient.post<Supplier>('/suppliers', supplier);
  }

  static async updateSupplier(supplier: UpdateSupplierRequest) {
    const { id, ...data } = supplier;
    return apiClient.put<Supplier>(`/suppliers/${id}`, data);
  }

  static async deleteSupplier(id: string) {
    return apiClient.delete(`/suppliers/${id}`);
  }
} 