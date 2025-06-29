# NIMBUS Inventory Management Backend

A high-performance Node.js backend API for the NIMBUS inventory management system, featuring a three-tier architecture with Redis caching, comprehensive analytics, and automated reorder suggestions.

## 🚀 Features

### Core Functionality
- **Product Management**: Full CRUD operations with advanced filtering and search
- **Category Management**: Organize products with hierarchical categories
- **Supplier Management**: Track supplier performance and reliability metrics
- **Order Management**: Complete order lifecycle with status tracking and inventory updates
- **User Authentication**: JWT-based authentication with Supabase integration

### Advanced Analytics
- **Dashboard Analytics**: Real-time insights into inventory, sales, and performance
- **Sales Analytics**: Revenue tracking, trend analysis, and forecasting
- **Inventory Turnover**: Track product movement and optimize stock levels
- **Demand Forecasting**: AI-powered demand prediction for better planning
- **Automated Reorder Suggestions**: Smart recommendations based on historical data

### Performance & Scalability
- **Redis Caching**: Multi-level caching with intelligent invalidation
- **Database Optimization**: Connection pooling and query optimization
- **Rate Limiting**: Protect against abuse with configurable limits
- **Request Batching**: Optimize database operations with batch processing

### Security & Monitoring
- **Input Validation**: Comprehensive validation with Zod schemas
- **SQL Injection Prevention**: Parameterized queries and sanitization
- **Error Handling**: Centralized error handling with detailed logging
- **Health Checks**: Kubernetes-ready health and readiness endpoints
- **Metrics Collection**: Prometheus metrics for monitoring and alerting

## 🏗️ Architecture

```
Frontend (React) → Backend API (Express) → Database API (Supabase/PostgreSQL)
                    ↓
                Redis Cache Layer
```

### Technology Stack
- **Runtime**: Node.js 18+ with TypeScript
- **Framework**: Express.js with async error handling
- **Database**: Supabase (PostgreSQL) with connection pooling
- **Caching**: Redis with intelligent invalidation
- **Authentication**: JWT with Supabase Auth integration
- **Validation**: Zod schemas for type-safe validation
- **Monitoring**: Winston logging + Prometheus metrics
- **Documentation**: Swagger/OpenAPI 3.0

## 📦 Installation

### Prerequisites
- Node.js 18 or higher
- PostgreSQL 13 or higher
- Redis 6 or higher
- Supabase account (for authentication)

### Environment Setup

1. **Clone and install dependencies**:
```bash
git clone <repository-url>
cd nimbus-backend
npm install
```

2. **Environment Configuration**:
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
# Application
NODE_ENV=development
PORT=3000

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=24h

# Supabase
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=nimbus
DB_USER=postgres
DB_PASSWORD=your-db-password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
```

3. **Database Setup**:
```bash
# Create database
createdb nimbus

# Run migrations and seed data
npm run db:seed
```

4. **Start Development Server**:
```bash
npm run dev
```

The API will be available at `http://localhost:3000`

## 🐳 Docker Deployment

### Quick Start with Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop services
docker-compose down
```

### Production Deployment

```bash
# Build production image
docker build -t nimbus-api .

# Run with production environment
docker run -d \
  --name nimbus-api \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e DATABASE_URL=your-production-db-url \
  -e REDIS_URL=your-production-redis-url \
  nimbus-api
```

## 📚 API Documentation

### Interactive Documentation
- **Swagger UI**: `http://localhost:3000/api-docs`
- **OpenAPI JSON**: `http://localhost:3000/api-docs.json`

### Core Endpoints

#### Authentication
```
POST /api/v1/auth/signin     - Sign in user
POST /api/v1/auth/signup     - Sign up new user
POST /api/v1/auth/signout    - Sign out user
GET  /api/v1/auth/me         - Get current user
POST /api/v1/auth/refresh    - Refresh access token
```

#### Products
```
GET    /api/v1/products           - List products with filtering
GET    /api/v1/products/:id       - Get product by ID
POST   /api/v1/products           - Create new product
PUT    /api/v1/products/:id       - Update product
DELETE /api/v1/products/:id       - Delete product
GET    /api/v1/products/low-stock - Get low stock products
```

#### Categories
```
GET    /api/v1/categories     - List categories
GET    /api/v1/categories/:id - Get category by ID
POST   /api/v1/categories     - Create category
PUT    /api/v1/categories/:id - Update category
DELETE /api/v1/categories/:id - Delete category
```

#### Suppliers
```
GET    /api/v1/suppliers     - List suppliers with filtering
GET    /api/v1/suppliers/:id - Get supplier by ID
POST   /api/v1/suppliers     - Create supplier
PUT    /api/v1/suppliers/:id - Update supplier
DELETE /api/v1/suppliers/:id - Delete supplier
```

