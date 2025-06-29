import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';
import { config } from './app.config';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'NIMBUS Inventory Management API',
      version: '1.0.0',
      description: 'A comprehensive inventory management system with analytics and forecasting capabilities',
      contact: {
        name: 'NIMBUS API Support',
        email: 'api-support@nimbus.com',
      },
    },
    servers: [
      {
        url: `http://localhost:${config.port}`,
        description: 'Development server',
      },
      {
        url: 'https://api.nimbus.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Product: {
          type: 'object',
          required: ['name', 'price', 'quantity', 'category_id', 'supplier_id'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique product identifier',
            },
            name: {
              type: 'string',
              minLength: 1,
              maxLength: 100,
              description: 'Product name',
            },
            SKU: {
              type: 'string',
              maxLength: 50,
              description: 'Stock Keeping Unit',
              nullable: true,
            },
            description: {
              type: 'string',
              maxLength: 500,
              description: 'Product description',
              nullable: true,
            },
            price: {
              type: 'number',
              minimum: 0,
              description: 'Product price',
            },
            quantity: {
              type: 'integer',
              minimum: 0,
              description: 'Available quantity',
            },
            low_stock_threshold: {
              type: 'integer',
              minimum: 0,
              default: 10,
              description: 'Threshold for low stock alerts',
            },
            category_id: {
              type: 'string',
              format: 'uuid',
              description: 'Category identifier',
            },
            supplier_id: {
              type: 'string',
              format: 'uuid',
              description: 'Supplier identifier',
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp',
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp',
              nullable: true,
            },
          },
        },
        Category: {
          type: 'object',
          required: ['name'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique category identifier',
            },
            name: {
              type: 'string',
              minLength: 1,
              maxLength: 50,
              description: 'Category name',
            },
            description: {
              type: 'string',
              maxLength: 200,
              description: 'Category description',
              nullable: true,
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp',
            },
          },
        },
        Supplier: {
          type: 'object',
          required: ['name', 'email', 'phone', 'address', 'contact_person', 'avg_lead_time'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique supplier identifier',
            },
            name: {
              type: 'string',
              minLength: 1,
              maxLength: 100,
              description: 'Supplier name',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Supplier email',
            },
            phone: {
              type: 'string',
              maxLength: 20,
              description: 'Supplier phone number',
            },
            address: {
              type: 'string',
              maxLength: 200,
              description: 'Supplier address',
            },
            contact_person: {
              type: 'string',
              maxLength: 100,
              description: 'Contact person name',
            },
            status: {
              type: 'string',
              enum: ['active', 'inactive', 'on-hold', 'new'],
              default: 'new',
              description: 'Supplier status',
            },
            reliability_score: {
              type: 'number',
              minimum: 0,
              maximum: 100,
              default: 50,
              description: 'Reliability score (0-100)',
            },
            avg_lead_time: {
              type: 'integer',
              minimum: 1,
              description: 'Average lead time in days',
            },
            on_time_delivery_rate: {
              type: 'number',
              minimum: 0,
              maximum: 100,
              default: 80,
              description: 'On-time delivery rate percentage',
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp',
            },
          },
        },
        Order: {
          type: 'object',
          required: ['supplier_id', 'product_id', 'quantity', 'customer', 'payment_method', 'shipping_method'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique order identifier',
            },
            supplier_id: {
              type: 'string',
              format: 'uuid',
              description: 'Supplier identifier',
            },
            product_id: {
              type: 'string',
              format: 'uuid',
              description: 'Product identifier',
            },
            quantity: {
              type: 'integer',
              minimum: 1,
              description: 'Order quantity',
            },
            status: {
              type: 'string',
              enum: ['pending', 'processing', 'shipped', 'completed', 'cancelled'],
              default: 'pending',
              description: 'Order status',
            },
            customer: {
              type: 'string',
              maxLength: 100,
              description: 'Customer name',
            },
            payment_method: {
              type: 'string',
              maxLength: 50,
              description: 'Payment method',
            },
            shipping_method: {
              type: 'string',
              maxLength: 50,
              description: 'Shipping method',
            },
            total: {
              type: 'number',
              minimum: 0,
              description: 'Order total amount',
              nullable: true,
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp',
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp',
              nullable: true,
            },
          },
        },
        ApiResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Request success status',
            },
            data: {
              description: 'Response data',
            },
            message: {
              type: 'string',
              description: 'Response message',
            },
            error: {
              type: 'object',
              properties: {
                message: {
                  type: 'string',
                  description: 'Error message',
                },
                code: {
                  type: 'string',
                  description: 'Error code',
                },
                statusCode: {
                  type: 'integer',
                  description: 'HTTP status code',
                },
                details: {
                  description: 'Error details',
                },
              },
            },
            pagination: {
              type: 'object',
              properties: {
                page: {
                  type: 'integer',
                  description: 'Current page number',
                },
                limit: {
                  type: 'integer',
                  description: 'Items per page',
                },
                total: {
                  type: 'integer',
                  description: 'Total number of items',
                },
                totalPages: {
                  type: 'integer',
                  description: 'Total number of pages',
                },
                hasNext: {
                  type: 'boolean',
                  description: 'Has next page',
                },
                hasPrev: {
                  type: 'boolean',
                  description: 'Has previous page',
                },
              },
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            error: {
              type: 'object',
              properties: {
                message: {
                  type: 'string',
                  description: 'Error message',
                },
                code: {
                  type: 'string',
                  description: 'Error code',
                },
                statusCode: {
                  type: 'integer',
                  description: 'HTTP status code',
                },
              },
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/api/**/*.ts'], // Paths to files containing OpenAPI definitions
};

const specs = swaggerJsdoc(options);

export const setupSwagger = (app: Express): void => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'NIMBUS API Documentation',
  }));
  
  // JSON endpoint for the spec
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });
};