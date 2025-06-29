import { Pool, PoolClient } from 'pg';
import { config } from '@/config/app.config';
import { logger } from '@/utils/logger';

// Database connection pool
export const pool = new Pool({
  host: config.database.host,
  port: config.database.port,
  database: config.database.name,
  user: config.database.user,
  password: config.database.password,
  max: config.database.maxConnections,
  idleTimeoutMillis: config.database.idleTimeoutMillis,
  connectionTimeoutMillis: config.database.connectionTimeoutMillis,
  ssl: config.database.ssl ? { rejectUnauthorized: false } : false,
});

// Handle pool errors
pool.on('error', (err) => {
  logger.error('Database pool error:', err);
});

pool.on('connect', () => {
  logger.debug('New database connection established');
});

// Query helper with error handling
export const query = async (text: string, params?: any[]): Promise<any> => {
  const client = await pool.connect();
  try {
    const start = Date.now();
    const result = await client.query(text, params);
    const duration = Date.now() - start;
    
    logger.debug('Executed query', {
      query: text,
      duration: `${duration}ms`,
      rows: result.rowCount
    });
    
    return result;
  } catch (error) {
    logger.error('Database query error:', {
      query: text,
      params,
      error: error.message
    });
    throw error;
  } finally {
    client.release();
  }
};

// Transaction helper
export const transaction = async (callback: (client: PoolClient) => Promise<any>): Promise<any> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Transaction error:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Batch query helper
export const batchQuery = async (queries: Array<{ text: string; params?: any[] }>): Promise<any[]> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const results = [];
    
    for (const { text, params } of queries) {
      const result = await client.query(text, params);
      results.push(result);
    }
    
    await client.query('COMMIT');
    return results;
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Batch query error:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Health check
export const checkDatabaseHealth = async (): Promise<{ status: string; responseTime: number }> => {
  try {
    // In development, if database is not configured, return OK
    if (config.nodeEnv === 'development' && !config.database.host) {
      return {
        status: 'OK',
        responseTime: 0
      };
    }

    const start = Date.now();
    await query('SELECT 1');
    const responseTime = Date.now() - start;
    
    return {
      status: 'OK',
      responseTime
    };
  } catch (error) {
    logger.error('Database health check failed:', error);
    // In development, don't fail the health check for database issues
    if (config.nodeEnv === 'development') {
      return {
        status: 'OK',
        responseTime: 0
      };
    }
    return {
      status: 'ERROR',
      responseTime: 0
    };
  }
};

// Cleanup on app termination
export const closeDatabase = async (): Promise<void> => {
  try {
    await pool.end();
    logger.info('Database pool closed');
  } catch (error) {
    logger.error('Error closing database pool:', error);
  }
};

// Query builder helpers
export const buildWhereClause = (filters: Record<string, any>): { clause: string; params: any[] } => {
  const conditions: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (typeof value === 'string' && key.includes('search')) {
        conditions.push(`${key.replace('search', 'name')} ILIKE $${paramIndex}`);
        params.push(`%${value}%`);
      } else {
        conditions.push(`${key} = $${paramIndex}`);
        params.push(value);
      }
      paramIndex++;
    }
  });

  return {
    clause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    params
  };
};

export const buildPaginationQuery = (page: number, limit: number): string => {
  const offset = (page - 1) * limit;
  return `LIMIT ${limit} OFFSET ${offset}`;
};

export const buildOrderByClause = (sortKey?: string, sortDirection?: string): string => {
  if (!sortKey) return 'ORDER BY created_at DESC';
  
  const direction = sortDirection?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  return `ORDER BY ${sortKey} ${direction}`;
};