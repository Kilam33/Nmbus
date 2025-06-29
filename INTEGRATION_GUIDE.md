# NIMBUS Frontend-Backend Integration Guide

## Overview

This guide explains how to integrate the NIMBUS frontend with the Node.js backend API. The integration replaces direct Supabase calls with a centralized API client that communicates with the backend.

## Architecture

```
Frontend (React/TypeScript) 
    ↓ API Client
Backend API (Node.js/Express)
    ↓ Database Layer
Supabase (PostgreSQL)
```

## Setup Instructions

### 1. Environment Configuration

Create a `.env` file in the `project/` directory:

```env
# Backend API Configuration
VITE_API_URL=http://localhost:3000/api/v1

# Supabase Configuration (for database access)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Development Configuration
VITE_APP_ENV=development
VITE_APP_NAME=NIMBUS Inventory Management
```

### 2. Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd project/backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the backend directory:
   ```env
   # Server Configuration
   PORT=3000
   NODE_ENV=development
   API_VERSION=v1

   # Database Configuration
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=nimbus
   DB_USER=postgres
   DB_PASSWORD=your_password
   DB_SSL=false

   # Redis Configuration
   REDIS_HOST=localhost
   REDIS_PORT=6379
   REDIS_PASSWORD=
   REDIS_DB=0

   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key
   JWT_EXPIRES_IN=24h

   # Supabase Configuration
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

   # Rate Limiting
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=100

   # CORS (Frontend URL)
   FRONTEND_URL=http://localhost:5173
   ```

4. Start the backend server:
   ```bash
   npm run dev
   ```

### 3. Frontend Setup

1. Install the new dependencies:
   ```bash
   cd project
   npm install axios
   ```

2. Start the frontend development server:
   ```bash
   npm run dev
   ```

## API Client Architecture

### Core Components

1. **API Client** (`src/lib/api.ts`)
   - Centralized HTTP client using Axios
   - Automatic token management and refresh
   - Request/response interceptors
   - Error handling and user feedback

2. **Service Layer** (`src/services/`)
   - `products.ts` - Product management
   - `analytics.ts` - Analytics and reporting
   - `categories.ts` - Category management
   - `suppliers.ts` - Supplier management
   - `orders.ts` - Order management

3. **Authentication** (`src/contexts/AuthContext.tsx`)
   - Updated to use backend API
   - JWT token management
   - Automatic session validation

## Key Features

### 1. Automatic Token Management
- JWT tokens are automatically stored in localStorage
- Token refresh happens transparently
- Failed requests are retried after token refresh

### 2. Error Handling
- Centralized error handling with user-friendly messages
- Automatic toast notifications for errors
- Graceful fallbacks for network issues

### 3. Request Caching
- Redis-based caching on the backend
- Automatic cache invalidation
- Configurable TTL for different data types

### 4. Rate Limiting
- Built-in rate limiting on the backend
- Frontend handles rate limit errors gracefully
- Configurable limits per endpoint

## API Endpoints

### Authentication
- `POST /api/v1/auth/signin` - User login
- `POST /api/v1/auth/signup` - User registration
- `POST /api/v1/auth/signout` - User logout
- `POST /api/v1/auth/reset-password` - Password reset
- `POST /api/v1/auth/update-password` - Password update
- `GET /api/v1/auth/me` - Get current user

### Products
- `GET /api/v1/products` - List products with filters
- `GET /api/v1/products/:id` - Get single product
- `POST /api/v1/products` - Create product
- `PUT /api/v1/products/:id` - Update product
- `DELETE /api/v1/products/:id` - Delete product
- `GET /api/v1/products/low-stock` - Get low stock products
- `GET /api/v1/products/expiring` - Get expiring products
- `PATCH /api/v1/products/:id/quantity` - Update quantity

