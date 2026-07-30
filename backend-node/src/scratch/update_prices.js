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
  // Seeds
  'GR-SD-WATERMELON': 57500,
  'GR-SD-SUNFLOWER': 19000,
  'GR-SD-CHIA': 44000,
  'GR-SD-FLAX': 13700,
  'GR-SD-PUMPKIN': 64800,

  // Oil & Ghee
  'GR-OG-REFINED-500ML': 176600,
  'GR-OG-REFINED-1LTR': 173600,
  'GR-OG-REFINED-2LTR': 178400,
  'GR-OG-REFINED-5LTR': 300600,
  'GR-OG-REFINED-15TIN': 223100,
  'GR-OG-REFINED-15JAR': 224600,
  'GR-OG-KACHI-500ML': 190000,
  'GR-OG-KACHI-1LTR': 186400,
  'GR-OG-KACHI-2LTR': 186400,
  'GR-OG-KACHI-5LTR': 155400,
  'GR-OG-KACHI-15LTR': 240300,

  // Spices
  'GR-SP-CAROM': 15500,
  'GR-SP-CARD-BLK': 174000,
  'GR-SP-STAR-ANISE': 41300,
  'GR-SP-CORIANDER-SEED': 19000,
  'GR-SP-TURMERIC-FING': 20600,
  'GR-SP-MACE': 203000,
  'GR-SP-NUTMEG': 86000,
  'GR-SP-CUMIN-KESARI': 27600,
  'GR-SP-CUMIN-KOHINOOR': 25900,
  'GR-SP-CUBEB-PEPPER': 110000,
  'GR-SP-BLACK-PEPPER': 82200,
  'GR-SP-NIGELLA': 23400,
  'GR-SP-FENUGREEK-DRY': 2900,
  'GR-SP-RED-CHILLI': 24400,
  'GR-SP-CLOVES': 91100,
  'GR-SP-FENUGREEK-SEED': 9100,
  'GR-SP-WHITE-PEPPER': 117500,
  'GR-SP-SHATAVARI': 96500,
  'GR-SP-BETEL-JAM': 58300,
  'GR-SP-BETEL-JEENI': 57300,
  'GR-SP-EDIBLE-GOND': 20700,
  'GR-SP-DRIED-GOND': 31500,
  'GR-SP-TAPIOCA': 7900,
  'GR-SP-WHITE-TURM': 25000,
  'GR-SP-GARDEN-CRESS': 10300,
  'GR-SP-CARD-GRN': 320000,
  'GR-SP-POPPY': 134100,
  'GR-SP-CINNAMON': 28900,
  'GR-SP-POPPY-POSTA': 134100,
  'GR-SP-LICORICE': 24500,
  'GR-SP-ASAFOETIDA-20G': 23400,
  'GR-SP-ASAFOETIDA-50G': 29600,
  'GR-SP-ASAFOETIDA-100G': 58200,
  'GR-SP-SESAME-WHT': 15400,
  'GR-SP-KASHMIRI-CHILLI': 6600,
  'GR-SP-TAMARIND': 6200,
  'GR-SP-VANILLA-ESS': 13700,
  'GR-SP-BAKING-POWDER': 7800,
  'GR-SP-BAKING-SODA': 4600,
  'GR-SP-CHIRAYTA': 19000,
  'GR-SP-CAMPHOR': 54000,
  'GR-SP-SESAME-BLK': 25500,
  'GR-SP-FRANKINCENSE': 16000,
  'GR-SP-ALUM': 4000,
  'GR-SP-ROCKSUGAR': 6600,
  'GR-SP-THREADSUGAR': 10000,
  'GR-SP-FENNEL-GOLD': 16000,
  'GR-SP-FENNEL-TULSI': 13800,
  'GR-SP-BAY-LEAF': 9800,
  'GR-SP-DRY-GINGER': 36000,
  'GR-SP-ASAFOETIDA-5G': 6000,
  'GR-SP-ALMONDETTE': 150000,
  'GR-SP-PEANUTS': 13600,
  'GR-SP-ARSHI': 13700,

  // Dry Fruits
  'GR-DF-APRICOT': 29000,
  'GR-DF-DATE-YEL': 14000,
  'GR-DF-DATE-BLK': 14000,
  'GR-DF-DATES': 35000,
  'GR-DF-RAISIN': 41500,
  'GR-DF-RAISIN-BLK': 46000,
  'GR-DF-ALMOND-FRESH': 90500,
  'GR-DF-ALMOND-INDI': 86000,
  'GR-DF-COCO-GRATED': 23000,
  'GR-DF-COCO-POWDER': 26500,
  'GR-DF-FOXNUT-250G': 79500,
  'GR-DF-FOXNUT-100G': 92000,
  'GR-DF-CASHEW-3PC': 82200,
  'GR-DF-CASHEW-320': 84800,
  'GR-DF-CASHEW-180': 97000,
  'GR-DF-CASHEW-MINCED': 62000,
  'GR-DF-TRAIL-MIX': 66000,
  'GR-DF-WALNUT-WHOLE': 77000,
  'GR-DF-WALNUT-KERN': 60000,
  'GR-DF-PISTACHIO': 117300,
  'GR-DF-PISTACHIO-GRN': 318500,

  // Dairy Product
  'GR-DP-CREAM-FRESH': 13000,
  'GR-DP-BUTTER': 13000,
  'GR-DP-CURD': 33200,
  'GR-DP-SOYACHAP': 12000,
  'GR-DP-PANEER': 22700,
  'GR-DP-PEAS-GREEN': 26000,
};

async function updatePrices() {
  const client = new pg.Client(clientConfig);
  try {
    await client.connect();
    console.log('Connected to Render database.');

    console.log('Updating catalog product prices...');
    
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

    console.log(`Successfully updated ${updatedCount} product prices in database!`);

  } catch (error) {
    console.error('Error updating prices:', error);
  } finally {
    await client.end();
  }
}

updatePrices();
