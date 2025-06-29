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

export interface ReorderSuggestion {
  id: string;
  productName: string;
  category: string;
  supplier: string;
  currentStock: number;
  minStock: number;
  suggestedQuantity: number;
  estimatedCost: number;
  urgency: 'critical' | 'high' | 'medium' | 'low';
  confidence: number;
  reason: string;
  lastOrderDate: string;
  leadTime: number;
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