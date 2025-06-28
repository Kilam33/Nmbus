import { faker } from '@faker-js/faker';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../src/types/supabase';
import * as dotenv from 'dotenv';

dotenv.config(); // Load from .env

const supabase = createClient<Database>(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);


// Types based on your schema
interface Category {
  id?: string;
  name: string;
  description: string | null;
  created_at?: string;
}

interface Supplier {
  id?: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  created_at?: string;
  status: 'pending' | 'completed' | 'active' | 'cancelled' | 'processing' | 'shipped';
  reliability_score: number;
  avg_lead_time: number;
  last_order_date?: string;
  on_time_delivery_rate: number;
  contact_person: string | null;
}

interface Product {
  id?: string;
  name: string;
  description: string | null;
  price: number;
  quantity: number;
  low_stock_threshold: number;
  category_id: string;
  supplier_id: string;
  created_at?: string;
}

interface Order {
  id?: string;
  supplier_id: string;
  product_id: string;
  quantity: number;
  status: 'pending' | 'completed' | 'active' | 'cancelled' | 'processing' | 'shipped';
  created_at?: string;
  updated_at?: string | null;
  order_number: string;
  total: number;
}

// Seed configuration
const CONFIG = {
  NUM_CATEGORIES: 8,
  NUM_SUPPLIERS: 25,
  NUM_PRODUCTS: 100,
  NUM_ORDERS: 1000,
  START_DATE: new Date(new Date().setMonth(new Date().getMonth() - 6)), // 6 months ago
  END_DATE: new Date(), // today
};

// Helper function to generate a random date between two dates
function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Helper function to generate unique order numbers
function generateOrderNumber(): string {
  return `ORD-${faker.string.alphanumeric(8).toUpperCase()}`;
}