#### Orders
```
GET    /api/v1/orders           - List orders with filtering
GET    /api/v1/orders/:id       - Get order by ID
POST   /api/v1/orders           - Create order
PUT    /api/v1/orders/:id       - Update order
PATCH  /api/v1/orders/:id/status - Update order status
DELETE /api/v1/orders/:id       - Delete order
```

#### Analytics
```
GET /api/v1/analytics/dashboard          - Dashboard data
GET /api/v1/analytics/sales              - Sales analytics
GET /api/v1/analytics/inventory-turnover - Turnover metrics
GET /api/v1/analytics/reorder-suggestions - Reorder recommendations
GET /api/v1/analytics/demand-forecast    - Demand forecasting
```

#### Health & Monitoring
```
GET /api/v1/health           - Health check
GET /api/v1/health/metrics   - Prometheus metrics
GET /api/v1/health/detailed  - Detailed health info
GET /api/v1/health/readiness - Kubernetes readiness
GET /api/v1/health/liveness  - Kubernetes liveness
```

## 🔧 Configuration

### Caching Strategy
```typescript
// Cache TTL configuration
cache: {
  defaultTTL: 300,     // 5 minutes
  shortTTL: 60,        // 1 minute
  longTTL: 3600,       // 1 hour
  analyticsData: 600,  // 10 minutes
  productData: 300,    // 5 minutes
  userSessions: 86400, // 24 hours
}
```

### Rate Limiting
```typescript
// Default rate limits
rateLimit: {
  windowMs: 900000,    // 15 minutes
  maxRequests: 100,    // 100 requests per window
}

// Auth endpoints: 5 requests per 15 minutes
// Heavy operations: 10 requests per minute
```

### Database Connection Pool
```typescript
database: {
  maxConnections: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
}
```

## 📊 Monitoring & Observability

### Health Checks
- **Basic Health**: `/api/v1/health`
- **Detailed Metrics**: `/api/v1/health/detailed`
- **Kubernetes Probes**: `/api/v1/health/readiness` & `/api/v1/health/liveness`

### Prometheus Metrics
- HTTP request duration and count
- Database query performance
- Cache hit/miss ratios
- Active connections
- Error rates by type

### Logging
- Structured JSON logging with Winston
- Request/response logging with Morgan
- Error tracking with stack traces
- Performance metrics logging

## 🧪 Testing

### Run Tests
```bash
# Unit tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

### API Testing
```bash
# Using curl
curl -X GET http://localhost:3000/api/v1/health

# Using httpie
http GET localhost:3000/api/v1/products Authorization:"Bearer your-jwt-token"
```

## 🚀 Performance Optimization

### Caching Strategies
1. **Query Result Caching**: Frequently accessed data cached in Redis
2. **Intelligent Invalidation**: Cache invalidated on data changes
3. **Multi-level Caching**: Different TTL for different data types
4. **Cache Warming**: Pre-populate cache with frequently accessed data

### Database Optimization
1. **Connection Pooling**: Reuse database connections
2. **Query Optimization**: Indexed queries and efficient joins
3. **Batch Operations**: Group multiple operations
4. **Prepared Statements**: Prevent SQL injection and improve performance

### Request Optimization
1. **Request Batching**: Combine multiple requests
2. **Compression**: Gzip compression for responses
3. **Rate Limiting**: Prevent abuse and ensure fair usage
4. **Pagination**: Limit result sets for better performance

## 🔒 Security Features

### Authentication & Authorization
- JWT-based authentication with Supabase
- Token refresh mechanism
- Role-based access control (extensible)
- Session management with Redis

### Input Validation
- Zod schema validation for all inputs
- SQL injection prevention with parameterized queries
- XSS protection with input sanitization
- File upload restrictions and validation

### Security Headers
- Helmet.js for security headers
- CORS configuration
- Rate limiting per IP/user
- Request size limits

## 📈 Scalability Considerations

### Horizontal Scaling
- Stateless design for easy horizontal scaling
- Redis for shared session storage
- Database connection pooling
- Load balancer ready (Nginx configuration included)

### Vertical Scaling
- Efficient memory usage
- Connection pooling
- Query optimization
- Caching strategies

### Monitoring & Alerting
- Prometheus metrics collection
- Grafana dashboards (optional)
- Health check endpoints
- Error rate monitoring

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Write tests for new features
- Update documentation
- Follow conventional commit messages
- Ensure all tests pass

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Common Issues

**Database Connection Issues**:
```bash
# Check PostgreSQL status
pg_isready -h localhost -p 5432

# Check Redis status
redis-cli ping
```

**Cache Issues**:
```bash
# Clear Redis cache
redis-cli FLUSHALL

# Restart Redis
sudo systemctl restart redis
```

**Performance Issues**:
- Check database query performance
- Monitor Redis memory usage
- Review application logs
- Check system resources

### Getting Help
- Check the [API Documentation](http://localhost:3000/api-docs)
- Review the logs in `logs/` directory
- Check health endpoints for service status
- Monitor Prometheus metrics

---

Built with ❤️ for efficient inventory management