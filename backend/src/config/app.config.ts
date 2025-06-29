export const config = {
  // Server
  port: parseInt(process.env.PORT || '3000'),
  nodeEnv: process.env.NODE_ENV || 'development',
  apiVersion: process.env.API_VERSION || 'v1',

  // Database
  database: {
    host: process.env.DB_HOST || (process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL).hostname : 'localhost'),
    port: parseInt(process.env.DB_PORT || (process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL).port : '5432')),
    name: process.env.DB_NAME || (process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL).pathname.slice(1) : 'nimbus'),
    user: process.env.DB_USER || (process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL).username : 'postgres'),
    password: process.env.DB_PASSWORD || (process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL).password : ''),
    ssl: process.env.DB_SSL === 'true' || process.env.NODE_ENV === 'production' || (process.env.DATABASE_URL?.includes('supabase') || false),
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000'),
  },

  // Redis
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0'),
    maxRetriesPerRequest: 3,
    retryDelayOnFailover: 100,
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },

  // Supabase
  supabase: {
    url: process.env.SUPABASE_URL!,
    anonKey: process.env.SUPABASE_ANON_KEY!,
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000'), // Increased from 100 to 1000
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },

  // Email (optional)
  email: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASS,
    from: process.env.FROM_EMAIL || 'noreply@nimbus.com',
  },

  // Cache TTL (in seconds)
  cache: {
    defaultTTL: 300, // 5 minutes
    shortTTL: 60, // 1 minute
    longTTL: 3600, // 1 hour
    analyticsData: 600, // 10 minutes
    productData: 300, // 5 minutes
    userSessions: 86400, // 24 hours
  },
} as const;

// Validate required environment variables
const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'JWT_SECRET',
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}