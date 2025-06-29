import { Router, Request, Response } from 'express';
import { asyncHandler, NotFoundError, ValidationError } from '@/middleware/error.middleware';
import { requireAuth } from '@/middleware/auth.middleware';
import { validate, schemas } from '@/middleware/validation.middleware';
import { productCache, invalidateCache } from '@/middleware/cache.middleware';
import { query } from '@/utils/database';
import { redisService } from '@/utils/redis';
import { logger } from '@/utils/logger';
import { Product, ApiResponse } from '@/types';
import { z } from 'zod';

const router = Router();

/**
 * @swagger
 * /api/v1/products:
 *   get:
 *     summary: Get all products with filtering and pagination
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in product name and SKU
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by category ID
 *       - in: query
 *         name: supplier
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by supplier ID
 *       - in: query
 *         name: lowStock
 *         schema:
 *           type: boolean
 *         description: Filter products with low stock
 *     responses:
 *       200:
 *         description: Products retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Product'
 */
router.get('/',
  requireAuth,
  validate({ query: schemas.paginationQuery.merge(schemas.productQuery) }),
  productCache(),
  asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, search, category, supplier, lowStock, minPrice, maxPrice } = req.query as any;
    
    // Build query
    let queryText = `
      SELECT 
        p.*,
        c.name as category_name,
        s.name as supplier_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE 1=1
    `;
    
    const queryParams: any[] = [];
    let paramIndex = 1;

    // Add filters
    if (search) {
      queryText += ` AND (p.name ILIKE $${paramIndex} OR p.sku ILIKE $${paramIndex})`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    if (category) {
      queryText += ` AND p.category_id = $${paramIndex}`;
      queryParams.push(category);
      paramIndex++;
    }

    if (supplier) {
      queryText += ` AND p.supplier_id = $${paramIndex}`;
      queryParams.push(supplier);
      paramIndex++;
    }

    if (lowStock) {
      queryText += ` AND p.quantity <= p.low_stock_threshold`;
    }

    if (minPrice !== undefined) {
      queryText += ` AND p.price >= $${paramIndex}`;
      queryParams.push(minPrice);
      paramIndex++;
    }

    if (maxPrice !== undefined) {
      queryText += ` AND p.price <= $${paramIndex}`;
      queryParams.push(maxPrice);
      paramIndex++;
    }

    // Get total count
    const countQuery = queryText.replace(
      'SELECT p.*, c.name as category_name, s.name as supplier_name',
      'SELECT COUNT(*)'
    );
    const countResult = await query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count);

    // Add pagination
    const offset = (page - 1) * limit;
    queryText += ` ORDER BY p.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(limit, offset);

    // Execute query
    const result = await query(queryText, queryParams);
    
    const products = result.rows.map((row: any) => ({
      ...row,
      categories: row.category_name ? { name: row.category_name } : null,
      suppliers: row.supplier_name ? { name: row.supplier_name } : null,
    }));

    const response: ApiResponse<Product[]> = {
      success: true,
      data: products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };

    res.json(response);
  })
);

/**
 * @swagger
 * /api/v1/products/low-stock:
 *   get:
 *     summary: Get low stock products
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Low stock products retrieved successfully
 */
router.get('/low-stock',
  requireAuth,
  validate({ query: z.object({
    limit: z.string().optional().transform(val => {
      if (!val) return 100;
      const parsed = parseInt(val, 10);
      return isNaN(parsed) ? 100 : Math.min(parsed, 1000); // Allow up to 1000 for low stock
    })
  }) }),
  productCache(300), // 5 minute cache
  asyncHandler(async (req: Request, res: Response) => {
    const { limit } = req.query as { limit?: number };
    
    const result = await query(`
      SELECT 
        p.*,
        c.name as category_name,
        s.name as supplier_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE p.quantity <= p.low_stock_threshold
      ORDER BY (p.quantity::float / p.low_stock_threshold) ASC
      LIMIT $1
    `, [limit || 100]);

    const products = result.rows.map((row: any) => ({
      ...row,
      categories: row.category_name ? { name: row.category_name } : null,
      suppliers: row.supplier_name ? { name: row.supplier_name } : null,
    }));

    res.json({
      success: true,
      data: products,
    });
  })
);

/**
 * @swagger
 * /api/v1/products/expiring:
 *   get:
 *     summary: Get expiring products
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Number of days to check for expiry
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Maximum number of products to return
 *     responses:
 *       200:
 *         description: Expiring products retrieved successfully
 */
router.get('/expiring',
  requireAuth,
  validate({ query: z.object({
    days: z.string().optional().transform(val => {
      if (!val) return 30;
      const parsed = parseInt(val, 10);
      return isNaN(parsed) ? 30 : Math.max(1, Math.min(parsed, 365)); // Between 1 and 365 days
    }),
    limit: z.string().optional().transform(val => {
      if (!val) return 10;
      const parsed = parseInt(val, 10);
      return isNaN(parsed) ? 10 : Math.min(parsed, 100);
    })
  }) }),
  productCache(300), // 5 minute cache
  asyncHandler(async (req: Request, res: Response) => {
    const { days, limit } = req.query as { days?: number; limit?: number };

    const result = await query(`
      SELECT 
        p.*,
        c.name as category_name,
        s.name as supplier_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE p.expiry_date IS NOT NULL 
        AND p.expiry_date <= NOW() + INTERVAL '${days || 30} days'
        AND p.quantity > 0
      ORDER BY p.expiry_date ASC
      LIMIT $1
    `, [limit || 10]);

    const products = result.rows.map((row: any) => ({
      ...row,
      categories: row.category_name ? { name: row.category_name } : null,
      suppliers: row.supplier_name ? { name: row.supplier_name } : null,
    }));

    res.json({
      success: true,
      data: products,
    });
  })
);

/**
 * @swagger
 * /api/v1/products/{id}:
 *   get:
 *     summary: Get product by ID
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Product retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Product'
 *       404:
 *         description: Product not found
 */
router.get('/:id',
  requireAuth,
  validate({ params: schemas.uuidParam }),
  productCache(),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const result = await query(`
      SELECT 
        p.*,
        c.name as category_name,
        s.name as supplier_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE p.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      throw new NotFoundError('Product not found');
    }

    const product = {
      ...result.rows[0],
      categories: result.rows[0].category_name ? { name: result.rows[0].category_name } : null,
      suppliers: result.rows[0].supplier_name ? { name: result.rows[0].supplier_name } : null,
    };

    res.json({
      success: true,
      data: product,
    });
  })
);

