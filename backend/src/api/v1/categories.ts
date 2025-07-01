import { Router, Request, Response } from 'express';
import { asyncHandler, NotFoundError, ValidationError } from '../../middleware/error.middleware';
import { requireAuth } from '../../middleware/auth.middleware';
import { validate, schemas } from '../../middleware/validation.middleware';
import { cache, invalidateCache } from '../../middleware/cache.middleware';
import { query } from '../../utils/database';
import { logger } from '../../utils/logger';
import { Category, ApiResponse } from '../../types';

const router = Router();

/**
 * @swagger
 * /api/v1/categories:
 *   get:
 *     summary: Get all categories
 *     tags: [Categories]
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
 *     responses:
 *       200:
 *         description: Categories retrieved successfully
 */
router.get('/',
  requireAuth,
  validate({ query: schemas.paginationQuery }),
  cache({ ttl: 600 }), // 10 minute cache
  asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = req.query as any;

    // Get total count
    const countResult = await query('SELECT COUNT(*) FROM categories');
    const total = parseInt(countResult.rows[0].count);

    // Get categories with product count
    const offset = (page - 1) * limit;
    const result = await query(`
      SELECT 
        c.*,
        COUNT(p.id) as product_count
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id
      GROUP BY c.id
      ORDER BY c.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    const categories = result.rows.map((row: any) => ({
      ...row,
      product_count: parseInt(row.product_count),
    }));

    const response: ApiResponse<Category[]> = {
      success: true,
      data: categories,
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
 * /api/v1/categories/{id}:
 *   get:
 *     summary: Get category by ID
 *     tags: [Categories]
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
 *         description: Category retrieved successfully
 *       404:
 *         description: Category not found
 */
router.get('/:id',
  requireAuth,
  validate({ params: schemas.uuidParam }),
  cache({ ttl: 600 }),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const result = await query(`
      SELECT 
        c.*,
        COUNT(p.id) as product_count
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id
      WHERE c.id = $1
      GROUP BY c.id
    `, [id]);

    if (result.rows.length === 0) {
      throw new NotFoundError('Category not found');
    }

    const category = {
      ...result.rows[0],
      product_count: parseInt(result.rows[0].product_count),
    };

    res.json({
      success: true,
      data: category,
    });
  })
);

/**
 * @swagger
 * /api/v1/categories:
 *   post:
 *     summary: Create a new category
 *     tags: [Categories]
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
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 50
 *               description:
 *                 type: string
 *                 maxLength: 200
 *     responses:
 *       201:
 *         description: Category created successfully
 *       400:
 *         description: Invalid input data or category already exists
 */
router.post('/',
  requireAuth,
  validate({ body: schemas.categoryCreate }),
  invalidateCache(['categories:*', 'products:*', 'analytics:*']),
  asyncHandler(async (req: Request, res: Response) => {
    const { name, description } = req.body;

    // Check for duplicate name
    const existingCategory = await query('SELECT id FROM categories WHERE LOWER(name) = LOWER($1)', [name]);
    if (existingCategory.rows.length > 0) {
      throw new ValidationError('Category name already exists');
    }

    const result = await query(`
      INSERT INTO categories (name, description, created_at)
      VALUES ($1, $2, NOW())
      RETURNING *
    `, [name, description || null]);

    const newCategory = result.rows[0];

    logger.info('Category created', { 
      categoryId: newCategory.id, 
      name: newCategory.name,
      userId: req.user!.id 
    });

    res.status(201).json({
      success: true,
      data: newCategory,
      message: 'Category created successfully',
    });
  })
);

/**
 * @swagger
 * /api/v1/categories/{id}:
 *   put:
 *     summary: Update category
 *     tags: [Categories]
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
 *                 maxLength: 50
 *               description:
 *                 type: string
 *                 maxLength: 200
 *     responses:
 *       200:
 *         description: Category updated successfully
 *       404:
 *         description: Category not found
 *       400:
 *         description: Invalid input data or category name already exists
 */
router.put('/:id',
  requireAuth,
  validate({ 
    params: schemas.uuidParam,
    body: schemas.categoryUpdate 
  }),
  invalidateCache(['categories:*', 'products:*', 'analytics:*']),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const updates = req.body;

    // Check if category exists
    const existingCategory = await query('SELECT * FROM categories WHERE id = $1', [id]);
    if (existingCategory.rows.length === 0) {
      throw new NotFoundError('Category not found');
    }

    // Check for duplicate name if name is being updated
    if (updates.name && updates.name.toLowerCase() !== existingCategory.rows[0].name.toLowerCase()) {
      const duplicateCheck = await query('SELECT id FROM categories WHERE LOWER(name) = LOWER($1) AND id != $2', [updates.name, id]);
      if (duplicateCheck.rows.length > 0) {
        throw new ValidationError('Category name already exists');
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
      UPDATE categories 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await query(updateQuery, updateValues);
    const updatedCategory = result.rows[0];

    logger.info('Category updated', { 
      categoryId: id, 
      updates: Object.keys(updates),
      userId: req.user!.id 
    });

    res.json({
      success: true,
      data: updatedCategory,
      message: 'Category updated successfully',
    });
  })
);

/**
 * @swagger
 * /api/v1/categories/{id}:
 *   delete:
 *     summary: Delete category
 *     tags: [Categories]
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
 *         description: Category deleted successfully
 *       404:
 *         description: Category not found
 *       400:
 *         description: Cannot delete category with existing products
 */
router.delete('/:id',
  requireAuth,
  validate({ params: schemas.uuidParam }),
  invalidateCache(['categories:*', 'products:*', 'analytics:*']),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    // Check if category exists
    const existingCategory = await query('SELECT * FROM categories WHERE id = $1', [id]);
    if (existingCategory.rows.length === 0) {
      throw new NotFoundError('Category not found');
    }

    // Check for existing products
    const productsCheck = await query('SELECT COUNT(*) FROM products WHERE category_id = $1', [id]);
    if (parseInt(productsCheck.rows[0].count) > 0) {
      throw new ValidationError('Cannot delete category with existing products');
    }

    await query('DELETE FROM categories WHERE id = $1', [id]);

    logger.info('Category deleted', { 
      categoryId: id, 
      name: existingCategory.rows[0].name,
      userId: req.user!.id 
    });

    res.json({
      success: true,
      message: 'Category deleted successfully',
    });
  })
);

export default router;