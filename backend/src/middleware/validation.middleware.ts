import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ValidationError, asyncHandler } from './error.middleware';

// Generic validation middleware
export const validate = (schema: {
  body?: z.ZodSchema;
  query?: z.ZodSchema;
  params?: z.ZodSchema;
}) => {
  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (schema.body) {
        req.body = await schema.body.parseAsync(req.body);
      }
      
      if (schema.query) {
        req.query = await schema.query.parseAsync(req.query);
      }
      
      if (schema.params) {
        req.params = await schema.params.parseAsync(req.params);
      }
      
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));
        
        throw new ValidationError('Validation failed', errorMessages);
      }
      throw error;
    }
  });
};

// Common validation schemas
export const schemas = {
  // UUID parameter validation
  uuidParam: z.object({
    id: z.string().uuid('Invalid ID format'),
  }),

  // Pagination query validation
  paginationQuery: z.object({
    page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
    limit: z.string().optional().transform(val => val ? Math.min(parseInt(val, 10), 100) : 10),
    sort: z.string().optional(),
    order: z.enum(['asc', 'desc']).optional().default('desc'),
  }),

  // Product schemas
  productCreate: z.object({
    name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
    description: z.string().max(500, 'Description too long').optional(),
    price: z.number().positive('Price must be positive'),
    quantity: z.number().int().min(0, 'Quantity cannot be negative'),
    category_id: z.string().uuid('Invalid category ID'),
    supplier_id: z.string().uuid('Invalid supplier ID'),
    low_stock_threshold: z.number().int().min(0).default(10).optional(),
    SKU: z.string().max(50, 'SKU too long').optional(),
  }),

  productUpdate: z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
    price: z.number().positive().optional(),
    quantity: z.number().int().min(0).optional(),
    category_id: z.string().uuid().optional(),
    supplier_id: z.string().uuid().optional(),
    low_stock_threshold: z.number().int().min(0).optional(),
    SKU: z.string().max(50).optional(),
  }),

  productQuery: z.object({
    search: z.string().optional(),
    category: z.string().uuid().optional(),
    supplier: z.string().uuid().optional(),
    lowStock: z.string().transform(val => val === 'true').optional(),
    minPrice: z.string().transform(val => val ? parseFloat(val) : undefined).optional(),
    maxPrice: z.string().transform(val => val ? parseFloat(val) : undefined).optional(),
  }),

  // Category schemas
  categoryCreate: z.object({
    name: z.string().min(1, 'Name is required').max(50, 'Name too long'),
    description: z.string().max(200, 'Description too long').optional(),
  }),

  categoryUpdate: z.object({
    name: z.string().min(1).max(50).optional(),
    description: z.string().max(200).optional(),
  }),

  // Supplier schemas
  supplierCreate: z.object({
    name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
    email: z.string().email('Invalid email address'),
    phone: z.string().min(1, 'Phone number is required').max(20, 'Phone number too long'),
    address: z.string().min(1, 'Address is required').max(200, 'Address too long'),
    contact_person: z.string().min(1, 'Contact person is required').max(100, 'Contact person name too long'),
    avg_lead_time: z.number().int().min(1, 'Lead time must be at least 1 day'),
  }),

  supplierUpdate: z.object({
    name: z.string().min(1).max(100).optional(),
    email: z.string().email().optional(),
    phone: z.string().min(1).max(20).optional(),
    address: z.string().min(1).max(200).optional(),
    contact_person: z.string().min(1).max(100).optional(),
    avg_lead_time: z.number().int().min(1).optional(),
    status: z.enum(['active', 'inactive', 'on-hold', 'new']).optional(),
  }),

  supplierQuery: z.object({
    search: z.string().optional(),
    status: z.enum(['active', 'inactive', 'on-hold', 'new']).optional(),
    minReliability: z.string().transform(val => val ? parseFloat(val) : undefined).optional(),
  }),

  // Order schemas
  orderCreate: z.object({
    supplier_id: z.string().uuid('Invalid supplier ID'),
    product_id: z.string().uuid('Invalid product ID'),
    quantity: z.number().int().min(1, 'Quantity must be at least 1'),
    status: z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled']).default('pending'),
    customer: z.string().min(1, 'Customer is required').max(100, 'Customer name too long'),
    payment_method: z.string().min(1, 'Payment method is required').max(50, 'Payment method too long'),
    shipping_method: z.string().min(1, 'Shipping method is required').max(50, 'Shipping method too long'),
  }),

  orderUpdate: z.object({
    supplier_id: z.string().uuid().optional(),
    product_id: z.string().uuid().optional(),
    quantity: z.number().int().min(1).optional(),
    status: z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled']).optional(),
    customer: z.string().min(1).max(100).optional(),
    payment_method: z.string().min(1).max(50).optional(),
    shipping_method: z.string().min(1).max(50).optional(),
  }),

  orderQuery: z.object({
    status: z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled']).optional(),
    supplier: z.string().uuid().optional(),
    customer: z.string().optional(),
    dateFrom: z.string().datetime().optional(),
    dateTo: z.string().datetime().optional(),
  }),

  // Analytics query schemas
  analyticsQuery: z.object({
    period: z.enum(['daily', 'weekly', 'monthly', 'yearly']).optional().default('monthly'),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    category: z.string().uuid().optional(),
    supplier: z.string().uuid().optional(),
  }),
};

// Validate body
export const validateBody = (schema: z.ZodSchema) => validate({ body: schema });

// Validate query
export const validateQuery = (schema: z.ZodSchema) => validate({ query: schema });

// Validate params
export const validateParams = (schema: z.ZodSchema) => validate({ params: schema });

// Validate all
export const validateAll = (bodySchema?: z.ZodSchema, querySchema?: z.ZodSchema, paramsSchema?: z.ZodSchema) => 
  validate({ 
    ...(bodySchema && { body: bodySchema }), 
    ...(querySchema && { query: querySchema }), 
    ...(paramsSchema && { params: paramsSchema }) 
  });