/**
 * @swagger
 * /api/v1/products:
 *   post:
 *     summary: Create a new product
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - price
 *               - quantity
 *               - category_id
 *               - supplier_id
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *               description:
 *                 type: string
 *                 maxLength: 500
 *               price:
 *                 type: number
 *                 minimum: 0
 *               quantity:
 *                 type: integer
 *                 minimum: 0
 *               category_id:
 *                 type: string
 *                 format: uuid
 *               supplier_id:
 *                 type: string
 *                 format: uuid
 *               low_stock_threshold:
 *                 type: integer
 *                 minimum: 0
 *                 default: 10
 *               SKU:
 *                 type: string
 *                 maxLength: 50
 *     responses:
 *       201:
 *         description: Product created successfully
 *       400:
 *         description: Invalid input data
 */
router.post('/',
  requireAuth,
  validate({ body: schemas.productCreate }),
  invalidateCache(['products:*', 'analytics:*']),
  asyncHandler(async (req: Request, res: Response) => {
    const productData = req.body;

    // Verify category and supplier exist
    const [categoryCheck, supplierCheck] = await Promise.all([
      query('SELECT id FROM categories WHERE id = $1', [productData.category_id]),
      query('SELECT id FROM suppliers WHERE id = $1', [productData.supplier_id]),
    ]);

    if (categoryCheck.rows.length === 0) {
      throw new ValidationError('Category not found');
    }

    if (supplierCheck.rows.length === 0) {
      throw new ValidationError('Supplier not found');
    }

    // Check for duplicate SKU if provided
    if (productData.SKU) {
      const skuCheck = await query('SELECT id FROM products WHERE sku = $1', [productData.SKU]);
      if (skuCheck.rows.length > 0) {
        throw new ValidationError('SKU already exists');
      }
    }

    const result = await query(`
      INSERT INTO products (
        name, description, price, quantity, category_id, supplier_id, 
        low_stock_threshold, sku, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING *
    `, [
      productData.name,
      productData.description || null,
      productData.price,
      productData.quantity,
      productData.category_id,
      productData.supplier_id,
      productData.low_stock_threshold || 10,
      productData.SKU || null,
    ]);

    const newProduct = result.rows[0];

    logger.info('Product created', { 
      productId: newProduct.id, 
      name: newProduct.name,
      userId: req.user!.id 
    });

    res.status(201).json({
      success: true,
      data: newProduct,
      message: 'Product created successfully',
    });
  })
);