### Analytics
- `GET /api/v1/analytics/dashboard` - Dashboard statistics
- `GET /api/v1/analytics/revenue` - Revenue data
- `GET /api/v1/analytics/orders/stats` - Order statistics
- `GET /api/v1/analytics/categories/breakdown` - Category breakdown
- `GET /api/v1/analytics/products/top` - Top selling products
- `GET /api/v1/analytics/inventory/trends` - Inventory trends
- `GET /api/v1/analytics/orders/trends` - Order trends
- `GET /api/v1/analytics/sales/report` - Sales report
- `GET /api/v1/analytics/inventory/turnover` - Inventory turnover

## Migration Steps

### Phase 1: API Client Setup ✅
- [x] Created centralized API client
- [x] Implemented token management
- [x] Added request/response interceptors
- [x] Set up error handling

### Phase 2: Authentication Migration ✅
- [x] Updated AuthContext to use backend API
- [x] Implemented JWT token management
- [x] Added proper error handling
- [x] Maintained existing interface

### Phase 3: Data Layer Migration 🔄
- [x] Created service layer for products
- [x] Created service layer for analytics
- [ ] Update remaining pages to use services
- [ ] Implement caching strategies
- [ ] Add loading states

### Phase 4: Testing & Optimization
- [ ] Test all API endpoints
- [ ] Optimize performance
- [ ] Add error boundaries
- [ ] Implement offline support

## Testing the Integration

1. **Start both servers:**
   ```bash
   # Terminal 1 - Backend
   cd project/backend
   npm run dev

   # Terminal 2 - Frontend
   cd project
   npm run dev
   ```

2. **Test authentication:**
   - Navigate to `/login`
   - Try signing in with valid credentials
   - Check that tokens are stored in localStorage

3. **Test dashboard:**
   - Navigate to `/dashboard`
   - Verify that data loads from the backend
   - Check browser network tab for API calls

4. **Test error handling:**
   - Stop the backend server
   - Try to perform actions in the frontend
   - Verify error messages are displayed

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Ensure `FRONTEND_URL` is set correctly in backend `.env`
   - Check that the frontend is running on the expected port

2. **Authentication Failures**
   - Verify JWT_SECRET is set in backend `.env`
   - Check that Supabase credentials are correct
   - Ensure tokens are being stored in localStorage

3. **API Connection Issues**
   - Verify backend is running on port 3000
   - Check `VITE_API_URL` in frontend `.env`
   - Ensure no firewall blocking localhost connections

4. **Redis Connection Issues**
   - Install and start Redis server
   - Verify Redis configuration in backend `.env`
   - Check Redis logs for connection errors

### Debug Mode

Enable debug logging by setting:
```env
LOG_LEVEL=debug
```

This will show detailed API request/response logs in the backend console.

## Performance Considerations

1. **Caching Strategy**
   - Analytics data: 10 minutes
   - Product data: 5 minutes
   - User sessions: 24 hours

2. **Request Optimization**
   - Use pagination for large datasets
   - Implement request debouncing
   - Cache frequently accessed data

3. **Error Recovery**
   - Automatic retry for failed requests
   - Graceful degradation for offline scenarios
   - User-friendly error messages

## Security Features

1. **JWT Authentication**
   - Secure token storage
   - Automatic token refresh
   - Token expiration handling

2. **Rate Limiting**
   - Per-endpoint rate limits
   - IP-based throttling
   - Configurable limits

3. **Input Validation**
   - Zod schema validation
   - SQL injection prevention
   - XSS protection

## Next Steps

1. **Complete Service Layer**
   - Implement remaining services (categories, suppliers, orders)
   - Add comprehensive error handling
   - Implement data caching

2. **Enhanced Features**
   - Real-time updates with WebSockets
   - File upload functionality
   - Advanced search and filtering

3. **Production Deployment**
   - Environment-specific configurations
   - Health checks and monitoring
   - Performance optimization

## Support

For issues or questions:
1. Check the browser console for errors
2. Review backend server logs
3. Verify environment configuration
4. Test API endpoints directly with tools like Postman 