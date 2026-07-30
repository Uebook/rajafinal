import pg from 'pg';
import * as dotenv from 'dotenv';
import crypto from 'crypto';
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

async function syncWholesalePricing() {
  const client = new pg.Client(clientConfig);
  try {
    await client.connect();
    console.log('Connected to Render database.');

    // Select all products
    console.log('Fetching products to sync to wholesale/vendor pricing overrides...');
    const { rows: products } = await client.query('SELECT id, name, base_price FROM products WHERE is_deleted = false');

    console.log(`Found ${products.length} active products. Checking/updating vendor_pricing overrides...`);
    
    let inserted = 0;
    let updated = 0;

    for (const p of products) {
      // Check if vendor pricing override exists for this product
      const { rows: existing } = await client.query(
        'SELECT id FROM vendor_pricing WHERE product_id = $1 AND is_deleted = false',
        [p.id]
      );

      if (existing.length > 0) {
        // Update price
        await client.query(
          'UPDATE vendor_pricing SET price = $1, updated_at = NOW() WHERE product_id = $2 AND is_deleted = false',
          [p.base_price, p.id]
        );
        updated++;
      } else {
        // Insert new override
        const id = crypto.randomUUID();
        await client.query(
          'INSERT INTO vendor_pricing (id, product_id, price, created_at, updated_at, is_deleted) VALUES ($1, $2, $3, NOW(), NOW(), false)',
          [id, p.id, p.base_price]
        );
        inserted++;
      }
    }

    console.log(`Sync completed successfully! Created ${inserted} and updated ${updated} wholesale/vendor pricing overrides.`);

  } catch (error) {
    console.error('Error syncing wholesale pricing:', error);
  } finally {
    await client.end();
  }
}

syncWholesalePricing();
