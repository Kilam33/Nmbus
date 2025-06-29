import 'dotenv/config';
import { query, closeDatabase } from '../utils/database';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

interface SeedData {
  categories: Array<{ id: string; name: string; description: string }>;
  suppliers: Array<{ id: string; name: string; email: string; phone: string; address: string; contact_person: string; avg_lead_time: number; status: string; reliability_score: number; on_time_delivery_rate: number }>;
  products: Array<{ id: string; name: string; description: string; price: number; quantity: number; category_id: string; supplier_id: string; low_stock_threshold: number; sku: string }>;
  orders: Array<{ id: string; supplier_id: string; product_id: string; quantity: number; status: string; customer: string; payment_method: string; shipping_method: string; order_number: string; total: number; created_at: string }>;
}

// Sample data generators
const generateCategories = (): SeedData['categories'] => [
  { id: uuidv4(), name: 'Electronics', description: 'Electronic devices and components' },
  { id: uuidv4(), name: 'Clothing', description: 'Apparel and fashion items' },
  { id: uuidv4(), name: 'Home & Garden', description: 'Home improvement and gardening supplies' },
  { id: uuidv4(), name: 'Sports & Outdoors', description: 'Sports equipment and outdoor gear' },
  { id: uuidv4(), name: 'Books & Media', description: 'Books, movies, and digital media' },
  { id: uuidv4(), name: 'Health & Beauty', description: 'Health and beauty products' },
  { id: uuidv4(), name: 'Automotive', description: 'Car parts and automotive supplies' },
  { id: uuidv4(), name: 'Office Supplies', description: 'Office and business supplies' },
  { id: uuidv4(), name: 'Food & Beverages', description: 'Food items and beverages' },
  { id: uuidv4(), name: 'Toys & Games', description: 'Toys and gaming products' },
];

const generateSuppliers = (): SeedData['suppliers'] => [
  {
    id: uuidv4(),
    name: 'TechCorp Solutions',
    email: 'orders@techcorp.com',
    phone: '+1-555-0101',
    address: '123 Tech Street, Silicon Valley, CA 94000',
    contact_person: 'John Smith',
    avg_lead_time: 7,
    status: 'active',
    reliability_score: 95,
    on_time_delivery_rate: 98,
  },
  {
    id: uuidv4(),
    name: 'Fashion Forward Inc',
    email: 'supply@fashionforward.com',
    phone: '+1-555-0102',
    address: '456 Fashion Ave, New York, NY 10001',
    contact_person: 'Sarah Johnson',
    avg_lead_time: 14,
    status: 'active',
    reliability_score: 88,
    on_time_delivery_rate: 92,
  },
  {
    id: uuidv4(),
    name: 'Home Essentials Ltd',
    email: 'orders@homeessentials.com',
    phone: '+1-555-0103',
    address: '789 Home Blvd, Chicago, IL 60601',
    contact_person: 'Mike Wilson',
    avg_lead_time: 10,
    status: 'active',
    reliability_score: 91,
    on_time_delivery_rate: 94,
  },
  {
    id: uuidv4(),
    name: 'Sports Gear Pro',
    email: 'wholesale@sportsgear.com',
    phone: '+1-555-0104',
    address: '321 Sports Way, Denver, CO 80201',
    contact_person: 'Lisa Brown',
    avg_lead_time: 12,
    status: 'active',
    reliability_score: 85,
    on_time_delivery_rate: 89,
  },
  {
    id: uuidv4(),
    name: 'Global Auto Parts',
    email: 'orders@globalauto.com',
    phone: '+1-555-0105',
    address: '654 Auto Lane, Detroit, MI 48201',
    contact_person: 'Robert Davis',
    avg_lead_time: 5,
    status: 'active',
    reliability_score: 93,
    on_time_delivery_rate: 96,
  },
  {
    id: uuidv4(),
    name: 'Office Solutions Plus',
    email: 'supply@officesolutions.com',
    phone: '+1-555-0106',
    address: '987 Business Park, Atlanta, GA 30301',
    contact_person: 'Jennifer Lee',
    avg_lead_time: 8,
    status: 'active',
    reliability_score: 90,
    on_time_delivery_rate: 93,
  },
  {
    id: uuidv4(),
    name: 'Health & Beauty Direct',
    email: 'orders@healthbeauty.com',
    phone: '+1-555-0107',
    address: '147 Beauty Blvd, Los Angeles, CA 90210',
    contact_person: 'Amanda White',
    avg_lead_time: 9,
    status: 'active',
    reliability_score: 87,
    on_time_delivery_rate: 91,
  },
  {
    id: uuidv4(),
    name: 'Book World Distributors',
    email: 'wholesale@bookworld.com',
    phone: '+1-555-0108',
    address: '258 Library St, Boston, MA 02101',
    contact_person: 'David Miller',
    avg_lead_time: 15,
    status: 'active',
    reliability_score: 82,
    on_time_delivery_rate: 88,
  },
];

