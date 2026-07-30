import pg from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error('DATABASE_URL not set in environment!');
  process.exit(1);
}

const clientConfig = {
  connectionString: dbUrl,
  ssl: dbUrl.includes('.render.com') ? { rejectUnauthorized: false } : undefined,
};

async function clearDb() {
  const client = new pg.Client(clientConfig);
  try {
    await client.connect();
    console.log('Connected to Render database.');

    // Run TRUNCATE cascade on products and categories (which clears products, categories, images, pricing, schemes, cart items, order items, and invoices)
    console.log('Truncating tables: categories, products, carts, orders...');
    await client.query('TRUNCATE TABLE categories, products, carts, orders CASCADE;');
    console.log('Successfully cleared all products, categories, orders, carts, invoices, and dependent tables!');

  } catch (error) {
    console.error('Error clearing database:', error);
  } finally {
    await client.end();
  }
}

clearDb();
