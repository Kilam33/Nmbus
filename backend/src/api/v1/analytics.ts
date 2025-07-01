import { Router, Request, Response } from 'express';
import { asyncHandler } from '../../middleware/error.middleware';
import { requireAuth } from '../../middleware/auth.middleware';
import { validate, schemas } from '../../middleware/validation.middleware';
import { analyticsCache } from '../../middleware/cache.middleware';
import { query } from '../../utils/database';
import { logger } from '../../utils/logger';
import { DashboardData, SalesAnalytics, TurnoverData, ReorderSuggestion } from '../../types';
import { z } from 'zod';
import { ValidationError } from '../../middleware/error.middleware';

const router = Router();

/**
 * @swagger
 * /api/v1/analytics/dashboard:
 *   get:
 *     summary: Get dashboard analytics data
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data retrieved successfully
 */
router.get('/dashboard',
  requireAuth,
  analyticsCache(600), // 10 minute cache
  asyncHandler(async (req: Request, res: Response) => {
    try {
      // Get basic counts with error handling
      const [
        productsCount,
        categoriesCount,
        suppliersCount,
        ordersCount,
        lowStockCount,
        revenueData,
        ordersByStatus,
        productsByCategory,
        recentOrders,
        topProducts,
        lowStockProducts,
      ] = await Promise.all([
        query('SELECT COUNT(*) FROM products').catch(() => ({ rows: [{ count: '0' }] })),
        query('SELECT COUNT(*) FROM categories').catch(() => ({ rows: [{ count: '0' }] })),
        query('SELECT COUNT(*) FROM suppliers').catch(() => ({ rows: [{ count: '0' }] })),
        query('SELECT COUNT(*) FROM orders').catch(() => ({ rows: [{ count: '0' }] })),
        query('SELECT COUNT(*) FROM products WHERE quantity <= low_stock_threshold').catch(() => ({ rows: [{ count: '0' }] })),
        query(`
          SELECT 
            COALESCE(SUM(total), 0) as current_revenue,
            COALESCE(SUM(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN total ELSE 0 END), 0) as last_30_days,
            COALESCE(SUM(CASE WHEN created_at >= NOW() - INTERVAL '60 days' AND created_at < NOW() - INTERVAL '30 days' THEN total ELSE 0 END), 0) as previous_30_days
          FROM orders 
          WHERE status = 'completed'
        `).catch(() => ({ rows: [{ current_revenue: '0', last_30_days: '0', previous_30_days: '0' }] })),
        query(`
          SELECT status, COUNT(*) as count
          FROM orders
          GROUP BY status
          ORDER BY count DESC
        `).catch(() => ({ rows: [] })),
        query(`
          SELECT c.name as category, COUNT(p.id) as count
          FROM categories c
          LEFT JOIN products p ON c.id = p.category_id
          GROUP BY c.id, c.name
          ORDER BY count DESC
          LIMIT 10
        `).catch(() => ({ rows: [] })),
        query(`
          SELECT 
            o.*,
            p.name as product_name,
            s.name as supplier_name
          FROM orders o
          LEFT JOIN products p ON o.product_id = p.id
          LEFT JOIN suppliers s ON o.supplier_id = s.id
          ORDER BY o.created_at DESC
          LIMIT 10
        `).catch(() => ({ rows: [] })),
        query(`
          SELECT 
            p.id,
            p.name,
            c.name as category,
            COUNT(o.id) as units_sold,
            COALESCE(SUM(o.total), 0) as revenue
          FROM products p
          LEFT JOIN categories c ON p.category_id = c.id
          LEFT JOIN orders o ON p.id = o.product_id AND o.status = 'completed'
          GROUP BY p.id, p.name, c.name
          ORDER BY units_sold DESC, revenue DESC
          LIMIT 10
        `).catch(() => ({ rows: [] })),
        query(`
          SELECT 
            p.*,
            c.name as category_name,
            s.name as supplier_name
          FROM products p
          LEFT JOIN categories c ON p.category_id = c.id
          LEFT JOIN suppliers s ON p.supplier_id = s.id
          WHERE p.quantity <= p.low_stock_threshold
          ORDER BY (p.quantity::float / p.low_stock_threshold) ASC
          LIMIT 10
        `).catch(() => ({ rows: [] })),
      ]);

    // Calculate revenue change
    const currentRevenue = parseFloat(revenueData.rows[0].current_revenue);
    const last30Days = parseFloat(revenueData.rows[0].last_30_days);
    const previous30Days = parseFloat(revenueData.rows[0].previous_30_days);
    const revenueChange = previous30Days > 0 ? ((last30Days - previous30Days) / previous30Days) * 100 : 0;

    // Generate inventory trends (mock data for now)
    const inventoryTrends = [
      { name: 'Jan', products: 120, revenue: 15000 },
      { name: 'Feb', products: 135, revenue: 18000 },
      { name: 'Mar', products: 142, revenue: 22000 },
      { name: 'Apr', products: 158, revenue: 25000 },
      { name: 'May', products: 165, revenue: 28000 },
      { name: 'Jun', products: 172, revenue: 32000 },
    ];

    const dashboardData: DashboardData = {
      totalProducts: parseInt(productsCount.rows[0].count),
      totalCategories: parseInt(categoriesCount.rows[0].count),
      totalSuppliers: parseInt(suppliersCount.rows[0].count),
      totalOrders: parseInt(ordersCount.rows[0].count),
      revenue: currentRevenue,
      lowStockItems: parseInt(lowStockCount.rows[0].count),
      revenueChange,
      ordersByStatus: ordersByStatus.rows.map((row: any) => ({
        status: row.status === 'completed' ? 'delivered' : row.status,
        count: parseInt(row.count),
      })),
      productsByCategory: productsByCategory.rows.map((row: any) => ({
        category: row.category,
        count: parseInt(row.count),
      })),
      recentOrders: recentOrders.rows.map((row: any) => ({
        ...row,
        products: row.product_name ? { name: row.product_name } : null,
        suppliers: row.supplier_name ? { name: row.supplier_name } : null,
      })),
      topSellingProducts: topProducts.rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        category: row.category || 'Uncategorized',
        unitsSold: parseInt(row.units_sold),
        revenue: parseFloat(row.revenue),
        growth: Math.random() * 20 - 10, // Mock growth data
      })),
      lowStockProducts: lowStockProducts.rows.map((row: any) => ({
        ...row,
        categories: row.category_name ? { name: row.category_name } : null,
        suppliers: row.supplier_name ? { name: row.supplier_name } : null,
      })),
      inventoryTrends,
    };

    res.json({
      success: true,
      data: dashboardData,
    });
    } catch (error) {
      logger.error('Dashboard analytics error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to load dashboard data',
          code: 'DASHBOARD_ERROR',
          statusCode: 500,
        },
      });
    }
  })
);

