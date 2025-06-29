import { Router, Request, Response } from 'express';
import { asyncHandler, NotFoundError, ValidationError } from '@/middleware/error.middleware';
import { requireAuth } from '@/middleware/auth.middleware';
import { validate, schemas } from '@/middleware/validation.middleware';
import { cache, invalidateCache } from '@/middleware/cache.middleware';
import { query, transaction } from '@/utils/database';
import { logger } from '@/utils/logger';
import { Order, ApiResponse } from '@/types';

const router = Router();

/**
 * @swagger
 * /api/v1/orders:
 *   get:
 *     summary: Get all orders with filtering and pagination
 *     tags: [Orders]
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
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, processing, shipped, completed, cancelled]
 *       - in: query
 *         name: supplier
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: customer
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Orders retrieved successfully
 */
router.get('/',
  requireAuth,
  validate({ query: schemas.paginationQuery.merge(schemas.orderQuery) }),
  cache({ ttl: 180 }), // 3 minute cache
  asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, status, supplier, customer, dateFrom, dateTo } = req.query as any;
    
    // Build query
    let queryText = `
      SELECT 
        o.*,
        p.name as product_name,
        p.price as product_price,
        s.name as supplier_name
      FROM orders o
      LEFT JOIN products p ON o.product_id = p.id
      LEFT JOIN suppliers s ON o.supplier_id = s.id
      WHERE 1=1
    `;
    
    const queryParams: any[] = [];
    let paramIndex = 1;

    // Add filters
    if (status) {
      queryText += ` AND o.status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }

    if (supplier) {
      queryText += ` AND o.supplier_id = $${paramIndex}`;
      queryParams.push(supplier);
      paramIndex++;
    }

    if (customer) {
      queryText += ` AND o.customer ILIKE $${paramIndex}`;
      queryParams.push(`%${customer}%`);
      paramIndex++;
    }

    if (dateFrom) {
      queryText += ` AND o.created_at >= $${paramIndex}`;
      queryParams.push(dateFrom);
      paramIndex++;
    }

    if (dateTo) {
      queryText += ` AND o.created_at <= $${paramIndex}`;
      queryParams.push(dateTo);
      paramIndex++;
    }

    // Get total count
    const countQuery = queryText.replace(
      'SELECT o.*, p.name as product_name, p.price as product_price, s.name as supplier_name',
      'SELECT COUNT(*)'
    );
    const countResult = await query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count);

    // Add pagination
    const offset = (page - 1) * limit;
    queryText += ` ORDER BY o.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(limit, offset);

    // Execute query
    const result = await query(queryText, queryParams);
    
    const orders = result.rows.map((row: any) => ({
      ...row,
      // Map 'completed' status to 'delivered' for frontend compatibility
      status: row.status === 'completed' ? 'delivered' : row.status,
      products: row.product_name ? { 
        name: row.product_name, 
        price: row.product_price 
      } : null,
      suppliers: row.supplier_name ? { 
        name: row.supplier_name 
      } : null,
      total: row.quantity * (row.product_price || 0),
    }));

    const response: ApiResponse<Order[]> = {
      success: true,
      data: orders,
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
 * /api/v1/orders/{id}:
 *   get:
 *     summary: Get order by ID
 *     tags: [Orders]
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
 *         description: Order retrieved successfully
 *       404:
 *         description: Order not found
 */
router.get('/:id',
  requireAuth,
  validate({ params: schemas.uuidParam }),
  cache({ ttl: 180 }),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const result = await query(`
      SELECT 
        o.*,
        p.name as product_name,
        p.price as product_price,
        p.sku as product_sku,
        s.name as supplier_name,
        s.email as supplier_email,
        s.phone as supplier_phone
      FROM orders o
      LEFT JOIN products p ON o.product_id = p.id
      LEFT JOIN suppliers s ON o.supplier_id = s.id
      WHERE o.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      throw new NotFoundError('Order not found');
    }

    const order = {
      ...result.rows[0],
      // Map 'completed' status to 'delivered' for frontend compatibility
      status: result.rows[0].status === 'completed' ? 'delivered' : result.rows[0].status,
      products: result.rows[0].product_name ? {
        name: result.rows[0].product_name,
        price: result.rows[0].product_price,
        sku: result.rows[0].product_sku,
      } : null,
      suppliers: result.rows[0].supplier_name ? {
        name: result.rows[0].supplier_name,
        email: result.rows[0].supplier_email,
        phone: result.rows[0].supplier_phone,
      } : null,
      total: result.rows[0].quantity * (result.rows[0].product_price || 0),
    };

    res.json({
      success: true,
      data: order,
    });
  })
);

/**
 * @swagger
 * /api/v1/orders:
 *   post:
 *     summary: Create a new order
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - supplier_id
 *               - product_id
 *               - quantity
 *               - customer
 *               - payment_method
 *               - shipping_method
 *             properties:
 *               supplier_id:
 *                 type: string
 *                 format: uuid
 *               product_id:
 *                 type: string
 *                 format: uuid
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *               status:
 *                 type: string
 *                 enum: [pending, processing, shipped, completed, cancelled]
 *                 default: pending
 *               customer:
 *                 type: string
 *                 maxLength: 100
 *               payment_method:
 *                 type: string
 *                 maxLength: 50
 *               shipping_method:
 *                 type: string
 *                 maxLength: 50
 *     responses:
 *       201:
 *         description: Order created successfully
 *       400:
 *         description: Invalid input data or insufficient stock
 */
router.post('/',
  requireAuth,
  validate({ body: schemas.orderCreate }),
  invalidateCache(['orders:*', 'analytics:*', 'products:*']),
  asyncHandler(async (req: Request, res: Response) => {
    const orderData = req.body;

    // Map 'delivered' status to 'completed' for database compatibility
    if (orderData.status === 'delivered') {
      orderData.status = 'completed';
    }

    await transaction(async (client) => {
      // Verify supplier and product exist
      const [supplierCheck, productCheck] = await Promise.all([
        client.query('SELECT id FROM suppliers WHERE id = $1', [orderData.supplier_id]),
        client.query('SELECT * FROM products WHERE id = $1', [orderData.product_id]),
      ]);

      if (supplierCheck.rows.length === 0) {
        throw new ValidationError('Supplier not found');
      }

      if (productCheck.rows.length === 0) {
        throw new ValidationError('Product not found');
      }

      const product = productCheck.rows[0];

      // Check stock availability for completed orders
      if (orderData.status === 'completed' && product.quantity < orderData.quantity) {
        throw new ValidationError('Insufficient stock available');
      }

      // Generate order number
      const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      // Calculate total
      const total = orderData.quantity * product.price;

      // Create order
      const orderResult = await client.query(`
        INSERT INTO orders (
          supplier_id, product_id, quantity, status, customer, 
          payment_method, shipping_method, order_number, total, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        RETURNING *
      `, [
        orderData.supplier_id,
        orderData.product_id,
        orderData.quantity,
        orderData.status || 'pending',
        orderData.customer,
        orderData.payment_method,
        orderData.shipping_method,
        orderNumber,
        total,
      ]);

      const newOrder = orderResult.rows[0];

      // Update product quantity if order is completed
      if (orderData.status === 'completed') {
        await client.query(`
          UPDATE products 
          SET quantity = quantity - $1, updated_at = NOW()
          WHERE id = $2
        `, [orderData.quantity, orderData.product_id]);
      }

      logger.info('Order created', { 
        orderId: newOrder.id, 
        orderNumber: newOrder.order_number,
        customer: newOrder.customer,
        total: newOrder.total,
        userId: req.user!.id 
      });

      res.status(201).json({
        success: true,
        data: newOrder,
        message: 'Order created successfully',
      });
    });
  })
);

/**
 * @swagger
 * /api/v1/orders/{id}:
 *   put:
 *     summary: Update order
 *     tags: [Orders]
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
 *               supplier_id:
 *                 type: string
 *                 format: uuid
 *               product_id:
 *                 type: string
 *                 format: uuid
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *               status:
 *                 type: string
 *                 enum: [pending, processing, shipped, completed, cancelled]
 *               customer:
 *                 type: string
 *                 maxLength: 100
 *               payment_method:
 *                 type: string
 *                 maxLength: 50
 *               shipping_method:
 *                 type: string
 *                 maxLength: 50
 *     responses:
 *       200:
 *         description: Order updated successfully
 *       404:
 *         description: Order not found
 */
router.put('/:id',
  requireAuth,
  validate({ 
    params: schemas.uuidParam,
    body: schemas.orderUpdate 
  }),
  invalidateCache(['orders:*', 'analytics:*', 'products:*']),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const updates = req.body;

    // Map 'delivered' status to 'completed' for database compatibility
    if (updates.status === 'delivered') {
      updates.status = 'completed';
    }

    await transaction(async (client) => {
      // Check if order exists
      const existingOrder = await client.query('SELECT * FROM orders WHERE id = $1', [id]);
      if (existingOrder.rows.length === 0) {
        throw new NotFoundError('Order not found');
      }

      const currentOrder = existingOrder.rows[0];

      // Verify supplier and product if being updated
      if (updates.supplier_id) {
        const supplierCheck = await client.query('SELECT id FROM suppliers WHERE id = $1', [updates.supplier_id]);
        if (supplierCheck.rows.length === 0) {
          throw new ValidationError('Supplier not found');
        }
      }

      if (updates.product_id) {
        const productCheck = await client.query('SELECT id FROM products WHERE id = $1', [updates.product_id]);
        if (productCheck.rows.length === 0) {
          throw new ValidationError('Product not found');
        }
      }

      // Handle status changes that affect inventory
      if (updates.status && updates.status !== currentOrder.status) {
        const productId = updates.product_id || currentOrder.product_id;
        const quantity = updates.quantity || currentOrder.quantity;

        // If changing from non-completed to completed, reduce inventory
        if (currentOrder.status !== 'completed' && updates.status === 'completed') {
          const productCheck = await client.query('SELECT quantity FROM products WHERE id = $1', [productId]);
          if (productCheck.rows[0].quantity < quantity) {
            throw new ValidationError('Insufficient stock available');
          }
          
          await client.query(`
            UPDATE products 
            SET quantity = quantity - $1, updated_at = NOW()
            WHERE id = $2
          `, [quantity, productId]);
        }

        // If changing from completed to non-completed, restore inventory
        if (currentOrder.status === 'completed' && updates.status !== 'completed') {
          await client.query(`
            UPDATE products 
            SET quantity = quantity + $1, updated_at = NOW()
            WHERE id = $2
          `, [currentOrder.quantity, currentOrder.product_id]);
        }
      }

      // Recalculate total if quantity or product changed
      let newTotal = currentOrder.total;
      if (updates.quantity || updates.product_id) {
        const productId = updates.product_id || currentOrder.product_id;
        const quantity = updates.quantity || currentOrder.quantity;
        
        const productResult = await client.query('SELECT price FROM products WHERE id = $1', [productId]);
        newTotal = quantity * productResult.rows[0].price;
        updates.total = newTotal;
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
        UPDATE orders 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await client.query(updateQuery, updateValues);
      const updatedOrder = result.rows[0];

      logger.info('Order updated', { 
        orderId: id, 
        updates: Object.keys(updates),
        userId: req.user!.id 
      });

      res.json({
        success: true,
        data: updatedOrder,
        message: 'Order updated successfully',
      });
    });
  })
);

/**
 * @swagger
 * /api/v1/orders/{id}/status:
 *   patch:
 *     summary: Update order status
 *     tags: [Orders]
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
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, processing, shipped, completed, cancelled]
 *     responses:
 *       200:
 *         description: Order status updated successfully
 */
router.patch('/:id/status',
  requireAuth,
  validate({ 
    params: schemas.uuidParam,
    body: schemas.orderUpdate.pick({ status: true })
  }),
  invalidateCache(['orders:*', 'analytics:*', 'products:*']),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;

    await transaction(async (client) => {
      const existingOrder = await client.query('SELECT * FROM orders WHERE id = $1', [id]);
      if (existingOrder.rows.length === 0) {
        throw new NotFoundError('Order not found');
      }

      const currentOrder = existingOrder.rows[0];

      // Handle inventory changes
      if (status !== currentOrder.status) {
        if (currentOrder.status !== 'completed' && status === 'completed') {
          // Reduce inventory
          const productCheck = await client.query('SELECT quantity FROM products WHERE id = $1', [currentOrder.product_id]);
          if (productCheck.rows[0].quantity < currentOrder.quantity) {
            throw new ValidationError('Insufficient stock available');
          }
          
          await client.query(`
            UPDATE products 
            SET quantity = quantity - $1, updated_at = NOW()
            WHERE id = $2
          `, [currentOrder.quantity, currentOrder.product_id]);
        } else if (currentOrder.status === 'completed' && status !== 'completed') {
          // Restore inventory
          await client.query(`
            UPDATE products 
            SET quantity = quantity + $1, updated_at = NOW()
            WHERE id = $2
          `, [currentOrder.quantity, currentOrder.product_id]);
        }
      }

      const result = await client.query(`
        UPDATE orders 
        SET status = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `, [status, id]);

      const updatedOrder = result.rows[0];

      logger.info('Order status updated', { 
        orderId: id, 
        oldStatus: currentOrder.status,
        newStatus: status,
        userId: req.user!.id 
      });

      res.json({
        success: true,
        data: updatedOrder,
        message: 'Order status updated successfully',
      });
    });
  })
);

/**
 * @swagger
 * /api/v1/orders/{id}:
 *   delete:
 *     summary: Delete order
 *     tags: [Orders]
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
 *         description: Order deleted successfully
 *       404:
 *         description: Order not found
 *       400:
 *         description: Cannot delete completed order
 */
router.delete('/:id',
  requireAuth,
  validate({ params: schemas.uuidParam }),
  invalidateCache(['orders:*', 'analytics:*', 'products:*']),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    await transaction(async (client) => {
      const existingOrder = await client.query('SELECT * FROM orders WHERE id = $1', [id]);
      if (existingOrder.rows.length === 0) {
        throw new NotFoundError('Order not found');
      }

      const order = existingOrder.rows[0];

      // Don't allow deletion of completed orders (for audit purposes)
      if (order.status === 'completed') {
        throw new ValidationError('Cannot delete completed orders. Cancel the order instead.');
      }

      await client.query('DELETE FROM orders WHERE id = $1', [id]);

      logger.info('Order deleted', { 
        orderId: id, 
        orderNumber: order.order_number,
        userId: req.user!.id 
      });

      res.json({
        success: true,
        message: 'Order deleted successfully',
      });
    });
  })
);

export default router;