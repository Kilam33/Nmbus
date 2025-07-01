import { Router, Request, Response } from 'express';
import { asyncHandler } from '../../middleware/error.middleware';
import { checkDatabaseHealth } from '../../utils/database';
import { redisService } from '../../utils/redis';
import { getHealthMetrics, getMetrics } from '../../middleware/metrics.middleware';
import { logger } from '../../utils/logger';

const router = Router();

/**
 * @swagger
 * /api/v1/health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: healthy
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: number
 *                   description: Process uptime in seconds
 *                 services:
 *                   type: object
 *                   properties:
 *                     database:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: string
 *                           example: OK
 *                         responseTime:
 *                           type: number
 *                     redis:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: string
 *                           example: OK
 *                         responseTime:
 *                           type: number
 *       503:
 *         description: Service is unhealthy
 */
router.get('/', asyncHandler(async (_req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    // Check all services
    const [databaseHealth, redisHealth] = await Promise.all([
      checkDatabaseHealth(),
      redisService.healthCheck(),
    ]);

    const responseTime = Date.now() - startTime;
    const isHealthy = databaseHealth.status === 'OK' && redisHealth.status === 'OK';

    const healthData = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      responseTime,
      services: {
        database: databaseHealth,
        redis: redisHealth,
        memory: process.memoryUsage(),
      },
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    };

    const statusCode = isHealthy ? 200 : 503;
    res.status(statusCode).json(healthData);

    // Log health check
    logger.info('Health check performed', {
      status: healthData.status,
      responseTime,
      services: {
        database: databaseHealth.status,
        redis: redisHealth.status,
      },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Health check failed', { error: errorMessage });
    
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      uptime: process.uptime(),
    });
  }
}));

/**
 * @swagger
 * /api/v1/health/metrics:
 *   get:
 *     summary: Get Prometheus metrics
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Prometheus metrics
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 */
router.get('/metrics', getMetrics);

/**
 * @swagger
 * /api/v1/health/detailed:
 *   get:
 *     summary: Detailed health information
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Detailed health metrics
 */
router.get('/detailed', asyncHandler(async (_req: Request, res: Response) => {
  const healthMetrics = getHealthMetrics();
  const databaseHealth = await checkDatabaseHealth();
  const redisHealth = await redisService.healthCheck();

  res.json({
    ...healthMetrics,
    services: {
      database: databaseHealth,
      redis: redisHealth,
    },
    process: {
      pid: process.pid,
      version: process.version,
      platform: process.platform,
      arch: process.arch,
    },
  });
}));

/**
 * @swagger
 * /api/v1/health/readiness:
 *   get:
 *     summary: Readiness check for Kubernetes
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is ready
 *       503:
 *         description: Service is not ready
 */
router.get('/readiness', asyncHandler(async (_req: Request, res: Response) => {
  try {
    // Quick readiness checks
    await Promise.all([
      checkDatabaseHealth(),
      redisService.healthCheck(),
    ]);

    res.json({ status: 'ready' });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Readiness check failed', { error: errorMessage });
    res.status(503).json({ status: 'not ready', error: errorMessage });
  }
}));

/**
 * @swagger
 * /api/v1/health/liveness:
 *   get:
 *     summary: Liveness check for Kubernetes
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is alive
 */
router.get('/liveness', (_req: Request, res: Response) => {
  res.json({ status: 'alive', timestamp: new Date().toISOString() });
});

export default router;