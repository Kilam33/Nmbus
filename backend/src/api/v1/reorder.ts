import { Router, Request, Response } from 'express';
import { asyncHandler } from '../../middleware/error.middleware';
import { requireAuth } from '../../middleware/auth.middleware';
import { validate, schemas } from '../../middleware/validation.middleware';
import { cache, invalidateCache, shortCache, longCache } from '../../middleware/cache.middleware';
import { metricsMiddleware, recordDatabaseQuery } from '../../middleware/metrics.middleware';
import { logger } from '../../utils/logger';
import { reorderService } from '../../services/reorder.service';
import { forecastingAgent } from '../../services/forecasting.agent';
import { ReorderFilters } from '../../types';
import { z } from 'zod';
import { redisService } from '../../utils/redis';

const router = Router();

// Apply metrics middleware to all routes
router.use(metricsMiddleware);

// Validation schemas
const reorderPolicySchema = z.object({
  product_id: z.string().uuid().optional(),
  category_id: z.string().uuid().optional(),
  supplier_id: z.string().uuid().optional(),
  min_stock_multiplier: z.number().min(0.1).max(10).default(1.5),
  max_order_quantity: z.number().int().min(1).optional(),
  preferred_order_quantity: z.number().int().min(1).optional(),
  safety_stock_days: z.number().int().min(1).max(365).default(7),
  review_frequency_days: z.number().int().min(1).max(30).default(7),
  auto_approve_threshold: z.number().min(0).optional(),
  is_active: z.boolean().default(true),
});

const suggestionActionSchema = z.object({
  action: z.enum(['approve', 'reject', 'modify']),
  reason: z.string().optional(),
  modifications: z.object({
    quantity: z.number().int().min(1).optional(),
    supplier_id: z.string().uuid().optional(),
    notes: z.string().optional(),
  }).optional(),
});

/**
 * @swagger
 * /api/v1/reorder/analyze:
 *   post:
 *     summary: Trigger AI reorder analysis
 *     tags: [Reorder]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               scope:
 *                 type: string
 *                 enum: [all, category, supplier, product]
 *                 default: all
 *               target_id:
 *                 type: string
 *                 format: uuid
 *               urgency_only:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       200:
 *         description: Analysis job started
 *       400:
 *         description: Invalid request parameters
 *       500:
 *         description: Internal server error
 */
