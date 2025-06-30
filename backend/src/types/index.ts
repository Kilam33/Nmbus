import { Request } from 'express';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: User;
      id?: string;
    }
  }
  
  var redisClient: any;
}

// Core Entity Types
export interface User {
  id: string;
  email: string;
  created_at: string;
  updated_at?: string;
  email_confirmed_at?: string;
  last_sign_in_at?: string;
  app_metadata?: Record<string, any>;
  user_metadata?: Record<string, any>;
}

export interface Product {
  id: string;
  name: string;
  SKU: string | null;
  description: string | null;
  price: number;
  quantity: number;
  low_stock_threshold: number;
  category_id: string;
  supplier_id: string;
  created_at: string;
  updated_at?: string;
  categories?: { name: string };
  suppliers?: { name: string };
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  product_count?: number;
}

export interface Supplier {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  created_at: string;
  status: 'active' | 'inactive' | 'on-hold' | 'new';
  reliability_score: number;
  avg_lead_time: number;
  last_order_date: string | null;
  on_time_delivery_rate: number;
  contact_person: string;
  productsSupplied?: number;
}

export interface Order {
  id: string;
  supplier_id: string;
  product_id: string;
  quantity: number;
  status: 'pending' | 'completed' | 'cancelled' | 'processing' | 'shipped';
  created_at: string;
  updated_at?: string | null;
  order_number?: string | null;
  total?: number | null;
  customer?: string;
  payment_method?: string;
  shipping_method?: string;
  products?: Product;
  suppliers?: Supplier;
}

// ===== REORDER TYPES =====

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

// ===== FORECASTING TYPES =====

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

export interface SeasonalPattern {
  month: number;
  factor: number;
  confidence: number;
}

export interface TrendAnalysis {
  direction: 'increasing' | 'decreasing' | 'stable';
  strength: number;
  confidence: number;
}

// ===== REORDER FILTER AND QUERY TYPES =====

