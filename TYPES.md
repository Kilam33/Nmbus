# NIMBUS Application Types Documentation

This document provides a comprehensive overview of all types used throughout the NIMBUS inventory management application. These types should be used to design the database schema and ensure consistency between frontend and backend.

## Table of Contents

1. [Authentication & User Management](#authentication--user-management)
2. [Core Business Entities](#core-business-entities)
3. [Analytics & Reporting](#analytics--reporting)
4. [Inventory Management](#inventory-management)
5. [Order Management](#order-management)
6. [Supplier Management](#supplier-management)
7. [UI Components](#ui-components)
8. [Form Schemas](#form-schemas)
9. [Utility Types](#utility-types)

---

## Authentication & User Management

### User Types
```typescript
interface User {
  id: string;
  email: string;
  created_at: string;
  updated_at?: string;
  email_confirmed_at?: string;
  last_sign_in_at?: string;
  app_metadata?: {
    provider?: string;
    [key: string]: any;
  };
  user_metadata?: {
    [key: string]: any;
  };
}

interface PasswordRequirements {
  minLength: boolean;
  hasUpperCase: boolean;
  hasLowerCase: boolean;
  hasNumbers: boolean;
  hasSpecialChar: boolean;
}

interface PasswordValidationResult {
  isValid: boolean;
  requirements: PasswordRequirements;
}
```

### Authentication Context
```typescript
interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  validatePasswordStrength: (password: string) => PasswordValidationResult;
}
```

---

## Core Business Entities

### Product Types
```typescript
interface Product {
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
  // Extended properties for UI
  last_updated?: string;
  categories?: { name: string };
  suppliers?: { name: string };
}

interface ProductFormData {
  name: string;
  description?: string;
  price: number;
  quantity: number;
  category_id: string;
  supplier_id: string;
  low_stock_threshold?: number;
  SKU?: string;
}
```

### Category Types
```typescript
interface Category {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  // Extended properties for UI
  product_count?: number;
}

interface CategoryFormData {
  name: string;
  description?: string;
}
```

### Supplier Types
```typescript
interface Supplier {
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
  // Extended properties for UI
  productsSupplied?: number;
  code?: string;
}

interface SupplierFormData {
  name: string;
  email: string;
  phone: string;
  address: string;
  contactPerson: string;
  avgLeadTime: number;
}
```

---

## Analytics & Reporting

### Dashboard Data Types
```typescript
interface DashboardData {
  totalProducts: number;
  totalCategories: number;
  totalSuppliers: number;
  totalOrders: number;
  revenue: number;
  lowStockItems: number;
  revenueChange: number;
  ordersByStatus: OrderStatusCount[];
  productsByCategory: CategoryCount[];
  recentAlerts: AlertProps[];
  upcomingShipments: ShipmentProps[];
  inventoryTrends: InventoryTrend[];
  categoryBreakdown: CategoryBreakdown[];
  lowStockInventory: InventoryItemProps[];
  topSellingProducts: TopSellingProduct[];
  recentOrders: OrderProps[];
  orderStats: OrderStats;
  orderTrends: OrderTrend[];
}

interface OrderStatusCount {
  status: string;
  count: number;
}

interface CategoryCount {
  category: string;
  count: number;
}

interface InventoryTrend {
  name: string;
  products: number;
  revenue: number;
}

interface CategoryBreakdown {
  name: string;
  value: number;
  color: string;
}

interface OrderStats {
  pending: number;
  processing: number;
  shipped: number;
  delivered: number;
  cancelled: number;
}

interface OrderTrend {
  name: string;
  orders: number;
  revenue: number;
}
```

### Sales Analytics Types
```typescript
interface SalesData {
  date: string;
  revenue: number;
  orders: number;
  customers: number;
  avgOrderValue: number;
}

interface TopProduct {
  id: string;
  name: string;
  category: string;
  unitsSold: number;
  revenue: number;
  growth: number;
  color?: string;
}

interface SalesByCategory {
  category: string;
  revenue: number;
  percentage: number;
  color: string;
}
```

### Demand Analytics Types
```typescript
interface SalesData {
  date: string;
  actual: number;
  forecast: number;
}

interface ProductDemand {
  id: string;
  name: string;
  currentDemand: number;
  forecastedDemand: number;
  confidence: number;
  color?: string;
}
```

### Inventory Turnover Types
```typescript
interface TurnoverData {
  month: string;
  turnoverRate: number;
  avgInventory: number;
  costOfGoods: number;
  sales: number;
  daysToSell: number;
}

interface ProductTurnover {
  id: string;
  name: string;
  category: string;
  turnoverRate: number;
  avgInventory: number;
  costOfGoods: number;
  sales: number;
  daysToSell: number;
  status: 'excellent' | 'good' | 'fair' | 'poor';
  color?: string;
}

interface CategoryPerformance {
  category: string;
  turnoverRate: number;
  avgInventory: number;
  efficiency: number;
  color: string;
}
```

---

## Inventory Management

### Low Stock Types
```typescript
interface LowStockProduct {
  id: string;
  name: string;
  category: string;
  currentStock: number;
  minStock: number;
  reorderPoint: number;
  supplier: string;
  lastOrdered: string;
  daysUntilStockout: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  image?: string;
}
```

### Expiring Products Types
```typescript
interface ExpiringProduct {
  id: string;
  name: string;
  category: string;
  batchNumber: string;
  quantity: number;
  expirationDate: string;
  daysUntilExpiry: number;
  supplier: string;
  purchaseDate: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  image?: string;
  value: number;
}
```

### Reorder Suggestions Types
```typescript
interface ReorderSuggestion {
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
  image?: string;
}

interface SupplierInfo {
  name: string;
  rating: number;
  avgLeadTime: number;
  reliability: number;
  contactInfo: string;
}
```

---

## Order Management

### Order Types
```typescript
interface Order {
  id: string;
  supplier_id: string;
  product_id: string;
  quantity: number;
  status: 'pending' | 'completed' | 'cancelled' | 'processing' | 'shipped';
  created_at: string;
  updated_at?: string | null;
  order_number?: string | null;
  total?: number | null;
  // Extended properties for UI
  customer?: string;
  payment_method?: string;
  shipping_method?: string;
  items?: number;
  products?: Product;
  suppliers?: Supplier;
  itemsDetails?: OrderItemDetail[];
}

interface OrderFormData {
  supplier_id: string;
  product_id: string;
  quantity: number;
  status: 'pending' | 'completed' | 'cancelled' | 'processing' | 'shipped';
  customer: string;
  payment_method: string;
  shipping_method: string;
}

interface OrderItemDetail {
  id: string;
  name: string;
  quantity: number;
  price: number;
  sku: string | null;
}

interface OrderProps {
  id: number;
  orderNumber: string;
  customer: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  total: number;
  items: number;
  date: string;
  priority: 'high' | 'medium' | 'low';
}
```

---

## UI Components

### Alert Types
```typescript
interface AlertProps {
  children: React.ReactNode;
  type?: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  className?: string;
  onClose?: () => void;
}

interface AlertProps {
  id: number;
  message: string;
  severity: 'high' | 'medium' | 'low';
  timestamp?: string;
}
```

### StatCard Types
```typescript
interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  trend?: string | null;
  trendDirection?: 'positive' | 'negative' | 'neutral';
  onClick?: () => void;
  color?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'violet' | 'blue' | 'green' | 'yellow' | 'purple' | 'cyan';
  className?: string;
}
```

### Card Types
```typescript
interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  icon?: React.ComponentType<{ className?: string }>;
  action?: React.ReactNode;
  padding?: 'sm' | 'md' | 'lg';
}
```

### Navigation Types
```typescript
interface ProfileDropdownItemProps {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  className?: string;
}

interface NotificationProps {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error';
  time: string;
  isRead: boolean;
}

interface SearchResultProps {
  id: string;
  type: 'product' | 'order' | 'supplier';
  title: string;
  subtitle: string;
}

interface MobileMenuItemProps {
  icon: ReactNode;
  label: string;
  alert?: boolean;
  alertCount?: number;
  onClick?: () => void;
}
```

---

## Form Schemas

### Zod Schemas
```typescript
// Product Schema
const productSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  price: z.number().min(0, 'Price must be positive'),
  quantity: z.number().min(0, 'Quantity must be positive'),
  category_id: z.string().uuid(),
  supplier_id: z.string().uuid(),
  low_stock_threshold: z.number().min(0).default(10).optional(),
  SKU: z.string().optional(),
});

// Category Schema
const categorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Name must be less than 50 characters'),
  description: z.string().max(200, 'Description must be less than 200 characters').optional(),
});

// Supplier Schema
const supplierSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(1, 'Phone number is required'),
  address: z.string().min(1, 'Address is required'),
  contactPerson: z.string().min(1, 'Contact person is required'),
  avgLeadTime: z.number().min(1, 'Lead time must be at least 1 day'),
});

// Order Schema
const orderSchema = z.object({
  supplier_id: z.string().uuid('Supplier is required'),
  product_id: z.string().uuid('Product is required'),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  status: z.enum(['pending', 'completed', 'cancelled', 'processing', 'shipped']),
  customer: z.string().min(1, 'Customer is required'),
  payment_method: z.string().min(1, 'Payment method is required'),
  shipping_method: z.string().min(1, 'Shipping method is required'),
});
```

---

## Utility Types

### Common Enums
```typescript
type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
type SupplierStatus = 'active' | 'inactive' | 'on-hold' | 'new';
type Priority = 'critical' | 'high' | 'medium' | 'low';
type AlertType = 'success' | 'error' | 'warning' | 'info';
type TurnoverStatus = 'excellent' | 'good' | 'fair' | 'poor';
```

### Filter and Sort Types
```typescript
interface SortConfig {
  key: string;
  direction: 'asc' | 'desc' | 'ascending' | 'descending';
}

interface DateRange {
  start: string;
  end: string;
}
```

### Settings Types
```typescript
interface UserSettings {
  darkMode: boolean;
  notificationsEnabled: boolean;
  emailReports: boolean;
  lowStockThreshold: number;
  autoReorder: boolean;
  exportFormat: 'csv' | 'xlsx' | 'pdf';
  twoFactorAuth: boolean;
  timezone: string;
}

interface StorageUsage {
  used: number;
  total: number;
}
```

---

## Database Schema Recommendations

Based on the types above, here are the recommended database tables and their relationships:

### Core Tables
1. **users** - User authentication and profile data
2. **products** - Product inventory with relationships to categories and suppliers
3. **categories** - Product categorization
4. **suppliers** - Supplier information with performance metrics
5. **orders** - Order management with status tracking
6. **order_items** - Individual items within orders (many-to-many relationship)

### Analytics Tables
7. **sales_data** - Historical sales data for analytics
8. **inventory_turnover** - Turnover metrics by product/category
9. **demand_forecasts** - Demand prediction data
10. **reorder_suggestions** - AI-generated reorder recommendations

### Alert Tables
11. **alerts** - System alerts and notifications
12. **low_stock_alerts** - Low stock threshold alerts
13. **expiring_products** - Product expiration tracking

### Settings Tables
14. **user_settings** - User preferences and configuration
15. **system_settings** - Global system configuration

### Audit Tables
16. **audit_logs** - Activity tracking for compliance
17. **data_exports** - Export history and configuration

---

## Notes for Implementation

1. **UUIDs**: All primary keys should use UUIDs for security and scalability
2. **Timestamps**: Include `created_at` and `updated_at` fields on all tables
3. **Soft Deletes**: Consider implementing soft deletes for data retention
4. **Indexing**: Create indexes on frequently queried fields (SKU, status, dates)
5. **Foreign Keys**: Implement proper foreign key constraints for data integrity
6. **Enums**: Use database enums for status fields to ensure data consistency
7. **JSON Fields**: Consider using JSON fields for flexible metadata storage
8. **Partitioning**: Plan for table partitioning for large datasets (orders, sales_data)

This types documentation should serve as the foundation for building a robust and scalable database schema that supports all the frontend functionality.