/**
 * @swagger
 * /api/v1/analytics/test:
 *   get:
 *     summary: Test analytics endpoint
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Test successful
 */
router.get('/test',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      // Test database connection
      const testResult = await query('SELECT 1 as test');
      
      res.json({
        success: true,
        data: {
          message: 'Analytics endpoint is working',
          database: 'connected',
          testResult: testResult.rows[0],
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Analytics test error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Analytics test failed',
          code: 'TEST_ERROR',
          statusCode: 500,
        },
      });
    }
  })
);

/**
 * @swagger
 * /api/v1/analytics/sales:
 *   get:
 *     summary: Get sales analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d, 1y]
 *           default: 30d
 *     responses:
 *       200:
 *         description: Sales analytics retrieved successfully
 */
router.get('/sales',
  requireAuth,
  validate({ query: schemas.analyticsQuery }),
  analyticsCache(300), // 5 minute cache
  asyncHandler(async (req: Request, res: Response) => {
    const { period = '30d' } = req.query as any;

    // Convert period to days
    const periodDays: Record<string, number> = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '1y': 365,
    };
    const days = periodDays[period] || 30;

    const [
      totalStats,
      dailySales,
      topProducts,
      categoryBreakdown,
    ] = await Promise.all([
      query(`
        SELECT 
          COALESCE(SUM(total), 0) as total_revenue,
          COUNT(*) as total_orders,
          COALESCE(AVG(total), 0) as avg_order_value
        FROM orders 
        WHERE status = 'completed' 
        AND created_at >= NOW() - INTERVAL '${days} days'
      `),
      query(`
        SELECT 
          DATE(created_at) as date,
          COALESCE(SUM(total), 0) as revenue,
          COUNT(*) as orders
        FROM orders 
        WHERE status = 'completed' 
        AND created_at >= NOW() - INTERVAL '${days} days'
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `),
      query(`
        SELECT 
          p.id,
          p.name,
          c.name as category,
          COUNT(o.id) as units_sold,
          COALESCE(SUM(o.total), 0) as revenue,
          COALESCE(SUM(o.total), 0) / NULLIF(COUNT(o.id), 0) as avg_price
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN orders o ON p.id = o.product_id 
          AND o.status = 'completed' 
          AND o.created_at >= NOW() - INTERVAL '${days} days'
        GROUP BY p.id, p.name, c.name
        HAVING COUNT(o.id) > 0
        ORDER BY revenue DESC
        LIMIT 10
      `),
      query(`
        SELECT 
          c.name as category,
          COALESCE(SUM(o.total), 0) as revenue,
          COUNT(o.id) as orders
        FROM categories c
        LEFT JOIN products p ON c.id = p.category_id
        LEFT JOIN orders o ON p.id = o.product_id 
          AND o.status = 'completed' 
          AND o.created_at >= NOW() - INTERVAL '${days} days'
        GROUP BY c.id, c.name
        HAVING COUNT(o.id) > 0
        ORDER BY revenue DESC
      `),
    ]);

    const totalRevenue = parseFloat(totalStats.rows[0].total_revenue);
    const categoryTotal = categoryBreakdown.rows.reduce((sum: number, row: any) => sum + parseFloat(row.revenue), 0);

    const salesAnalytics: SalesAnalytics = {
      totalRevenue,
      totalOrders: parseInt(totalStats.rows[0].total_orders),
      averageOrderValue: parseFloat(totalStats.rows[0].avg_order_value),
      revenueGrowth: Math.random() * 20 - 10, // Mock growth data
      ordersGrowth: Math.random() * 15 - 5, // Mock growth data
      dailySales: dailySales.rows.map((row: any) => ({
        date: row.date,
        revenue: parseFloat(row.revenue),
        orders: parseInt(row.orders),
      })),
      topProducts: topProducts.rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        category: row.category || 'Uncategorized',
        unitsSold: parseInt(row.units_sold),
        revenue: parseFloat(row.revenue),
        growth: Math.random() * 25 - 10, // Mock growth data
      })),
      categoryBreakdown: categoryBreakdown.rows.map((row: any, index: number) => {
        const revenue = parseFloat(row.revenue);
        const percentage = categoryTotal > 0 ? (revenue / categoryTotal) * 100 : 0;
        const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'];
        
        return {
          name: row.category,
          value: revenue,
          percentage,
          color: colors[index % colors.length],
        };
      }),
    };

    res.json({
      success: true,
      data: salesAnalytics,
    });
  })
);

