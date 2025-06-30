import { apiClient } from '../lib/api';

// Import types from backend (these should match the backend types)
export interface ReorderSuggestion {
  id: string;
  product_id: string;
  supplier_id: string;
  suggested_quantity: number;
  estimated_cost: number;
  urgency: 'critical' | 'high' | 'medium' | 'low';
  confidence_score: number;
  reason: string;
  lead_time_days: number;
  status: 'pending' | 'approved' | 'rejected' | 'ordered';
  created_at: string;
  updated_at?: string;
  expires_at: string;
  created_by_ai: boolean;
  ai_model_version?: string;
  
  // Extended properties for UI
  product_name?: string;
  category_name?: string;
  supplier_name?: string;
  current_stock?: number;
  min_stock?: number;
  image?: string;
}

export interface ReorderPolicy {
  id: string;
  product_id?: string;
  category_id?: string;
  supplier_id?: string;
  min_stock_multiplier: number;
  max_order_quantity?: number;
  preferred_order_quantity?: number;
  safety_stock_days: number;
  review_frequency_days: number;
  auto_approve_threshold?: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  created_by?: string;
  
  // Extended properties for UI
  product_name?: string;
  category_name?: string;
  supplier_name?: string;
  scope: 'global' | 'category' | 'supplier' | 'product';
}

export interface DemandPattern {
  id: string;
  product_id: string;
  period_start: string;
  period_end: string;
  avg_daily_demand: number;
  peak_demand: number;
  demand_variance: number;
  seasonality_factor: number;
  trend_factor: number;
  calculated_at: string;
}

export interface ReorderHistory {
  id: string;
  suggestion_id?: string;
  product_id: string;
  suggested_quantity: number;
  actual_quantity_ordered?: number;
  suggested_cost: number;
  actual_cost?: number;
  action_taken: 'approved' | 'rejected' | 'modified' | 'auto_ordered';
  action_reason?: string;
  stockout_occurred: boolean;
  overstock_occurred: boolean;
  accuracy_score?: number;
  user_id?: string;
  created_at: string;
  
  // Extended properties for UI
  product_name?: string;
  user_name?: string;
}

export interface ReorderSettings {
  id: string;
  auto_reorder_enabled: boolean;
  analysis_frequency_hours: number;
  default_confidence_threshold: number;
  max_auto_approve_amount: number;
  notification_email?: string;
  slack_webhook_url?: string;
  created_at: string;
  updated_at: string;
  updated_by?: string;
}

export interface ForecastAccuracy {
  id: string;
  product_id: string;
  forecast_date: string;
  forecasted_demand: number;
  actual_demand: number;
  accuracy_score: number;
  model_version: string;
  created_at: string;
}

// Add missing types from backend
export interface DemandForecast {
  productId: string;
  horizon: number;
  avgDailyDemand: number;
  forecastedDemand: number[];
  confidence: number;
  trendDirection: 'increasing' | 'decreasing' | 'stable';
  seasonalityFactor: number;
  daysUntilStockout: number;
  confidenceIntervals?: {
    lower: number[];
    upper: number[];
  };
  externalFactors?: {
    holidays: boolean;
    promotions: boolean;
    marketTrends: number;
  };
  metadata: {
    dataPoints: number;
    modelAccuracy: number;
    lastUpdated: string;
  };
}

export interface ForecastOptions {
  horizon: number;
  includeConfidenceIntervals?: boolean;
  includeSeasonality?: boolean;
  includeExternalFactors?: boolean;
}

export interface ReorderSummary {
  total_suggestions: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  total_estimated_cost: number;
  avg_confidence: number;
}

export interface ReorderFilters {
  urgency?: 'all' | 'critical' | 'high' | 'medium' | 'low';
  category?: string;
  supplier?: string;
  minConfidence?: number;
  status?: 'pending' | 'approved' | 'rejected' | 'ordered';
  dateFrom?: string;
  dateTo?: string;
}

export interface AnalysisJob {
  id: string;
  estimatedCompletion: string;
  status: 'started' | 'running' | 'completed' | 'failed';
  userId?: string;
  scope?: string;
  targetId?: string;
  urgencyOnly?: boolean;
  suggestionsCount?: number;
  error?: string;
}

// Form data types
export interface ReorderPolicyFormData {
  product_id?: string;
  category_id?: string;
  supplier_id?: string;
  min_stock_multiplier: number;
  max_order_quantity?: number;
  preferred_order_quantity?: number;
  safety_stock_days: number;
  review_frequency_days: number;
  auto_approve_threshold?: number;
  is_active: boolean;
}

export interface ReorderSettingsFormData {
  auto_reorder_enabled: boolean;
  analysis_frequency_hours: number;
  default_confidence_threshold: number;
  max_auto_approve_amount: number;
  notification_email?: string;
  slack_webhook_url?: string;
}

export interface SuggestionActionData {
  action: 'approve' | 'reject' | 'modify';
  reason?: string;
  modifications?: {
    quantity?: number;
    supplier_id?: string;
    notes?: string;
  };
}

// Dashboard and analytics types
export interface ReorderDashboardData {
  pending_suggestions: number;
  critical_suggestions: number;
  high_suggestions: number;
  total_estimated_cost: number;
  avg_confidence: number;
  approved_this_week: number;
  rejected_this_week: number;
}

export interface ReorderInsights {
  totalSuggestions: number;
  averageConfidence: number;
  totalEstimatedCost: number;
  urgencyBreakdown: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  topCategories: Array<{
    category: string;
    count: number;
    totalCost: number;
  }>;
  topSuppliers: Array<{
    supplier: string;
    count: number;
    totalCost: number;
    avgLeadTime: number;
  }>;
  accuracyTrends: Array<{
    date: string;
    accuracy: number;
  }>;
  costSavings: {
    preventedStockouts: number;
    optimizedOrders: number;
    totalSavings: number;
  };
}

