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

async function insertData() {
  const client = new pg.Client(clientConfig);
  try {
    await client.connect();
    console.log('Connected to Render database.');

    // Ensure we start with clean tables (truncate cascade)
    console.log('Clearing old categories and products...');
    await client.query('TRUNCATE TABLE categories, products CASCADE;');

    // 1. Insert Main Categories (Depth 0)
    console.log('Inserting main categories...');
    
    const mainCategories = [
      { id: crypto.randomUUID(), name: 'Grocery', slug: generateUniqueSlug('Grocery'), depth: 0 },
      { id: crypto.randomUUID(), name: 'Electronic', slug: generateUniqueSlug('Electronic'), depth: 0 },
      { id: crypto.randomUUID(), name: 'Clothes', slug: generateUniqueSlug('Clothes'), depth: 0 }
    ];

    for (const mc of mainCategories) {
      await client.query(
        'INSERT INTO categories (id, name, slug, depth, visible_to_vendor, visible_to_retailer, is_active, is_deleted) VALUES ($1, $2, $3, $4, true, true, true, false)',
        [mc.id, mc.name, mc.slug, mc.depth]
      );
    }

    const groceryId = mainCategories.find(c => c.name === 'Grocery').id;
    const electronicId = mainCategories.find(c => c.name === 'Electronic').id;
    const clothesId = mainCategories.find(c => c.name === 'Clothes').id;

    // 2. Insert Sub Categories (Depth 1)
    console.log('Inserting sub categories...');
    const subCategories = [
      // Grocery subcategories
      { id: crypto.randomUUID(), parentId: groceryId, name: 'Dairy Product', slug: generateUniqueSlug('Dairy Product'), depth: 1 },
      { id: crypto.randomUUID(), parentId: groceryId, name: 'Oil & Ghee', slug: generateUniqueSlug('Oil & Ghee'), depth: 1 },
      { id: crypto.randomUUID(), parentId: groceryId, name: 'Dry fruits', slug: generateUniqueSlug('Dry fruits'), depth: 1 },
      { id: crypto.randomUUID(), parentId: groceryId, name: 'Whole Spices & other Grocery Item', slug: generateUniqueSlug('Whole Spices & other Grocery Item'), depth: 1 },
      { id: crypto.randomUUID(), parentId: groceryId, name: 'Seeds', slug: generateUniqueSlug('Seeds'), depth: 1 },
      { id: crypto.randomUUID(), parentId: groceryId, name: 'Herbs & Ayurvedic', slug: generateUniqueSlug('Herbs & Ayurvedic'), depth: 1 },
      { id: crypto.randomUUID(), parentId: groceryId, name: 'Worship Item', slug: generateUniqueSlug('Worship Item'), depth: 1 },

      // Electronic subcategories
      { id: crypto.randomUUID(), parentId: electronicId, name: 'Mobile & Accessories', slug: generateUniqueSlug('Mobile & Accessories'), depth: 1 },
      { id: crypto.randomUUID(), parentId: electronicId, name: 'Computer Accessories', slug: generateUniqueSlug('Computer Accessories'), depth: 1 },
      { id: crypto.randomUUID(), parentId: electronicId, name: 'Home Electronic', slug: generateUniqueSlug('Home Electronic'), depth: 1 },

      // Clothes subcategories
      { id: crypto.randomUUID(), parentId: clothesId, name: 'Men', slug: generateUniqueSlug('Men'), depth: 1 },
      { id: crypto.randomUUID(), parentId: clothesId, name: 'Women', slug: generateUniqueSlug('Women'), depth: 1 },
      { id: crypto.randomUUID(), parentId: clothesId, name: 'Children', slug: generateUniqueSlug('Children'), depth: 1 }
    ];

    for (const sc of subCategories) {
      await client.query(
        'INSERT INTO categories (id, parent_id, name, slug, depth, visible_to_vendor, visible_to_retailer, is_active, is_deleted) VALUES ($1, $2, $3, $4, $5, true, true, true, false)',
        [sc.id, sc.parentId, sc.name, sc.slug, sc.depth]
      );
    }

    const dryFruitsId = subCategories.find(s => s.name === 'Dry fruits').id;
    const wholeSpicesId = subCategories.find(s => s.name === 'Whole Spices & other Grocery Item').id;
    const dairyId = subCategories.find(s => s.name === 'Dairy Product').id;
    const oilGheeId = subCategories.find(s => s.name === 'Oil & Ghee').id;
    const seedsId = subCategories.find(s => s.name === 'Seeds').id;
    const herbsId = subCategories.find(s => s.name === 'Herbs & Ayurvedic').id;
    const worshipId = subCategories.find(s => s.name === 'Worship Item').id;

    const mobileAccId = subCategories.find(s => s.name === 'Mobile & Accessories').id;
    const computerAccId = subCategories.find(s => s.name === 'Computer Accessories').id;
    const homeElecId = subCategories.find(s => s.name === 'Home Electronic').id;

    // 3. Insert Dry Fruits
    console.log('Inserting dry fruits products...');
    const dryFruits = [
      { name: 'Dry Apricot', desc: 'Dry Apricot (खुसानी)', sku: 'GR-DF-APRICOT', price: 65000 },
      { name: 'Dry Dates Yellow', desc: 'Dry Dates Yellow (छुहारा पीला)', sku: 'GR-DF-DATE-YEL', price: 28000 },
      { name: 'Dry Date Black', desc: 'Dry Date Black (छुहारा काला)', sku: 'GR-DF-DATE-BLK', price: 32000 },
      { name: 'Dates', desc: 'Dates (खजूर)', sku: 'GR-DF-DATES', price: 35000 },
      { name: 'Raisins', desc: 'Raisins (किमिस - किशमिश)', sku: 'GR-DF-RAISIN', price: 29000 },
      { name: 'Black Raisins', desc: 'Black Raisins (मुनक्का)', sku: 'GR-DF-RAISIN-BLK', price: 42000 },
      { name: 'Almonds fresh', desc: 'Almonds fresh (बादाम फ्रेश)', sku: 'GR-DF-ALMOND-FRESH', price: 85000 },
      { name: 'Almond Indi', desc: 'Almond Indi (बादाम इण्डी)', sku: 'GR-DF-ALMOND-INDI', price: 78000 },
      { name: 'Grated dry Coconut', desc: 'Grated dry Coconut (गरी लच्छा)', sku: 'GR-DF-COCO-GRATED', price: 24000 },
      { name: 'Coconut Powder', desc: 'Coconut Powder (गरी बुरादा)', sku: 'GR-DF-COCO-POWDER', price: 22000 },
      { name: 'Fox Nuts 250g', desc: 'Fox Nuts 250g (मखाना 250 ग्राम)', sku: 'GR-DF-FOXNUT-250G', price: 25000, unit: 'piece' },
      { name: 'Fox Nuts 100g', desc: 'Fox Nuts 100g (मखाना 100 ग्राम)', sku: 'GR-DF-FOXNUT-100G', price: 11000, unit: 'piece' },
      { name: 'Cashew nut 2pcs', desc: 'Cashew nut 2pcs (काजू 2 टुकड़ा)', sku: 'GR-DF-CASHEW-2PC', price: 72000 },
      { name: 'Cashew nut 3pcs', desc: 'Cashew nut 3pcs (काजू 3 टुकड़ा)', sku: 'GR-DF-CASHEW-3PC', price: 68000 },
      { name: 'Cashew 320 Lot', desc: 'Cashew 320 Lot (काजू 320 लाट)', sku: 'GR-DF-CASHEW-320', price: 82000 },
      { name: 'Cashew 210 Lot', desc: 'Cashew 210 Lot (काजू 210 बार)', sku: 'GR-DF-CASHEW-210', price: 98000 },
      { name: 'Cashew 180 Lot', desc: 'Cashew 180 Lot (काजू 180 लाट)', sku: 'GR-DF-CASHEW-180', price: 115000 },
      { name: 'Minced Cashew', desc: 'Minced Cashew (काजू नोका)', sku: 'GR-DF-CASHEW-MINCED', price: 58000 },
      { name: 'Trail Mix', desc: 'Trail Mix (सूखे मेवे)', sku: 'GR-DF-TRAIL-MIX', price: 95000 },
      { name: 'Whole walnut', desc: 'Whole walnut (अखरोट साबुत)', sku: 'GR-DF-WALNUT-WHOLE', price: 65000 },
      { name: 'Walnut kernels', desc: 'Walnut kernels (अखरोट गिरी)', sku: 'GR-DF-WALNUT-KERN', price: 95000 },
      { name: 'Pistachio', desc: 'Pistachio (पिस्ता)', sku: 'GR-DF-PISTACHIO', price: 98000 },
      { name: 'Green Pistachio', desc: 'Green Pistachio (हरा पिस्ता)', sku: 'GR-DF-PISTACHIO-GRN', price: 125000 },
      { name: 'Tutti frutti', desc: 'Tutti frutti (टूटी फूटी)', sku: 'GR-DF-TUTTI-FRUTTI', price: 18000 },
      { name: 'Dry Cherry', desc: 'Dry Cherry', sku: 'GR-DF-CHERRY', price: 45000 }
    ];

    for (const p of dryFruits) {
      await client.query(
        'INSERT INTO products (id, category_id, name, slug, sku, description, base_price, unit, gst_rate, stock_qty, low_stock_threshold, status, is_deleted) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 12, 100, 10, \'ACTIVE\', false)',
        [crypto.randomUUID(), dryFruitsId, p.name, generateUniqueSlug(p.name), p.sku, p.desc, p.price, p.unit || 'kg']
      );
    }

    // 4. Insert Whole Spices
    console.log('Inserting whole spices products...');
    const wholeSpices = [
      { name: 'Carom Seeds', desc: 'Carom Seeds (अजवाइन)', sku: 'GR-SP-CAROM', price: 32000 },
      { name: 'Black Cardamom', desc: 'Black Cardamom (بड़ी इलायची)', sku: 'GR-SP-CARD-BLK', price: 125000 },
      { name: 'Star Anise', desc: 'Star Anise (चक्रफूल)', sku: 'GR-SP-STAR-ANISE', price: 85000 },
      { name: 'Coriander Seeds', desc: 'Coriander Seeds (धनिया खड़ी)', sku: 'GR-SP-CORIANDER-SEED', price: 22000 },
      { name: 'Turmeric Fingers', desc: 'Turmeric Fingers (हल्दी खड़ी)', sku: 'GR-SP-TURMERIC-FING', price: 24000 },
      { name: 'Mace', desc: 'Mace (जावित्री)', sku: 'GR-SP-MACE', price: 165000 },
      { name: 'Nutmeg', desc: 'Nutmeg (जायफल)', sku: 'GR-SP-NUTMEG', price: 95000 },
      { name: 'Cumin Seeds Kesari', desc: 'Cumin Seeds (जीरा केसरी)', sku: 'GR-SP-CUMIN-KESARI', price: 55000 },
      { name: 'Cumin Seeds Kohinoor', desc: 'Cumin Seeds (जीरा कोहिनूर)', sku: 'GR-SP-CUMIN-KOHINOOR', price: 65000 },
      { name: 'Cubeb Pepper', desc: 'Cubeb Pepper (कबाब चीनी)', sku: 'GR-SP-CUBEB-PEPPER', price: 145000 },
      { name: 'Black Pepper', desc: 'Black Pepper (काली मिर्च)', sku: 'GR-SP-BLACK-PEPPER', price: 68000 },
      { name: 'Nigella Seeds', desc: 'Nigella Seeds (कलौंजी - मंगरैल)', sku: 'GR-SP-NIGELLA', price: 35000 },
      { name: 'Dried Fenugreek', desc: 'Dried Fenugreek (कसूरी मेथी)', sku: 'GR-SP-FENUGREEK-DRY', price: 22000 },
      { name: 'Red Chilli', desc: 'Red Chilli (लाल मिर्च)', sku: 'GR-SP-RED-CHILLI', price: 29000 },
      { name: 'Cloves', desc: 'Cloves (लौंग)', sku: 'GR-SP-CLOVES', price: 95000 },
      { name: 'Fenugreek Seeds', desc: 'Fenugreek Seeds (मेथी दाना)', sku: 'GR-SP-FENUGREEK-SEED', price: 15000 },
      { name: 'White Pepper', desc: 'White Pepper (सफेद मिर्च)', sku: 'GR-SP-WHITE-PEPPER', price: 85000 },
      { name: 'Shatavari', desc: 'Shatavari (शतावर)', sku: 'GR-SP-SHATAVARI', price: 110000 },
      { name: 'Betel Nut Jam', desc: 'Betel Nut (सुपारी जाम)', sku: 'GR-SP-BETEL-JAM', price: 48000 },
      { name: 'Betel Nut Jeeni', desc: 'Betel Nut (सुपारी जीनी)', sku: 'GR-SP-BETEL-JEENI', price: 54000 },
      { name: 'Edible Gond', desc: 'Edible Gond (गोंद)', sku: 'GR-SP-EDIBLE-GOND', price: 32000 },
      { name: 'Dried Gond', desc: 'Dried Gond (गोंद कतली)', sku: 'GR-SP-DRIED-GOND', price: 36000 },
      { name: 'Tapioca Pearls', desc: 'Tapioca Pearls (साबूदाना)', sku: 'GR-SP-TAPIOCA', price: 9000 },
      { name: 'White Turmeric', desc: 'White Turmeric (हल्दी आमा)', sku: 'GR-SP-WHITE-TURM', price: 32000 },
      { name: 'Garden Cress Seeds', desc: 'Garden Cress Seeds (चामसूर)', sku: 'GR-SP-GARDEN-CRESS', price: 25000 },
      { name: 'Green Cardamom', desc: 'Green Cardamom (इलायची छोटी)', sku: 'GR-SP-CARD-GRN', price: 145000 },
      { name: 'Poppy Seeds', desc: 'Poppy Seeds (खसखस)', sku: 'GR-SP-POPPY', price: 125000 },
      { name: 'Cinnamon', desc: 'Cinnamon (दालचीनी)', sku: 'GR-SP-CINNAMON', price: 42000 },
      { name: 'Salt', desc: 'Salt (नमक)', sku: 'GR-SP-SALT', price: 2000 },
      { name: 'Poppy Seeds Posta', desc: 'Poppy Seeds (पोस्ता दाना)', sku: 'GR-SP-POPPY-POSTA', price: 135000 },
      { name: 'Licorice', desc: 'Licorice (मुलेठी)', sku: 'GR-SP-LICORICE', price: 55000 },
      { name: 'Asafoetida 20g', desc: 'Asafoetida 20g (हींग 20g)', sku: 'GR-SP-ASAFOETIDA-20G', price: 4500, unit: 'piece' },
      { name: 'Asafoetida 50g', desc: 'Asafoetida 50g (हींग 50g)', sku: 'GR-SP-ASAFOETIDA-50G', price: 9800, unit: 'piece' },
      { name: 'Asafoetida 100g', desc: 'Asafoetida 100g (हींग 100g)', sku: 'GR-SP-ASAFOETIDA-100G', price: 18500, unit: 'piece' },
      { name: 'White Sesame Seeds', desc: 'White Sesame Seeds (सफेद तिल)', sku: 'GR-SP-SESAME-WHT', price: 24000 },
      { name: 'Kashmiri Red Chilli', desc: 'Kashmiri Red Chilli (कश्मीरी लाल मिर्च)', sku: 'GR-SP-KASHMIRI-CHILLI', price: 48000 },
      { name: 'Tamarind', desc: 'Tamarind (इमली)', sku: 'GR-SP-TAMARIND', price: 14000 },
      { name: 'Rock Salt', desc: 'Rock Salt (सेंधा नमक)', sku: 'GR-SP-ROCKSALT', price: 4000 },
      { name: 'Vanilla Essence', desc: 'Vanilla Essence (वेनिला एसेंस)', sku: 'GR-SP-VANILLA-ESS', price: 8500, unit: 'piece' },
      { name: 'Baking Powder', desc: 'Baking Powder (बेकिंग पाउडर)', sku: 'GR-SP-BAKING-POWDER', price: 7500, unit: 'piece' },
      { name: 'Baking Soda', desc: 'Baking Soda (बेकिंग सोडा)', sku: 'GR-SP-BAKING-SODA', price: 4500, unit: 'piece' },
      { name: 'Cocoa Powder', desc: 'Cocoa Powder (कोको पाउडर)', sku: 'GR-SP-COCOA', price: 25000 },
      { name: 'Chirayta', desc: 'Chirayta (चिरायता)', sku: 'GR-SP-CHIRAYTA', price: 65000 },
      { name: 'Camphor', desc: 'Camphor (कपूर)', sku: 'GR-SP-CAMPHOR', price: 65000 },
      { name: 'Caraway Seeds', desc: 'Caraway Seeds (शाही जीरा)', sku: 'GR-SP-CARAWAY', price: 45000 },
      { name: 'Black Sesame Seeds', desc: 'Black Sesame Seeds (काला तिल)', sku: 'GR-SP-SESAME-BLK', price: 26000 },
      { name: 'Frankincense', desc: 'Frankincense (लोबान)', sku: 'GR-SP-FRANKINCENSE', price: 32000 },
      { name: 'Alum', desc: 'Alum (फिटकरी)', sku: 'GR-SP-ALUM', price: 8000 },
      { name: 'Rock sugar', desc: 'Rock sugar (मिश्री)', sku: 'GR-SP-ROCKSUGAR', price: 8500 },
      { name: 'Thread Sugar', desc: 'Thread Sugar (मिश्री धागा)', sku: 'GR-SP-THREADSUGAR', price: 11000 },
      { name: 'Fennel Seeds Gold', desc: 'Fennel Seeds (सौंफ गोल्ड)', sku: 'GR-SP-FENNEL-GOLD', price: 24000 },
      { name: 'Fennel Seeds Tulsi', desc: 'Fennel Seeds (सौंफ तुलसी)', sku: 'GR-SP-FENNEL-TULSI', price: 28000 },
      { name: 'Bay Leaf', desc: 'Bay Leaf (तेज पत्ता)', sku: 'GR-SP-BAY-LEAF', price: 18000 },
      { name: 'Dry Ginger', desc: 'Dry Ginger (सोंठ)', sku: 'GR-SP-DRY-GINGER', price: 38000 },
      { name: 'Asafoetida 5g', desc: 'Asafoetida 5g (हींग 5g)', sku: 'GR-SP-ASAFOETIDA-5G', price: 1500, unit: 'piece' },
      { name: 'Almondette', desc: 'Almondette (चिरौंजी)', sku: 'GR-SP-ALMONDETTE', price: 95000 },
      { name: 'Peanuts', desc: 'Peanuts (मूंगफली)', sku: 'GR-SP-PEANUTS', price: 16000 },
      { name: 'Arshi', desc: 'Arshi (अरशी)', sku: 'GR-SP-ARSHI', price: 75000 }
    ];

    for (const p of wholeSpices) {
      await client.query(
        'INSERT INTO products (id, category_id, name, slug, sku, description, base_price, unit, gst_rate, stock_qty, low_stock_threshold, status, is_deleted) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 5, 150, 10, \'ACTIVE\', false)',
        [crypto.randomUUID(), wholeSpicesId, p.name, generateUniqueSlug(p.name), p.sku, p.desc, p.price, p.unit || 'kg']
      );
    }

    // 5. Insert Placeholders for basic items
    console.log('Inserting other subcategory placeholder products...');
    
    // Mobile Acc items
    const mobileItems = [
      { name: 'Charger 18W Fast', sku: 'EL-MB-CHARGER', price: 45000 },
      { name: 'Wired Earphones Pro', sku: 'EL-MB-EARPHONE', price: 29900 },
      { name: 'Smart Watch Series 5', sku: 'EL-MB-SMARTWATCH', price: 199900 },
      { name: 'Power Bank 20000mAh', sku: 'EL-MB-POWERBANK', price: 99900 }
    ];
    for (const p of mobileItems) {
      await client.query(
        'INSERT INTO products (id, category_id, name, slug, sku, description, base_price, unit, gst_rate, stock_qty, low_stock_threshold, status, is_deleted) VALUES ($1, $2, $3, $4, $5, $6, $7, \'piece\', 18, 50, 5, \'ACTIVE\', false)',
        [crypto.randomUUID(), mobileAccId, p.name, generateUniqueSlug(p.name), p.sku, p.name, p.price]
      );
    }

    // Computer Acc items
    const computerItems = [
      { name: 'Mechanical Keyboard K2', sku: 'EL-CP-KEYBOARD', price: 749900 },
      { name: 'Wireless Mouse MX Master', sku: 'EL-CP-MOUSE', price: 899900 },
      { name: 'Portable SSD 1TB', sku: 'EL-CP-SSD', price: 650000 }
    ];
    for (const p of computerItems) {
      await client.query(
        'INSERT INTO products (id, category_id, name, slug, sku, description, base_price, unit, gst_rate, stock_qty, low_stock_threshold, status, is_deleted) VALUES ($1, $2, $3, $4, $5, $6, $7, \'piece\', 18, 30, 3, \'ACTIVE\', false)',
        [crypto.randomUUID(), computerAccId, p.name, generateUniqueSlug(p.name), p.sku, p.name, p.price]
      );
    }

    console.log('ALL CATEGORIES AND PRODUCTS INSERTED SUCCESSFULLY!');

  } catch (error) {
    console.error('Error inserting data:', error);
  } finally {
    await client.end();
  }
}

insertData();