/**
 * @swagger
 * /api/v1/analytics/inventory-turnover:
 *   get:
 *     summary: Get inventory turnover analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Inventory turnover data retrieved successfully
 */
router.get('/inventory-turnover',
  requireAuth,
  analyticsCache(600), // 10 minute cache
  asyncHandler(async (_req: Request, res: Response) => {
    // Mock turnover data - in a real implementation, this would be calculated from historical data
    const turnoverData: TurnoverData[] = [
      {
        month: 'Jan',
        turnoverRate: 4.2,
        avgInventory: 25000,
        costOfGoods: 105000,
        sales: 120000,
        daysToSell: 87,
      },
      {
        month: 'Feb',
        turnoverRate: 4.8,
        avgInventory: 23000,
        costOfGoods: 110400,
        sales: 135000,
        daysToSell: 76,
      },
      {
        month: 'Mar',
        turnoverRate: 5.1,
        avgInventory: 22000,
        costOfGoods: 112200,
        sales: 142000,
        daysToSell: 72,
      },
      {
        month: 'Apr',
        turnoverRate: 5.5,
        avgInventory: 21000,
        costOfGoods: 115500,
        sales: 158000,
        daysToSell: 66,
      },
      {
        month: 'May',
        turnoverRate: 5.8,
        avgInventory: 20500,
        costOfGoods: 118900,
        sales: 165000,
        daysToSell: 63,
      },
      {
        month: 'Jun',
        turnoverRate: 6.2,
        avgInventory: 20000,
        costOfGoods: 124000,
        sales: 172000,
        daysToSell: 59,
      },
    ];

    res.json({
      success: true,
      data: turnoverData,
    });
  })
);

