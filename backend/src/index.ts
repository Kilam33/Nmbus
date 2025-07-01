import 'dotenv/config';
import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { createClient } from 'redis';
import cron from 'node-cron';

import { config } from './config/app.config';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/error.middleware';
import { notFoundHandler } from './middleware/notFound.middleware';
import { rateLimitMiddleware } from './middleware/rateLimit.middleware';
import { metricsMiddleware } from './middleware/metrics.middleware';
import { setupSwagger } from './config/swagger.config';
import { reorderService } from './services/reorder.service';

// Route imports
import authRoutes from './api/v1/auth';
import productsRoutes from './api/v1/products';
import categoriesRoutes from './api/v1/categories';
import suppliersRoutes from './api/v1/suppliers';
import ordersRoutes from './api/v1/orders';
import analyticsRoutes from './api/v1/analytics';
import healthRoutes from './api/v1/health';
import reorderRoutes from './api/v1/reorder';

class Server {
  private app: Express;
  public redisClient: any;
  public scheduledJobs: cron.ScheduledTask[] = [];

  constructor() {
    this.app = express();
    this.initializeRedis();
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
    this.initializeSwagger();
    this.initializeScheduledJobs();
  }

  private async initializeRedis(): Promise<void> {
    // Skip Redis initialization in development if REDIS_ENABLED is not set to true
    if (config.nodeEnv === 'development' && process.env.REDIS_ENABLED !== 'true') {
      logger.info('Redis disabled for development. Set REDIS_ENABLED=true to enable.');
      this.redisClient = null;
      global.redisClient = null;
      return;
    }

    try {
      this.redisClient = createClient({
        url: `redis://${config.redis.password ? `:${config.redis.password}@` : ''}${config.redis.host}:${config.redis.port}/${config.redis.db}`,
      });

      this.redisClient.on('error', (err: Error) => {
        logger.error('Redis connection error:', err);
      });

      this.redisClient.on('connect', () => {
        logger.info('Connected to Redis');
      });

      await this.redisClient.connect();
      
      // Make redis client available globally
      global.redisClient = this.redisClient;
    } catch (error) {
      logger.error('Failed to initialize Redis:', error);
      if (config.nodeEnv === 'production') {
        process.exit(1);
      } else {
        logger.warn('Continuing without Redis in development mode');
        this.redisClient = null;
        global.redisClient = null;
      }
    }
  }

