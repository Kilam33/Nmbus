# NIMBUS Backend Development Instructions

## Overview
Build a high-performance Node.js backend for the NIMBUS inventory management system with a three-tier architecture: Frontend API → Backend Service → Database API, featuring Redis caching, optimized request handling, and comprehensive CRUD operations.

## Architecture Design

### Three-Tier Architecture
```
Frontend (React) → Backend API (Express) → Database API (Supabase/PostgreSQL)
                    ↓
                Redis Cache Layer
```

### Technology Stack
- **Runtime**: Node.js 18+ with TypeScript
- **Framework**: Express.js with Express-async-handler
- **Database**: Supabase (PostgreSQL) with Prisma ORM
- **Caching**: Redis with Redis Cluster for high availability
- **Authentication**: JWT with Supabase Auth integration
- **Validation**: Zod schemas (matching frontend)
- **Rate Limiting**: Express-rate-limit with Redis store
- **Monitoring**: Winston logging + Prometheus metrics
- **Testing**: Jest + Supertest
- **Documentation**: Swagger/OpenAPI 3.0

## Project Structure
```
src/
├── api/                    # API routes
│   ├── v1/
│   │   ├── auth.ts
│   │   ├── products.ts
│   │   ├── categories.ts
│   │   ├── suppliers.ts
│   │   ├── orders.ts
│   │   ├── analytics.ts
│   │   └── settings.ts
├── services/              # Business logic
│   ├── auth.service.ts
│   ├── product.service.ts
│   ├── analytics.service.ts
│   ├── cache.service.ts
│   └── notification.service.ts
├── models/               # Data models
│   ├── product.model.ts
│   ├── order.model.ts
│   └── analytics.model.ts
├── middleware/           # Custom middleware
│   ├── auth.middleware.ts
│   ├── cache.middleware.ts
│   ├── rate-limit.middleware.ts
│   └── validation.middleware.ts
├── utils/               # Utility functions
│   ├── redis.utils.ts
│   ├── database.utils.ts
│   └── response.utils.ts
├── config/              # Configuration
│   ├── database.config.ts
│   ├── redis.config.ts
│   └── app.config.ts
└── types/               # TypeScript types
    └── index.ts
```

## Core Features Implementation

### 1. Authentication & Authorization
```typescript
// Implement JWT-based auth with Supabase integration
interface AuthService {
  validateToken(token: string): Promise<User>;
  refreshToken(refreshToken: string): Promise<AuthResponse>;
  revokeToken(token: string): Promise<void>;
}

// Middleware for protected routes
const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) throw new UnauthorizedError('No token provided');
  
  const user = await authService.validateToken(token);
  req.user = user;
  next();
};
```

### 2. Redis Caching Strategy
```typescript
// Multi-level caching with TTL
interface CacheService {
  // Product caching
  getProduct(id: string): Promise<Product | null>;
  setProduct(id: string, product: Product, ttl?: number): Promise<void>;
  invalidateProduct(id: string): Promise<void>;
  
  // Analytics caching
  getAnalytics(key: string): Promise<AnalyticsData | null>;
  setAnalytics(key: string, data: AnalyticsData, ttl: number): Promise<void>;
  
  // Query result caching
  getQueryResult(hash: string): Promise<any>;
  setQueryResult(hash: string, result: any, ttl: number): Promise<void>;
}

// Cache middleware
const cacheMiddleware = (ttl: number = 300) => async (req: Request, res: Response, next: NextFunction) => {
  const key = `api:${req.method}:${req.originalUrl}:${req.user?.id || 'anonymous'}`;
  const cached = await cacheService.get(key);
  
  if (cached) {
    return res.json(cached);
  }
  
  // Store original send method
  const originalSend = res.json;
  res.json = function(data) {
    cacheService.set(key, data, ttl);
    return originalSend.call(this, data);
  };
  
  next();
};
```

### 3. Database API Layer
```typescript
// Abstract database operations
interface DatabaseService {
  // Products
  getProducts(filters: ProductFilters, pagination: Pagination): Promise<ProductResult>;
  getProductById(id: string): Promise<Product>;
  createProduct(product: CreateProductDto): Promise<Product>;
  updateProduct(id: string, updates: UpdateProductDto): Promise<Product>;
  deleteProduct(id: string): Promise<void>;
  
  // Analytics
  getDashboardData(userId: string): Promise<DashboardData>;
  getSalesAnalytics(filters: AnalyticsFilters): Promise<SalesAnalytics>;
  getInventoryTurnover(filters: TurnoverFilters): Promise<TurnoverData[]>;
  
  // Orders
  getOrders(filters: OrderFilters, pagination: Pagination): Promise<OrderResult>;
  createOrder(order: CreateOrderDto): Promise<Order>;
  updateOrderStatus(id: string, status: OrderStatus): Promise<Order>;
}
```