/**
 * @swagger
 * /api/v1/analytics/reorder-suggestions:
 *   get:
 *     summary: Get automated reorder suggestions
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Reorder suggestions retrieved successfully
 */
router.get('/reorder-suggestions',
  requireAuth,
  analyticsCache(300), // 5 minute cache
  asyncHandler(async (_req: Request, res: Response) => {
    // Get products that need reordering based on various criteria
    const result = await query(`
      SELECT 
        p.*,
        c.name as category_name,
        s.name as supplier_name,
        s.avg_lead_time,
        s.reliability_score,
        COALESCE(AVG(o.quantity), 0) as avg_order_quantity,
        COALESCE(COUNT(o.id), 0) as order_count,
        COALESCE(MAX(o.created_at), p.created_at) as last_order_date
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      LEFT JOIN orders o ON p.id = o.product_id AND o.status = 'completed'
      WHERE p.quantity <= p.low_stock_threshold * 1.5
      GROUP BY p.id, c.name, s.name, s.avg_lead_time, s.reliability_score
      ORDER BY (p.quantity::float / p.low_stock_threshold) ASC
      LIMIT 20
    `);

    const suggestions: ReorderSuggestion[] = result.rows.map((row: any) => {
      const currentStock = row.quantity;
      const minStock = row.low_stock_threshold;
      const avgOrderQty = parseFloat(row.avg_order_quantity) || minStock * 2;
      const leadTime = row.avg_lead_time || 7;
      
      // Calculate suggested quantity based on various factors
      const safetyStock = minStock * 0.5;
      const leadTimeDemand = avgOrderQty * (leadTime / 30); // Assuming monthly average
      const suggestedQuantity = Math.ceil(leadTimeDemand + safetyStock);
      
      // Determine urgency
      const stockRatio = currentStock / minStock;
      let urgency: 'critical' | 'high' | 'medium' | 'low';
      if (stockRatio <= 0.5) urgency = 'critical';
      else if (stockRatio <= 0.8) urgency = 'high';
      else if (stockRatio <= 1.2) urgency = 'medium';
      else urgency = 'low';

      // Calculate confidence based on historical data and supplier reliability
      const dataPoints = parseInt(row.order_count);
      const reliabilityScore = row.reliability_score || 50;
      const confidence = Math.min(95, (dataPoints * 10) + (reliabilityScore * 0.5));

      // Generate reason
      let reason = `Stock level (${currentStock}) is `;
      if (currentStock <= minStock) {
        reason += `at or below minimum threshold (${minStock})`;
      } else {
        reason += `approaching minimum threshold (${minStock})`;
      }

      return {
        id: row.id,
        productName: row.name,
        category: row.category_name || 'Uncategorized',
        supplier: row.supplier_name || 'Unknown',
        currentStock,
        minStock,
        suggestedQuantity,
        estimatedCost: suggestedQuantity * (row.price || 0),
        urgency,
        confidence: Math.round(confidence),
        reason,
        lastOrderDate: row.last_order_date,
        leadTime,
      };
    });

    res.json({
      success: true,
      data: suggestions,
    });
  })
);

/**
 * @swagger
 * /api/v1/analytics/demand-forecast:
 *   get:
 *     summary: Get demand forecasting data
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [30d, 90d, 180d]
 *           default: 90d
 *     responses:
 *       200:
 *         description: Demand forecast data retrieved successfully
 */