router.post('/analyze',
  requireAuth,
  invalidateCache(['reorder:*', 'analytics:*', 'products:*']),
  asyncHandler(async (req: Request, res: Response) => {
    const { scope = 'all', target_id, urgency_only = false } = req.body;

    logger.info('Starting reorder analysis', {
      userId: req.user!.id,
      scope,
      target_id,
      urgency_only
    });

    try {
      const analysisJob = await reorderService.startAnalysis({
        userId: req.user!.id,
        scope,
        targetId: target_id,
        urgencyOnly: urgency_only
      });

      res.json({
        success: true,
        data: {
          jobId: analysisJob.id,
          estimatedCompletion: analysisJob.estimatedCompletion,
          status: 'started'
        },
        message: 'Reorder analysis started successfully'
      });
    } catch (error) {
      logger.error('Failed to start reorder analysis', {
        userId: req.user!.id,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  })
);

/**
 * @swagger
 * /api/v1/reorder/suggestions:
 *   get:
 *     summary: Get AI-generated reorder suggestions
 *     tags: [Reorder]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: urgency
 *         schema:
 *           type: string
 *           enum: [all, critical, high, medium, low]
 *           default: all
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: supplier
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: min_confidence
 *         schema:
 *           type: integer
 *           minimum: 0
 *           maximum: 100
 *           default: 70
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected, ordered]
 *           default: pending
 *     responses:
 *       200:
 *         description: Reorder suggestions retrieved successfully
 *       400:
 *         description: Invalid query parameters
 *       500:
 *         description: Internal server error
 */
router.get('/suggestions',
  requireAuth,
  cache({ 
    ttl: 300, // 5 minute cache
    keyGenerator: (req) => `reorder:suggestions:${req.user?.id}:${JSON.stringify(req.query)}`
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const filters: ReorderFilters = {
      urgency: (req.query.urgency as string || 'all') as 'all' | 'critical' | 'high' | 'medium' | 'low',
      category: req.query.category as string,
      supplier: req.query.supplier as string,
      minConfidence: parseInt(req.query.min_confidence as string) || 70,
      status: (req.query.status as string || 'pending') as 'pending' | 'approved' | 'rejected' | 'ordered'
    };

    const startTime = Date.now();
    
    try {
      const [suggestions, summary] = await Promise.all([
        reorderService.getSuggestions(filters),
        reorderService.getSuggestionsSummary(filters)
      ]);

      const duration = Date.now() - startTime;
      recordDatabaseQuery('select', 'reorder_suggestions', duration);

      res.json({
        success: true,
        data: {
          suggestions,
          summary
        }
      });
    } catch (error) {
      logger.error('Failed to get reorder suggestions', {
        userId: req.user!.id,
        filters,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  })
);

/**
 * @swagger
 * /api/v1/reorder/suggestions/{id}/action:
 *   post:
 *     summary: Approve, reject, or modify a reorder suggestion
 *     tags: [Reorder]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - action
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [approve, reject, modify]
 *               reason:
 *                 type: string
 *               modifications:
 *                 type: object
 *                 properties:
 *                   quantity:
 *                     type: integer
 *                     minimum: 1
 *                   supplier_id:
 *                     type: string
 *                     format: uuid
 *                   notes:
 *                     type: string
 *     responses:
 *       200:
 *         description: Suggestion processed successfully
 *       400:
 *         description: Invalid request data
 *       404:
 *         description: Suggestion not found
 *       500:
 *         description: Internal server error
 */
router.post('/suggestions/:id/action',
  requireAuth,
  validate({ 
    params: schemas.uuidParam,
    body: suggestionActionSchema 
  }),
  invalidateCache(['reorder:*', 'orders:*', 'products:*', 'analytics:*']),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { action, reason, modifications } = req.body;

    try {
      const result = await reorderService.processSuggestion(id!, {
        action,
        reason,
        modifications,
        userId: req.user!.id
      });

      logger.info('Reorder suggestion processed', {
        suggestionId: id,
        action,
        userId: req.user!.id,
        result: result.success
      });

      res.json({
        success: true,
        data: result,
        message: `Suggestion ${action}ed successfully`
      });
    } catch (error) {
      logger.error('Failed to process reorder suggestion', {
        suggestionId: id,
        userId: req.user!.id,
        action,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  })
);

/**
 * @swagger
 * /api/v1/reorder/policies:
 *   get:
 *     summary: Get reorder policies
 *     tags: [Reorder]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Reorder policies retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/policies',
  requireAuth,
  longCache(600), // 10 minute cache
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const policies = await reorderService.getPolicies();
      
      res.json({
        success: true,
        data: policies
      });
    } catch (error) {
      logger.error('Failed to get reorder policies', {
        userId: req.user!.id,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  })
);

/**
 * @swagger
 * /api/v1/reorder/policies:
 *   post:
 *     summary: Create a new reorder policy
 *     tags: [Reorder]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               product_id:
 *                 type: string
 *                 format: uuid
 *               category_id:
 *                 type: string
 *                 format: uuid
 *               supplier_id:
 *                 type: string
 *                 format: uuid
 *               min_stock_multiplier:
 *                 type: number
 *                 minimum: 0.1
 *                 maximum: 10
 *                 default: 1.5
 *               safety_stock_days:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 365
 *                 default: 7
 *               auto_approve_threshold:
 *                 type: number
 *                 minimum: 0
 *     responses:
 *       201:
 *         description: Reorder policy created successfully
 *       400:
 *         description: Invalid request data
 *       500:
 *         description: Internal server error
 */
router.post('/policies',
  requireAuth,
  validate({ body: reorderPolicySchema }),
  invalidateCache(['reorder:*']),
  asyncHandler(async (req: Request, res: Response) => {
    const policyData = req.body;

    try {
      const policy = await reorderService.createPolicy({
        ...policyData,
        createdBy: req.user!.id
      });

      logger.info('Reorder policy created', {
        policyId: policy.id,
        userId: req.user!.id
      });

      res.status(201).json({
        success: true,
        data: policy,
        message: 'Reorder policy created successfully'
      });
    } catch (error) {
      logger.error('Failed to create reorder policy', {
        userId: req.user!.id,
        policyData,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  })
);

/**
 * @swagger
 * /api/v1/reorder/forecast/{productId}:
 *   get:
 *     summary: Get demand forecast for a product
 *     tags: [Reorder]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           minimum: 7
 *           maximum: 365
 *           default: 30
 *       - in: query
 *         name: include_confidence_intervals
 *         schema:
 *           type: boolean
 *           default: true
 *     responses:
 *       200:
 *         description: Demand forecast retrieved successfully
 *       404:
 *         description: Product not found
 *       500:
 *         description: Internal server error
 */
router.get('/forecast/:productId',
  requireAuth,
  validate({ params: schemas.uuidParam }),
  cache({ 
    ttl: 1800, // 30 minute cache
    keyGenerator: (req) => `reorder:forecast:${req.params.productId}:${JSON.stringify(req.query)}`
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { productId } = req.params;
    const days = parseInt(req.query.days as string) || 30;
    const includeConfidenceIntervals = req.query.include_confidence_intervals !== 'false';

    try {
      const forecast = await forecastingAgent.generateForecast(productId!, {
        horizon: days,
        includeConfidenceIntervals,
        includeSeasonality: true,
        includeExternalFactors: true
      });

      res.json({
        success: true,
        data: forecast
      });
    } catch (error) {
      logger.error('Failed to generate forecast', {
        productId,
        userId: req.user!.id,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  })
);

/**
 * @swagger
 * /api/v1/reorder/auto-orders:
 *   get:
 *     summary: Get automatically created orders
 *     tags: [Reorder]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, sent, received]
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Auto-generated orders retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/auto-orders',
  requireAuth,
  shortCache(180), // 3 minute cache
  asyncHandler(async (req: Request, res: Response) => {
    const filters = {
      status: req.query.status as string,
      dateFrom: req.query.date_from as string,
      dateTo: req.query.date_to as string
    };

    try {
      const autoOrders = await reorderService.getAutoOrders(filters);
      
      res.json({
        success: true,
        data: autoOrders
      });
    } catch (error) {
      logger.error('Failed to get auto orders', {
        userId: req.user!.id,
        filters,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  })
);

/**
 * @swagger
 * /api/v1/reorder/settings:
 *   get:
 *     summary: Get reorder system settings
 *     tags: [Reorder]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Reorder settings retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/settings',
  requireAuth,
  longCache(3600), // 1 hour cache
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const settings = await reorderService.getSettings();
      
      res.json({
        success: true,
        data: settings
      });
    } catch (error) {
      logger.error('Failed to get reorder settings', {
        userId: req.user!.id,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  })
);

/**
 * @swagger
 * /api/v1/reorder/settings:
 *   put:
 *     summary: Update reorder system settings
 *     tags: [Reorder]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               auto_reorder_enabled:
 *                 type: boolean
 *               analysis_frequency_hours:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 168
 *               default_confidence_threshold:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 100
 *               max_auto_approve_amount:
 *                 type: number
 *                 minimum: 0
 *     responses:
 *       200:
 *         description: Reorder settings updated successfully
 *       400:
 *         description: Invalid request data
 *       500:
 *         description: Internal server error
 */
router.put('/settings',
  requireAuth,
  invalidateCache(['reorder:*']),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const settings = await reorderService.updateSettings(req.body, req.user!.id);
      
      logger.info('Reorder settings updated', {
        userId: req.user!.id,
        changes: Object.keys(req.body)
      });

      res.json({
        success: true,
        data: settings,
        message: 'Reorder settings updated successfully'
      });
    } catch (error) {
      logger.error('Failed to update reorder settings', {
        userId: req.user!.id,
        settings: req.body,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  })
);

/**
 * @swagger
 * /api/v1/reorder/job/{jobId}:
 *   get:
 *     summary: Get analysis job status
 *     tags: [Reorder]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Job status retrieved successfully
 *       404:
 *         description: Job not found
 *       500:
 *         description: Internal server error
 */
router.get('/job/:jobId',
  requireAuth,
  validate({ params: z.object({ jobId: z.string().uuid('Invalid job ID format') }) }),
  asyncHandler(async (req: Request, res: Response) => {
    const { jobId } = req.params;

    try {
      const jobData = await redisService.get(`reorder:job:${jobId}`);
      
      if (!jobData) {
        return res.status(404).json({
          success: false,
          message: 'Job not found'
        });
      }

      res.json({
        success: true,
        data: {
          id: jobId,
          status: jobData.status,
          estimatedCompletion: jobData.estimatedCompletion,
          suggestionsCount: jobData.suggestionsCount,
          error: jobData.error,
          startedAt: jobData.startedAt,
          completedAt: jobData.completedAt,
          failedAt: jobData.failedAt
        }
      });
    } catch (error) {
      logger.error('Failed to get job status', {
        jobId,
        userId: req.user!.id,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  })
);

export default router;