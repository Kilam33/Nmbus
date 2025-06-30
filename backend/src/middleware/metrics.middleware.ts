import { Request, Response, NextFunction } from 'express';
import promClient from 'prom-client';
import { logger } from '@/utils/logger';

// Initialize Prometheus metrics
const register = promClient.register;

// Default metrics
promClient.collectDefaultMetrics({
  register,
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
});

// Custom metrics
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code', 'user_id'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
});

const httpRequestTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code', 'user_id'],
});

const activeConnections = new promClient.Gauge({
  name: 'active_connections',
  help: 'Number of active HTTP connections',
});

const databaseQueryDuration = new promClient.Histogram({
  name: 'database_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['query_type', 'table'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
});

const cacheHits = new promClient.Counter({
  name: 'cache_hits_total',
  help: 'Total number of cache hits',
  labelNames: ['cache_type'],
});

const cacheMisses = new promClient.Counter({
  name: 'cache_misses_total',
  help: 'Total number of cache misses',
  labelNames: ['cache_type'],
});

const errorTotal = new promClient.Counter({
  name: 'errors_total',
  help: 'Total number of errors',
  labelNames: ['error_type', 'status_code'],
});

// Track active connections
let currentConnections = 0;

export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Increment active connections
  currentConnections++;
  activeConnections.set(currentConnections);

  const startTime = Date.now();
  
  // Track request start
  const originalSend = res.send;
  res.send = function(data) {
    const duration = (Date.now() - startTime) / 1000;
    const route = req.route?.path || req.path;
    const userId = req.user?.id || 'anonymous';
    
    // Record metrics
    httpRequestTotal.inc({
      method: req.method,
      route,
      status_code: res.statusCode.toString(),
      user_id: userId,
    });
    
    httpRequestDuration.observe(
      {
        method: req.method,
        route,
        status_code: res.statusCode.toString(),
        user_id: userId,
      },
      duration
    );
    
    // Track errors
    if (res.statusCode >= 400) {
      errorTotal.inc({
        error_type: getErrorType(res.statusCode),
        status_code: res.statusCode.toString(),
      });
    }
    
    // Log request
    logger.info('HTTP Request', {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration.toFixed(3)}s`,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      userId,
    });
    
    // Decrement active connections
    currentConnections--;
    activeConnections.set(currentConnections);
    
    return originalSend.call(this, data);
  };
  
  next();
};

// Helper function to categorize errors
const getErrorType = (statusCode: number): string => {
  if (statusCode >= 400 && statusCode < 500) {
    return 'client_error';
  } else if (statusCode >= 500) {
    return 'server_error';
  }
  return 'unknown';
};

// Database metrics helper
export const recordDatabaseQuery = (queryType: string, table: string, duration: number) => {
  databaseQueryDuration.observe(
    {
      query_type: queryType,
      table,
    },
    duration / 1000 // Convert to seconds
  );
};

// Cache metrics helpers
export const recordCacheHit = (cacheType: string) => {
  cacheHits.inc({ cache_type: cacheType });
};

export const recordCacheMiss = (cacheType: string) => {
  cacheMisses.inc({ cache_type: cacheType });
};

// Export metrics register
export { register };

// Metrics endpoint handler
export const getMetrics = async (req: Request, res: Response) => {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logger.error('Failed to generate metrics', { error: errMsg });
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to generate metrics',
        code: 'METRICS_ERROR',
        statusCode: 500,
      },
    });
  }
};

// Health metrics
export const getHealthMetrics = () => {
  return {
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    activeConnections: currentConnections,
    timestamp: new Date().toISOString(),
  };
};