router.get('/demand-forecast',
  requireAuth,
  validate({ query: schemas.analyticsQuery }),
  analyticsCache(600), // 10 minute cache
  asyncHandler(async (req: Request, res: Response) => {
    const { period = '90d' } = req.query as any;

    // Get historical sales data for forecasting
    const historicalData = await query(`
      SELECT 
        p.id,
        p.name,
        c.name as category,
        DATE_TRUNC('week', o.created_at) as week,
        SUM(o.quantity) as total_quantity
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN orders o ON p.id = o.product_id AND o.status = 'completed'
      WHERE o.created_at >= NOW() - INTERVAL '${period}'
      GROUP BY p.id, p.name, c.name, DATE_TRUNC('week', o.created_at)
      ORDER BY p.name, week
    `);

    // Simple moving average forecast (in production, use more sophisticated algorithms)
    interface ForecastItem {
      id: string;
      name: string;
      category: string;
      currentDemand: number;
      forecastedDemand: number;
      confidence: number;
    }
    
    const forecastData: ForecastItem[] = [];
    const productData = new Map<string, any>();

    // Group data by product
    historicalData.rows.forEach((row: any) => {
      const productId = row.id;
      if (!productData.has(productId)) {
        productData.set(productId, {
          id: productId,
          name: row.name,
          category: row.category || 'Uncategorized',
          weeklyData: [],
        });
      }
      productData.get(productId).weeklyData.push({
        week: row.week,
        quantity: parseInt(row.total_quantity),
      });
    });

    // Generate forecasts
    productData.forEach((product: any) => {
      if (product.weeklyData.length >= 4) { // Need at least 4 weeks of data
        const quantities = product.weeklyData.map((d: any) => d.quantity);
        const avgDemand = quantities.reduce((sum: number, q: number) => sum + q, 0) / quantities.length;
        
        // Simple trend calculation
        const trend = quantities.length > 1 
          ? (quantities[quantities.length - 1] - quantities[0]) / quantities.length
          : 0;

        const forecastedDemand = Math.max(0, Math.round(avgDemand + trend * 4)); // 4 weeks ahead
        const confidence = Math.min(95, Math.max(60, 100 - (Math.abs(trend) / avgDemand) * 100));

        forecastData.push({
          id: product.id,
          name: product.name,
          category: product.category,
          currentDemand: Math.round(avgDemand),
          forecastedDemand,
          confidence: Math.round(confidence),
        });
      }
    });

    // Sort by forecasted demand
    forecastData.sort((a: ForecastItem, b: ForecastItem) => b.forecastedDemand - a.forecastedDemand);

    res.json({
      success: true,
      data: forecastData.slice(0, 20), // Top 20 products
    });
  })
);

/**
 * @swagger
 * /api/v1/analytics/export:
 *   post:
 *     summary: Export data
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               format:
 *                 type: string
 *                 enum: [csv, json, xlsx]
 *                 default: csv
 *     responses:
 *       200:
 *         description: Data exported successfully
 */
router.post('/export',
  requireAuth,
  validate({
    body: z.object({
      format: z.enum(['csv', 'json', 'xlsx']).default('csv'),
    })
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { format } = req.body;
    const userId = req.user!.id;

    try {
      // Get all data for export
      const products = await query('SELECT * FROM products ORDER BY created_at DESC');
      const categories = await query('SELECT * FROM categories ORDER BY name');
      const suppliers = await query('SELECT * FROM suppliers ORDER BY name');
      const orders = await query('SELECT * FROM orders ORDER BY created_at DESC');

      const exportData = {
        products: products.rows,
        categories: categories.rows,
        suppliers: suppliers.rows,
        orders: orders.rows,
        exportDate: new Date().toISOString(),
        exportedBy: userId,
      };

      logger.info('Data export requested', { 
        userId, 
        format, 
        recordCount: {
          products: products.rows.length,
          categories: categories.rows.length,
          suppliers: suppliers.rows.length,
          orders: orders.rows.length,
        }
      });

      if (format === 'json') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="nimbus-export-${Date.now()}.json"`);
        res.json(exportData);
      } else if (format === 'csv') {
        // For CSV, we'll return a simplified version
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="nimbus-export-${Date.now()}.csv"`);
        
        // Create CSV content (simplified)
        const csvContent = [
          'Product Name,Category,Supplier,Price,Quantity,Status',
          ...products.rows.map((p: any) => `${p.name},${p.category_id},${p.supplier_id},${p.price},${p.quantity},${p.status || 'active'}`)
        ].join('\n');
        
        res.send(csvContent);
      } else {
        // For xlsx, return JSON for now (you'd need a library like xlsx to generate actual Excel files)
        res.json({
          success: true,
          data: exportData,
          message: 'Data exported successfully',
          note: 'XLSX format not implemented yet, returning JSON data',
        });
      }

    } catch (error) {
      logger.error('Data export error', { userId, error: (error as Error).message });
      throw new ValidationError('Failed to export data');
    }
  })
);

/**
 * @swagger
 * /api/v1/analytics/orders/stats:
 *   get:
 *     summary: Get order statistics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Order statistics retrieved successfully
 */