/**
 * @swagger
 * /api/v1/products/{id}:
 *   put:
 *     summary: Update product
 *     tags: [Products]
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
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *               description:
 *                 type: string
 *                 maxLength: 500
 *               price:
 *                 type: number
 *                 minimum: 0
 *               quantity:
 *                 type: integer
 *                 minimum: 0
 *               category_id:
 *                 type: string
 *                 format: uuid
 *               supplier_id:
 *                 type: string
 *                 format: uuid
 *               low_stock_threshold:
 *                 type: integer
 *                 minimum: 0
 *               SKU:
 *                 type: string
 *                 maxLength: 50
 *     responses:
 *       200:
 *         description: Product updated successfully
 *       404:
 *         description: Product not found
 */
router.put('/:id',
  requireAuth,
  validate({ 
    params: schemas.uuidParam,
    body: schemas.productUpdate 
  }),
  invalidateCache(['products:*', 'analytics:*']),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const updates = req.body;

    // Check if product exists
    const existingProduct = await query('SELECT * FROM products WHERE id = $1', [id]);
    if (existingProduct.rows.length === 0) {
      throw new NotFoundError('Product not found');
    }

    // Verify category and supplier if being updated
    if (updates.category_id) {
      const categoryCheck = await query('SELECT id FROM categories WHERE id = $1', [updates.category_id]);
      if (categoryCheck.rows.length === 0) {
        throw new ValidationError('Category not found');
      }
    }

    if (updates.supplier_id) {
      const supplierCheck = await query('SELECT id FROM suppliers WHERE id = $1', [updates.supplier_id]);
      if (supplierCheck.rows.length === 0) {
        throw new ValidationError('Supplier not found');
      }
    }

    // Check for duplicate SKU if being updated
    if (updates.SKU && updates.SKU !== existingProduct.rows[0].sku) {
      const skuCheck = await query('SELECT id FROM products WHERE sku = $1 AND id != $2', [updates.SKU, id]);
      if (skuCheck.rows.length > 0) {
        throw new ValidationError('SKU already exists');
      }
    }

    // Build update query
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    Object.entries(updates).forEach(([key, value]) => {
      updateFields.push(`${key} = $${paramIndex}`);
      updateValues.push(value);
      paramIndex++;
    });

    updateFields.push(`updated_at = NOW()`);
    updateValues.push(id);

    const updateQuery = `
      UPDATE products 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await query(updateQuery, updateValues);
    const updatedProduct = result.rows[0];

    // Invalidate specific product cache
    if (id) {
      await redisService.invalidateProduct(id);
    }

    logger.info('Product updated', { 
      productId: id, 
      updates: Object.keys(updates),
      userId: req.user!.id 
    });

    res.json({
      success: true,
      data: updatedProduct,
      message: 'Product updated successfully',
    });
  })
);

/**
 * @swagger
 * /api/v1/products/{id}/stock:
 *   patch:
 *     summary: Update product stock
 *     tags: [Products]
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
 *               - quantity
 *             properties:
 *               quantity:
 *                 type: number
 *                 minimum: 0
 *     responses:
 *       200:
 *         description: Stock updated successfully
 *       404:
 *         description: Product not found
 */
router.patch('/:id/stock',
  requireAuth,
  validate({ 
    params: schemas.uuidParam,
    body: z.object({
      quantity: z.number().min(0, 'Quantity must be non-negative')
    })
  }),
  invalidateCache(['products:*', 'analytics:*']),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { quantity } = req.body;

    // Check if product exists
    const existingProduct = await query('SELECT * FROM products WHERE id = $1', [id]);
    if (existingProduct.rows.length === 0) {
      throw new NotFoundError('Product not found');
    }

    // Update stock
    const result = await query(`
      UPDATE products 
      SET quantity = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [quantity, id]);

    const updatedProduct = result.rows[0];

    // Invalidate specific product cache
    if (id) {
      await redisService.invalidateProduct(id);
    }

    logger.info('Product stock updated', { 
      productId: id, 
      oldQuantity: existingProduct.rows[0].quantity,
      newQuantity: quantity,
      userId: req.user!.id 
    });

    res.json({
      success: true,
      data: updatedProduct,
      message: 'Stock updated successfully',
    });
  })
);

/**
 * @swagger
 * /api/v1/products/{id}:
 *   delete:
 *     summary: Delete product
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Product deleted successfully
 *       404:
 *         description: Product not found
 *       400:
 *         description: Cannot delete product with existing orders
 */
