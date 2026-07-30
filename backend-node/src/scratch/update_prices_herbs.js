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

const priceUpdates = {
  'GR-HA-AMLA-DRY': 14500,
  'GR-HA-BACHWOOD': 25400,
  'GR-HA-LICORICE-ROOT': 24500,
  'GR-HA-SHIKAKAI': 14400,
  'GR-HA-SOAPNUT': 7500,
  'GR-HA-ALKANET': 64000,
  'GR-HA-PANEER-FLW': 20000,
};

async function updatePrices() {
  const client = new pg.Client(clientConfig);
  try {
    await client.connect();
    console.log('Connected to Render database.');

    console.log('Updating Herbs & Ayurvedic product prices...');
    
    let updatedCount = 0;
    for (const [sku, price] of Object.entries(priceUpdates)) {
      const res = await client.query(
        'UPDATE products SET base_price = $1, updated_at = NOW() WHERE sku = $2 RETURNING id',
        [price, sku]
      );
      if (res.rowCount > 0) {
        updatedCount++;
      } else {
        console.warn(`WARNING: Product with SKU "${sku}" not found in database.`);
      }
    }

    console.log(`Successfully updated ${updatedCount} Herbs & Ayurvedic product prices in database!`);

  } catch (error) {
    console.error('Error updating prices:', error);
  } finally {
    await client.end();
  }
}

updatePrices();