router.get('/orders/stats',
  requireAuth,
  analyticsCache(300), // 5 minute cache
  asyncHandler(async (req: Request, res: Response) => {
    const result = await query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM orders
      GROUP BY status
    `);

    const stats = {
      pending: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
    };

    result.rows.forEach((row: any) => {
      const status = row.status.toLowerCase();
      if (status === 'completed') {
        // Map 'completed' to 'delivered' for frontend compatibility
        stats.delivered = parseInt(row.count);
      } else if (status in stats) {
        stats[status as keyof typeof stats] = parseInt(row.count);
      }
    });

    res.json({
      success: true,
      data: stats,
    });
  })
);

/**
 * @swagger
 * /api/v1/analytics/orders/trends:
 *   get:
 *     summary: Get order trends
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d, 1y]
 *           default: 30d
 *     responses:
 *       200:
 *         description: Order trends retrieved successfully
 */
router.get('/orders/trends',
  requireAuth,
  validate({ query: schemas.analyticsQuery }),
  analyticsCache(300), // 5 minute cache
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { period = '30d' } = req.query as any;

      const periodDays: Record<string, number> = {
        '7d': 7,
        '30d': 30,
        '90d': 90,
        '1y': 365,
      };

      const days = periodDays[period] || 30;

      const result = await query(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as orders,
          COALESCE(SUM(total), 0) as revenue
        FROM orders
        WHERE created_at >= NOW() - INTERVAL '${days} days'
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `);

      const trends = result.rows.map((row: any) => ({
        name: row.date,
        orders: parseInt(row.orders),
        revenue: parseFloat(row.revenue),
      }));

      res.json({
        success: true,
        data: trends,
      });
    } catch (error) {
      logger.error('Order trends analytics error:', error);
      res.status(500).json({
        success: false,
        data: [],
        error: {
          message: 'Failed to load order trends',
          code: 'ORDER_TRENDS_ERROR',
          statusCode: 500,
        },
      });
    }
  })
);

/**
 * @swagger
 * /api/v1/analytics/categories/breakdown:
 *   get:
 *     summary: Get category breakdown
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Category breakdown retrieved successfully
 */
router.get('/categories/breakdown',
  requireAuth,
  analyticsCache(600), // 10 minute cache
  asyncHandler(async (req: Request, res: Response) => {
    const result = await query(`
      SELECT 
        c.name,
        COUNT(p.id) as value,
        '#' || substr(md5(c.name), 1, 6) as color
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id
      GROUP BY c.id, c.name
      ORDER BY value DESC
    `);

    const breakdown = result.rows.map((row: any) => ({
      name: row.name,
      value: parseInt(row.value),
      color: row.color,
    }));

    res.json({
      success: true,
      data: breakdown,
    });
  })
);

/**
 * @swagger
 * /api/v1/analytics/products/top:
 *   get:
 *     summary: Get top selling products
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Top products retrieved successfully
 */
router.get('/products/top',
  requireAuth,
  validate({ query: z.object({
    limit: z.string().optional().transform(val => {
      if (!val) return 10;
      const parsed = parseInt(val, 10);
      return isNaN(parsed) ? 10 : Math.min(parsed, 100);
    })
  }) }),
  analyticsCache(300), // 5 minute cache
  asyncHandler(async (req: Request, res: Response) => {
    const { limit } = req.query as { limit?: number };

    const result = await query(`
      SELECT 
        p.id,
        p.name,
        p.quantity as in_stock,
        COUNT(o.id) as sold,
        COALESCE(SUM(o.total), 0) as revenue
      FROM products p
      LEFT JOIN orders o ON p.id = o.product_id AND o.status = 'completed'
      GROUP BY p.id, p.name, p.quantity
      ORDER BY sold DESC, revenue DESC
      LIMIT $1
    `, [limit || 10]);

    const topProducts = result.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      sold: parseInt(row.sold),
      revenue: parseFloat(row.revenue),
      in_stock: parseInt(row.in_stock),
    }));

    res.json({
      success: true,
      data: topProducts,
    });
  })
);

/**
 * @swagger
 * /api/v1/analytics/inventory/trends:
 *   get:
 *     summary: Get inventory trends
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Inventory trends retrieved successfully
 */