  private initializeMiddleware(): void {
    // CORS configuration - must come before other middleware
    this.app.use(cors({
      origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        const allowedOrigins = [
          'http://localhost:3000',
          'http://localhost:3173',
          'http://localhost:4173', // Vite preview
          'http://127.0.0.1:3000',
          'http://127.0.0.1:3173',
          'http://127.0.0.1:4173',
          'https://nmbus.ip-ddns.com',
          'https://nmbus.ip-ddns.com:3000',
          'https://nmbus.ip-ddns.com:3173',
          'https://api.nmbus.ip-ddns.com',
          'https://nmbus.ip-ddns.com:4173',
        ];
        
        // Add production frontend URL if specified
        if (process.env.FRONTEND_URL) {
          allowedOrigins.push(process.env.FRONTEND_URL);
        }
        
        if (allowedOrigins.indexOf(origin) !== -1 || config.nodeEnv === 'development') {
          callback(null, true);
        } else {
          logger.warn(`CORS blocked request from origin: ${origin}`);
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type', 
        'Authorization', 
        'X-Requested-With',
        'Accept',
        'Origin',
        'Cache-Control',
        'X-File-Name'
      ],
      exposedHeaders: ['X-Request-ID', 'X-Total-Count'],
      maxAge: 86400, // 24 hours
    }));

    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));

    // Compression and parsing
    this.app.use(compression());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Logging
    if (config.nodeEnv !== 'test') {
      this.app.use(morgan('combined', {
        stream: { write: (message: string) => logger.info(message.trim()) }
      }));
    }

    // Rate limiting
    this.app.use(rateLimitMiddleware);

    // Metrics collection
    this.app.use(metricsMiddleware);

    // Request ID
    this.app.use((req, res, next) => {
      req.id = Math.random().toString(36).substring(2, 15);
      res.setHeader('X-Request-ID', req.id);
      next();
    });
  }

  private initializeRoutes(): void {
    const apiPrefix = `/api/${config.apiVersion}`;

    // Handle preflight requests for all routes
    this.app.options('*', cors());

    // Health check route (no auth required)
    this.app.use(`${apiPrefix}/health`, healthRoutes);

    // API routes
    this.app.use(`${apiPrefix}/auth`, authRoutes);
    this.app.use(`${apiPrefix}/products`, productsRoutes);
    this.app.use(`${apiPrefix}/categories`, categoriesRoutes);
    this.app.use(`${apiPrefix}/suppliers`, suppliersRoutes);
    this.app.use(`${apiPrefix}/orders`, ordersRoutes);
    this.app.use(`${apiPrefix}/analytics`, analyticsRoutes);
    this.app.use(`${apiPrefix}/reorder`, reorderRoutes);

    // Root route
    this.app.get('/', (req, res) => {
      res.json({
        message: 'NIMBUS Inventory Management API',
        version: config.apiVersion,
        environment: config.nodeEnv,
        timestamp: new Date().toISOString(),
      });
    });
  }

  private initializeErrorHandling(): void {
    this.app.use(notFoundHandler);
    this.app.use(errorHandler);
  }

  private initializeSwagger(): void {
    setupSwagger(this.app);
  }

  private initializeScheduledJobs(): void {
    // Schedule automatic reorder analysis
    this.scheduleReorderAnalysis();
    
    logger.info('Scheduled jobs initialized');
  }

  private scheduleReorderAnalysis(): void {
    // Run every hour by default, but will be adjusted based on settings
    const reorderAnalysisJob = cron.schedule('0 * * * *', async () => {
      try {
        logger.info('Starting scheduled reorder analysis');
        
        // Get current settings
        const settings = await reorderService.getSettings();
        
        if (!settings.auto_reorder_enabled) {
          logger.debug('Auto reorder is disabled, skipping scheduled analysis');
          return;
        }

        // Start analysis for all products
        await reorderService.startAnalysis({
          userId: 'system', // System user for automated jobs
          scope: 'all',
          urgencyOnly: false
        });

        logger.info('Scheduled reorder analysis completed');
      } catch (error) {
        logger.error('Scheduled reorder analysis failed', {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }, {
      scheduled: false // Don't start immediately
    });

    // Start the job
    reorderAnalysisJob.start();
    this.scheduledJobs.push(reorderAnalysisJob);

    // Schedule settings-based analysis frequency updates
    const settingsUpdateJob = cron.schedule('0 */6 * * *', async () => {
      try {
        const settings = await reorderService.getSettings();
        const frequencyHours = settings.analysis_frequency_hours || 24;
        
        // Convert hours to cron expression (simplified - runs every hour if frequency is 1, every 6 hours if 6, etc.)
        const cronExpression = frequencyHours <= 1 ? '0 * * * *' : 
                              frequencyHours <= 6 ? '0 */6 * * *' : 
                              frequencyHours <= 12 ? '0 */12 * * *' : '0 0 * * *';
        
        // Restart job with new frequency
        reorderAnalysisJob.stop();
        
        const newJob = cron.schedule(cronExpression, async () => {
          try {
            logger.info('Starting scheduled reorder analysis (frequency-based)');
            
            const currentSettings = await reorderService.getSettings();
            if (!currentSettings.auto_reorder_enabled) {
              return;
            }

            await reorderService.startAnalysis({
              userId: 'system',
              scope: 'all',
              urgencyOnly: false
            });

            logger.info('Scheduled reorder analysis completed');
          } catch (error) {
            logger.error('Scheduled reorder analysis failed', {
              error: error instanceof Error ? error.message : String(error)
            });
          }
        });
        
        newJob.start();
        this.scheduledJobs.push(newJob);
        
        logger.info(`Updated reorder analysis schedule to run every ${frequencyHours} hours`);
      } catch (error) {
        logger.error('Failed to update reorder analysis schedule', {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    });

    settingsUpdateJob.start();
    this.scheduledJobs.push(settingsUpdateJob);
  }

  public start(): void {
    this.app.listen(config.port, () => {
      logger.info(`🚀 NIMBUS API Server running on port ${config.port}`);
      logger.info(`📝 API Documentation: http://localhost:${config.port}/api-docs`);
      logger.info(`🔍 Health Check: http://localhost:${config.port}/api/${config.apiVersion}/health`);
      logger.info(`🌍 Environment: ${config.nodeEnv}`);
      logger.info(`⏰ Scheduled jobs: ${this.scheduledJobs.length} active`);
    });
  }

  public getApp(): express.Application {
    return this.app;
  }
}

// Start server
const server = new Server();
server.start();

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  
  // Stop all scheduled jobs
  server.scheduledJobs.forEach(job => {
    job.stop();
  });
  
  if (global.redisClient) {
    await global.redisClient.disconnect();
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  
  // Stop all scheduled jobs
  server.scheduledJobs.forEach(job => {
    job.stop();
  });
  
  if (global.redisClient) {
    await global.redisClient.disconnect();
  }
  process.exit(0);
});

export default server.getApp();
