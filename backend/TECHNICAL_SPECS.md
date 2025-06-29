# NIMBUS Backend Technical Specifications

## Overview
This document provides comprehensive technical specifications for the NIMBUS Inventory Management Backend API, detailing the architecture, implementation patterns, and integration guidelines for frontend developers.

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [API Design Patterns](#api-design-patterns)
3. [Authentication & Security](#authentication--security)
4. [Data Models & Schemas](#data-models--schemas)
5. [Caching Strategy](#caching-strategy)
6. [Error Handling](#error-handling)
7. [Performance Optimization](#performance-optimization)
8. [Frontend Integration Guide](#frontend-integration-guide)
9. [Deployment Architecture](#deployment-architecture)
10. [Monitoring & Observability](#monitoring--observability)

---

## Architecture Overview

### Three-Tier Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   Database      │
│   (React/TS)    │◄──►│   (Express/TS)  │◄──►│   (Supabase)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   Redis Cache   │
                       └─────────────────┘
```

### Core Components

#### 1. API Layer (`src/api/`)
- **Route Handlers**: RESTful endpoints with OpenAPI documentation
- **Middleware Stack**: Authentication, validation, caching, rate limiting
- **Request/Response Processing**: Standardized API responses with pagination

#### 2. Service Layer (`src/services/`)
- **Business Logic**: Core application logic separated from HTTP concerns
- **Data Access**: Database operations with connection pooling
- **External Integrations**: Supabase Auth, Redis caching

#### 3. Data Layer
- **Database**: PostgreSQL via Supabase with optimized queries
- **Caching**: Redis with intelligent invalidation strategies
- **File Storage**: Supabase Storage for file uploads (if needed)

---

## API Design Patterns

### RESTful Design Principles

#### Resource Naming
```
GET    /api/v1/products           # Collection
GET    /api/v1/products/:id       # Resource
POST   /api/v1/products           # Create
PUT    /api/v1/products/:id       # Update (full)
PATCH  /api/v1/products/:id       # Update (partial)
DELETE /api/v1/products/:id       # Delete
```

#### Nested Resources
```
GET    /api/v1/suppliers/:id/products     # Supplier's products
GET    /api/v1/categories/:id/products    # Category's products
PATCH  /api/v1/orders/:id/status          # Update order status
```

### Standardized Response Format

#### Success Response
```typescript
interface ApiResponse<T> {
  success: true;
  data: T;
  message?: string;
  pagination?: PaginationMeta;
}
```

#### Error Response
```typescript
interface ApiErrorResponse {
  success: false;
  error: {
    message: string;
    code: string;
    statusCode: number;
    details?: any;
  };
}
```

#### Pagination Response
```typescript
interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}
```

### Query Parameters

#### Filtering
```
GET /api/v1/products?category=uuid&supplier=uuid&lowStock=true
GET /api/v1/orders?status=pending&dateFrom=2024-01-01&dateTo=2024-12-31
```

#### Sorting
```
GET /api/v1/products?sort=name&order=asc
GET /api/v1/orders?sort=created_at&order=desc
```

#### Pagination
```
GET /api/v1/products?page=1&limit=20
```

#### Search
```
GET /api/v1/products?search=wireless
GET /api/v1/suppliers?search=tech
```

---

## Authentication & Security

### JWT Authentication Flow

#### 1. Sign In Process
```typescript
// Request
POST /api/v1/auth/signin
{
  "email": "user@example.com",
  "password": "securePassword123"
}

// Response
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "created_at": "2024-01-01T00:00:00Z"
    },
    "session": {
      "access_token": "jwt-token",
      "refresh_token": "refresh-token",
      "expires_at": 1704067200
    }
  }
}
```

#### 2. Token Usage
```typescript
// All authenticated requests
Authorization: Bearer <access_token>
```

#### 3. Token Refresh
```typescript
POST /api/v1/auth/refresh
{
  "refresh_token": "refresh-token"
}
```

### Security Middleware Stack

#### 1. Rate Limiting
```typescript
// Default: 100 requests per 15 minutes
// Auth endpoints: 5 requests per 15 minutes
// Heavy operations: 10 requests per minute
```

#### 2. Input Validation
```typescript
// Zod schema validation for all inputs
const productSchema = z.object({
  name: z.string().min(1).max(100),
  price: z.number().positive(),
  quantity: z.number().int().min(0),
  category_id: z.string().uuid(),
  supplier_id: z.string().uuid()
});
```

#### 3. SQL Injection Prevention
```typescript
// Parameterized queries only
const result = await query(
  'SELECT * FROM products WHERE category_id = $1 AND price >= $2',
  [categoryId, minPrice]
);
```

---

## Data Models & Schemas

### Core Entities

#### Product Model
```typescript
interface Product {
  id: string;                    // UUID primary key
  name: string;                  // Product name (1-100 chars)
  SKU: string | null;            // Stock keeping unit (optional)
  description: string | null;    // Product description (max 500 chars)
  price: number;                 // Price (decimal, >= 0)
  quantity: number;              // Current stock (integer, >= 0)
  low_stock_threshold: number;   // Alert threshold (integer, >= 0)
  category_id: string;           // Foreign key to categories
  supplier_id: string;           // Foreign key to suppliers
  created_at: string;            // ISO timestamp
  updated_at?: string;           // ISO timestamp
  
  // Computed/joined fields
  categories?: { name: string };
  suppliers?: { name: string };
}
```

#### Category Model
```typescript
interface Category {
  id: string;                    // UUID primary key
  name: string;                  // Category name (1-50 chars, unique)
  description: string | null;    // Description (max 200 chars)
  created_at: string;            // ISO timestamp
  
  // Computed fields
  product_count?: number;        // Number of products in category
}
```

#### Supplier Model
```typescript
interface Supplier {
  id: string;                    // UUID primary key
  name: string;                  // Supplier name (1-100 chars)
  email: string;                 // Email (unique)
  phone: string;                 // Phone number (max 20 chars)
  address: string;               // Address (max 200 chars)
  contact_person: string;        // Contact person (max 100 chars)
  status: SupplierStatus;        // 'active' | 'inactive' | 'on-hold' | 'new'
  reliability_score: number;     // Score 0-100
  avg_lead_time: number;         // Days (integer, > 0)
  last_order_date: string | null; // ISO timestamp
  on_time_delivery_rate: number; // Percentage 0-100
  created_at: string;            // ISO timestamp
  
  // Computed fields
  productsSupplied?: number;     // Number of products supplied
}
```

#### Order Model
```typescript
interface Order {
  id: string;                    // UUID primary key
  supplier_id: string;           // Foreign key to suppliers
  product_id: string;            // Foreign key to products
  quantity: number;              // Order quantity (integer, > 0)
  status: OrderStatus;           // Order status enum
  customer: string;              // Customer name (max 100 chars)
  payment_method: string;        // Payment method (max 50 chars)
  shipping_method: string;       // Shipping method (max 50 chars)
  order_number: string | null;   // Generated order number
  total: number | null;          // Calculated total amount
  created_at: string;            // ISO timestamp
  updated_at?: string;           // ISO timestamp
  
  // Joined fields
  products?: Product;
  suppliers?: Supplier;
}
```

### Enums and Constants

```typescript
type OrderStatus = 'pending' | 'processing' | 'shipped' | 'completed' | 'cancelled';
type SupplierStatus = 'active' | 'inactive' | 'on-hold' | 'new';
type Priority = 'critical' | 'high' | 'medium' | 'low';
```

---

## Caching Strategy

### Multi-Level Caching Architecture

#### 1. Application-Level Caching
```typescript
// Cache configuration
const cacheConfig = {
  defaultTTL: 300,      // 5 minutes
  shortTTL: 60,         // 1 minute
  longTTL: 3600,        // 1 hour
  analyticsData: 600,   // 10 minutes
  productData: 300,     // 5 minutes
  userSessions: 86400,  // 24 hours
};
```

#### 2. Cache Key Patterns
```typescript
// Product caching
`product:${productId}`                    // Individual product
`products:list:${queryHash}`              // Product list queries
`products:low-stock`                      // Low stock products
`products:category:${categoryId}`         // Products by category

// Analytics caching
`analytics:dashboard:${userId}`           // User dashboard
`analytics:sales:${period}:${filters}`    // Sales analytics
`analytics:turnover:${period}`            // Inventory turnover

// Query result caching
`query:${queryHash}`                      // Generic query results
```

#### 3. Cache Invalidation Strategies
```typescript
// Product updates invalidate related caches
const invalidateProductCache = async (productId: string) => {
  await Promise.all([
    redisService.del(`product:${productId}`),
    redisService.delPattern('products:list:*'),
    redisService.delPattern('analytics:*'),
    redisService.del('products:low-stock')
  ]);
};
```

#### 4. Cache Middleware Usage
```typescript
// Route-level caching
router.get('/products', 
  productCache(300),           // 5-minute cache
  getProducts
);

router.get('/analytics/dashboard',
  analyticsCache(600),         // 10-minute cache
  getDashboardData
);
```

---

## Error Handling

### Error Classification

#### 1. Client Errors (4xx)
```typescript
// 400 Bad Request
throw new ValidationError('Invalid input data', validationDetails);

// 401 Unauthorized
throw new UnauthorizedError('Invalid or expired token');

// 403 Forbidden
throw new ForbiddenError('Insufficient permissions');

// 404 Not Found
throw new NotFoundError('Product not found');

// 409 Conflict
throw new ConflictError('SKU already exists');

// 429 Too Many Requests
// Handled by rate limiting middleware
```

#### 2. Server Errors (5xx)
```typescript
// 500 Internal Server Error
throw new DatabaseError('Database connection failed');
throw new CacheError('Redis connection failed');
```

### Error Response Format
```typescript
{
  "success": false,
  "error": {
    "message": "Validation failed",
    "code": "VALIDATION_ERROR",
    "statusCode": 400,
    "details": [
      {
        "field": "price",
        "message": "Price must be positive",
        "code": "invalid_type"
      }
    ]
  }
}
```

### Error Logging
```typescript
// Structured error logging
logger.error('API Error', {
  message: error.message,
  stack: error.stack,
  statusCode,
  code,
  url: req.url,
  method: req.method,
  userId: req.user?.id,
  requestId: req.id,
  timestamp: new Date().toISOString()
});
```

---

## Performance Optimization

### Database Optimization

#### 1. Connection Pooling
```typescript
const pool = new Pool({
  max: 20,                    // Maximum connections
  idleTimeoutMillis: 30000,   // Close idle connections
  connectionTimeoutMillis: 2000, // Connection timeout
});
```

#### 2. Query Optimization
```typescript
// Indexed queries
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_supplier ON products(supplier_id);
CREATE INDEX idx_products_low_stock ON products(quantity, low_stock_threshold);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);

// Efficient joins
SELECT p.*, c.name as category_name, s.name as supplier_name
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN suppliers s ON p.supplier_id = s.id
WHERE p.quantity <= p.low_stock_threshold;
```

#### 3. Batch Operations
```typescript
// Batch inserts/updates
const batchQuery = async (queries: QueryBatch[]) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const results = await Promise.all(
      queries.map(q => client.query(q.text, q.params))
    );
    await client.query('COMMIT');
    return results;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
```

### Request Optimization

#### 1. Response Compression
```typescript
// Gzip compression for responses > 1KB
app.use(compression({
  threshold: 1024,
  level: 6,
  memLevel: 8
}));
```

#### 2. Request Size Limits
```typescript
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
```

#### 3. Pagination
```typescript
// Default pagination limits
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

// Efficient pagination with OFFSET/LIMIT
const offset = (page - 1) * limit;
const query = `
  SELECT * FROM products 
  ORDER BY created_at DESC 
  LIMIT $1 OFFSET $2
`;
```

---

## Frontend Integration Guide

### API Client Setup

#### 1. Base Configuration
```typescript
// Frontend API client configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';
const API_VERSION = 'v1';

const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/${API_VERSION}`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});
```

#### 2. Authentication Interceptor
```typescript
// Request interceptor for auth token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Handle token refresh or redirect to login
      await refreshToken();
      return apiClient.request(error.config);
    }
    return Promise.reject(error);
  }
);
```

### Type-Safe API Calls

#### 1. Product Operations
```typescript
// Get products with filtering
const getProducts = async (params: ProductFilters & PaginationParams): Promise<ApiResponse<Product[]>> => {
  const response = await apiClient.get('/products', { params });
  return response.data;
};

// Create product
const createProduct = async (product: ProductCreateDto): Promise<ApiResponse<Product>> => {
  const response = await apiClient.post('/products', product);
  return response.data;
};

// Update product
const updateProduct = async (id: string, updates: ProductUpdateDto): Promise<ApiResponse<Product>> => {
  const response = await apiClient.put(`/products/${id}`, updates);
  return response.data;
};
```

#### 2. Real-time Data Fetching
```typescript
// React Query integration
const useProducts = (filters: ProductFilters) => {
  return useQuery({
    queryKey: ['products', filters],
    queryFn: () => getProducts(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Mutation with cache invalidation
const useCreateProduct = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries(['products']);
      queryClient.invalidateQueries(['analytics']);
    },
  });
};
```

### Error Handling

#### 1. Global Error Handler
```typescript
const handleApiError = (error: AxiosError<ApiErrorResponse>) => {
  const apiError = error.response?.data?.error;
  
  if (apiError) {
    switch (apiError.code) {
      case 'VALIDATION_ERROR':
        // Handle validation errors
        showValidationErrors(apiError.details);
        break;
      case 'UNAUTHORIZED_ERROR':
        // Redirect to login
        redirectToLogin();
        break;
      case 'NOT_FOUND_ERROR':
        // Show not found message
        showNotFoundError(apiError.message);
        break;
      default:
        // Show generic error
        showGenericError(apiError.message);
    }
  } else {
    // Network or other errors
    showNetworkError();
  }
};
```

#### 2. Form Validation Integration
```typescript
// Zod schema matching backend
const productSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  price: z.number().positive('Price must be positive'),
  quantity: z.number().int().min(0, 'Quantity cannot be negative'),
  category_id: z.string().uuid('Please select a category'),
  supplier_id: z.string().uuid('Please select a supplier'),
});

// React Hook Form integration
const form = useForm<ProductFormData>({
  resolver: zodResolver(productSchema),
});
```

---

## Deployment Architecture

### Production Environment

#### 1. Container Orchestration
```yaml
# Kubernetes deployment example
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nimbus-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nimbus-api
  template:
    metadata:
      labels:
        app: nimbus-api
    spec:
      containers:
      - name: api
        image: nimbus-api:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: nimbus-secrets
              key: database-url
        livenessProbe:
          httpGet:
            path: /api/v1/health/liveness
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/v1/health/readiness
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

#### 2. Load Balancer Configuration
```nginx
upstream nimbus_api {
    least_conn;
    server api-1:3000 max_fails=3 fail_timeout=30s;
    server api-2:3000 max_fails=3 fail_timeout=30s;
    server api-3:3000 max_fails=3 fail_timeout=30s;
}

server {
    listen 80;
    server_name api.nimbus.com;
    
    location /api/ {
        proxy_pass http://nimbus_api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Health check
        proxy_next_upstream error timeout http_500 http_502 http_503;
        proxy_connect_timeout 5s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

### Environment Configuration

#### 1. Production Environment Variables
```env
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=postgresql://user:pass@host:5432/nimbus
DB_POOL_SIZE=20
DB_TIMEOUT=30000

# Redis
REDIS_URL=redis://redis-cluster:6379
REDIS_CLUSTER_NODES=redis-1:6379,redis-2:6379,redis-3:6379

# Security
JWT_SECRET=production-secret-key-256-bits
CORS_ORIGINS=https://app.nimbus.com,https://admin.nimbus.com

# Monitoring
LOG_LEVEL=info
METRICS_ENABLED=true
SENTRY_DSN=https://your-sentry-dsn

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000
```

#### 2. Health Check Configuration
```typescript
// Kubernetes health checks
app.get('/api/v1/health/liveness', (req, res) => {
  res.json({ status: 'alive', timestamp: new Date().toISOString() });
});

app.get('/api/v1/health/readiness', async (req, res) => {
  try {
    await Promise.all([
      checkDatabaseHealth(),
      checkRedisHealth(),
    ]);
    res.json({ status: 'ready' });
  } catch (error) {
    res.status(503).json({ status: 'not ready', error: error.message });
  }
});
```

---

## Monitoring & Observability

### Metrics Collection

#### 1. Prometheus Metrics
```typescript
// Custom metrics
const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code', 'user_id'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
});

const databaseQueryDuration = new prometheus.Histogram({
  name: 'database_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['query_type', 'table'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
});

const cacheHitRate = new prometheus.Counter({
  name: 'cache_operations_total',
  help: 'Total number of cache operations',
  labelNames: ['operation', 'result'], // hit, miss, error
});
```

#### 2. Application Logging
```typescript
// Structured logging with Winston
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { 
    service: 'nimbus-api',
    version: process.env.npm_package_version 
  },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

// Request logging
app.use(morgan('combined', {
  stream: { write: (message) => logger.info(message.trim()) }
}));
```

#### 3. Performance Monitoring
```typescript
// Database query monitoring
const monitoredQuery = async (text: string, params: any[]) => {
  const start = Date.now();
  const queryType = text.split(' ')[0].toUpperCase();
  const table = extractTableName(text);
  
  try {
    const result = await pool.query(text, params);
    const duration = (Date.now() - start) / 1000;
    
    databaseQueryDuration
      .labels(queryType, table)
      .observe(duration);
    
    return result;
  } catch (error) {
    logger.error('Database query failed', {
      query: text,
      params,
      error: error.message,
      duration: Date.now() - start
    });
    throw error;
  }
};
```

### Alerting Rules

#### 1. Prometheus Alerting
```yaml
# prometheus-alerts.yml
groups:
  - name: nimbus-api
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status_code=~"5.."}[5m]) > 0.1
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} errors per second"
      
      - alert: DatabaseConnectionFailure
        expr: up{job="nimbus-api"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Database connection failed"
          description: "Cannot connect to database"
      
      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High response time"
          description: "95th percentile response time is {{ $value }}s"
```

#### 2. Log-based Alerts
```typescript
// Error rate monitoring
const errorRateAlert = (errorCount: number, totalRequests: number) => {
  const errorRate = errorCount / totalRequests;
  
  if (errorRate > 0.05) { // 5% error rate threshold
    logger.error('High error rate detected', {
      errorRate,
      errorCount,
      totalRequests,
      alert: 'HIGH_ERROR_RATE'
    });
    
    // Send to alerting system (Slack, PagerDuty, etc.)
    sendAlert({
      type: 'HIGH_ERROR_RATE',
      severity: 'warning',
      message: `Error rate is ${(errorRate * 100).toFixed(2)}%`,
      metadata: { errorCount, totalRequests }
    });
  }
};
```

---

## Integration Checklist

### Frontend Integration
- [ ] API client configured with base URL and timeout
- [ ] Authentication interceptors implemented
- [ ] Error handling for all API error codes
- [ ] Type definitions match backend schemas
- [ ] Pagination implemented for list endpoints
- [ ] Real-time updates with React Query or SWR
- [ ] Form validation using matching Zod schemas
- [ ] Loading states and error boundaries

### Backend Deployment
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Redis cache configured and connected
- [ ] Health check endpoints responding
- [ ] Monitoring and logging configured
- [ ] Rate limiting configured
- [ ] CORS origins configured
- [ ] SSL certificates installed (production)

### Performance Optimization
- [ ] Database indexes created
- [ ] Query performance optimized
- [ ] Caching strategy implemented
- [ ] Connection pooling configured
- [ ] Response compression enabled
- [ ] Static asset optimization
- [ ] CDN configured (if applicable)

### Security Checklist
- [ ] JWT secret configured securely
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention verified
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] Security headers implemented
- [ ] Sensitive data not logged
- [ ] API documentation access controlled

---

This technical specification provides a comprehensive guide for integrating with and deploying the NIMBUS backend API. For additional support or clarification on any aspect, refer to the API documentation at `/api-docs` or contact the development team.