// Main seed function
async function seedDatabase() {
  console.log('Starting database seeding...');

  try {
    // 1. Seed categories
    console.log('Seeding categories...');
    const categories: Category[] = [];
    
    const categoryTypes = [
      'Electronics', 'Furniture', 'Clothing', 'Office Supplies', 
      'Food & Beverages', 'Health & Beauty', 'Toys & Games', 'Sports Equipment',
      'Home Decor', 'Kitchen Appliances', 'Tools & Hardware', 'Pet Supplies'
    ];
    
    for (let i = 0; i < CONFIG.NUM_CATEGORIES; i++) {
      const category: Category = {
        name: categoryTypes[i % categoryTypes.length],
        description: faker.commerce.productDescription(),
        created_at: randomDate(CONFIG.START_DATE, CONFIG.END_DATE).toISOString()
      };
      categories.push(category);
    }
    
    const { data: categoriesData, error: categoriesError } = await supabase
      .from('categories')
      .insert(categories)
      .select();
    
    if (categoriesError) {
      throw new Error(`Error seeding categories: ${categoriesError.message}`);
    }
    
    console.log(`Seeded ${categoriesData?.length} categories`);
    
    // 2. Seed suppliers
    console.log('Seeding suppliers...');
    const suppliers: Supplier[] = [];
    
    for (let i = 0; i < CONFIG.NUM_SUPPLIERS; i++) {
      const supplier: Supplier = {
        name: faker.company.name(),
        email: faker.internet.email(),
        phone: faker.phone.number(),
        address: faker.location.streetAddress({ useFullAddress: true }),
        status: faker.helpers.arrayElement(['active', 'pending']),
        reliability_score: faker.number.int({ min: 50, max: 100 }),
        avg_lead_time: faker.number.int({ min: 1, max: 30 }),
        last_order_date: randomDate(CONFIG.START_DATE, CONFIG.END_DATE).toISOString(),
        on_time_delivery_rate: parseFloat(faker.number.float({ min: 70, max: 100, fractionDigits: 1 }).toFixed(1)),
        contact_person: faker.person.fullName(),
        created_at: randomDate(CONFIG.START_DATE, CONFIG.END_DATE).toISOString()
      };
      suppliers.push(supplier);
    }
    
    const { data: suppliersData, error: suppliersError } = await supabase
      .from('suppliers')
      .insert(suppliers)
      .select();
    
    if (suppliersError) {
      throw new Error(`Error seeding suppliers: ${suppliersError.message}`);
    }
    
    console.log(`Seeded ${suppliersData?.length} suppliers`);
    
    // 3. Seed products
    console.log('Seeding products...');
    const products: Product[] = [];
    
    if (!categoriesData || !suppliersData) {
      throw new Error('Missing category or supplier data');
    }
    
    for (let i = 0; i < CONFIG.NUM_PRODUCTS; i++) {
      const category = faker.helpers.arrayElement(categoriesData);
      const supplier = faker.helpers.arrayElement(suppliersData);
      
      const product: Product = {
        name: faker.commerce.productName(),
        description: faker.commerce.productDescription(),
        price: parseFloat(faker.commerce.price({ min: 5, max: 2000 })),
        quantity: faker.number.int({ min: 0, max: 500 }),
        low_stock_threshold: faker.number.int({ min: 5, max: 50 }),
        category_id: category.id!,
        supplier_id: supplier.id!,
        created_at: randomDate(CONFIG.START_DATE, CONFIG.END_DATE).toISOString()
      };
      products.push(product);
    }
    
    const { data: productsData, error: productsError } = await supabase
      .from('products')
      .insert(products)
      .select();
    
    if (productsError) {
      throw new Error(`Error seeding products: ${productsError.message}`);
    }
    
    console.log(`Seeded ${productsData?.length} products`);
    
    // 4. Seed orders
    console.log('Seeding orders...');
    const orders: Order[] = [];
    
    if (!productsData) {
      throw new Error('Missing product data');
    }
    
    for (let i = 0; i < CONFIG.NUM_ORDERS; i++) {
      const orderDate = randomDate(CONFIG.START_DATE, CONFIG.END_DATE);
      const product = faker.helpers.arrayElement(productsData);
      const supplier = suppliersData.find(s => s.id === product.supplier_id);
      
      if (!supplier) continue;
      
      const quantity = faker.number.int({ min: 1, max: 50 });
      const total = parseFloat((product.price * quantity).toFixed(2));
      
      // Calculate potential update date (for completed orders)
      let updatedAt: string | null = null;
      let status: 'pending' | 'completed' | 'active' | 'cancelled' | 'processing' | 'shipped';
      
      // Status logic based on date
      const daysSinceCreation = (new Date().getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSinceCreation > 60) {
        // Older orders are more likely to be completed
        status = faker.helpers.arrayElement([
          'completed', 'completed', 'completed', 'completed', 'cancelled'
        ]);
        updatedAt = new Date(orderDate.getTime() + faker.number.int({ min: 2, max: 14 }) * 24 * 60 * 60 * 1000).toISOString();
      } else if (daysSinceCreation > 30) {
        status = faker.helpers.arrayElement([
          'completed', 'completed', 'shipped', 'cancelled'
        ]);
        updatedAt = new Date(orderDate.getTime() + faker.number.int({ min: 1, max: 10 }) * 24 * 60 * 60 * 1000).toISOString();
      } else if (daysSinceCreation > 7) {
        status = faker.helpers.arrayElement([
          'pending', 'processing', 'shipped', 'completed'
        ]);
        updatedAt = new Date(orderDate.getTime() + faker.number.int({ min: 1, max: 7 }) * 24 * 60 * 60 * 1000).toISOString();
      } else {
        status = faker.helpers.arrayElement([
          'pending', 'pending', 'processing', 'processing'
        ]);
        updatedAt = daysSinceCreation > 2 ? new Date(orderDate.getTime() + faker.number.int({ min: 1, max: 2 }) * 24 * 60 * 60 * 1000).toISOString() : null;
      }
      
      const order: Order = {
        supplier_id: supplier.id!,
        product_id: product.id!,
        quantity,
        status,
        created_at: orderDate.toISOString(),
        updated_at: updatedAt,
        order_number: generateOrderNumber(),
        total
      };
      orders.push(order);
    }
    
    // Sort orders by creation date to maintain realistic order numbers
    orders.sort((a, b) => new Date(a.created_at!).getTime() - new Date(b.created_at!).getTime());
    
    // Insert orders in chunks to avoid request size limitations
    const CHUNK_SIZE = 100;
    for (let i = 0; i < orders.length; i += CHUNK_SIZE) {
      const chunk = orders.slice(i, i + CHUNK_SIZE);
      const { error: ordersError } = await supabase.from('orders').insert(chunk);
      
      if (ordersError) {
        throw new Error(`Error seeding orders (chunk ${i / CHUNK_SIZE + 1}): ${ordersError.message}`);
      }
      
      console.log(`Seeded orders chunk ${i / CHUNK_SIZE + 1} of ${Math.ceil(orders.length / CHUNK_SIZE)}`);
    }
    
    console.log(`Seeded ${orders.length} orders`);
    console.log('Database seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}

// Run the seed function
seedDatabase();