const generateProducts = (categories: SeedData['categories'], suppliers: SeedData['suppliers']): SeedData['products'] => {
  const products: SeedData['products'] = [];
  
  const productTemplates = [
    // Electronics
    { name: 'Wireless Bluetooth Headphones', description: 'High-quality wireless headphones with noise cancellation', price: 149.99, baseQuantity: 50 },
    { name: 'Smartphone Case', description: 'Protective case for smartphones', price: 24.99, baseQuantity: 200 },
    { name: 'USB-C Cable', description: 'Fast charging USB-C cable', price: 12.99, baseQuantity: 300 },
    { name: 'Wireless Charger', description: 'Qi-compatible wireless charging pad', price: 39.99, baseQuantity: 75 },
    { name: 'Bluetooth Speaker', description: 'Portable Bluetooth speaker with bass boost', price: 79.99, baseQuantity: 60 },
    
    // Clothing
    { name: 'Cotton T-Shirt', description: '100% cotton comfortable t-shirt', price: 19.99, baseQuantity: 150 },
    { name: 'Denim Jeans', description: 'Classic fit denim jeans', price: 59.99, baseQuantity: 80 },
    { name: 'Running Shoes', description: 'Lightweight running shoes', price: 89.99, baseQuantity: 45 },
    { name: 'Winter Jacket', description: 'Insulated winter jacket', price: 129.99, baseQuantity: 30 },
    { name: 'Baseball Cap', description: 'Adjustable baseball cap', price: 24.99, baseQuantity: 100 },
    
    // Home & Garden
    { name: 'LED Light Bulb', description: 'Energy-efficient LED bulb', price: 8.99, baseQuantity: 500 },
    { name: 'Garden Hose', description: '50ft expandable garden hose', price: 34.99, baseQuantity: 40 },
    { name: 'Kitchen Knife Set', description: 'Professional kitchen knife set', price: 79.99, baseQuantity: 25 },
    { name: 'Throw Pillow', description: 'Decorative throw pillow', price: 16.99, baseQuantity: 120 },
    { name: 'Plant Pot', description: 'Ceramic plant pot with drainage', price: 22.99, baseQuantity: 85 },
    
    // Sports & Outdoors
    { name: 'Yoga Mat', description: 'Non-slip yoga mat', price: 29.99, baseQuantity: 70 },
    { name: 'Water Bottle', description: 'Insulated stainless steel water bottle', price: 24.99, baseQuantity: 150 },
    { name: 'Camping Tent', description: '4-person camping tent', price: 199.99, baseQuantity: 15 },
    { name: 'Fitness Tracker', description: 'Waterproof fitness tracker', price: 99.99, baseQuantity: 35 },
    { name: 'Basketball', description: 'Official size basketball', price: 34.99, baseQuantity: 50 },
    
    // Office Supplies
    { name: 'Notebook', description: 'Spiral-bound notebook', price: 4.99, baseQuantity: 400 },
    { name: 'Pen Set', description: 'Set of 10 ballpoint pens', price: 9.99, baseQuantity: 200 },
    { name: 'Desk Organizer', description: 'Multi-compartment desk organizer', price: 19.99, baseQuantity: 60 },
    { name: 'Printer Paper', description: 'Ream of 500 sheets', price: 12.99, baseQuantity: 100 },
    { name: 'Stapler', description: 'Heavy-duty office stapler', price: 15.99, baseQuantity: 80 },
  ];

  productTemplates.forEach((template, index) => {
    const categoryIndex = index % categories.length;
    const supplierIndex = index % suppliers.length;
    
    const category = categories[categoryIndex];
    const supplier = suppliers[supplierIndex];
    
    if (!category || !supplier) {
      logger.warn(`Skipping product ${template.name} - missing category or supplier`);
      return;
    }
    
    // Create multiple variants of each product with different quantities
    for (let variant = 0; variant < 2; variant++) {
      const quantity = Math.floor(template.baseQuantity * (0.5 + Math.random()));
      const lowStockThreshold = Math.floor(quantity * 0.2);
      
      products.push({
        id: uuidv4(),
        name: variant === 0 ? template.name : `${template.name} Pro`,
        description: template.description,
        price: variant === 0 ? template.price : template.price * 1.3,
        quantity,
        category_id: category.id,
        supplier_id: supplier.id,
        low_stock_threshold: lowStockThreshold,
        sku: `SKU-${(index * 2 + variant + 1).toString().padStart(4, '0')}`,
      });
    }
  });

  return products;
};

