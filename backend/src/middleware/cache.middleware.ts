import { Request, Response, NextFunction } from 'express';
import { redisService } from '../utils/redis';
import { logger } from '../utils/logger';
import { config } from '../config/app.config';
import { asyncHandler } from './error.middleware';

interface CacheOptions {
  ttl?: number;
  keyGenerator?: (req: Request) => string;
  condition?: (req: Request) => boolean;
  skipCache?: boolean;
}

// Generate cache key from request
const defaultKeyGenerator = (req: Request): string => {
  const { method, originalUrl, user } = req;
  const userId = user?.id || 'anonymous';
  const queryString = JSON.stringify(req.query);
  return `api:${method}:${originalUrl}:${userId}:${Buffer.from(queryString).toString('base64')}`;
};

// Cache middleware
export const cache = (options: CacheOptions = {}) => {
  const {
    ttl = config.cache.defaultTTL,
    keyGenerator = defaultKeyGenerator,
    condition = () => true,
    skipCache = false
  } = options;

  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    if (skipCache || req.method !== 'GET' || !condition(req)) {
      return next();
    }

    const cacheKey = keyGenerator(req);

    try {
      // Check if Redis is available
      if (!global.redisClient) {
        logger.debug('Redis not available, skipping cache', { key: cacheKey });
        return next();
      }

      const cachedData = await redisService.get(cacheKey);
      
      if (cachedData) {
        logger.debug('Cache HIT', { key: cacheKey });
        return res.json(cachedData);
      }

      logger.debug('Cache MISS', { key: cacheKey });

      const originalJson = res.json.bind(res);

      res.json = function (data: any) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          redisService.set(cacheKey, data, ttl).catch((error: unknown) => {
            if (error instanceof Error) {
              logger.error('Failed to cache response', { key: cacheKey, error: error.message });
            } else {
              logger.error('Failed to cache response', { key: cacheKey, error: String(error) });
            }
          });
        }

        return originalJson(data);
      };

      next();
    } catch (error: unknown) {
      if (error instanceof Error) {
        logger.error('Cache middleware error', { key: cacheKey, error: error.message });
      } else {
        logger.error('Cache middleware error', { key: cacheKey, error: String(error) });
      }

      // Continue without cache on error
      next();
    }
  });
};

// Cache invalidation middleware
export const invalidateCache = (patterns: string[]) => {
  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);
    const originalEnd = res.end.bind(res);

    const invalidate = async () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          const promises = patterns.map((pattern) => redisService.delPattern(pattern));
          await Promise.all(promises);
          logger.debug('Cache invalidated', { patterns });
        } catch (error: unknown) {
          if (error instanceof Error) {
            logger.error('Cache invalidation error', { patterns, error: error.message });
          } else {
            logger.error('Cache invalidation error', { patterns, error: String(error) });
          }
        }
      }
    };

    res.json = function (data: any) {
      invalidate();
      return originalJson(data);
    };

    res.send = function (data: any) {
      invalidate();
      return originalSend(data);
    };

    res.end = function (
      chunk?: any,
      encodingOrCallback?: BufferEncoding | (() => void),
      callback?: () => void
    ): Response {
      invalidate();

      if (typeof encodingOrCallback === 'function') {
        return originalEnd(chunk, encodingOrCallback);
      }

      return originalEnd(chunk, encodingOrCallback as BufferEncoding, callback);
    };

    next();
  });
};

// Product-specific cache helpers
export const productCache = (ttl: number = config.cache.productData) =>
  cache({
    ttl,
    keyGenerator: (req) => `products:${req.method}:${req.originalUrl}:${JSON.stringify(req.query)}`,
  });

export const analyticsCache = (ttl: number = config.cache.analyticsData) =>
  cache({
    ttl,
    keyGenerator: (req) =>
      `analytics:${req.originalUrl}:${JSON.stringify(req.query)}:${req.user?.id || 'anonymous'}`,
  });

export const shortCache = (ttl: number = config.cache.shortTTL) => cache({ ttl });
export const longCache = (ttl: number = config.cache.longTTL) => cache({ ttl });

// Cache warming utilities
export const warmCache = async () => {
  try {
    logger.info('Starting cache warming...');

    // Add cache warming logic here

    logger.info('Cache warming completed');
  } catch (error: unknown) {
    if (error instanceof Error) {
      logger.error('Cache warming failed', { error: error.message });
    } else {
      logger.error('Cache warming failed', { error: String(error) });
    }
  }
};

// Cache cleanup utilities
export const cleanupExpiredCache = async () => {
  try {
    logger.info('Starting cache cleanup...');

    // Redis automatically handles TTL expiration

    logger.info('Cache cleanup completed');
  } catch (error: unknown) {
    if (error instanceof Error) {
      logger.error('Cache cleanup failed', { error: error.message });
    } else {
      logger.error('Cache cleanup failed', { error: String(error) });
    }
  }
};
