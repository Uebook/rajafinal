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

const categoryImages = {
  'Grocery': 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500',
  'Dairy Product': 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=500',
  'Oil & Ghee': 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500',
  'Dry fruits': 'https://images.unsplash.com/photo-1596547609652-9cf5d8d76921?w=500',
  'Whole Spices & other Grocery Item': 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=500',
  'Seeds': 'https://images.unsplash.com/photo-1608686207856-001b95cf60ca?w=500',
  'Herbs & Ayurvedic': 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=500',
  'Worship Item': 'https://images.unsplash.com/photo-1609137144814-722fb5af3477?w=500',
  'Electronic': 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=500',
  'Mobile & Accessories': 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500',
  'Computer Accessories': 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=500',
  'Home Electronic': 'https://images.unsplash.com/photo-1585338107529-13afc5f02586?w=500',
  'Clothes': 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=500',
  'Men': 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=500',
  'Women': 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=500',
  'Children': 'https://images.unsplash.com/photo-1503919545889-aef636e10ad4?w=500'
};

const keywordProductImages = [
  { keyword: 'almond', url: 'https://images.unsplash.com/photo-1508061253366-f7da158b6d96?w=400' },
  { keyword: 'cashew', url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400' },
  { keyword: 'raisin', url: 'https://images.unsplash.com/photo-1536622432307-207012777b09?w=400' },
  { keyword: 'apricot', url: 'https://images.unsplash.com/photo-1501746877-14782df589a0?w=400' },
  { keyword: 'date', url: 'https://images.unsplash.com/photo-1569870499705-504209102861?w=400' },
  { keyword: 'walnut', url: 'https://images.unsplash.com/photo-1543362906-acfc16c67564?w=400' },
  { keyword: 'pistachio', url: 'https://images.unsplash.com/photo-1555529733-0e670560f7e1?w=400' },
  { keyword: 'cherry', url: 'https://images.unsplash.com/photo-1528826722302-d374329d3118?w=400' },
  { keyword: 'fox', url: 'https://images.unsplash.com/photo-1589881133595-a3c085cb1493?w=400' },
  { keyword: 'cardamom', url: 'https://images.unsplash.com/photo-1599940824399-b87987ceb72a?w=400' },
  { keyword: 'pepper', url: 'https://images.unsplash.com/photo-1608797178974-15b35a61d121?w=400' },
  { keyword: 'clove', url: 'https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?w=400' },
  { keyword: 'cinnamon', url: 'https://images.unsplash.com/photo-1509358271058-acd22cc93898?w=400' },
  { keyword: 'cumin', url: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=400' },
  { keyword: 'chilli', url: 'https://images.unsplash.com/photo-1588252303782-cb80119abd6d?w=400' },
  { keyword: 'ginger', url: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=400' },
  { keyword: 'turmeric', url: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=400' },
  { keyword: 'refined', url: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400' },
  { keyword: 'ghee', url: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400' },
  { keyword: 'cream', url: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400' },
  { keyword: 'butter', url: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400' },
  { keyword: 'curd', url: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400' },
  { keyword: 'corn', url: 'https://images.unsplash.com/photo-1551754655-cd27e38d20f6?w=400' },
  { keyword: 'paneer', url: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400' },
  { keyword: 'peas', url: 'https://images.unsplash.com/photo-1587570252623-0d33e531872f?w=400' },
  { keyword: 'charger', url: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=400' },
  { keyword: 'earphone', url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400' },
  { keyword: 'watch', url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400' },
  { keyword: 'powerbank', url: 'https://images.unsplash.com/photo-1609081219090-a6d81d3085bf?w=400' },
  { keyword: 'keyboard', url: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400' },
  { keyword: 'mouse', url: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=400' },
  { keyword: 'ssd', url: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400' },
  { keyword: 'seeds', url: 'https://images.unsplash.com/photo-1608686207856-001b95cf60ca?w=400' },
  { keyword: 'amla', url: 'https://images.unsplash.com/photo-1609137144814-722fb5af3477?w=400' }
];

async function addImages() {
  const client = new pg.Client(clientConfig);
  try {
    await client.connect();
    console.log('Connected to Render database.');

    // 1. Update Category Images
    console.log('Updating category images...');
    for (const [name, url] of Object.entries(categoryImages)) {
      await client.query(
        'UPDATE categories SET image_url = $1, updated_at = NOW() WHERE name = $2',
        [url, name]
      );
    }
    console.log('Successfully updated category images.');

    // 2. Clear old product images
    console.log('Clearing old product images...');
    await client.query('TRUNCATE TABLE product_images;');

    // 3. Select all active products
    const { rows: products } = await client.query('SELECT id, name FROM products WHERE is_deleted = false');

    console.log(`Found ${products.length} products. Inserting matching Unsplash image URLs...`);

    let insertedCount = 0;
    for (const p of products) {
      const lowerName = p.name.toLowerCase();
      // Find matching keyword image URL
      let match = keywordProductImages.find(k => lowerName.includes(k.keyword));
      let imageUrl = match ? match.url : 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=400'; // fallback grocery cart

      const id = crypto.randomUUID();
      await client.query(
        'INSERT INTO product_images (id, product_id, image_url, sort_order, created_at, updated_at, is_deleted) VALUES ($1, $2, $3, 0, NOW(), NOW(), false)',
        [id, p.id, imageUrl]
      );
      insertedCount++;
    }

    console.log(`Successfully mapped and inserted ${insertedCount} product image relationships!`);

  } catch (error) {
    console.error('Error adding images:', error);
  } finally {
    await client.end();
  }
}

addImages();
