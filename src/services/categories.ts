import { apiClient } from '../lib/api';

export interface Category {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at?: string;
}

export interface CreateCategoryRequest {
  name: string;
  description?: string;
}

export interface UpdateCategoryRequest extends Partial<CreateCategoryRequest> {
  id: string;
}

export class CategoriesService {
  static async getCategories() {
    return apiClient.get<Category[]>('/categories');
  }

  static async getCategory(id: string) {
    return apiClient.get<Category>(`/categories/${id}`);
  }

  static async createCategory(category: CreateCategoryRequest) {
    return apiClient.post<Category>('/categories', category);
  }

  static async updateCategory(category: UpdateCategoryRequest) {
    const { id, ...data } = category;
    return apiClient.put<Category>(`/categories/${id}`, data);
  }

  static async deleteCategory(id: string) {
    return apiClient.delete(`/categories/${id}`);
  }
} 