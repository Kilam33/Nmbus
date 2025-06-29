import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { config } from '@/config/app.config';
import { logger } from '@/utils/logger';

// Create rate limiter with Redis store
export const rateLimitMiddleware = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: 1000, // Increased from default to 1000 requests per window
  message: {
    success: false,
    error: {
      message: 'Too many requests from this IP, please try again later',
      code: 'RATE_LIMIT_EXCEEDED',
      statusCode: 429,
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  
  // Custom key generator (use user ID if authenticated, otherwise IP)
  keyGenerator: (req: Request) => req.user?.id || req.ip || '',
  
  // Skip certain endpoints
  skip: (req: Request) => {
    // Skip rate limiting for health checks
    if (req.path.includes('/health')) return true;
    
    // Skip for authenticated admin users (if implementing roles)
    if (req.user?.app_metadata?.role === 'admin') return true;
    
    return false;
  },
  
  // Custom handler for rate limit exceeded
  handler: (req: Request, res: Response) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      userId: req.user?.id,
    });
    
    res.status(429).json({
      success: false,
      error: {
        message: 'Too many requests from this IP, please try again later',
        code: 'RATE_LIMIT_EXCEEDED',
        statusCode: 429,
        retryAfter: Math.round(config.rateLimit.windowMs / 1000),
      },
    });
  },
});

export const authRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 500, // Increased from 50 to 500 requests per IP per window
  message: {
    success: false,
    error: {
      message: 'Chill fam, too many login tries — give it a moment',
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      statusCode: 429,
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => req.ip || '',
  handler: (req: Request, res: Response) => {
    logger.warn('Dev auth rate limit triggered', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
    });

    res.status(429).json({
      success: false,
      error: {
        message: 'Chill fam, too many login tries — give it a moment',
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
        statusCode: 429,
        retryAfter: 300, // 5 minutes
      },
    });
  },
});


// API-specific rate limits
export const createRateLimit = (maxRequests: number, windowMs?: number) => {
  return rateLimit({
    windowMs: windowMs || config.rateLimit.windowMs,
    max: maxRequests,
    message: {
      success: false,
      error: {
        message: 'Request limit exceeded for this endpoint',
        code: 'ENDPOINT_RATE_LIMIT_EXCEEDED',
        statusCode: 429,
      },
    },
    keyGenerator: (req: Request) => req.user?.id || req.ip || '',
  });
};

// Heavy operation rate limiting (for analytics, reports, etc.)
export const heavyOperationRateLimit = createRateLimit(100, 60 * 1000); // Increased from 10 to 100 requests per minute

// Bulk operation rate limiting
export const bulkOperationRateLimit = createRateLimit(50, 60 * 1000); // Increased from 5 to 50 requests per minute