### 4. Optimized Request Handling
```typescript
// Request batching and debouncing
class RequestBatcher {
  private batchQueue: Map<string, Array<{resolve: Function, reject: Function}>> = new Map();
  private batchTimeout: Map<string, NodeJS.Timeout> = new Map();
  
  async batchRequest<T>(key: string, operation: () => Promise<T>, delay: number = 50): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.batchQueue.has(key)) {
        this.batchQueue.set(key, []);
        this.batchTimeout.set(key, setTimeout(() => this.processBatch(key), delay));
      }
      
      this.batchQueue.get(key)!.push({ resolve, reject });
    });
  }
  
  private async processBatch(key: string) {
    const batch = this.batchQueue.get(key)!;
    this.batchQueue.delete(key);
    this.batchTimeout.delete(key);
    
    try {
      const result = await this.executeBatch(key, batch.length);
      batch.forEach(({ resolve }) => resolve(result));
    } catch (error) {
      batch.forEach(({ reject }) => reject(error));
    }
  }
}

// Connection pooling
const dbPool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20, // Maximum number of clients
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

## API Endpoints Design

### 1. Products API
```typescript
// GET /api/v1/products
// GET /api/v1/products/:id
// POST /api/v1/products
// PUT /api/v1/products/:id
// DELETE /api/v1/products/:id
// GET /api/v1/products/low-stock
// GET /api/v1/products/expiring-soon

router.get('/products', 
  requireAuth, 
  cacheMiddleware(300), 
  validateQuery(productQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 10, search, category, supplier, lowStock } = req.query;
    const filters = { search, category, supplier, lowStock };
    const pagination = { page: parseInt(page), limit: parseInt(limit) };
    
    const products = await productService.getProducts(filters, pagination);
    res.json(products);
  })
);
```

### 2. Analytics API
```typescript
// GET /api/v1/analytics/dashboard
// GET /api/v1/analytics/sales
// GET /api/v1/analytics/inventory-turnover
// GET /api/v1/analytics/demand-forecast
// GET /api/v1/analytics/reorder-suggestions

router.get('/analytics/dashboard',
  requireAuth,
  cacheMiddleware(600), // 10 minutes cache
  asyncHandler(async (req: Request, res: Response) => {
    const dashboardData = await analyticsService.getDashboardData(req.user.id);
    res.json(dashboardData);
  })
);
```

### 3. Orders API
```typescript
// GET /api/v1/orders
// POST /api/v1/orders
// PUT /api/v1/orders/:id
// PATCH /api/v1/orders/:id/status
// GET /api/v1/orders/:id

router.post('/orders',
  requireAuth,
  validateBody(orderCreateSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const order = await orderService.createOrder({
      ...req.body,
      userId: req.user.id
    });
    
    // Invalidate related caches
    await cacheService.invalidatePattern('analytics:*');
    await cacheService.invalidatePattern('products:*');
    
    res.status(201).json(order);
  })
);
```

## Performance Optimizations

### 1. Database Query Optimization
```typescript
// Implement query optimization
class QueryOptimizer {
  static optimizeProductQuery(filters: ProductFilters): string {
    let query = `
      SELECT p.*, c.name as category_name, s.name as supplier_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE 1=1
    `;
    
    if (filters.search) {
      query += ` AND (p.name ILIKE $1 OR p.sku ILIKE $1)`;
    }
    
    if (filters.category) {
      query += ` AND p.category_id = $2`;
    }
    
    query += ` ORDER BY p.created_at DESC`;
    
    return query;
  }
  
  static async batchQueries(queries: Array<{sql: string, params: any[]}>): Promise<any[]> {
    const client = await dbPool.connect();
    try {
      await client.query('BEGIN');
      const results = await Promise.all(
        queries.map(q => client.query(q.sql, q.params))
      );
      await client.query('COMMIT');
      return results.map(r => r.rows);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
```

### 2. Redis Caching Patterns
```typescript
// Cache invalidation strategies
class CacheManager {
  static async invalidateProductCache(productId: string): Promise<void> {
    const patterns = [
      `product:${productId}`,
      'products:list:*',
      'analytics:dashboard:*',
      'analytics:low-stock:*'
    ];
    
    await Promise.all(
      patterns.map(pattern => cacheService.delPattern(pattern))
    );
  }
  
  static async warmCache(): Promise<void> {
    // Pre-populate frequently accessed data
    const dashboardData = await analyticsService.getDashboardData();
    await cacheService.set('analytics:dashboard:global', dashboardData, 3600);
    
    const lowStockProducts = await productService.getLowStockProducts();
    await cacheService.set('products:low-stock', lowStockProducts, 1800);
  }
}
```

### 3. Rate Limiting & Throttling
```typescript
// Implement intelligent rate limiting
const rateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP',
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: (...args: string[]) => redisClient.call(...args),
  }),
  skip: (req: Request) => {
    // Skip rate limiting for certain endpoints
    return req.path.startsWith('/api/v1/health');
  },
  keyGenerator: (req: Request) => {
    // Use user ID if authenticated, otherwise IP
    return req.user?.id || req.ip;
  }
};

