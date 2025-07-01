import { Router, Request, Response } from 'express';
import { asyncHandler, NotFoundError, ValidationError } from '../../middleware/error.middleware';
import { requireAuth } from '../../middleware/auth.middleware';
import { validate, schemas } from '../../middleware/validation.middleware';
import { cache, invalidateCache } from '../../middleware/cache.middleware';
import { query } from '../../utils/database';
import { logger } from '../../utils/logger';
import { Supplier, ApiResponse } from '../../types';

const router = Router();

/**
 * @swagger
 * /api/v1/suppliers:
 *   get:
 *     summary: Get all suppliers with filtering and pagination
 *     tags: [Suppliers]
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
 *         description: Search in supplier name and email
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, on-hold, new]
 *         description: Filter by supplier status
 *     responses:
 *       200:
 *         description: Suppliers retrieved successfully
 */
router.get('/',
  requireAuth,
  validate({ query: schemas.paginationQuery.merge(schemas.supplierQuery) }),
  cache({ ttl: 300 }), // 5 minute cache
  asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, search, status, minReliability } = req.query as any;
    
    // Build query
    let queryText = `
      SELECT 
        s.*,
        COUNT(p.id) as products_supplied
      FROM suppliers s
      LEFT JOIN products p ON s.id = p.supplier_id
      WHERE 1=1
    `;
    
    const queryParams: any[] = [];
    let paramIndex = 1;

    // Add filters
    if (search) {
      queryText += ` AND (s.name ILIKE $${paramIndex} OR s.email ILIKE $${paramIndex})`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    if (status) {
      queryText += ` AND s.status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }

    if (minReliability !== undefined) {
      queryText += ` AND s.reliability_score >= $${paramIndex}`;
      queryParams.push(minReliability);
      paramIndex++;
    }

    queryText += ` GROUP BY s.id`;

    // Get total count
    const countQuery = `
      SELECT COUNT(*) FROM (${queryText}) as counted_suppliers
    `;
    const countResult = await query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count);

    // Add pagination
    const offset = (page - 1) * limit;
    queryText += ` ORDER BY s.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(limit, offset);

    // Execute query
    const result = await query(queryText, queryParams);
    
    const suppliers = result.rows.map((row: any) => ({
      ...row,
      productsSupplied: parseInt(row.products_supplied),
    }));

    const response: ApiResponse<Supplier[]> = {
      success: true,
      data: suppliers,
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
 * /api/v1/suppliers/{id}:
 *   get:
 *     summary: Get supplier by ID
 *     tags: [Suppliers]
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
 *         description: Supplier retrieved successfully
 *       404:
 *         description: Supplier not found
 */
router.get('/:id',
  requireAuth,
  validate({ params: schemas.uuidParam }),
  cache({ ttl: 300 }),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const result = await query(`
      SELECT 
        s.*,
        COUNT(p.id) as products_supplied
      FROM suppliers s
      LEFT JOIN products p ON s.id = p.supplier_id
      WHERE s.id = $1
      GROUP BY s.id
    `, [id]);

    if (result.rows.length === 0) {
      throw new NotFoundError('Supplier not found');
    }

    const supplier = {
      ...result.rows[0],
      productsSupplied: parseInt(result.rows[0].products_supplied),
    };

    res.json({
      success: true,
      data: supplier,
    });
  })
);

/**
 * @swagger
 * /api/v1/suppliers:
 *   post:
 *     summary: Create a new supplier
 *     tags: [Suppliers]
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
 *               - email
 *               - phone
 *               - address
 *               - contact_person
 *               - avg_lead_time
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *                 maxLength: 20
 *               address:
 *                 type: string
 *                 maxLength: 200
 *               contact_person:
 *                 type: string
 *                 maxLength: 100
 *               avg_lead_time:
 *                 type: integer
 *                 minimum: 1
 *     responses:
 *       201:
 *         description: Supplier created successfully
 *       400:
 *         description: Invalid input data or supplier already exists
 */
router.post('/',
  requireAuth,
  validate({ body: schemas.supplierCreate }),
  invalidateCache(['suppliers:*', 'analytics:*']),
  asyncHandler(async (req: Request, res: Response) => {
    const supplierData = req.body;

    // Check for duplicate email
    const existingSupplier = await query('SELECT id FROM suppliers WHERE email = $1', [supplierData.email]);
    if (existingSupplier.rows.length > 0) {
      throw new ValidationError('Supplier with this email already exists');
    }

    const result = await query(`
      INSERT INTO suppliers (
        name, email, phone, address, contact_person, avg_lead_time,
        status, reliability_score, on_time_delivery_rate, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, 'new', 50, 80, NOW())
      RETURNING *
    `, [
      supplierData.name,
      supplierData.email,
      supplierData.phone,
      supplierData.address,
      supplierData.contact_person,
      supplierData.avg_lead_time,
    ]);

    const newSupplier = result.rows[0];

    logger.info('Supplier created', { 
      supplierId: newSupplier.id, 
      name: newSupplier.name,
      userId: req.user!.id 
    });

    res.status(201).json({
      success: true,
      data: newSupplier,
      message: 'Supplier created successfully',
    });
  })
);

/**
 * @swagger
 * /api/v1/suppliers/{id}:
 *   put:
 *     summary: Update supplier
 *     tags: [Suppliers]
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
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *                 maxLength: 20
 *               address:
 *                 type: string
 *                 maxLength: 200
 *               contact_person:
 *                 type: string
 *                 maxLength: 100
 *               avg_lead_time:
 *                 type: integer
 *                 minimum: 1
 *               status:
 *                 type: string
 *                 enum: [active, inactive, on-hold, new]
 *     responses:
 *       200:
 *         description: Supplier updated successfully
 *       404:
 *         description: Supplier not found
 */
router.put('/:id',
  requireAuth,
  validate({ 
    params: schemas.uuidParam,
    body: schemas.supplierUpdate 
  }),
  invalidateCache(['suppliers:*', 'analytics:*']),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const updates = req.body;

    // Check if supplier exists
    const existingSupplier = await query('SELECT * FROM suppliers WHERE id = $1', [id]);
    if (existingSupplier.rows.length === 0) {
      throw new NotFoundError('Supplier not found');
    }

    // Check for duplicate email if being updated
    if (updates.email && updates.email !== existingSupplier.rows[0].email) {
      const emailCheck = await query('SELECT id FROM suppliers WHERE email = $1 AND id != $2', [updates.email, id]);
      if (emailCheck.rows.length > 0) {
        throw new ValidationError('Supplier with this email already exists');
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
      UPDATE suppliers 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await query(updateQuery, updateValues);
    const updatedSupplier = result.rows[0];

    logger.info('Supplier updated', { 
      supplierId: id, 
      updates: Object.keys(updates),
      userId: req.user!.id 
    });

    res.json({
      success: true,
      data: updatedSupplier,
      message: 'Supplier updated successfully',
    });
  })
);

/**
 * @swagger
 * /api/v1/suppliers/{id}:
 *   delete:
 *     summary: Delete supplier
 *     tags: [Suppliers]
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
 *         description: Supplier deleted successfully
 *       404:
 *         description: Supplier not found
 *       400:
 *         description: Cannot delete supplier with existing products or orders
 */
router.delete('/:id',
  requireAuth,
  validate({ params: schemas.uuidParam }),
  invalidateCache(['suppliers:*', 'products:*', 'analytics:*']),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    // Check if supplier exists
    const existingSupplier = await query('SELECT * FROM suppliers WHERE id = $1', [id]);
    if (existingSupplier.rows.length === 0) {
      throw new NotFoundError('Supplier not found');
    }

    // Check for existing products
    const productsCheck = await query('SELECT COUNT(*) FROM products WHERE supplier_id = $1', [id]);
    if (parseInt(productsCheck.rows[0].count) > 0) {
      throw new ValidationError('Cannot delete supplier with existing products');
    }

    // Check for existing orders
    const ordersCheck = await query('SELECT COUNT(*) FROM orders WHERE supplier_id = $1', [id]);
    if (parseInt(ordersCheck.rows[0].count) > 0) {
      throw new ValidationError('Cannot delete supplier with existing orders');
    }

    await query('DELETE FROM suppliers WHERE id = $1', [id]);

    logger.info('Supplier deleted', { 
      supplierId: id, 
      name: existingSupplier.rows[0].name,
      userId: req.user!.id 
    });

    res.json({
      success: true,
      message: 'Supplier deleted successfully',
    });
  })
);

export default router;