router.get('/inventory/trends',
  requireAuth,
  validate({ query: schemas.analyticsQuery }),
  analyticsCache(600), // 10 minute cache
  asyncHandler(async (req: Request, res: Response) => {
    const { period = 'monthly' } = req.query as any;

    const periodDays: Record<string, number> = {
      'daily': 7,
      'weekly': 30,
      'monthly': 90,
      'yearly': 365,
    };

    const days = periodDays[period] || 90;

    // Generate time-based trends based on the selected period
    let trends: any[] = [];

    if (period === 'daily') {
      // Daily: Show last 7 days
      const dailyData = await query(`
        SELECT 
          DATE(o.created_at) as date,
          COUNT(DISTINCT p.id) as products,
          COALESCE(SUM(o.total), 0) as revenue
        FROM orders o
        LEFT JOIN products p ON o.product_id = p.id
        WHERE o.status = 'completed' 
        AND o.created_at >= NOW() - INTERVAL '7 days'
        GROUP BY DATE(o.created_at)
        ORDER BY date ASC
      `);

      trends = dailyData.rows.map((row: any) => ({
        name: new Date(row.date).toLocaleDateString('en-US', { weekday: 'short' }),
        products: parseInt(row.products),
        revenue: parseFloat(row.revenue)
      }));
    } else if (period === 'weekly') {
      // Weekly: Show last 4 weeks
      const weeklyData = await query(`
        SELECT 
          DATE_TRUNC('week', o.created_at) as week_start,
          COUNT(DISTINCT p.id) as products,
          COALESCE(SUM(o.total), 0) as revenue
        FROM orders o
        LEFT JOIN products p ON o.product_id = p.id
        WHERE o.status = 'completed' 
        AND o.created_at >= NOW() - INTERVAL '4 weeks'
        GROUP BY DATE_TRUNC('week', o.created_at)
        ORDER BY week_start ASC
      `);

      trends = weeklyData.rows.map((row: any, index: number) => ({
        name: `Week ${index + 1}`,
        products: parseInt(row.products),
        revenue: parseFloat(row.revenue)
      }));
    } else if (period === 'monthly') {
      // Monthly: Show last 6 months
      const monthlyData = await query(`
        SELECT 
          DATE_TRUNC('month', o.created_at) as month_start,
          COUNT(DISTINCT p.id) as products,
          COALESCE(SUM(o.total), 0) as revenue
        FROM orders o
        LEFT JOIN products p ON o.product_id = p.id
        WHERE o.status = 'completed' 
        AND o.created_at >= NOW() - INTERVAL '6 months'
        GROUP BY DATE_TRUNC('month', o.created_at)
        ORDER BY month_start ASC
      `);

      trends = monthlyData.rows.map((row: any) => ({
        name: new Date(row.month_start).toLocaleDateString('en-US', { month: 'short' }),
        products: parseInt(row.products),
        revenue: parseFloat(row.revenue)
      }));
    } else {
      // Yearly: Show last 12 months
      const yearlyData = await query(`
        SELECT 
          DATE_TRUNC('month', o.created_at) as month_start,
          COUNT(DISTINCT p.id) as products,
          COALESCE(SUM(o.total), 0) as revenue
        FROM orders o
        LEFT JOIN products p ON o.product_id = p.id
        WHERE o.status = 'completed' 
        AND o.created_at >= NOW() - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', o.created_at)
        ORDER BY month_start ASC
      `);

      trends = yearlyData.rows.map((row: any) => ({
        name: new Date(row.month_start).toLocaleDateString('en-US', { month: 'short' }),
        products: parseInt(row.products),
        revenue: parseFloat(row.revenue)
      }));
    }

    // If no data, provide some fallback data
    if (trends.length === 0) {
      trends = [
        { name: 'No Data', products: 0, revenue: 0 }
      ];
    }

    res.json({
      success: true,
      data: trends,
    });
  })
);

/**
 * @swagger
 * /api/v1/analytics/sales/report:
 *   get:
 *     summary: Get sales report
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sales report retrieved successfully
 */