export interface ReorderFilters {
  urgency?: 'all' | 'critical' | 'high' | 'medium' | 'low';
  category?: string;
  supplier?: string;
  minConfidence?: number;
  status?: 'pending' | 'approved' | 'rejected' | 'ordered';
  dateFrom?: string;
  dateTo?: string;
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

// ===== REORDER FORM DATA TYPES =====

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

// ===== REORDER DASHBOARD AND ANALYTICS TYPES =====

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

// ===== MACHINE LEARNING TYPES =====

export interface MLModelConfig {
  modelType: 'arima' | 'prophet' | 'lstm' | 'ensemble';
  parameters: {
    seasonality?: boolean;
    trend?: boolean;
    holidays?: boolean;
    changepoints?: number;
    seasonalityMode?: 'additive' | 'multiplicative';
  };
  trainingPeriod: number; // days
  validationSplit: number; // 0-1
  hyperparameters?: Record<string, any>;
}

export interface MLPrediction {
  productId: string;
  modelType: string;
  prediction: number[];
  confidence: number[];
  mape: number; // Mean Absolute Percentage Error
  rmse: number; // Root Mean Square Error
  mae: number;  // Mean Absolute Error
  modelVersion: string;
  trainingDate: string;
  features: string[];
}

export interface MLTrainingJob {
  id: string;
  productId?: string;
  modelType: string;
  status: 'queued' | 'training' | 'completed' | 'failed';
  progress: number; // 0-100
  startedAt: string;
  completedAt?: string;
  error?: string;
  metrics?: {
    mape: number;
    rmse: number;
    mae: number;
    r2: number;
  };
}

// ===== NOTIFICATION TYPES =====

export interface ReorderNotification {
  id: string;
  type: 'suggestion_created' | 'critical_stock' | 'analysis_completed' | 'order_approved';
  title: string;
  message: string;
  productId?: string;
  suggestionId?: string;
  urgency: 'critical' | 'high' | 'medium' | 'low';
  isRead: boolean;
  createdAt: string;
  actionUrl?: string;
}

export interface NotificationSettings {
  emailEnabled: boolean;
  slackEnabled: boolean;
  pushEnabled: boolean;
  criticalOnly: boolean;
  dailyDigest: boolean;
  weeklyReport: boolean;
}

// DTO Types
export interface ProductCreateDto {
  name: string;
  description?: string;
  price: number;
  quantity: number;
  category_id: string;
  supplier_id: string;
  low_stock_threshold?: number;
  SKU?: string;
}

export interface ProductUpdateDto extends Partial<ProductCreateDto> {}

export interface CategoryCreateDto {
  name: string;
  description?: string;
}

export interface CategoryUpdateDto extends Partial<CategoryCreateDto> {}

export interface SupplierCreateDto {
  name: string;
  email: string;
  phone: string;
  address: string;
  contact_person: string;
  avg_lead_time: number;
}

export interface SupplierUpdateDto extends Partial<SupplierCreateDto> {}

export interface OrderCreateDto {
  supplier_id: string;
  product_id: string;
  quantity: number;
  status: 'pending' | 'completed' | 'cancelled' | 'processing' | 'shipped';
  customer: string;
  payment_method: string;
  shipping_method: string;
}

export interface OrderUpdateDto extends Partial<OrderCreateDto> {}

// Filter Types
export interface ProductFilters {
  search?: string;
  category?: string;
  supplier?: string;
  lowStock?: boolean;
  minPrice?: number;
  maxPrice?: number;
  status?: string;
}

export interface OrderFilters {
  status?: string;
  supplier?: string;
  dateFrom?: string;
  dateTo?: string;
  customer?: string;
}

export interface SupplierFilters {
  status?: string;
  search?: string;
  minReliability?: number;
}

// Pagination
export interface Pagination {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Analytics Types
export interface DashboardData {
  totalProducts: number;
  totalCategories: number;
  totalSuppliers: number;
  totalOrders: number;
  revenue: number;
  lowStockItems: number;
  revenueChange: number;
  ordersByStatus: OrderStatusCount[];
  productsByCategory: CategoryCount[];
  recentOrders: Order[];
  topSellingProducts: TopSellingProduct[];
  lowStockProducts: Product[];
  inventoryTrends: InventoryTrend[];
}

export interface OrderStatusCount {
  status: string;
  count: number;
}

export interface CategoryCount {
  category: string;
  count: number;
}

export interface TopSellingProduct {
  id: string;
  name: string;
  category: string;
  unitsSold: number;
  revenue: number;
  growth: number;
}

export interface InventoryTrend {
  name: string;
  products: number;
  revenue: number;
}

export interface SalesAnalytics {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  revenueGrowth: number;
  ordersGrowth: number;
  dailySales: DailySalesData[];
  topProducts: TopSellingProduct[];
  categoryBreakdown: CategoryBreakdown[];
}

export interface DailySalesData {
  date: string;
  revenue: number;
  orders: number;
}

export interface CategoryBreakdown {
  name: string;
  value: number;
  percentage: number;
  color: string;
}

export interface TurnoverData {
  month: string;
  turnoverRate: number;
  avgInventory: number;
  costOfGoods: number;
  sales: number;
  daysToSell: number;
}

// Error Types
export interface ApiError {
  message: string;
  code: string;
  statusCode: number;
  details?: any;
}

// Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: ApiError;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Cache Types
export interface CacheOptions {
  ttl?: number;
  key?: string;
  tags?: string[];
}

// Health Check Types
export interface HealthCheck {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  services: {
    database: ServiceHealth;
    redis: ServiceHealth;
    memory: MemoryUsage;
  };
}

export interface ServiceHealth {
  status: 'OK' | 'ERROR';
  responseTime?: number;
  message?: string;
}

export interface MemoryUsage {
  rss: number;
  heapTotal: number;
  heapUsed: number;
  external: number;
  arrayBuffers: number;
}

// Sort Configuration
export interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

// Batch Operation Types
export interface BatchOperation<T> {
  operation: 'create' | 'update' | 'delete';
  data: T;
  id?: string;
}

export interface BatchResult<T> {
  successful: T[];
  failed: Array<{
    data: T;
    error: string;
  }>;
}