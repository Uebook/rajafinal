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

function generateUniqueSlug(text) {
  const base = text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
  const rand = crypto.randomBytes(3).toString('hex');
  return `${base}-${rand}`;
}

async function insertData2() {
  const client = new pg.Client(clientConfig);
  try {
    await client.connect();
    console.log('Connected to Render database.');

    // Fetch subcategories map from DB to get the correct UUIDs
    const { rows: subCats } = await client.query(
      "SELECT id, name FROM categories WHERE name IN ('Oil & Ghee', 'Herbs & Ayurvedic', 'Dairy Product', 'Worship Item', 'Seeds')"
    );

    const subCatMap = {};
    for (const row of subCats) {
      subCatMap[row.name] = row.id;
    }

    const oilGheeId = subCatMap['Oil & Ghee'];
    const herbsId = subCatMap['Herbs & Ayurvedic'];
    const dairyId = subCatMap['Dairy Product'];
    const worshipId = subCatMap['Worship Item'];
    const seedsId = subCatMap['Seeds'];

    if (!oilGheeId || !herbsId || !dairyId || !worshipId || !seedsId) {
      console.error('Could not find all required subcategories in the database! Please run insert_data.js first.');
      process.exit(1);
    }

    // 1. Insert Oil & Ghee
    console.log('Inserting Oil & Ghee products...');
    const oilGheeItems = [
      { name: 'Refined 500ml', desc: 'Refined 500ml (रिफाइंड 500ml)', sku: 'GR-OG-REFINED-500ML', price: 6500 },
      { name: 'Refined 1 ltr', desc: 'Refined 1 ltr (रिफाइंड 1ltr)', sku: 'GR-OG-REFINED-1LTR', price: 12500 },
      { name: 'Refined 2 ltr', desc: 'Refined 2 ltr (रिफाइंड 2 ltr)', sku: 'GR-OG-REFINED-2LTR', price: 24500 },
      { name: 'Refined 5ltr', desc: 'Refined 5ltr (रिफाइंड 5ltr )', sku: 'GR-OG-REFINED-5LTR', price: 60000 },
      { name: 'Refined 15 Tin', desc: 'Refined 15 Tin (रिफाइंड 15 ltr टीन)', sku: 'GR-OG-REFINED-15TIN', price: 175000 },
      { name: 'Refined 15ltr Jar', desc: 'Refined 15ltr Jar (रिफाइंड 15 ltr जार)', sku: 'GR-OG-REFINED-15JAR', price: 180000 },
      { name: 'Kachi ghani 500ml', desc: 'Kachi ghani 500ml (कच्ची घानी 500ml)', sku: 'GR-OG-KACHI-500ML', price: 8000 },
      { name: 'Kachi ghani 1ltr', desc: 'Kachi ghani 1ltr (कच्ची घानी 1 ltr)', sku: 'GR-OG-KACHI-1LTR', price: 15500 },
      { name: 'Kachi ghani 2lt', desc: 'Kachi ghani 2lt (कच्ची घानी 2ltr)', sku: 'GR-OG-KACHI-2LTR', price: 30000 },
      { name: 'Kachi ghani 5ltr', desc: 'Kachi ghani 5ltr (कच्ची घानी 5ltr)', sku: 'GR-OG-KACHI-5LTR', price: 74000 },
      { name: 'Kachi ghani 15ltr', desc: 'Kachi ghani 15ltr (कच्ची घानी 15ltr)', sku: 'GR-OG-KACHI-15LTR', price: 215000 },
      { name: 'Ghee Desi 250ml', desc: 'Ghee Desi 250ml (देशी घी 250 ml)', sku: 'GR-OG-GHEEDESI-250ML', price: 17500 },
      { name: 'Ghee Desi 500ml', desc: 'Ghee Desi 500ml (देशी घी 500 ml)', sku: 'GR-OG-GHEEDESI-500ML', price: 34000 },
      { name: 'Ghee Desi 1 ltr', desc: 'Ghee Desi 1 ltr (देशी घी 1 ltr)', sku: 'GR-OG-GHEEDESI-1LTR', price: 65000 },
      { name: 'Ghee Dalda', desc: 'Ghee Dalda (डालडा घी)', sku: 'GR-OG-GHEEDALDA', price: 18000 }
    ];

    for (const p of oilGheeItems) {
      await client.query(
        'INSERT INTO products (id, category_id, name, slug, sku, description, base_price, unit, gst_rate, stock_qty, low_stock_threshold, status, is_deleted) VALUES ($1, $2, $3, $4, $5, $6, $7, \'piece\', 5, 200, 15, \'ACTIVE\', false)',
        [crypto.randomUUID(), oilGheeId, p.name, generateUniqueSlug(p.name), p.sku, p.desc, p.price]
      );
    }

    // 2. Insert Herbs & Ayurvedic
    console.log('Inserting Herbs & Ayurvedic products...');
    const herbsItems = [
      { name: 'Dried Amla', desc: 'Dried Amla (सूखा आंवला)', sku: 'GR-HA-AMLA-DRY', price: 24000 },
      { name: 'Bach Wood', desc: 'Bach Wood (बछ की लकड़ी)', sku: 'GR-HA-BACHWOOD', price: 15000 },
      { name: 'Licorice Root', desc: 'Licorice Root (मुलेठी)', sku: 'GR-HA-LICORICE-ROOT', price: 45000 },
      { name: 'Shikakai', desc: 'Shikakai (शिकाकाई)', sku: 'GR-HA-SHIKAKAI', price: 22000 },
      { name: 'Soapnut', desc: 'Soapnut (रीठा)', sku: 'GR-HA-SOAPNUT', price: 18000 },
      { name: 'Alkanet Root', desc: 'Alkanet Root (रतनजोत)', sku: 'GR-HA-ALKANET', price: 35000 },
      { name: 'Paneer Flower', desc: 'Paneer Flower (पनीर फूल)', sku: 'GR-HA-PANEER-FLW', price: 32000 }
    ];

    for (const p of herbsItems) {
      await client.query(
        'INSERT INTO products (id, category_id, name, slug, sku, description, base_price, unit, gst_rate, stock_qty, low_stock_threshold, status, is_deleted) VALUES ($1, $2, $3, $4, $5, $6, $7, \'kg\', 5, 100, 10, \'ACTIVE\', false)',
        [crypto.randomUUID(), herbsId, p.name, generateUniqueSlug(p.name), p.sku, p.desc, p.price]
      );
    }

    // 3. Insert Dairy Products
    console.log('Inserting Dairy Product products...');
    const dairyItems = [
      { name: 'fresh Cream', desc: 'fresh Cream (ताजा क्रीम)', sku: 'GR-DP-CREAM-FRESH', price: 9000 },
      { name: 'Butter', desc: 'Butter (मक्खन)', sku: 'GR-DP-BUTTER', price: 12500 },
      { name: 'Curd', desc: 'Curd (दही)', sku: 'GR-DP-CURD', price: 4000 },
      { name: 'Sweet Corn', desc: 'Sweet Corn (मीठा मक्का)', sku: 'GR-DP-SWEET-CORN', price: 8500 },
      { name: 'Soya Chap', desc: 'Soya Chap (सोया चाप)', sku: 'GR-DP-SOYACHAP', price: 9500 },
      { name: 'Paneer', desc: 'Paneer (पनीर)', sku: 'GR-DP-PANEER', price: 18000 },
      { name: 'Green Peas', desc: 'Green Peas (मटर)', sku: 'GR-DP-PEAS-GREEN', price: 12000 }
    ];

    for (const p of dairyItems) {
      await client.query(
        'INSERT INTO products (id, category_id, name, slug, sku, description, base_price, unit, gst_rate, stock_qty, low_stock_threshold, status, is_deleted) VALUES ($1, $2, $3, $4, $5, $6, $7, \'piece\', 5, 120, 10, \'ACTIVE\', false)',
        [crypto.randomUUID(), dairyId, p.name, generateUniqueSlug(p.name), p.sku, p.desc, p.price]
      );
    }

    // 4. Insert Worship Items
    console.log('Inserting Worship Item products...');
    const worshipItems = [
      { name: 'Lotus Seeds Raw', desc: 'Lotus Seeds Raw (कमलगट्टा)', sku: 'GR-WI-LOTUS-SEEDS', price: 95000 },
      { name: 'Havan Masala', desc: 'Havan Masala (हवन मसाला)', sku: 'GR-WI-HAVAN-MASALA', price: 12000 }
    ];

    for (const p of worshipItems) {
      await client.query(
        'INSERT INTO products (id, category_id, name, slug, sku, description, base_price, unit, gst_rate, stock_qty, low_stock_threshold, status, is_deleted) VALUES ($1, $2, $3, $4, $5, $6, $7, \'kg\', 5, 80, 5, \'ACTIVE\', false)',
        [crypto.randomUUID(), worshipId, p.name, generateUniqueSlug(p.name), p.sku, p.desc, p.price]
      );
    }

    // 5. Insert Seeds
    console.log('Inserting Seeds products...');
    const seedsItems = [
      { name: 'Watermelon Seeds', desc: 'Watermelon Seeds (तरबूज के बीज)', sku: 'GR-SD-WATERMELON', price: 28000 },
      { name: 'Sunflower Seeds', desc: 'Sunflower Seeds (सूरजमुखी के बीज)', sku: 'GR-SD-SUNFLOWER', price: 24000 },
      { name: 'Chia Seeds', desc: 'Chia Seeds (चिया के बीज)', sku: 'GR-SD-CHIA', price: 35000 },
      { name: 'Flax Seeds', desc: 'Flax Seeds (अलसी के बीज)', sku: 'GR-SD-FLAX', price: 18000 },
      { name: 'Pumpkin Seeds', desc: 'Pumpkin Seeds (कद्दू के बीज)', sku: 'GR-SD-PUMPKIN', price: 32000 }
    ];

    for (const p of seedsItems) {
      await client.query(
        'INSERT INTO products (id, category_id, name, slug, sku, description, base_price, unit, gst_rate, stock_qty, low_stock_threshold, status, is_deleted) VALUES ($1, $2, $3, $4, $5, $6, $7, \'kg\', 5, 100, 10, \'ACTIVE\', false)',
        [crypto.randomUUID(), seedsId, p.name, generateUniqueSlug(p.name), p.sku, p.desc, p.price]
      );
    }

    console.log('SECOND BATCH OF PRODUCTS SEEDED SUCCESSFULLY!');

  } catch (error) {
    console.error('Error inserting second batch:', error);
  } finally {
    await client.end();
  }
}

insertData2();