const generateOrders = (products: SeedData['products'], suppliers: SeedData['suppliers']): SeedData['orders'] => {
  const orders: SeedData['orders'] = [];
  const customers = [
    'Acme Corporation', 'Global Industries', 'Tech Innovations', 'Retail Solutions',
    'Manufacturing Co', 'Service Experts', 'Digital Dynamics', 'Enterprise Systems',
    'Business Partners', 'Commercial Group', 'Industrial Supply', 'Professional Services',
    'Quality Products', 'Reliable Solutions', 'Advanced Technologies', 'Modern Enterprises',
  ];
  
  const paymentMethods = ['Credit Card', 'Bank Transfer', 'PayPal', 'Check', 'Net 30'];
  const shippingMethods = ['Standard', 'Express', 'Overnight', 'Ground', 'Priority'];
  const statuses = ['pending', 'processing', 'shipped', 'completed', 'cancelled'];
  const statusWeights = [0.1, 0.15, 0.2, 0.5, 0.05]; // Most orders should be completed

  // Generate orders for the past year
  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - 1);

  for (let i = 0; i < 2000; i++) {
    const product = products[Math.floor(Math.random() * products.length)];
    if (!product) {
      logger.warn(`Skipping order ${i} - no product available`);
      continue;
    }
    
    const supplier = suppliers.find(s => s.id === product.supplier_id);
    if (!supplier) {
      logger.warn(`Skipping order ${i} - supplier not found for product ${product.id}`);
      continue;
    }
    
    // Generate random date within the past year
    const orderDate = new Date(startDate.getTime() + Math.random() * (Date.now() - startDate.getTime()));
    
    // Select status based on weights
    let statusIndex = 0;
    const random = Math.random();
    let cumulativeWeight = 0;
    for (let j = 0; j < statusWeights.length; j++) {
      const weight = statusWeights[j];
      if (weight === undefined) continue;
      cumulativeWeight += weight;
      if (random <= cumulativeWeight) {
        statusIndex = j;
        break;
      }
    }
    
    const quantity = Math.floor(Math.random() * 10) + 1;
    const total = quantity * product.price;
    const orderNumber = `ORD-${orderDate.getFullYear()}${(orderDate.getMonth() + 1).toString().padStart(2, '0')}${orderDate.getDate().toString().padStart(2, '0')}-${(i + 1).toString().padStart(4, '0')}`;

    const customer = customers[Math.floor(Math.random() * customers.length)];
    const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
    const shippingMethod = shippingMethods[Math.floor(Math.random() * shippingMethods.length)];
    const status = statuses[statusIndex];

    if (!customer || !paymentMethod || !shippingMethod || !status) {
      logger.warn(`Skipping order ${i} - missing required data`);
      continue;
    }

    orders.push({
      id: uuidv4(),
      supplier_id: supplier.id,
      product_id: product.id,
      quantity,
      status,
      customer,
      payment_method: paymentMethod,
      shipping_method: shippingMethod,
      order_number: orderNumber,
      total,
      created_at: orderDate.toISOString(),
    });
  }

  return orders.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
};

const createTables = async (): Promise<void> => {
  logger.info('Creating database tables...');

  // Create categories table
  await query(`
    CREATE TABLE IF NOT EXISTS categories (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      description TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Create suppliers table
  await query(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT NOT NULL,
      address TEXT NOT NULL,
      contact_person TEXT NOT NULL,
      status VARCHAR(20) DEFAULT 'new' CHECK (status IN ('active', 'inactive', 'on-hold', 'new')),
      reliability_score INTEGER DEFAULT 50 CHECK (reliability_score >= 0 AND reliability_score <= 100),
      avg_lead_time INTEGER NOT NULL CHECK (avg_lead_time > 0),
      last_order_date TIMESTAMPTZ,
      on_time_delivery_rate INTEGER DEFAULT 80 CHECK (on_time_delivery_rate >= 0 AND on_time_delivery_rate <= 100),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ
    )
  `);

  // Create products table
  await query(`
    CREATE TABLE IF NOT EXISTS products (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      sku VARCHAR(50) UNIQUE,
      description TEXT,
      price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
      quantity INTEGER NOT NULL CHECK (quantity >= 0),
      low_stock_threshold INTEGER NOT NULL DEFAULT 10 CHECK (low_stock_threshold >= 0),
      category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
      supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ
    )
  `);

  // Create orders table
  await query(`
    CREATE TABLE IF NOT EXISTS orders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
      product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'shipped', 'completed', 'cancelled')),
      customer TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      shipping_method TEXT NOT NULL,
      order_number VARCHAR(50) UNIQUE,
      total DECIMAL(10,2) CHECK (total >= 0),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ
    )
  `);

  // Create indexes for better performance
  await query('CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id)');
  await query('CREATE INDEX IF NOT EXISTS idx_products_supplier ON products(supplier_id)');
  await query('CREATE INDEX IF NOT EXISTS idx_products_low_stock ON products(quantity, low_stock_threshold)');
  await query('CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku)');
  await query('CREATE INDEX IF NOT EXISTS idx_orders_supplier ON orders(supplier_id)');
  await query('CREATE INDEX IF NOT EXISTS idx_orders_product ON orders(product_id)');
  await query('CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)');
  await query('CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at)');
  await query('CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number)');
  await query('CREATE INDEX IF NOT EXISTS idx_suppliers_email ON suppliers(email)');
  await query('CREATE INDEX IF NOT EXISTS idx_suppliers_status ON suppliers(status)');
  await query('CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name)');

  logger.info('Database tables created successfully');
};