// Use the same ApiResponse type as the backend for consistency
export interface ReorderApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    message: string;
    code: string;
    statusCode: number;
    details?: any;
  };
}

export interface ReorderSuggestionsResponse extends ReorderApiResponse {
  data: {
    suggestions: ReorderSuggestion[];
    summary: ReorderSummary;
  };
}

export interface ReorderAnalysisResponse extends ReorderApiResponse {
  data: {
    jobId: string;
    estimatedCompletion: string;
    status: string;
  };
}

// Reorder Service Class
export class ReorderService {
  // Get reorder suggestions with filters
  static async getSuggestions(filters: ReorderFilters = {}) {
    const params = new URLSearchParams();
    
    if (filters.urgency && filters.urgency !== 'all') params.append('urgency', filters.urgency);
    if (filters.category) params.append('category', filters.category);
    if (filters.supplier) params.append('supplier', filters.supplier);
    if (filters.minConfidence) params.append('min_confidence', filters.minConfidence.toString());
    if (filters.status) params.append('status', filters.status);
    if (filters.dateFrom) params.append('date_from', filters.dateFrom);
    if (filters.dateTo) params.append('date_to', filters.dateTo);

    const url = `/reorder/suggestions${params.toString() ? `?${params.toString()}` : ''}`;
    return apiClient.get<{ suggestions: ReorderSuggestion[]; summary: ReorderSummary }>(url);
  }

  // Trigger AI reorder analysis
  static async triggerAnalysis(params: {
    scope?: 'all' | 'category' | 'supplier' | 'product';
    target_id?: string;
    urgency_only?: boolean;
  } = {}) {
    return apiClient.post<{ jobId: string; estimatedCompletion: string; status: string }>('/reorder/analyze', params);
  }

  // Process a reorder suggestion (approve, reject, modify)
  static async processSuggestion(suggestionId: string, actionData: SuggestionActionData) {
    return apiClient.post(`/reorder/suggestions/${suggestionId}/action`, actionData);
  }

  // Get reorder policies
  static async getPolicies() {
    return apiClient.get<ReorderPolicy[]>('/reorder/policies');
  }

  // Create a new reorder policy
  static async createPolicy(policyData: ReorderPolicyFormData) {
    return apiClient.post<ReorderPolicy>('/reorder/policies', policyData);
  }

  // Get demand forecast for a product
  static async getForecast(productId: string, options: ForecastOptions = { horizon: 30 }) {
    const params = new URLSearchParams();
    params.append('days', options.horizon.toString());
    params.append('include_confidence_intervals', (options.includeConfidenceIntervals !== false).toString());
    
    const url = `/reorder/forecast/${productId}?${params.toString()}`;
    return apiClient.get<DemandForecast>(url);
  }

  // Get auto-generated orders
  static async getAutoOrders(filters: {
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  } = {}) {
    const params = new URLSearchParams();
    
    if (filters.status) params.append('status', filters.status);
    if (filters.dateFrom) params.append('date_from', filters.dateFrom);
    if (filters.dateTo) params.append('date_to', filters.dateTo);

    const url = `/reorder/auto-orders${params.toString() ? `?${params.toString()}` : ''}`;
    return apiClient.get<any[]>(url);
  }

  // Get reorder settings
  static async getSettings() {
    return apiClient.get<ReorderSettings>('/reorder/settings');
  }

  // Update reorder settings
  static async updateSettings(settings: ReorderSettingsFormData) {
    return apiClient.put<ReorderSettings>('/reorder/settings', settings);
  }

  // Get analysis job status
  static async getJobStatus(jobId: string) {
    return apiClient.get<AnalysisJob>(`/reorder/job/${jobId}`);
  }

  // Bulk actions
  static async bulkApprove(suggestionIds: string[]) {
    const promises = suggestionIds.map(id => 
      this.processSuggestion(id, { action: 'approve' })
    );
    
    const results = await Promise.allSettled(promises);
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    return {
      success: failed === 0,
      data: { successful, failed, total: suggestionIds.length },
      message: `Successfully processed ${successful} suggestions${failed > 0 ? `, ${failed} failed` : ''}`
    };
  }

  static async bulkReject(suggestionIds: string[], reason: string) {
    const promises = suggestionIds.map(id => 
      this.processSuggestion(id, { action: 'reject', reason })
    );
    
    const results = await Promise.allSettled(promises);
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    return {
      success: failed === 0,
      data: { successful, failed, total: suggestionIds.length },
      message: `Successfully rejected ${successful} suggestions${failed > 0 ? `, ${failed} failed` : ''}`
    };
  }

  // Export suggestions
  static async exportSuggestions(filters: ReorderFilters = {}, format: 'csv' | 'excel' = 'csv'): Promise<Blob> {
    const params = new URLSearchParams();
    params.append('format', format);
    
    if (filters.urgency && filters.urgency !== 'all') params.append('urgency', filters.urgency);
    if (filters.category) params.append('category', filters.category);
    if (filters.supplier) params.append('supplier', filters.supplier);
    if (filters.minConfidence) params.append('min_confidence', filters.minConfidence.toString());
    if (filters.status) params.append('status', filters.status);

    const response = await fetch(`${apiClient['baseURL']}/reorder/suggestions/export?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      },
    });

    if (!response.ok) {
      throw new Error('Export failed');
    }

    return response.blob();
  }

  // Send email notifications
  static async sendEmailNotification(suggestionIds: string[], recipients: string[]) {
    return apiClient.post('/reorder/notifications/email', {
      suggestion_ids: suggestionIds,
      recipients
    });
  }
} 