const rateLimiter = rateLimit(rateLimitConfig);
```

## Error Handling & Monitoring

### 1. Centralized Error Handling
```typescript
// Global error handler
const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error({
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    userId: req.user?.id,
    timestamp: new Date().toISOString()
  });
  
  if (err instanceof ValidationError) {
    return res.status(400).json({
      error: 'Validation Error',
      details: err.details
    });
  }
  
  if (err instanceof UnauthorizedError) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: err.message
    });
  }
  
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message
  });
};
```

### 2. Health Checks & Monitoring
```typescript
// Health check endpoints
router.get('/health', async (req: Request, res: Response) => {
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      database: await checkDatabaseHealth(),
      redis: await checkRedisHealth(),
      memory: process.memoryUsage()
    }
  };
  
  const isHealthy = Object.values(health.services).every(service => service.status === 'OK');
  res.status(isHealthy ? 200 : 503).json(health);
});

router.get('/metrics', async (req: Request, res: Response) => {
  const metrics = await prometheusClient.register.metrics();
  res.set('Content-Type', prometheusClient.register.contentType);
  res.end(metrics);
});
```

## Security Implementation

### 1. Input Validation & Sanitization
```typescript
// Use Zod schemas for validation
const productCreateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  price: z.number().positive(),
  quantity: z.number().int().min(0),
  category_id: z.string().uuid(),
  supplier_id: z.string().uuid(),
  low_stock_threshold: z.number().int().min(0).default(10),
  sku: z.string().max(50).optional()
});

const validateBody = (schema: z.ZodSchema) => async (req: Request, res: Response, next: NextFunction) => {
  try {
    req.body = await schema.parseAsync(req.body);
    next();
  } catch (error) {
    next(new ValidationError('Invalid request body', error));
  }
};
```

### 2. SQL Injection Prevention
```typescript
// Use parameterized queries
const getProducts = async (filters: ProductFilters): Promise<Product[]> => {
  const query = `
    SELECT * FROM products 
    WHERE ($1::text IS NULL OR name ILIKE $1)
    AND ($2::uuid IS NULL OR category_id = $2)
    ORDER BY created_at DESC
  `;
  
  const result = await dbPool.query(query, [
    filters.search ? `%${filters.search}%` : null,
    filters.category || null
  ]);
  
  return result.rows;
};
```

## Deployment & Configuration

### 1. Environment Configuration
```typescript
// config/app.config.ts
export const config = {
  port: parseInt(process.env.PORT || '3000'),
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    name: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.NODE_ENV === 'production'
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0')
  },
  jwt: {
    secret: process.env.JWT_SECRET!,
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  },
  supabase: {
    url: process.env.SUPABASE_URL!,
    key: process.env.SUPABASE_ANON_KEY!
  }
};
```

### 2. Docker Configuration
```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

### 3. Docker Compose for Development
```yaml
# docker-compose.yml
version: '3.8'
services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - DB_HOST=postgres
      - REDIS_HOST=redis
    depends_on:
      - postgres
      - redis
  
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: nimbus
      POSTGRES_USER: nimbus
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
  
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

## Testing Strategy

### 1. Unit Tests
```typescript
// services/product.service.test.ts
describe('ProductService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('getProducts', () => {
    it('should return products with pagination', async () => {
      const mockProducts = [/* mock data */];
      jest.spyOn(dbService, 'query').mockResolvedValue({ rows: mockProducts });
      
      const result = await productService.getProducts({}, { page: 1, limit: 10 });
      
      expect(result.products).toEqual(mockProducts);
      expect(result.pagination.page).toBe(1);
    });
  });
});
```

### 2. Integration Tests
```typescript
// api/products.test.ts
describe('Products API', () => {
  it('should create a new product', async () => {
    const productData = {
      name: 'Test Product',
      price: 99.99,
      quantity: 10,
      category_id: 'uuid',
      supplier_id: 'uuid'
    };
    
    const response = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${validToken}`)
      .send(productData)
      .expect(201);
    
    expect(response.body.name).toBe(productData.name);
  });
});
```

## Performance Monitoring

### 1. Metrics Collection
```typescript
// utils/metrics.ts
import prometheus from 'prom-client';

const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code']
});

const activeConnections = new prometheus.Gauge({
  name: 'active_connections',
  help: 'Number of active database connections'
});

// Middleware to collect metrics
const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestDuration
      .labels(req.method, req.route?.path || req.path, res.statusCode.toString())
      .observe(duration);
  });
  
  next();
};
```

### 2. Logging Strategy
```typescript
// utils/logger.ts
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}
```

## Implementation Priority

### Phase 1: Core Infrastructure
1. Set up Express.js with TypeScript
2. Implement authentication middleware
3. Set up Redis caching
4. Create basic CRUD operations for products, categories, suppliers
5. Implement basic error handling

### Phase 2: Analytics & Performance
1. Implement analytics endpoints
2. Add query optimization
3. Implement advanced caching strategies
4. Add rate limiting and monitoring

### Phase 3: Advanced Features
1. Real-time notifications
2. Advanced analytics and reporting
3. Bulk operations
4. Data export functionality

### Phase 4: Production Readiness
1. Comprehensive testing
2. Security hardening
3. Performance optimization
4. Documentation and deployment

This architecture provides a scalable, performant, and maintainable backend that can handle the complex requirements of the NIMBUS inventory management system while ensuring optimal database performance through intelligent caching and request optimization.