router.delete('/:id',
  requireAuth,
  validate({ params: schemas.uuidParam }),
  invalidateCache(['products:*', 'analytics:*']),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    // Check if product exists
    const existingProduct = await query('SELECT * FROM products WHERE id = $1', [id]);
    if (existingProduct.rows.length === 0) {
      throw new NotFoundError('Product not found');
    }

    // Check for existing orders
    const ordersCheck = await query('SELECT COUNT(*) FROM orders WHERE product_id = $1', [id]);
    if (parseInt(ordersCheck.rows[0].count) > 0) {
      throw new ValidationError('Cannot delete product with existing orders');
    }

    await query('DELETE FROM products WHERE id = $1', [id]);

    // Invalidate specific product cache
    if (id) {
      await redisService.invalidateProduct(id);
    }

    logger.info('Product deleted', { 
      productId: id, 
      name: existingProduct.rows[0].name,
      userId: req.user!.id 
    });

    res.json({
      success: true,
      message: 'Product deleted successfully',
    });
  })
);

/**
 * @swagger
 * /api/v1/products/bulk-update:
 *   post:
 *     summary: Bulk update products
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - products
 *             properties:
 *               products:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - id
 *                     - updates
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     updates:
 *                       type: object
 *     responses:
 *       200:
 *         description: Products updated successfully
 */
router.post('/bulk-update',
  requireAuth,
  validate({
    body: z.object({
      products: z.array(z.object({
        id: z.string().uuid(),
        updates: z.record(z.any())
      }))
    })
  }),
  invalidateCache(['products:*', 'analytics:*']),
  asyncHandler(async (req: Request, res: Response) => {
    const { products } = req.body;

    const updatedProducts = [];
    
    for (const { id, updates } of products) {
      // Check if product exists
      const existingProduct = await query('SELECT * FROM products WHERE id = $1', [id]);
      if (existingProduct.rows.length === 0) {
        continue; // Skip non-existent products
      }

      // Build update query
      const updateFields = [];
      const updateValues = [];
      let paramIndex = 1;

      Object.entries(updates).forEach(([key, value]) => {
        updateFields.push(`${key} = $${paramIndex}`);
        updateValues.push(value);
        paramIndex++;
      });

      updateFields.push(`updated_at = NOW()`);
      updateValues.push(id);

      const updateQuery = `
        UPDATE products 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await query(updateQuery, updateValues);
      updatedProducts.push(result.rows[0]);
    }

    logger.info('Bulk products update', { 
      count: updatedProducts.length,
      userId: req.user!.id 
    });

    res.json({
      success: true,
      data: updatedProducts,
      message: `${updatedProducts.length} products updated successfully`,
    });
  })
);

/**
 * @swagger
 * /api/v1/products/bulk-delete:
 *   post:
 *     summary: Bulk delete products
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ids
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *     responses:
 *       200:
 *         description: Products deleted successfully
 */
router.post('/bulk-delete',
  requireAuth,
  validate({
    body: z.object({
      ids: z.array(z.string().uuid())
    })
  }),
  invalidateCache(['products:*', 'analytics:*']),
  asyncHandler(async (req: Request, res: Response) => {
    const { ids } = req.body;

    // Check for existing orders
    const ordersCheck = await query(
      'SELECT COUNT(*) FROM orders WHERE product_id = ANY($1)',
      [ids]
    );
    
    if (parseInt(ordersCheck.rows[0].count) > 0) {
      throw new ValidationError('Cannot delete products with existing orders');
    }

    // Delete products
    const result = await query(
      'DELETE FROM products WHERE id = ANY($1) RETURNING id',
      [ids]
    );

    logger.info('Bulk products delete', { 
      count: result.rows.length,
      userId: req.user!.id 
    });

    res.json({
      success: true,
      message: `${result.rows.length} products deleted successfully`,
    });
  })
);

/**
 * @swagger
 * /api/v1/products/stats:
 *   get:
 *     summary: Get product statistics
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Product statistics retrieved successfully
 */
router.get('/stats',
  requireAuth,
  productCache(600), // 10 minute cache
  asyncHandler(async (_req: Request, res: Response) => {
    const stats = await query(`
      SELECT 
        COUNT(*) as total_products,
        COUNT(CASE WHEN quantity <= low_stock_threshold THEN 1 END) as low_stock_count,
        COUNT(CASE WHEN quantity = 0 THEN 1 END) as out_of_stock_count,
        COUNT(CASE WHEN expiry_date IS NOT NULL AND expiry_date <= NOW() + INTERVAL '30 days' THEN 1 END) as expiring_soon_count
      FROM products
    `);

    const result = stats.rows[0];

    res.json({
      success: true,
      data: {
        total_products: parseInt(result.total_products),
        low_stock_count: parseInt(result.low_stock_count),
        out_of_stock_count: parseInt(result.out_of_stock_count),
        expiring_soon_count: parseInt(result.expiring_soon_count),
      },
    });
  })
);

export default router;