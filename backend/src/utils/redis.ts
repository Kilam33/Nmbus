import { logger } from '@/utils/logger';
import { config } from '@/config/app.config';

interface CacheOptions {
  ttl?: number;
  tags?: string[];
}

class RedisService {
  private client: any;

  constructor() {
    this.client = global.redisClient;
  }

  // Basic operations
  async get(key: string): Promise<any> {
    try {
      if (!this.client) {
        return null;
      }
      const value = await this.client.get(key);
      if (value) {
        return JSON.parse(value);
      }
      return null;
    } catch (error) {
      logger.error('Redis GET error:', { key, error: (error as Error).message });
      return null;
    }
  }

  async set(key: string, value: any, ttl: number = config.cache.defaultTTL): Promise<boolean> {
    try {
      if (!this.client) {
        return false;
      }
      const serializedValue = JSON.stringify(value);
      await this.client.setEx(key, ttl, serializedValue);
      return true;
    } catch (error) {
      logger.error('Redis SET error:', { key, error: (error as Error).message });
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    try {
      if (!this.client) {
        return false;
      }
      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error('Redis DEL error:', { key, error: (error as Error).message });
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      if (!this.client) {
        return false;
      }
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Redis EXISTS error:', { key, error: (error as Error).message });
      return false;
    }
  }

  // Pattern operations
  async delPattern(pattern: string): Promise<boolean> {
    try {
      if (!this.client) {
        return false;
      }
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
      return true;
    } catch (error) {
      logger.error('Redis DEL PATTERN error:', { pattern, error: (error as Error).message });
      return false;
    }
  }

  async getKeysPattern(pattern: string): Promise<string[]> {
    try {
      if (!this.client) {
        return [];
      }
      return await this.client.keys(pattern);
    } catch (error) {
      logger.error('Redis KEYS error:', { pattern, error: (error as Error).message });
      return [];
    }
  }

  // Cache with auto-expiration
  async cache<T>(
    key: string, 
    fetcher: () => Promise<T>, 
    options: CacheOptions = {}
  ): Promise<T> {
    const { ttl = config.cache.defaultTTL } = options;

    // Try to get from cache first
    const cached = await this.get(key);
    if (cached !== null) {
      logger.debug('Cache HIT:', { key });
      return cached;
    }

    // Cache miss - fetch data
    logger.debug('Cache MISS:', { key });
    try {
      const data = await fetcher();
      await this.set(key, data, ttl);
      return data;
    } catch (error) {
      logger.error('Cache fetcher error:', { key, error: (error as Error).message });
      throw error;
    }
  }

  // Invalidate by tags
  async invalidateByTags(tags: string[]): Promise<void> {
    try {
      if (!this.client) {
        return;
      }
      const promises = tags.map(tag => this.delPattern(`*:${tag}:*`));
      await Promise.all(promises);
      logger.debug('Cache invalidated by tags:', { tags });
    } catch (error) {
      logger.error('Cache invalidation error:', { tags, error: (error as Error).message });
    }
  }

  // Product-specific cache methods
  async getProduct(id: string): Promise<any> {
    return this.get(`product:${id}`);
  }

  async setProduct(id: string, product: any, ttl: number = config.cache.productData): Promise<void> {
    await this.set(`product:${id}`, product, ttl);
  }

  async invalidateProduct(id: string): Promise<void> {
    await this.del(`product:${id}`);
    await this.delPattern(`products:*`);
    await this.delPattern(`analytics:*`);
  }

  // Analytics cache methods
  async getAnalytics(key: string): Promise<any> {
    return this.get(`analytics:${key}`);
  }

  async setAnalytics(key: string, data: any, ttl: number = config.cache.analyticsData): Promise<void> {
    await this.set(`analytics:${key}`, data, ttl);
  }

  async invalidateAnalytics(): Promise<void> {
    await this.delPattern('analytics:*');
  }

  // Query result caching
  async cacheQuery(queryHash: string, result: any, ttl: number = config.cache.defaultTTL): Promise<void> {
    await this.set(`query:${queryHash}`, result, ttl);
  }

  async getCachedQuery(queryHash: string): Promise<any> {
    return this.get(`query:${queryHash}`);
  }

  // Session management
  async setSession(userId: string, sessionData: any): Promise<void> {
    await this.set(`session:${userId}`, sessionData, config.cache.userSessions);
  }

  async getSession(userId: string): Promise<any> {
    return this.get(`session:${userId}`);
  }

  async deleteSession(userId: string): Promise<void> {
    await this.del(`session:${userId}`);
  }

  // Health check
  async healthCheck(): Promise<{ status: string; responseTime: number }> {
    try {
      // If Redis client is not available, return OK for development
      if (!this.client) {
        return {
          status: 'OK',
          responseTime: 0
        };
      }

      const start = Date.now();
      await this.client.ping();
      const responseTime = Date.now() - start;
      
      return {
        status: 'OK',
        responseTime
      };
    } catch (error) {
      logger.error('Redis health check failed:', error);
      return {
        status: 'ERROR',
        responseTime: 0
      };
    }
  }

  // Cleanup and maintenance
  async flushAll(): Promise<void> {
    try {
      await this.client.flushAll();
      logger.info('Redis cache flushed');
    } catch (error) {
      logger.error('Redis flush error:', error);
    }
  }

  // Get cache statistics
  async getStats(): Promise<any> {
    try {
      const info = await this.client.info('memory');
      const keyspace = await this.client.info('keyspace');
      
      return {
        memory: info,
        keyspace: keyspace
      };
    } catch (error) {
      logger.error('Redis stats error:', error);
      return null;
    }
  }
}

export const redisService = new RedisService();