const seedDatabase = async (): Promise<void> => {
  try {
    logger.info('Starting database seeding...');

    // Test database connection first
    logger.info('Testing database connection...');
    try {
      await query('SELECT 1 as test');
      logger.info('Database connection successful');
    } catch (error) {
      logger.error('Database connection failed:', error);
      throw new Error(`Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Create tables first
    await createTables();

    // Check if data already exists
    const existingCategories = await query('SELECT COUNT(*) FROM categories');
    if (parseInt(existingCategories.rows[0].count) > 0) {
      logger.info('Database already contains data. Skipping seed.');
      return;
    }

    // Generate seed data
    logger.info('Generating seed data...');
    const categories = generateCategories();
    const suppliers = generateSuppliers();
    const products = generateProducts(categories, suppliers);
    const orders = generateOrders(products, suppliers);

    logger.info(`Generated:
      - ${categories.length} categories
      - ${suppliers.length} suppliers  
      - ${products.length} products
      - ${orders.length} orders`);

    // Insert categories
    logger.info('Inserting categories...');
    for (const category of categories) {
      await query(
        'INSERT INTO categories (id, name, description, created_at) VALUES ($1, $2, $3, NOW())',
        [category.id, category.name, category.description]
      );
    }

    // Insert suppliers
    logger.info('Inserting suppliers...');
    for (const supplier of suppliers) {
      await query(`
        INSERT INTO suppliers (
          id, name, email, phone, address, contact_person, avg_lead_time,
          status, reliability_score, on_time_delivery_rate, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      `, [
        supplier.id, supplier.name, supplier.email, supplier.phone, supplier.address,
        supplier.contact_person, supplier.avg_lead_time, supplier.status,
        supplier.reliability_score, supplier.on_time_delivery_rate
      ]);
    }

    // Insert products
    logger.info('Inserting products...');
    for (const product of products) {
      await query(`
        INSERT INTO products (
          id, name, description, price, quantity, category_id, supplier_id,
          low_stock_threshold, sku, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      `, [
        product.id, product.name, product.description, product.price, product.quantity,
        product.category_id, product.supplier_id, product.low_stock_threshold, product.sku
      ]);
    }

    // Insert orders
    logger.info('Inserting orders...');
    for (const order of orders) {
      await query(`
        INSERT INTO orders (
          id, supplier_id, product_id, quantity, status, customer,
          payment_method, shipping_method, order_number, total, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        order.id, order.supplier_id, order.product_id, order.quantity, order.status,
        order.customer, order.payment_method, order.shipping_method, order.order_number,
        order.total, order.created_at
      ]);
    }

    // Update supplier last_order_date
    logger.info('Updating supplier statistics...');
    await query(`
      UPDATE suppliers 
      SET last_order_date = (
        SELECT MAX(created_at) 
        FROM orders 
        WHERE orders.supplier_id = suppliers.id
      )
      WHERE id IN (SELECT DISTINCT supplier_id FROM orders)
    `);

    logger.info('Database seeding completed successfully!');
    logger.info('You can now start the API server and begin testing with realistic data.');

  } catch (error) {
    logger.error('Database seeding failed:', error);
    if (error instanceof Error) {
      logger.error('Error details:', {
        message: error.message,
        stack: error.stack
      });
    }
    throw error;
  }
};

// Run the seeder
if (require.main === module) {
  seedDatabase()
    .then(() => {
      logger.info('Seed script completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Seed script failed:', error);
      process.exit(1);
    })
    .finally(() => {
      closeDatabase();
    });
}

export { seedDatabase };