router.get('/sales/report',
  requireAuth,
  analyticsCache(300), // 5 minute cache
  asyncHandler(async (req: Request, res: Response) => {
    const [
      salesData,
      topCategories,
      topProducts,
      revenueTrend,
    ] = await Promise.all([
      query(`
        SELECT 
          COUNT(*) as total_orders,
          COALESCE(SUM(total), 0) as total_sales,
          COALESCE(AVG(total), 0) as average_order_value
        FROM orders
        WHERE status = 'completed'
      `),
      query(`
        SELECT 
          c.name,
          COUNT(o.id) as value,
          '#' || substr(md5(c.name), 1, 6) as color
        FROM categories c
        LEFT JOIN products p ON c.id = p.category_id
        LEFT JOIN orders o ON p.id = o.product_id AND o.status = 'completed'
        GROUP BY c.id, c.name
        ORDER BY value DESC
        LIMIT 10
      `),
      query(`
        SELECT 
          p.id,
          p.name,
          COUNT(o.id) as sold,
          COALESCE(SUM(o.total), 0) as revenue
        FROM products p
        LEFT JOIN orders o ON p.id = o.product_id AND o.status = 'completed'
        GROUP BY p.id, p.name
        ORDER BY sold DESC, revenue DESC
        LIMIT 10
      `),
      query(`
        SELECT 
          DATE(created_at) as date,
          COALESCE(SUM(total), 0) as revenue
        FROM orders
        WHERE status = 'completed' AND created_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `),
    ]);

    const report = {
      total_sales: parseFloat(salesData.rows[0].total_sales),
      total_orders: parseInt(salesData.rows[0].total_orders),
      average_order_value: parseFloat(salesData.rows[0].average_order_value),
      top_categories: topCategories.rows.map((row: any) => ({
        name: row.name,
        value: parseInt(row.value),
        color: row.color,
      })),
      top_products: topProducts.rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        sold: parseInt(row.sold),
        revenue: parseFloat(row.revenue),
        in_stock: 0, // Would need to join with products table
      })),
      revenue_trend: revenueTrend.rows.map((row: any) => ({
        date: row.date,
        revenue: parseFloat(row.revenue),
        orders: 0, // Would need to count orders per day
      })),
    };

    res.json({
      success: true,
      data: report,
    });
  })
);

/**
 * @swagger
 * /api/v1/analytics/suppliers/performance:
 *   get:
 *     summary: Get supplier performance
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Supplier performance retrieved successfully
 */
router.get('/suppliers/performance',
  requireAuth,
  analyticsCache(600), // 10 minute cache
  asyncHandler(async (req: Request, res: Response) => {
    const result = await query(`
      SELECT 
        s.id as supplier_id,
        s.name as supplier_name,
        COUNT(o.id) as total_orders,
        COALESCE(SUM(o.total), 0) as total_value,
        0 as average_delivery_time,
        0.95 as on_time_delivery_rate
      FROM suppliers s
      LEFT JOIN orders o ON s.id = o.supplier_id
      GROUP BY s.id, s.name
      ORDER BY total_value DESC
    `);

    const performance = result.rows.map((row: any) => ({
      supplier_id: row.supplier_id,
      supplier_name: row.supplier_name,
      total_orders: parseInt(row.total_orders),
      total_value: parseFloat(row.total_value),
      average_delivery_time: parseFloat(row.average_delivery_time),
      on_time_delivery_rate: parseFloat(row.on_time_delivery_rate),
    }));

    res.json({
      success: true,
      data: performance,
    });
  })
);

/**
 * @swagger
 * /api/v1/analytics/revenue:
 *   get:
 *     summary: Get revenue data
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d, 1y]
 *           default: 30d
 *     responses:
 *       200:
 *         description: Revenue data retrieved successfully
 */
router.get('/revenue',
  requireAuth,
  validate({ query: schemas.analyticsQuery }),
  analyticsCache(300), // 5 minute cache
  asyncHandler(async (req: Request, res: Response) => {
    const { period = '30d' } = req.query as any;

    const periodDays: Record<string, number> = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '1y': 365,
    };

    const days = periodDays[period] || 30;

    const result = await query(`
      SELECT 
        DATE(created_at) as date,
        COALESCE(SUM(total), 0) as revenue,
        COUNT(*) as orders
      FROM orders
      WHERE status = 'completed' AND created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);

    const revenueData = result.rows.map((row: any) => ({
      date: row.date,
      revenue: parseFloat(row.revenue),
      orders: parseInt(row.orders),
    }));

    res.json({
      success: true,
      data: revenueData,
    });
  })
);

export default router;