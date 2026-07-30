/**
 * Seed Script — Supply Setu Platform
 * Populates: categories, products, users (vendor + retailers),
 *            vendors, retailers, orders, order_items, ledger_entries
 *
 * Run: npx tsx src/seed.ts
 */

import 'dotenv/config';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { db } from './db/index.js';
import {
  categories, products, users, vendors, retailers,
  orders, orderItems, ledgerEntries, discountCodes
} from './db/schema.js';
import { eq } from 'drizzle-orm';

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────
const uid = () => crypto.randomUUID();
const hashPwd = (p: string) => bcrypt.hashSync(p, 10);
const now = new Date();
const daysAgo = (d: number) => new Date(now.getTime() - d * 86400_000);

const INR = (rupees: number) => Math.round(rupees * 100); // paise

console.log('🌱 Starting seed...\n');

// ──────────────────────────────────────────────
// 1. CATEGORIES
// ──────────────────────────────────────────────
const CAT_IDS = {
  // Original categories (which now become subcategories)
  cleaning: uid(),
  homecare: uid(),
  personal: uid(),
  food: uid(),
  stationary: uid(),

  // New parent categories
  grocery: uid(),
  electronics: uid(),
  clothingFashion: uid(),

  // New subcategories of Grocery
  dairyProduct: uid(),
  oilGhee: uid(),
  dryFruits: uid(),
  wholeSpices: uid(),
  seeds: uid(),
  herbAyurvedic: uid(),
  worshipItem: uid(),

  // New subcategories of Electronics
  mobileAccessories: uid(),
  computerAccessories: uid(),
  homeElectronics: uid(),

  // New subcategories of Clothing & Fashion
  men: uid(),
  women: uid(),
  kids: uid(),
  fashionEssential: uid(),
};

const categoryRows = [
  // Parent Categories (depth 0)
  { id: CAT_IDS.grocery, name: 'Grocery', slug: 'grocery', description: 'Grocery and daily essentials', depth: 0, parentId: null, isActive: true, visibleToVendor: true, visibleToRetailer: true, isDeleted: false, createdAt: now, updatedAt: now },
  { id: CAT_IDS.electronics, name: 'Electronics', slug: 'electronics', description: 'Gadgets, appliances, and accessories', depth: 0, parentId: null, isActive: true, visibleToVendor: true, visibleToRetailer: true, isDeleted: false, createdAt: now, updatedAt: now },
  { id: CAT_IDS.clothingFashion, name: 'Clothing & Fashion', slug: 'clothing-fashion', description: 'Apparel, footwear, and essentials', depth: 0, parentId: null, isActive: true, visibleToVendor: true, visibleToRetailer: true, isDeleted: false, createdAt: now, updatedAt: now },

  // Subcategories of Grocery (depth 1)
  { id: CAT_IDS.cleaning, name: 'Cleaning Supplies', slug: 'cleaning-supplies', description: 'Brooms, mops, phenyl, detergents', depth: 1, parentId: CAT_IDS.grocery, isActive: true, visibleToVendor: true, visibleToRetailer: true, isDeleted: false, createdAt: now, updatedAt: now },
  { id: CAT_IDS.homecare, name: 'Home Care', slug: 'home-care', description: 'Home maintenance and care products', depth: 1, parentId: CAT_IDS.grocery, isActive: true, visibleToVendor: true, visibleToRetailer: true, isDeleted: false, createdAt: now, updatedAt: now },
  { id: CAT_IDS.personal, name: 'Personal Care', slug: 'personal-care', description: 'Soaps, shampoos, toothpaste', depth: 1, parentId: CAT_IDS.grocery, isActive: true, visibleToVendor: true, visibleToRetailer: true, isDeleted: false, createdAt: now, updatedAt: now },
  { id: CAT_IDS.food, name: 'Food & Grocery', slug: 'food-grocery', description: 'Packaged foods and grocery items', depth: 1, parentId: CAT_IDS.grocery, isActive: true, visibleToVendor: true, visibleToRetailer: true, isDeleted: false, createdAt: now, updatedAt: now },
  { id: CAT_IDS.dairyProduct, name: 'Dairy Product', slug: 'dairy-product', description: 'Milk, butter, paneer, curd, and peas', depth: 1, parentId: CAT_IDS.grocery, isActive: true, visibleToVendor: true, visibleToRetailer: true, isDeleted: false, createdAt: now, updatedAt: now },
  { id: CAT_IDS.oilGhee, name: 'Oil & Ghee', slug: 'oil-ghee', description: 'Refined oil, mustard oil, ghee', depth: 1, parentId: CAT_IDS.grocery, isActive: true, visibleToVendor: true, visibleToRetailer: true, isDeleted: false, createdAt: now, updatedAt: now },
  { id: CAT_IDS.dryFruits, name: 'Dry Fruits', slug: 'dry-fruits', description: 'Almonds, cashews, raisins, walnuts, pistachios', depth: 1, parentId: CAT_IDS.grocery, isActive: true, visibleToVendor: true, visibleToRetailer: true, isDeleted: false, createdAt: now, updatedAt: now },
  { id: CAT_IDS.wholeSpices, name: 'Whole Spices & other Grocery', slug: 'whole-spices-other-grocery', description: 'Whole spices, salt, Atta, rice, pulses, and hing', depth: 1, parentId: CAT_IDS.grocery, isActive: true, visibleToVendor: true, visibleToRetailer: true, isDeleted: false, createdAt: now, updatedAt: now },
  { id: CAT_IDS.seeds, name: 'Seeds', slug: 'seeds', description: 'Watermelon, sunflower, pumpkin, chia, flax seeds', depth: 1, parentId: CAT_IDS.grocery, isActive: true, visibleToVendor: true, visibleToRetailer: true, isDeleted: false, createdAt: now, updatedAt: now },
  { id: CAT_IDS.herbAyurvedic, name: 'Herb & Ayurvedic', slug: 'herb-ayurvedic', description: 'Amla, shatavari, mulethi, soapnut, ratanjot', depth: 1, parentId: CAT_IDS.grocery, isActive: true, visibleToVendor: true, visibleToRetailer: true, isDeleted: false, createdAt: now, updatedAt: now },
  { id: CAT_IDS.worshipItem, name: 'Worship Item', slug: 'worship-item', description: 'Havan samagri, gangajal, camphor, kamalgatta', depth: 1, parentId: CAT_IDS.grocery, isActive: true, visibleToVendor: true, visibleToRetailer: true, isDeleted: false, createdAt: now, updatedAt: now },

  // Subcategories of Electronics (depth 1)
  { id: CAT_IDS.mobileAccessories, name: 'Mobile & Accessories', slug: 'mobile-accessories', description: 'Smartphones, chargers, powerbanks', depth: 1, parentId: CAT_IDS.electronics, isActive: true, visibleToVendor: true, visibleToRetailer: true, isDeleted: false, createdAt: now, updatedAt: now },
  { id: CAT_IDS.computerAccessories, name: 'Computer Accessories', slug: 'computer-accessories', description: 'Laptops, keyboards, mice, printers', depth: 1, parentId: CAT_IDS.electronics, isActive: true, visibleToVendor: true, visibleToRetailer: true, isDeleted: false, createdAt: now, updatedAt: now },
  { id: CAT_IDS.homeElectronics, name: 'Home Electronics', slug: 'home-electronics', description: 'TVs, ACs, coolers, heaters, fans', depth: 1, parentId: CAT_IDS.electronics, isActive: true, visibleToVendor: true, visibleToRetailer: true, isDeleted: false, createdAt: now, updatedAt: now },

  // Subcategories of Clothing & Fashion (depth 1)
  { id: CAT_IDS.men, name: 'Men', slug: 'men-clothing', description: 'Men\'s shirts, t-shirts, jeans, shoes', depth: 1, parentId: CAT_IDS.clothingFashion, isActive: true, visibleToVendor: true, visibleToRetailer: true, isDeleted: false, createdAt: now, updatedAt: now },
  { id: CAT_IDS.women, name: 'Women', slug: 'women-clothing', description: 'Women\'s sarees, suits, dresses, footwear', depth: 1, parentId: CAT_IDS.clothingFashion, isActive: true, visibleToVendor: true, visibleToRetailer: true, isDeleted: false, createdAt: now, updatedAt: now },
  { id: CAT_IDS.kids, name: 'Kids', slug: 'kids-clothing', description: 'Kids casuals, uniforms, frocks', depth: 1, parentId: CAT_IDS.clothingFashion, isActive: true, visibleToVendor: true, visibleToRetailer: true, isDeleted: false, createdAt: now, updatedAt: now },
  { id: CAT_IDS.fashionEssential, name: 'Fashion Essential', slug: 'fashion-essential', description: 'Watches, belts, sunglasses, bags', depth: 1, parentId: CAT_IDS.clothingFashion, isActive: true, visibleToVendor: true, visibleToRetailer: true, isDeleted: false, createdAt: now, updatedAt: now },

  // Stationery (standalone / depth 0)
  { id: CAT_IDS.stationary, name: 'Stationery', slug: 'stationery', description: 'Paper, pens, notebooks', depth: 0, parentId: null, isActive: true, visibleToVendor: true, visibleToRetailer: true, isDeleted: false, createdAt: now, updatedAt: now },
];

// ──────────────────────────────────────────────
// 2. PRODUCTS
// ──────────────────────────────────────────────
const PROD_IDS = {
  p1: uid(), p2: uid(), p3: uid(), p4: uid(), p5: uid(),
  p6: uid(), p7: uid(), p8: uid(), p9: uid(), p10: uid(),
  p11: uid(), p12: uid(),

  // Dairy Product
  amulMilk: uid(), amulButter: uid(), amulPaneer: uid(), gowardhanGhee: uid(),
  freshCream: uid(), butterMKKN: uid(), freshCurd: uid(), sweetCorn: uid(),
  soyaChaap: uid(), paneerFresh: uid(), greenPeas: uid(),

  // Oil & Ghee
  refined500: uid(), refined1L: uid(), refined2L: uid(), refined5L: uid(), refined15T: uid(), refined15J: uid(),
  kachi500: uid(), kachi1L: uid(), kachi2L: uid(), kachi5L: uid(), kachi15T: uid(),
  desi250: uid(), desi500: uid(), desi1L: uid(), dalda: uid(),

  // Dry Fruits
  aprt: uid(), ddateY: uid(), ddateB: uid(), date: uid(), rsn: uid(), brsn: uid(),
  almdF: uid(), almdI: uid(), cocoL: uid(), cocoB: uid(), fox250: uid(), fox100: uid(),
  cshw3: uid(), cshw320: uid(), cshw180: uid(), cshwMin: uid(), trail: uid(), wlntW: uid(),
  wlntK: uid(), pst: uid(), gpst: uid(),

  // Whole Spices
  carom: uid(), bcard: uid(), stara: uid(), cori: uid(), turm: uid(), mace: uid(),
  nutm: uid(), jeeraC: uid(), jeeraK: uid(), kcubeb: uid(), bpep: uid(), nig: uid(),
  kmethi: uid(), rchil: uid(), clov: uid(), methid: uid(), wmirch: uid(), shatav: uid(),
  supjam: uid(), supjee: uid(), gonded: uid(), gondkt: uid(), sabu: uid(), turmam: uid(),
  chamsur: uid(), gcard: uid(), bcardb: uid(), cin: uid(), dhsab: uid(), salt: uid(),
  posta: uid(), mul: uid(), hing20: uid(), hing50: uid(), hing100: uid(), hing5: uid(),
  tilsf: uid(), kchiliP: uid(), tam: uid(), rsalt: uid(), vanil: uid(), bpow: uid(),
  bsoda: uid(), tilkl: uid(), loban: uid(), fitkari: uid(), mishri: uid(), mishrid: uid(),
  saunfg: uid(), saunft: uid(), bay: uid(), ging: uid(), chirnj: uid(), peanut: uid(),
  arshi: uid(), atta: uid(), rice: uid(), pulse: uid(),

  // Seeds
  pump: uid(), sun: uid(), chia: uid(), wmelon: uid(), flax: uid(),

  // Herb & Ayurvedic
  sika: uid(), shat: uid(), chir: uid(), amla: uid(), bach: uid(), lico: uid(),
  soap: uid(), alka: uid(), pflr: uid(),

  // Worship Item
  havan: uid(), ganga: uid(), kapoor: uid(), lotus: uid(), hmasala: uid(),

  // Mobile Accessories
  iph15: uid(), chgr: uid(), ear: uid(), watch: uid(), pbank: uid(),

  // Computer Accessories
  lap: uid(), keyb: uid(), mouse: uid(), ssd: uid(), prin: uid(),

  // Home Electronics
  tv: uid(), ac: uid(), frig: uid(), cool: uid(), fan: uid(), heat: uid(), dryer: uid(), trim: uid(),

  // Men
  tshrt: uid(), jean: uid(), shrt: uid(), trous: uid(), ethnic: uid(), foot: uid(),

  // Women
  saree: uid(), kurti: uid(), suit: uid(), dress: uid(), top: uid(), wfoot: uid(),

  // Kids
  boys: uid(), girls: uid(), school: uid(),

  // Fashion Essential
  ewatch: uid(), belt: uid(), bag: uid(), glass: uid(), undr: uid(),
};

const productRows = [
  // Original 12 products
  { id: PROD_IDS.p1, name: 'Jhaadu Classic Broom', slug: 'jhaadu-classic-broom', sku: 'JH-001', description: 'Soft bristle broom for floor cleaning', unit: 'piece', hsnCode: '9603', basePrice: INR(45), gstRate: 5, stockQty: 250, lowStockThreshold: 20, status: 'ACTIVE', categoryId: CAT_IDS.cleaning, isDeleted: false, createdAt: daysAgo(60), updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.p2, name: 'Pochha Mop Refill', slug: 'pochha-mop-refill', sku: 'PM-002', description: 'Cotton mop head refill 400g', unit: 'piece', hsnCode: '9603', basePrice: INR(120), gstRate: 5, stockQty: 180, lowStockThreshold: 15, status: 'ACTIVE', categoryId: CAT_IDS.cleaning, isDeleted: false, createdAt: daysAgo(55), updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.p3, name: 'Phenyl Concentrate 1L', slug: 'phenyl-concentrate-1l', sku: 'PH-003', description: 'White phenyl floor cleaner concentrate', unit: 'bottle', hsnCode: '3402', basePrice: INR(95), gstRate: 18, stockQty: 300, lowStockThreshold: 30, status: 'ACTIVE', categoryId: CAT_IDS.cleaning, isDeleted: false, createdAt: daysAgo(50), updatedAt: now, returnWindowDays: 0 },
  { id: PROD_IDS.p4, name: 'Detergent Powder 1kg', slug: 'detergent-powder-1kg', sku: 'DP-004', description: 'Washing powder with lemon fragrance', unit: 'kg', hsnCode: '3402', basePrice: INR(75), gstRate: 18, stockQty: 400, lowStockThreshold: 50, status: 'ACTIVE', categoryId: CAT_IDS.cleaning, isDeleted: false, createdAt: daysAgo(45), updatedAt: now, returnWindowDays: 0 },
  { id: PROD_IDS.p5, name: 'Mosquito Coil (10pcs)', slug: 'mosquito-coil-10pcs', sku: 'MC-005', description: 'Long-burning mosquito repellent coils', unit: 'pack', hsnCode: '3808', basePrice: INR(28), gstRate: 12, stockQty: 500, lowStockThreshold: 60, status: 'ACTIVE', categoryId: CAT_IDS.homecare, isDeleted: false, createdAt: daysAgo(40), updatedAt: now, returnWindowDays: 0 },
  { id: PROD_IDS.p6, name: 'Incense Sticks Agarbatti', slug: 'incense-sticks-agarbatti', sku: 'AG-006', description: 'Premium fragrance agarbatti 100 sticks', unit: 'pack', hsnCode: '3307', basePrice: INR(42), gstRate: 5, stockQty: 600, lowStockThreshold: 80, status: 'ACTIVE', categoryId: CAT_IDS.homecare, isDeleted: false, createdAt: daysAgo(35), updatedAt: now, returnWindowDays: 0 },
  { id: PROD_IDS.p7, name: 'Bath Soap Rose 100g', slug: 'bath-soap-rose-100g', sku: 'BS-007', description: 'Moisturising rose bar soap', unit: 'piece', hsnCode: '3401', basePrice: INR(32), gstRate: 12, stockQty: 800, lowStockThreshold: 100, status: 'ACTIVE', categoryId: CAT_IDS.personal, isDeleted: false, createdAt: daysAgo(30), updatedAt: now, returnWindowDays: 0 },
  { id: PROD_IDS.p8, name: 'Shampoo Sachet 8ml', slug: 'shampoo-sachet-8ml', sku: 'SH-008', description: 'Anti-dandruff shampoo sachet strip of 12', unit: 'strip', hsnCode: '3305', basePrice: INR(22), gstRate: 18, stockQty: 1000, lowStockThreshold: 200, status: 'ACTIVE', categoryId: CAT_IDS.personal, isDeleted: false, createdAt: daysAgo(25), updatedAt: now, returnWindowDays: 0 },
  { id: PROD_IDS.p9, name: 'Toothpaste 100g', slug: 'toothpaste-100g', sku: 'TP-009', description: 'Fluoride toothpaste fresh mint', unit: 'tube', hsnCode: '3306', basePrice: INR(48), gstRate: 12, stockQty: 550, lowStockThreshold: 60, status: 'ACTIVE', categoryId: CAT_IDS.personal, isDeleted: false, createdAt: daysAgo(20), updatedAt: now, returnWindowDays: 0 },
  { id: PROD_IDS.p10, name: 'Salt 1kg', slug: 'salt-1kg', sku: 'SL-010', description: 'Iodized table salt', unit: 'kg', hsnCode: '2501', basePrice: INR(20), gstRate: 0, stockQty: 2000, lowStockThreshold: 200, status: 'ACTIVE', categoryId: CAT_IDS.food, isDeleted: false, createdAt: daysAgo(15), updatedAt: now, returnWindowDays: 0 },
  { id: PROD_IDS.p11, name: 'Biscuit Glucose 100g', slug: 'biscuit-glucose-100g', sku: 'BG-011', description: 'Energy glucose biscuits', unit: 'pack', hsnCode: '1905', basePrice: INR(12), gstRate: 12, stockQty: 3000, lowStockThreshold: 500, status: 'ACTIVE', categoryId: CAT_IDS.food, isDeleted: false, createdAt: daysAgo(12), updatedAt: now, returnWindowDays: 0 },
  { id: PROD_IDS.p12, name: 'Notebook A5 200 Pages', slug: 'notebook-a5-200pages', sku: 'NB-012', description: 'Single-lined A5 notebook', unit: 'piece', hsnCode: '4820', basePrice: INR(60), gstRate: 12, stockQty: 400, lowStockThreshold: 40, status: 'ACTIVE', categoryId: CAT_IDS.stationary, isDeleted: false, createdAt: daysAgo(8), updatedAt: now, returnWindowDays: 7 },

  // Dairy Product (under Grocery)
  { id: PROD_IDS.amulMilk, name: 'Amul Fresh Milk', slug: 'amul-fresh-milk', sku: 'GR-DY-MILK', description: 'Amul Fresh Milk 1L', unit: '1L', hsnCode: '0401', basePrice: 3000, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.dairyProduct, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.amulButter, name: 'Amul Salted Butter', slug: 'amul-salted-butter', sku: 'GR-DY-BUTR', description: 'Amul Salted Butter 500g', unit: '500g', hsnCode: '0405', basePrice: 5600, gstRate: 12, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.dairyProduct, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.amulPaneer, name: 'Amul Paneer', slug: 'amul-paneer', sku: 'GR-DY-PANR', description: 'Amul Paneer 200g', unit: '200g', hsnCode: '0406', basePrice: 9000, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.dairyProduct, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.gowardhanGhee, name: 'Gowardhan Desi Ghee', slug: 'gowardhan-desi-ghee', sku: 'GR-DY-GHEE', description: 'Gowardhan Desi Ghee 1L', unit: '1L', hsnCode: '0405', basePrice: 68000, gstRate: 12, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.dairyProduct, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.freshCream, name: 'Fresh Cream', slug: 'fresh-cream', sku: 'GR-DY-CREAM', description: 'Fresh Cream 1kg', unit: '1kg', hsnCode: '0402', basePrice: 13000, gstRate: 12, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.dairyProduct, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.butterMKKN, name: 'Butter (Makkhan)', slug: 'butter-makkhan', sku: 'GR-DY-MKKN', description: 'Butter (Makkhan) 1kg', unit: '1kg', hsnCode: '0405', basePrice: 13000, gstRate: 12, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.dairyProduct, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.freshCurd, name: 'Fresh Curd (Dahi)', slug: 'fresh-curd-dahi', sku: 'GR-DY-CURD', description: 'Fresh Curd (Dahi) 1kg', unit: '1kg', hsnCode: '0403', basePrice: 33200, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.dairyProduct, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.sweetCorn, name: 'Sweet Corn', slug: 'sweet-corn', sku: 'GR-DY-CORN', description: 'Sweet Corn 1kg', unit: '1kg', hsnCode: '0710', basePrice: 14000, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.dairyProduct, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.soyaChaap, name: 'Soya Chaap', slug: 'soya-chaap', sku: 'GR-DY-CHAP', description: 'Soya Chaap 1kg', unit: '1kg', hsnCode: '2106', basePrice: 12000, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.dairyProduct, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.paneerFresh, name: 'Paneer (Fresh)', slug: 'paneer-fresh', sku: 'GR-DY-PANR-F', description: 'Paneer (Fresh) 1kg', unit: '1kg', hsnCode: '0406', basePrice: 22700, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.dairyProduct, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.greenPeas, name: 'Green Peas (Matar)', slug: 'green-peas-matar', sku: 'GR-DY-PEAS', description: 'Green Peas (Matar) 1 Bag', unit: '1 Bag', hsnCode: '0710', basePrice: 26000, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.dairyProduct, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },

  // Oil & Ghee (under Grocery)
  { id: PROD_IDS.refined500, name: 'Refined Oil 500ml (Box)', slug: 'refined-oil-500ml-box', sku: 'GR-OL-REF-500', description: 'Refined Oil 500ml Box', unit: 'Box', hsnCode: '1512', basePrice: 176600, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.oilGhee, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.refined1L, name: 'Refined Oil 1L (Box)', slug: 'refined-oil-1l-box', sku: 'GR-OL-REF-1L', description: 'Refined Oil 1L Box', unit: 'Box', hsnCode: '1512', basePrice: 173600, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.oilGhee, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.refined2L, name: 'Refined Oil 2L (Box)', slug: 'refined-oil-2l-box', sku: 'GR-OL-REF-2L', description: 'Refined Oil 2L Box', unit: 'Box', hsnCode: '1512', basePrice: 178400, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.oilGhee, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.refined5L, name: 'Refined Oil 5L (Box)', slug: 'refined-oil-5l-box', sku: 'GR-OL-REF-5L', description: 'Refined Oil 5L Box', unit: 'Box', hsnCode: '1512', basePrice: 300600, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.oilGhee, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.refined15T, name: 'Refined Oil 15L Tin', slug: 'refined-oil-15l-tin', sku: 'GR-OL-REF-15T', description: 'Refined Oil 15L Tin', unit: '15L Tin', hsnCode: '1512', basePrice: 223100, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.oilGhee, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.refined15J, name: 'Refined Oil 15L Jar', slug: 'refined-oil-15l-jar', sku: 'GR-OL-REF-15J', description: 'Refined Oil 15L Jar', unit: '15L Jar', hsnCode: '1512', basePrice: 224600, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.oilGhee, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.kachi500, name: 'Kachi Ghani Mustard Oil 500ml (Box)', slug: 'kachi-ghani-mustard-oil-500ml-box', sku: 'GR-OL-KG-500', description: 'Kachi Ghani Mustard Oil 500ml Box', unit: 'Box', hsnCode: '1514', basePrice: 190000, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.oilGhee, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.kachi1L, name: 'Kachi Ghani Mustard Oil 1L (Box)', slug: 'kachi-ghani-mustard-oil-1l-box', sku: 'GR-OL-KG-1L', description: 'Kachi Ghani Mustard Oil 1L Box', unit: 'Box', hsnCode: '1514', basePrice: 106400, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.oilGhee, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.kachi2L, name: 'Kachi Ghani Mustard Oil 2L (Box)', slug: 'kachi-ghani-mustard-oil-2l-box', sku: 'GR-OL-KG-2L', description: 'Kachi Ghani Mustard Oil 2L Box', unit: 'Box', hsnCode: '1514', basePrice: 106400, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.oilGhee, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.kachi5L, name: 'Kachi Ghani Mustard Oil 5L (Box)', slug: 'kachi-ghani-mustard-oil-5l-box', sku: 'GR-OL-KG-5L', description: 'Kachi Ghani Mustard Oil 5L Box', unit: 'Box', hsnCode: '1514', basePrice: 155400, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.oilGhee, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.kachi15T, name: 'Kachi Ghani Mustard Oil 15L Tin', slug: 'kachi-ghani-mustard-oil-15l-tin', sku: 'GR-OL-KG-15T', description: 'Kachi Ghani Mustard Oil 15L Tin', unit: '15L Tin', hsnCode: '1514', basePrice: 240300, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.oilGhee, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.desi250, name: 'Desi Ghee 250ml', slug: 'desi-ghee-250ml', sku: 'GR-OL-DG-250', description: 'Desi Ghee 250ml', unit: '250ml', hsnCode: '0405', basePrice: 18000, gstRate: 12, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.oilGhee, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.desi500, name: 'Desi Ghee 500ml', slug: 'desi-ghee-500ml', sku: 'GR-OL-DG-500', description: 'Desi Ghee 500ml', unit: '500ml', hsnCode: '0405', basePrice: 35000, gstRate: 12, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.oilGhee, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.desi1L, name: 'Desi Ghee 1L', slug: 'desi-ghee-1l', sku: 'GR-OL-DG-1L', description: 'Desi Ghee 1L', unit: '1L', hsnCode: '0405', basePrice: 68000, gstRate: 12, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.oilGhee, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.dalda, name: 'Ghee Dalda', slug: 'ghee-dalda', sku: 'GR-OL-DALDA', description: 'Ghee Dalda 1L', unit: '1L', hsnCode: '1516', basePrice: 15000, gstRate: 12, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.oilGhee, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },

  // Dry Fruits (under Grocery)
  { id: PROD_IDS.aprt, name: 'Dry Apricot (Khubani)', slug: 'dry-apricot-khubani', sku: 'GR-DF-APRT', description: 'Dry Apricot (Khubani) 1kg', unit: '1kg', hsnCode: '0813', basePrice: 29000, gstRate: 12, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.dryFruits, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.ddateY, name: 'Dry Dates Yellow (Chhuhara Pila)', slug: 'dry-dates-yellow-chhuhara-pila', sku: 'GR-DF-DDATE-Y', description: 'Dry Dates Yellow (Chhuhara Pila) 1kg', unit: '1kg', hsnCode: '0804', basePrice: 14000, gstRate: 12, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.dryFruits, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.ddateB, name: 'Dry Dates Black (Chhuhara Kala)', slug: 'dry-dates-black-chhuhara-kala', sku: 'GR-DF-DDATE-B', description: 'Dry Dates Black (Chhuhara Kala) 1kg', unit: '1kg', hsnCode: '0804', basePrice: 14000, gstRate: 12, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.dryFruits, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.date, name: 'Dates (Khajur)', slug: 'dates-khajur', sku: 'GR-DF-DATE', description: 'Dates (Khajur) 1kg', unit: '1kg', hsnCode: '0804', basePrice: 35000, gstRate: 12, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.dryFruits, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.rsn, name: 'Raisins (Kishmish)', slug: 'raisins-kishmish', sku: 'GR-DF-RSN', description: 'Raisins (Kishmish) 1kg', unit: '1kg', hsnCode: '0806', basePrice: 41500, gstRate: 12, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.dryFruits, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.brsn, name: 'Black Raisins (Munakka)', slug: 'black-raisins-munakka', sku: 'GR-DF-BRSN', description: 'Black Raisins (Munakka) 1kg', unit: '1kg', hsnCode: '0806', basePrice: 46000, gstRate: 12, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.dryFruits, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.almdF, name: 'Almonds Fresh (Badam Fresh)', slug: 'almonds-fresh-badam-fresh', sku: 'GR-DF-ALMD-F', description: 'Almonds Fresh (Badam Fresh) 1kg', unit: '1kg', hsnCode: '0802', basePrice: 90500, gstRate: 12, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.dryFruits, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.almdI, name: 'Almond Indi (Badam Indi)', slug: 'almond-indi-badam-indi', sku: 'GR-DF-ALMD-I', description: 'Almond Indi (Badam Indi) 1kg', unit: '1kg', hsnCode: '0802', basePrice: 86000, gstRate: 12, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.dryFruits, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.cocoL, name: 'Grated Dry Coconut (Gari Lachha)', slug: 'grated-dry-coconut-gari-lachha', sku: 'GR-DF-COCO-L', description: 'Grated Dry Coconut (Gari Lachha) 1kg', unit: '1kg', hsnCode: '0801', basePrice: 23000, gstRate: 12, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.dryFruits, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.cocoB, name: 'Coconut Powder (Gari Burada)', slug: 'coconut-powder-gari-burada', sku: 'GR-DF-COCO-B', description: 'Coconut Powder (Gari Burada) 1kg', unit: '1kg', hsnCode: '0801', basePrice: 26500, gstRate: 12, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.dryFruits, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.fox250, name: 'Fox Nuts (Makhana) 250g', slug: 'fox-nuts-makhana-250g', sku: 'GR-DF-FOX-250', description: 'Fox Nuts (Makhana) 250g pack (priced per kg)', unit: '1kg', hsnCode: '1905', basePrice: 79500, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.dryFruits, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.fox100, name: 'Fox Nuts (Makhana) 100g', slug: 'fox-nuts-makhana-100g', sku: 'GR-DF-FOX-100', description: 'Fox Nuts (Makhana) 100g pack (priced per kg)', unit: '1kg', hsnCode: '1905', basePrice: 92000, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.dryFruits, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.cshw3, name: 'Cashew Nut 3pcs', slug: 'cashew-nut-3pcs', sku: 'GR-DF-CSHW-3', description: 'Cashew Nut 3pcs 1kg', unit: '1kg', hsnCode: '0801', basePrice: 82200, gstRate: 12, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.dryFruits, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.cshw320, name: 'Cashew 320 Lot', slug: 'cashew-320-lot', sku: 'GR-DF-CSHW-320', description: 'Cashew 320 Lot 1kg', unit: '1kg', hsnCode: '0801', basePrice: 84800, gstRate: 12, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.dryFruits, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.cshw180, name: 'Cashew 180 Lot', slug: 'cashew-180-lot', sku: 'GR-DF-CSHW-180', description: 'Cashew 180 Lot 1kg', unit: '1kg', hsnCode: '0801', basePrice: 97000, gstRate: 12, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.dryFruits, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.cshwMin, name: 'Minced Cashew (Kaju Noka)', slug: 'minced-cashew-kaju-noka', sku: 'GR-DF-CSHW-MIN', description: 'Minced Cashew (Kaju Noka) 1kg', unit: '1kg', hsnCode: '0801', basePrice: 62000, gstRate: 12, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.dryFruits, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.trail, name: 'Trail Mix (Sukhe Meve)', slug: 'trail-mix-sukhe-meve', sku: 'GR-DF-TRAIL', description: 'Trail Mix (Sukhe Meve) 1kg', unit: '1kg', hsnCode: '2008', basePrice: 66000, gstRate: 12, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.dryFruits, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.wlntW, name: 'Whole Walnut (Akhrot Sabut)', slug: 'whole-walnut-akhrot-sabut', sku: 'GR-DF-WLNT-W', description: 'Whole Walnut (Akhrot Sabut) 1kg', unit: '1kg', hsnCode: '0802', basePrice: 77000, gstRate: 12, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.dryFruits, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.wlntK, name: 'Walnut Kernels (Akhrot Giri)', slug: 'walnut-kernels-akhrot-giri', sku: 'GR-DF-WLNT-K', description: 'Walnut Kernels (Akhrot Giri) 1kg', unit: '1kg', hsnCode: '0802', basePrice: 60000, gstRate: 12, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.dryFruits, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.pst, name: 'Pistachio (Pista)', slug: 'pistachio-pista', sku: 'GR-DF-PST', description: 'Pistachio (Pista) 1kg', unit: '1kg', hsnCode: '0802', basePrice: 117300, gstRate: 12, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.dryFruits, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.gpst, name: 'Green Pistachio (Hara Pista)', slug: 'green-pistachio-hara-pista', sku: 'GR-DF-GPST', description: 'Green Pistachio (Hara Pista) 1kg', unit: '1kg', hsnCode: '0802', basePrice: 318500, gstRate: 12, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.dryFruits, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },

  // Whole Spices & other Grocery (under Grocery)
  { id: PROD_IDS.carom, name: 'Carom Seeds (Ajwain)', slug: 'carom-seeds-ajwain', sku: 'GR-SP-CAROM', description: 'Carom Seeds (Ajwain) 1kg', unit: '1kg', hsnCode: '0910', basePrice: 15500, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.wholeSpices, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.bcard, name: 'Black Cardamom (Badi Elaichi)', slug: 'black-cardamom-badi-elaichi', sku: 'GR-SP-BCARD', description: 'Black Cardamom (Badi Elaichi) 1kg', unit: '1kg', hsnCode: '0908', basePrice: 174000, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.wholeSpices, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.stara, name: 'Star Anise (Chakraphool)', slug: 'star-anise-chakraphool', sku: 'GR-SP-STARA', description: 'Star Anise (Chakraphool) 1kg', unit: '1kg', hsnCode: '0909', basePrice: 41300, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.wholeSpices, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.cori, name: 'Coriander Seeds (Dhania Khadi)', slug: 'coriander-seeds-dhania-khadi', sku: 'GR-SP-CORI', description: 'Coriander Seeds (Dhania Khadi) 1kg', unit: '1kg', hsnCode: '0909', basePrice: 19000, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.wholeSpices, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.turm, name: 'Turmeric Fingers (Haldi Khadi)', slug: 'turmeric-fingers-haldi-khadi', sku: 'GR-SP-TURM', description: 'Turmeric Fingers (Haldi Khadi) 1kg', unit: '1kg', hsnCode: '0908', basePrice: 20600, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.wholeSpices, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.mace, name: 'Mace (Javitri)', slug: 'mace-javitri', sku: 'GR-SP-MACE', description: 'Mace (Javitri) 1kg', unit: '1kg', hsnCode: '0908', basePrice: 203000, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.wholeSpices, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.nutm, name: 'Nutmeg (Jaiphal)', slug: 'nutmeg-jaiphal', sku: 'GR-SP-NUTM', description: 'Nutmeg (Jaiphal) 1kg', unit: '1kg', hsnCode: '0908', basePrice: 86000, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.wholeSpices, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.jeeraC, name: 'Cumin Seeds (Jeera Keshari)', slug: 'cumin-seeds-jeera-keshari', sku: 'GR-SP-JEERA-C', description: 'Cumin Seeds (Jeera Keshari) 1kg', unit: '1kg', hsnCode: '0909', basePrice: 27600, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.wholeSpices, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.jeeraK, name: 'Cumin Seeds (Jeera Kohinoor)', slug: 'cumin-seeds-jeera-kohinoor', sku: 'GR-SP-JEERA-K', description: 'Cumin Seeds (Jeera Kohinoor) 1kg', unit: '1kg', hsnCode: '0909', basePrice: 25900, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.wholeSpices, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.kcubeb, name: 'Cubeb Pepper (Kabab Chini)', slug: 'cubeb-pepper-kabab-chini', sku: 'GR-SP-KCUBEB', description: 'Cubeb Pepper (Kabab Chini) 1kg', unit: '1kg', hsnCode: '0904', basePrice: 110000, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.wholeSpices, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.bpep, name: 'Black Pepper (Kali Mirch)', slug: 'black-pepper-kali-mirch', sku: 'GR-SP-BPEP', description: 'Black Pepper (Kali Mirch) 1kg', unit: '1kg', hsnCode: '0904', basePrice: 82200, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.wholeSpices, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.nig, name: 'Nigella Seeds (Kalonji)', slug: 'nigella-seeds-kalonji', sku: 'GR-SP-NIG', description: 'Nigella Seeds (Kalonji) 1kg', unit: '1kg', hsnCode: '0909', basePrice: 23400, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.wholeSpices, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.kmethi, name: 'Dried Fenugreek (Kasuri Methi)', slug: 'dried-fenugreek-kasuri-methi', sku: 'GR-SP-KMETHI', description: 'Dried Fenugreek (Kasuri Methi) 1 Pack', unit: '1 Pack', hsnCode: '0910', basePrice: 2900, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.wholeSpices, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.rchil, name: 'Red Chilli (Lal Mirch)', slug: 'red-chilli-lal-mirch', sku: 'GR-SP-RCHIL', description: 'Red Chilli (Lal Mirch) 1kg', unit: '1kg', hsnCode: '0904', basePrice: 24400, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.wholeSpices, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.clov, name: 'Cloves (Laung)', slug: 'cloves-laung', sku: 'GR-SP-CLOV', description: 'Cloves (Laung) 1kg', unit: '1kg', hsnCode: '0907', basePrice: 91100, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.wholeSpices, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.methid, name: 'Fenugreek Seeds (Methi Dana)', slug: 'fenugreek-seeds-methi-dana', sku: 'GR-SP-METHID', description: 'Fenugreek Seeds (Methi Dana) 1kg', unit: '1kg', hsnCode: '0910', basePrice: 9100, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.wholeSpices, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.wmirch, name: 'White Pepper (Safed Mirch)', slug: 'white-pepper-safed-mirch', sku: 'GR-SP-WMIRCH', description: 'White Pepper (Safed Mirch) 1kg', unit: '1kg', hsnCode: '0904', basePrice: 117500, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.wholeSpices, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.shatav, name: 'Shatavari', slug: 'shatavari-spices', sku: 'GR-SP-SHATAV', description: 'Shatavari 1kg', unit: '1kg', hsnCode: '1211', basePrice: 96500, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.wholeSpices, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.supjam, name: 'Betel Nut (Supari Jam)', slug: 'betel-nut-supari-jam', sku: 'GR-SP-SUPJAM', description: 'Betel Nut (Supari Jam) 1kg', unit: '1kg', hsnCode: '0802', basePrice: 58300, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.wholeSpices, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.supjee, name: 'Betel Nut (Supari Jeeni)', slug: 'betel-nut-supari-jeeni', sku: 'GR-SP-SUPJEE', description: 'Betel Nut (Supari Jeeni) 1kg', unit: '1kg', hsnCode: '0802', basePrice: 57300, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.wholeSpices, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.gonded, name: 'Edible Gond', slug: 'edible-gond', sku: 'GR-SP-GONDED', description: 'Edible Gond 1kg', unit: '1kg', hsnCode: '1301', basePrice: 20700, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.wholeSpices, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.gondkt, name: 'Dried Gond (Gond Katli)', slug: 'dried-gond-gond-katli', sku: 'GR-SP-GONDKT', description: 'Dried Gond (Gond Katli) 1kg', unit: '1kg', hsnCode: '1301', basePrice: 31500, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.wholeSpices, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.sabu, name: 'Tapioca Pearls (Sabudana)', slug: 'tapioca-pearls-sabudana', sku: 'GR-SP-SABU', description: 'Tapioca Pearls (Sabudana) 1kg', unit: '1kg', hsnCode: '1903', basePrice: 7900, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.wholeSpices, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.turmam, name: 'White Turmeric (Haldi Aama)', slug: 'white-turmeric-haldi-aama', sku: 'GR-SP-TURMAM', description: 'White Turmeric (Haldi Aama) 1kg', unit: '1kg', hsnCode: '0908', basePrice: 25000, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.wholeSpices, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.chamsur, name: 'Garden Cress Seeds (Chamsur)', slug: 'garden-cress-seeds-chamsur', sku: 'GR-SP-CHAMSUR', description: 'Garden Cress Seeds (Chamsur) 1kg', unit: '1kg', hsnCode: '1209', basePrice: 10300, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.wholeSpices, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.gcard, name: 'Green Cardamom (Elaichi Chhoti)', slug: 'green-cardamom-elaichi-chhoti', sku: 'GR-SP-GCARD', description: 'Green Cardamom (Elaichi Chhoti) 1kg', unit: '1kg', hsnCode: '0908', basePrice: 320000, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.wholeSpices, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.bcardb, name: 'Black Cardamom (Elaichi Badi)', slug: 'black-cardamom-elaichi-badi-bulk', sku: 'GR-SP-BCARDB', description: 'Black Cardamom (Elaichi Badi) 1kg', unit: '1kg', hsnCode: '0908', basePrice: 226500, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.wholeSpices, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.cin, name: 'Cinnamon (Dalchini)', slug: 'cinnamon-dalchini', sku: 'GR-SP-CIN', description: 'Cinnamon (Dalchini) 1kg', unit: '1kg', hsnCode: '0906', basePrice: 28900, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.wholeSpices, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.dhsab, name: 'Coriander Seeds (Dhania Sabut)', slug: 'coriander-seeds-dhania-sabut', sku: 'GR-SP-DHSAB', description: 'Coriander Seeds (Dhania Sabut) 1kg', unit: '1kg', hsnCode: '0909', basePrice: 19000, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.wholeSpices, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.salt, name: 'Tata Salt', slug: 'tata-salt-1kg', sku: 'GR-SP-SALT', description: 'Tata Salt Iodized 1kg', unit: '1kg', hsnCode: '2501', basePrice: 2500, gstRate: 0, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.wholeSpices, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.posta, name: 'Poppy Seeds (Posta Dana)', slug: 'poppy-seeds-posta-dana', sku: 'GR-SP-POSTA', description: 'Poppy Seeds (Posta Dana) 1kg', unit: '1kg', hsnCode: '1207', basePrice: 134100, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.wholeSpices, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.mul, name: 'Licorice (Mulethi)', slug: 'licorice-mulethi-spices', sku: 'GR-SP-MUL', description: 'Licorice (Mulethi) 1kg', unit: '1kg', hsnCode: '1211', basePrice: 24500, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.wholeSpices, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.hing20, name: 'Asafoetida (Hing) 20g', slug: 'asafoetida-hing-20g', sku: 'GR-SP-HING-20', description: 'Asafoetida (Hing) 20g Pack', unit: '1 Pack', hsnCode: '1301', basePrice: 23400, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.wholeSpices, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.hing50, name: 'Asafoetida (Hing) 50g', slug: 'asafoetida-hing-50g', sku: 'GR-SP-HING-50', description: 'Asafoetida (Hing) 50g Pack', unit: '1 Pack', hsnCode: '1301', basePrice: 29600, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.wholeSpices, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.hing100, name: 'Asafoetida (Hing) 100g', slug: 'asafoetida-hing-100g', sku: 'GR-SP-HING-100', description: 'Asafoetida (Hing) 100g Pack', unit: '1 Pack', hsnCode: '1301', basePrice: 58200, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.wholeSpices, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.hing5, name: 'Asafoetida (Hing) 5g', slug: 'asafoetida-hing-5g', sku: 'GR-SP-HING-5', description: 'Asafoetida (Hing) 5g Pack', unit: '1 Pack', hsnCode: '1301', basePrice: 6800, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.wholeSpices, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.tilsf, name: 'White Sesame Seeds (Safed Til)', slug: 'white-sesame-seeds-safed-til', sku: 'GR-SP-TILSF', description: 'White Sesame Seeds (Safed Til) 1kg', unit: '1kg', hsnCode: '1207', basePrice: 15400, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.wholeSpices, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.kchiliP, name: 'Kashmiri Red Chilli', slug: 'kashmiri-red-chilli-pack', sku: 'GR-SP-KCHILI-P', description: 'Kashmiri Red Chilli Pack', unit: '1 Pack', hsnCode: '0904', basePrice: 6600, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.wholeSpices, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.tam, name: 'Tamarind (Imli)', slug: 'tamarind-imli', sku: 'GR-SP-TAM', description: 'Tamarind (Imli) 1kg', unit: '1kg', hsnCode: '0802', basePrice: 6200, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.wholeSpices, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.rsalt, name: 'Sendha Namak (Rock Salt)', slug: 'sendha-namak-rock-salt', sku: 'GR-SP-RSALT', description: 'Sendha Namak (Rock Salt) 1kg', unit: '1kg', hsnCode: '2501', basePrice: 5000, gstRate: 0, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.wholeSpices, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.vanil, name: 'Vanilla Essence', slug: 'vanilla-essence', sku: 'GR-SP-VANIL', description: 'Vanilla Essence 1 Bottle', unit: '1 Bottle', hsnCode: '3302', basePrice: 13700, gstRate: 18, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.wholeSpices, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.bpow, name: 'Baking Powder', slug: 'baking-powder-pack', sku: 'GR-SP-BPOW', description: 'Baking Powder Pack', unit: '1 Pack', hsnCode: '2102', basePrice: 7800, gstRate: 18, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.wholeSpices, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.bsoda, name: 'Baking Soda', slug: 'baking-soda-pack', sku: 'GR-SP-BSODA', description: 'Baking Soda Pack', unit: '1 Pack', hsnCode: '2836', basePrice: 4600, gstRate: 18, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.wholeSpices, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.tilkl, name: 'Black Sesame Seeds (Kala Til)', slug: 'black-sesame-seeds-kala-til', sku: 'GR-SP-TILKL', description: 'Black Sesame Seeds (Kala Til) 1kg', unit: '1kg', hsnCode: '1207', basePrice: 25500, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.wholeSpices, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.loban, name: 'Frankincense (Loban)', slug: 'frankincense-loban', sku: 'GR-SP-LOBAN', description: 'Frankincense (Loban) 1kg', unit: '1kg', hsnCode: '3307', basePrice: 16000, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.wholeSpices, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.fitkari, name: 'Alum (Fitkari)', slug: 'alum-fitkari', sku: 'GR-SP-FITKARI', description: 'Alum (Fitkari) 1kg', unit: '1kg', hsnCode: '2833', basePrice: 4000, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.wholeSpices, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.mishri, name: 'Rock Sugar (Mishri)', slug: 'rock-sugar-mishri', sku: 'GR-SP-MISHRI', description: 'Rock Sugar (Mishri) 1kg', unit: '1kg', hsnCode: '1701', basePrice: 6600, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.wholeSpices, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.mishrid, name: 'Thread Sugar (Mishri Dhaga)', slug: 'thread-sugar-mishri-dhaga', sku: 'GR-SP-MISHRID', description: 'Thread Sugar (Mishri Dhaga) 1kg', unit: '1kg', hsnCode: '1701', basePrice: 10000, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.wholeSpices, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.saunfg, name: 'Fennel Seeds (Saunf Gold)', slug: 'fennel-seeds-saunf-gold', sku: 'GR-SP-SAUNFG', description: 'Fennel Seeds (Saunf Gold) 1kg', unit: '1kg', hsnCode: '0909', basePrice: 16000, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.wholeSpices, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.saunft, name: 'Fennel Seeds (Saunf Tulsi)', slug: 'fennel-seeds-saunf-tulsi', sku: 'GR-SP-SAUNFT', description: 'Fennel Seeds (Saunf Tulsi) 1kg', unit: '1kg', hsnCode: '0909', basePrice: 13800, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.wholeSpices, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.bay, name: 'Bay Leaf (Tej Patta)', slug: 'bay-leaf-tej-patta', sku: 'GR-SP-BAY', description: 'Bay Leaf (Tej Patta) 1kg', unit: '1kg', hsnCode: '0910', basePrice: 9800, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.wholeSpices, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.ging, name: 'Dry Ginger (Sonth)', slug: 'dry-ginger-sonth', sku: 'GR-SP-GING', description: 'Dry Ginger (Sonth) 1kg', unit: '1kg', hsnCode: '0910', basePrice: 36000, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.wholeSpices, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.chirnj, name: 'Chirounji (Almondette)', slug: 'chirounji-almondette', sku: 'GR-SP-CHIRNJ', description: 'Chirounji (Almondette) 1kg', unit: '1kg', hsnCode: '0802', basePrice: 150000, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.wholeSpices, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.peanut, name: 'Peanuts (Mungfali)', slug: 'peanuts-mungfali', sku: 'GR-SP-PEANUT', description: 'Peanuts (Mungfali) 1kg', unit: '1kg', hsnCode: '1202', basePrice: 13600, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.wholeSpices, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.arshi, name: 'Arshi', slug: 'arshi-spices', sku: 'GR-SP-ARSHI', description: 'Arshi 1kg', unit: '1kg', hsnCode: '1211', basePrice: 13700, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.wholeSpices, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.atta, name: 'Ashirvaad Shudh Chakki Atta', slug: 'ashirvaad-shudh-chakki-atta', sku: 'GR-SP-ATTA', description: 'Ashirvaad Shudh Chakki Atta 10kg', unit: '10kg', hsnCode: '1101', basePrice: 45000, gstRate: 0, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.wholeSpices, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.rice, name: 'Basmati Rice Premium', slug: 'basmati-rice-premium', sku: 'GR-SP-RICE', description: 'Basmati Rice Premium 10kg', unit: '10kg', hsnCode: '1006', basePrice: 120000, gstRate: 0, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.wholeSpices, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.pulse, name: 'Toor Dal (Pulses)', slug: 'toor-dal-pulses', sku: 'GR-SP-PULSE', description: 'Toor Dal (Pulses) 1kg', unit: '1kg', hsnCode: '0713', basePrice: 16000, gstRate: 0, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.wholeSpices, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },

  // Seeds (under Grocery)
  { id: PROD_IDS.pump, name: 'Pumpkin Seeds', slug: 'pumpkin-seeds', sku: 'GR-SD-PUMP', description: 'Pumpkin Seeds 1kg', unit: '1kg', hsnCode: '1207', basePrice: 64800, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.seeds, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.sun, name: 'Sunflower Seeds', slug: 'sunflower-seeds', sku: 'GR-SD-SUN', description: 'Sunflower Seeds 1kg', unit: '1kg', hsnCode: '1206', basePrice: 19000, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.seeds, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.chia, name: 'Chia Seeds', slug: 'chia-seeds', sku: 'GR-SD-CHIA', description: 'Chia Seeds 1kg', unit: '1kg', hsnCode: '1207', basePrice: 44000, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.seeds, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.wmelon, name: 'Watermelon Seeds', slug: 'watermelon-seeds', sku: 'GR-SD-WMELON', description: 'Watermelon Seeds 1kg', unit: '1kg', hsnCode: '1207', basePrice: 57500, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.seeds, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.flax, name: 'Flax Seeds (Alsi)', slug: 'flax-seeds-alsi', sku: 'GR-SD-FLAX', description: 'Flax Seeds (Alsi) 1kg', unit: '1kg', hsnCode: '1204', basePrice: 13700, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.seeds, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },

  // Herb & Ayurvedic (under Grocery)
  { id: PROD_IDS.sika, name: 'Sikakai Powder', slug: 'sikakai-powder', sku: 'GR-HB-SIKA', description: 'Sikakai Powder 1kg', unit: '1kg', hsnCode: '1211', basePrice: 14400, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.herbAyurvedic, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.shat, name: 'Shatavari Powder', slug: 'shatavari-powder', sku: 'GR-HB-SHAT', description: 'Shatavari Powder 1kg', unit: '1kg', hsnCode: '1211', basePrice: 96500, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.herbAyurvedic, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.chir, name: 'Chirayta (Kiratatikta)', slug: 'chirayta-kiratatikta', sku: 'GR-HB-CHIR', description: 'Chirayta (Kiratatikta) 1kg', unit: '1kg', hsnCode: '1211', basePrice: 19000, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.herbAyurvedic, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.amla, name: 'Dried Amla', slug: 'dried-amla', sku: 'GR-HB-AMLA', description: 'Dried Amla 1kg', unit: '1kg', hsnCode: '1211', basePrice: 14500, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.herbAyurvedic, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.bach, name: 'Bach Wood', slug: 'bach-wood', sku: 'GR-HB-BACH', description: 'Bach Wood 1kg', unit: '1kg', hsnCode: '1211', basePrice: 25400, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.herbAyurvedic, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.lico, name: 'Licorice Root (Mulethi)', slug: 'licorice-root-mulethi', sku: 'GR-HB-LICO', description: 'Licorice Root (Mulethi) 1kg', unit: '1kg', hsnCode: '1211', basePrice: 24500, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.herbAyurvedic, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.soap, name: 'Soapnut (Reetha)', slug: 'soapnut-reetha', sku: 'GR-HB-SOAP', description: 'Soapnut (Reetha) 1kg', unit: '1kg', hsnCode: '1211', basePrice: 7500, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.herbAyurvedic, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.alka, name: 'Alkanet Root (Ratanjot)', slug: 'alkanet-root-ratanjot', sku: 'GR-HB-ALKA', description: 'Alkanet Root (Ratanjot) 1kg', unit: '1kg', hsnCode: '1211', basePrice: 64000, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.herbAyurvedic, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.pflr, name: 'Paneer Flower (Paneer Phool)', slug: 'paneer-flower-paneer-phool', sku: 'GR-HB-PFLR', description: 'Paneer Flower (Paneer Phool) 1kg', unit: '1kg', hsnCode: '1211', basePrice: 20000, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.herbAyurvedic, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },

  // Worship Item (under Grocery)
  { id: PROD_IDS.havan, name: 'Havan Samagri Pack', slug: 'havan-samagri-pack', sku: 'GR-WP-HAVAN', description: 'Havan Samagri Pack 1kg', unit: '1kg', hsnCode: '3307', basePrice: 12000, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.worshipItem, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.ganga, name: 'Gangajal Holy Water', slug: 'gangajal-holy-water', sku: 'GR-WP-GANGA', description: 'Gangajal Holy Water 500ml', unit: '500ml', hsnCode: '2201', basePrice: 4500, gstRate: 18, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.worshipItem, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.kapoor, name: 'Camphor (Kapoor) Tablets', slug: 'camphor-kapoor-tablets', sku: 'GR-WP-KAPOOR', description: 'Camphor (Kapoor) Tablets 500g', unit: '500g', hsnCode: '2914', basePrice: 15000, gstRate: 18, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.worshipItem, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.lotus, name: 'Lotus Seeds Raw (Kamalgatta)', slug: 'lotus-seeds-raw-kamalgatta', sku: 'GR-WP-LOTUS', description: 'Lotus Seeds Raw (Kamalgatta) 1kg', unit: '1kg', hsnCode: '1209', basePrice: 45000, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.worshipItem, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.hmasala, name: 'Havan Masala', slug: 'havan-masala', sku: 'GR-WP-HMASALA', description: 'Havan Masala 1kg', unit: '1kg', hsnCode: '3307', basePrice: 18000, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.worshipItem, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },

  // Mobile & Accessories (under Electronics)
  { id: PROD_IDS.iph15, name: 'Apple iPhone 15 Pro', slug: 'apple-iphone-15-pro', sku: 'EL-MB-IPH15', description: 'Apple iPhone 15 Pro 128GB', unit: '1 unit', hsnCode: '8517', basePrice: 12900000, gstRate: 18, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.mobileAccessories, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.chgr, name: 'Fast Charger 20W USB-C', slug: 'fast-charger-20w-usb-c', sku: 'EL-MB-CHGR', description: 'Fast Charger 20W USB-C adapter', unit: '1 unit', hsnCode: '8504', basePrice: 190000, gstRate: 18, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.mobileAccessories, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.ear, name: 'Boat Bassheads Earphones', slug: 'boat-bassheads-earphones', sku: 'EL-MB-EAR', description: 'In-ear wired earphones', unit: '1 unit', hsnCode: '8518', basePrice: 59900, gstRate: 18, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.mobileAccessories, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.watch, name: 'Noise ColorFit Smartwatch', slug: 'noise-colorfit-smartwatch', sku: 'EL-MB-WATCH', description: 'Smartwatch with health tracker', unit: '1 unit', hsnCode: '9102', basePrice: 249900, gstRate: 18, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.mobileAccessories, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.pbank, name: 'Mi Power Bank 20000mAh', slug: 'mi-power-bank-20000mah', sku: 'EL-MB-PBANK', description: 'Fast charging power bank', unit: '1 unit', hsnCode: '8504', basePrice: 189900, gstRate: 18, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.mobileAccessories, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },

  // Computer Accessories (under Electronics)
  { id: PROD_IDS.lap, name: 'HP Pavilion Laptop', slug: 'hp-pavilion-laptop', sku: 'EL-CP-LAP', description: 'HP Pavilion 15\" Laptop', unit: '1 unit', hsnCode: '8471', basePrice: 6200000, gstRate: 18, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.computerAccessories, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.keyb, name: 'Logitech Wireless Keyboard', slug: 'logitech-wireless-keyboard', sku: 'EL-CP-KEYB', description: 'Wireless Keyboard', unit: '1 unit', hsnCode: '8471', basePrice: 129900, gstRate: 18, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.computerAccessories, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.mouse, name: 'Logitech M170 Wireless Mouse', slug: 'logitech-m170-wireless-mouse', sku: 'EL-CP-MOUSE', description: 'Wireless Optical Mouse', unit: '1 unit', hsnCode: '8471', basePrice: 59900, gstRate: 18, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.computerAccessories, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.ssd, name: 'Crucial 1TB External SSD', slug: 'crucial-1tb-external-ssd', sku: 'EL-CP-SSD', description: 'External portable SSD', unit: '1 unit', hsnCode: '8471', basePrice: 699900, gstRate: 18, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.computerAccessories, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.prin, name: 'Canon G3010 Printer', slug: 'canon-g3010-printer', sku: 'EL-CP-PRIN', description: 'Ink tank print copy scan printer', unit: '1 unit', hsnCode: '8443', basePrice: 1450000, gstRate: 18, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.computerAccessories, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },

  // Home Electronics (under Electronics)
  { id: PROD_IDS.tv, name: 'Samsung 43" Crystal 4K TV', slug: 'samsung-43-crystal-4k-tv', sku: 'EL-HM-TV', description: 'Samsung smart TV', unit: '1 unit', hsnCode: '8528', basePrice: 3290000, gstRate: 18, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.homeElectronics, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.ac, name: 'Daikin 1.5 Ton Split AC', slug: 'daikin-1-5-ton-split-ac', sku: 'EL-HM-AC', description: 'Inverter Split AC', unit: '1 unit', hsnCode: '8415', basePrice: 4200000, gstRate: 18, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.homeElectronics, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.frig, name: 'LG 240L Double Door Refrigerator', slug: 'lg-240l-double-door-refrigerator', sku: 'EL-HM-FRIG', description: 'Double door refrigerator', unit: '1 unit', hsnCode: '8418', basePrice: 2650000, gstRate: 18, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.homeElectronics, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.cool, name: 'Symphony Air Cooler', slug: 'symphony-air-cooler', sku: 'EL-HM-COOL', description: 'Personal air cooler', unit: '1 unit', hsnCode: '8479', basePrice: 890000, gstRate: 18, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.homeElectronics, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.fan, name: 'Havells Pedestal Fan', slug: 'havells-pedestal-fan', sku: 'EL-HM-FAN', description: 'High speed pedestal fan', unit: '1 unit', hsnCode: '8414', basePrice: 299900, gstRate: 18, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.homeElectronics, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.heat, name: 'Bajaj Room Heater', slug: 'bajaj-room-heater', sku: 'EL-HM-HEAT', description: 'Convector room heater', unit: '1 unit', hsnCode: '8516', basePrice: 189900, gstRate: 18, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.homeElectronics, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.dryer, name: 'Philips Hair Dryer', slug: 'philips-hair-dryer', sku: 'EL-HM-DRYER', description: 'Compact hair dryer', unit: '1 unit', hsnCode: '8516', basePrice: 129900, gstRate: 18, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.homeElectronics, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.trim, name: 'Philips Beard Trimmer', slug: 'philips-beard-trimmer', sku: 'EL-HM-TRIM', description: 'Cordless beard trimmer', unit: '1 unit', hsnCode: '8510', basePrice: 149900, gstRate: 18, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.homeElectronics, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },

  // Men (under Clothing & Fashion)
  { id: PROD_IDS.tshrt, name: 'Cotton T-Shirt (Polo)', slug: 'cotton-t-shirt-polo', sku: 'CL-MN-TSHRT', description: 'Men\'s polo t-shirt', unit: '1 unit', hsnCode: '6109', basePrice: 79900, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.men, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.jean, name: 'Casual Denim Jeans', slug: 'casual-denim-jeans', sku: 'CL-MN-JEAN', description: 'Men\'s denim jeans', unit: '1 unit', hsnCode: '6203', basePrice: 149900, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.men, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.shrt, name: 'Formal Slim-Fit Shirt', slug: 'formal-slim-fit-shirt', sku: 'CL-MN-SHRT', description: 'Men\'s formal shirt', unit: '1 unit', hsnCode: '6205', basePrice: 119900, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.men, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.trous, name: 'Cotton Trousers', slug: 'cotton-trousers', sku: 'CL-MN-TROUS', description: 'Men\'s casual trousers', unit: '1 unit', hsnCode: '6203', basePrice: 139900, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.men, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.ethnic, name: 'Kurta Pyjama Set (Ethnic)', slug: 'kurta-pyjama-set-ethnic', sku: 'CL-MN-ETHNIC', description: 'Men\'s ethnic wear', unit: '1 unit', hsnCode: '6205', basePrice: 249900, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.men, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.foot, name: 'Sports Running Shoes', slug: 'sports-running-shoes', sku: 'CL-MN-FOOT', description: 'Running shoes', unit: '1 unit', hsnCode: '6404', basePrice: 199900, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.men, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },

  // Women (under Clothing & Fashion)
  { id: PROD_IDS.saree, name: 'Silk Banarasi Saree', slug: 'silk-banarasi-saree', sku: 'CL-WM-SAREE', description: 'Silk Banarasi Saree', unit: '1 unit', hsnCode: '5007', basePrice: 499900, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.women, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.kurti, name: 'Anarkali Kurti Set', slug: 'anarkali-kurti-set', sku: 'CL-WM-KURTI', description: 'Anarkali Kurti Set', unit: '1 unit', hsnCode: '6204', basePrice: 189900, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.women, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.suit, name: 'Salwar Suit Set', slug: 'salwar-suit-set', sku: 'CL-WM-SUIT', description: 'Salwar Suit Set', unit: '1 unit', hsnCode: '6204', basePrice: 229900, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.women, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.dress, name: 'Casual Summer Dress', slug: 'casual-summer-dress', sku: 'CL-WM-DRESS', description: 'Casual Summer Dress', unit: '1 unit', hsnCode: '6204', basePrice: 129900, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.women, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.top, name: 'Stylish Floral Top', slug: 'stylish-floral-top', sku: 'CL-WM-TOP', description: 'Stylish Floral Top', unit: '1 unit', hsnCode: '6206', basePrice: 69900, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.women, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.wfoot, name: 'Heels Sandals (Footwear)', slug: 'heels-sandals-footwear', sku: 'CL-WM-FOOT', description: 'Women\'s footwear', unit: '1 unit', hsnCode: '6404', basePrice: 149900, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.women, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },

  // Kids (under Clothing & Fashion)
  { id: PROD_IDS.boys, name: 'Boys Casual Shirt & Shorts', slug: 'boys-casual-shirt-shorts', sku: 'CL-KD-BOYS', description: 'Boys clothing set', unit: '1 unit', hsnCode: '6209', basePrice: 89900, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.kids, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.girls, name: 'Girls Frock Dress', slug: 'girls-frock-dress', sku: 'CL-KD-GIRLS', description: 'Girls frock', unit: '1 unit', hsnCode: '6209', basePrice: 99900, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.kids, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.school, name: 'School Uniform Combo', slug: 'school-uniform-combo', sku: 'CL-KD-SCHOOL', description: 'School uniform set', unit: '1 unit', hsnCode: '6209', basePrice: 129900, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.kids, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },

  // Fashion Essential (under Clothing & Fashion)
  { id: PROD_IDS.ewatch, name: 'Casio Analogue Watch', slug: 'casio-analogue-watch', sku: 'CL-ES-WATCH', description: 'Analogue watch', unit: '1 unit', hsnCode: '9102', basePrice: 299900, gstRate: 18, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.fashionEssential, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.belt, name: 'Leather Belt', slug: 'leather-belt', sku: 'CL-ES-BELT', description: 'Men\'s leather belt', unit: '1 unit', hsnCode: '4203', basePrice: 49900, gstRate: 18, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.fashionEssential, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.bag, name: 'Travel Backpack', slug: 'travel-backpack', sku: 'CL-ES-BAG', description: 'Travel backpack with laptop slot', unit: '1 unit', hsnCode: '4202', basePrice: 189900, gstRate: 18, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.fashionEssential, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.glass, name: 'Ray-Ban Aviator Sunglasses', slug: 'ray-ban-aviator-sunglasses', sku: 'CL-ES-GLASS', description: 'Aviator sunglasses', unit: '1 unit', hsnCode: '9004', basePrice: 450000, gstRate: 18, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.fashionEssential, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
  { id: PROD_IDS.undr, name: 'Cotton Men\'s Undergarments (Pack of 3)', slug: 'cotton-mens-undergarments-pack-of-3', sku: 'CL-ES-UNDR', description: 'Cotton undergarments', unit: '1 pack', hsnCode: '6107', basePrice: 59900, gstRate: 5, stockQty: 100, lowStockThreshold: 10, status: 'ACTIVE', categoryId: CAT_IDS.fashionEssential, isDeleted: false, createdAt: now, updatedAt: now, returnWindowDays: 7 },
];;

// ──────────────────────────────────────────────
// 3. USERS — 1 Vendor, 5 Retailers
// ──────────────────────────────────────────────
const USER_IDS = {
  vendor1: uid(),
  r1: uid(), r2: uid(), r3: uid(), r4: uid(), r5: uid(),
};

const PASSWORD = hashPwd('Test@1234');
const ADMIN_PASSWORD = hashPwd('change-me-on-first-login');

const userRows = [
  // Super Admin
  {
    id: uid(), mobile: '+919999999999', email: 'admin@ambdmp.com',
    fullName: 'System Administrator', passwordHash: ADMIN_PASSWORD,
    role: 'SUPER_ADMIN', status: 'ACTIVE', isVerified: true,
    isDeleted: false, createdAt: daysAgo(90), updatedAt: now
  },
  // Vendor
  {
    id: USER_IDS.vendor1, mobile: '+919876543210', email: 'vendor1@supplysetu.in',
    fullName: 'Rajesh Sharma', passwordHash: PASSWORD,
    role: 'VENDOR', status: 'ACTIVE', isVerified: true,
    isDeleted: false, createdAt: daysAgo(90), updatedAt: now
  },
  // Retailers
  {
    id: USER_IDS.r1, mobile: '+919812345671', email: 'ramesh@example.in',
    fullName: 'Ramesh Kumar', passwordHash: PASSWORD,
    role: 'RETAILER', status: 'ACTIVE', isVerified: true,
    isDeleted: false, createdAt: daysAgo(80), updatedAt: now
  },
  {
    id: USER_IDS.r2, mobile: '+919812345672', email: 'sunita@example.in',
    fullName: 'Sunita Devi', passwordHash: PASSWORD,
    role: 'RETAILER', status: 'ACTIVE', isVerified: true,
    isDeleted: false, createdAt: daysAgo(75), updatedAt: now
  },
  {
    id: USER_IDS.r3, mobile: '+919812345673', email: 'mohan@example.in',
    fullName: 'Mohan Lal', passwordHash: PASSWORD,
    role: 'RETAILER', status: 'ACTIVE', isVerified: true,
    isDeleted: false, createdAt: daysAgo(70), updatedAt: now
  },
  {
    id: USER_IDS.r4, mobile: '+919812345674', email: 'priya@example.in',
    fullName: 'Priya Singh', passwordHash: PASSWORD,
    role: 'RETAILER', status: 'ACTIVE', isVerified: true,
    isDeleted: false, createdAt: daysAgo(60), updatedAt: now
  },
  {
    id: USER_IDS.r5, mobile: '+919812345675', email: 'ankit@example.in',
    fullName: 'Ankit Verma', passwordHash: PASSWORD,
    role: 'RETAILER', status: 'BLOCKED', isVerified: true,
    isDeleted: false, createdAt: daysAgo(50), updatedAt: now
  },
];

// ──────────────────────────────────────────────
// 4. VENDOR PROFILE
// ──────────────────────────────────────────────
const vendorRows = [
  {
    id: uid(), userId: USER_IDS.vendor1,
    businessName: 'Sharma Traders & Distributors',
    gstNumber: '29AABCS1429B1Z1', panNumber: 'AABCS1429B',
    address: 'Shop 12, Azad Market, Delhi',
    city: 'Delhi', state: 'Delhi', pincode: '110006',
    isDeleted: false, createdAt: daysAgo(90), updatedAt: now
  },
];

// ──────────────────────────────────────────────
// 5. RETAILER PROFILES
// ──────────────────────────────────────────────
const retailerRows = [
  { id: uid(), userId: USER_IDS.r1, businessName: 'Ramesh General Store', ownerName: 'Ramesh Kumar', businessType: 'Kirana', gstNumber: null, address: 'Gandhi Nagar, Jaipur', city: 'Jaipur', state: 'Rajasthan', pincode: '302004', creditLimit: INR(25000), isDeleted: false, createdAt: daysAgo(80), updatedAt: now },
  { id: uid(), userId: USER_IDS.r2, businessName: 'Sunita Provision Store', ownerName: 'Sunita Devi', businessType: 'Kirana', gstNumber: null, address: 'Civil Lines, Lucknow', city: 'Lucknow', state: 'Uttar Pradesh', pincode: '226001', creditLimit: INR(15000), isDeleted: false, createdAt: daysAgo(75), updatedAt: now },
  { id: uid(), userId: USER_IDS.r3, businessName: 'Mohan Mini Mart', ownerName: 'Mohan Lal', businessType: 'Supermarket', gstNumber: '07AABCS1234C1Z2', address: 'Sector 12, Noida', city: 'Noida', state: 'Uttar Pradesh', pincode: '201301', creditLimit: INR(50000), isDeleted: false, createdAt: daysAgo(70), updatedAt: now },
  { id: uid(), userId: USER_IDS.r4, businessName: 'Priya Sweets & General', ownerName: 'Priya Singh', businessType: 'Kirana', gstNumber: null, address: 'M.G. Road, Indore', city: 'Indore', state: 'Madhya Pradesh', pincode: '452001', creditLimit: INR(10000), isDeleted: false, createdAt: daysAgo(60), updatedAt: now },
  { id: uid(), userId: USER_IDS.r5, businessName: 'Ankit Departmental Store', ownerName: 'Ankit Verma', businessType: 'Departmental', gstNumber: null, address: 'Boring Road, Patna', city: 'Patna', state: 'Bihar', pincode: '800001', creditLimit: INR(20000), isDeleted: false, createdAt: daysAgo(50), updatedAt: now },
];

// ──────────────────────────────────────────────
// 6. ORDERS  (20 orders across all retailers)
// ──────────────────────────────────────────────
type OrderStatus = 'PENDING' | 'CONFIRMED' | 'DISPATCHED' | 'DELIVERED' | 'CANCELLED';

interface SeedOrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  gstRate: number;
}

interface SeedOrder {
  userId: string;
  orderNumber: string;
  status: OrderStatus;
  items: SeedOrderItem[];
  daysBack: number;
}

const makeOrder = (
  userId: string,
  orderNum: string,
  status: OrderStatus,
  items: SeedOrderItem[],
  daysBack: number
): SeedOrder => ({ userId, orderNumber: orderNum, status, items, daysBack });

const ORDERS: SeedOrder[] = [
  // Ramesh — r1
  makeOrder(USER_IDS.r1, 'ORD-2026-0001', 'DELIVERED',
    [{ productId: PROD_IDS.p1, productName: 'Jhaadu Classic Broom', quantity: 10, unitPrice: INR(45), gstRate: 5 },
     { productId: PROD_IDS.p2, productName: 'Pochha Mop Refill', quantity: 5, unitPrice: INR(120), gstRate: 5 }], 30),

  makeOrder(USER_IDS.r1, 'ORD-2026-0002', 'DELIVERED',
    [{ productId: PROD_IDS.p3, productName: 'Phenyl Concentrate 1L', quantity: 12, unitPrice: INR(95), gstRate: 18 },
     { productId: PROD_IDS.p4, productName: 'Detergent Powder 1kg', quantity: 20, unitPrice: INR(75), gstRate: 18 }], 22),

  makeOrder(USER_IDS.r1, 'ORD-2026-0003', 'CONFIRMED',
    [{ productId: PROD_IDS.p7, productName: 'Bath Soap Rose 100g', quantity: 48, unitPrice: INR(32), gstRate: 12 }], 5),

  makeOrder(USER_IDS.r1, 'ORD-2026-0004', 'PENDING',
    [{ productId: PROD_IDS.p11, productName: 'Biscuit Glucose 100g', quantity: 100, unitPrice: INR(12), gstRate: 12 },
     { productId: PROD_IDS.p10, productName: 'Salt 1kg', quantity: 50, unitPrice: INR(20), gstRate: 0 }], 1),

  // Sunita — r2
  makeOrder(USER_IDS.r2, 'ORD-2026-0005', 'DELIVERED',
    [{ productId: PROD_IDS.p5, productName: 'Mosquito Coil (10pcs)', quantity: 30, unitPrice: INR(28), gstRate: 12 },
     { productId: PROD_IDS.p6, productName: 'Incense Sticks Agarbatti', quantity: 20, unitPrice: INR(42), gstRate: 5 }], 28),

  makeOrder(USER_IDS.r2, 'ORD-2026-0006', 'DISPATCHED',
    [{ productId: PROD_IDS.p8, productName: 'Shampoo Sachet 8ml', quantity: 60, unitPrice: INR(22), gstRate: 18 },
     { productId: PROD_IDS.p9, productName: 'Toothpaste 100g', quantity: 24, unitPrice: INR(48), gstRate: 12 }], 7),

  makeOrder(USER_IDS.r2, 'ORD-2026-0007', 'DELIVERED',
    [{ productId: PROD_IDS.p1, productName: 'Jhaadu Classic Broom', quantity: 6, unitPrice: INR(45), gstRate: 5 }], 14),

  makeOrder(USER_IDS.r2, 'ORD-2026-0008', 'CANCELLED',
    [{ productId: PROD_IDS.p12, productName: 'Notebook A5 200 Pages', quantity: 12, unitPrice: INR(60), gstRate: 12 }], 10),

  // Mohan — r3
  makeOrder(USER_IDS.r3, 'ORD-2026-0009', 'DELIVERED',
    [{ productId: PROD_IDS.p3, productName: 'Phenyl Concentrate 1L', quantity: 24, unitPrice: INR(95), gstRate: 18 },
     { productId: PROD_IDS.p2, productName: 'Pochha Mop Refill', quantity: 10, unitPrice: INR(120), gstRate: 5 },
     { productId: PROD_IDS.p4, productName: 'Detergent Powder 1kg', quantity: 30, unitPrice: INR(75), gstRate: 18 }], 35),

  makeOrder(USER_IDS.r3, 'ORD-2026-0010', 'DELIVERED',
    [{ productId: PROD_IDS.p7, productName: 'Bath Soap Rose 100g', quantity: 96, unitPrice: INR(32), gstRate: 12 },
     { productId: PROD_IDS.p8, productName: 'Shampoo Sachet 8ml', quantity: 120, unitPrice: INR(22), gstRate: 18 }], 25),

  makeOrder(USER_IDS.r3, 'ORD-2026-0011', 'CONFIRMED',
    [{ productId: PROD_IDS.p10, productName: 'Salt 1kg', quantity: 100, unitPrice: INR(20), gstRate: 0 },
     { productId: PROD_IDS.p11, productName: 'Biscuit Glucose 100g', quantity: 200, unitPrice: INR(12), gstRate: 12 }], 3),

  makeOrder(USER_IDS.r3, 'ORD-2026-0012', 'PENDING',
    [{ productId: PROD_IDS.p5, productName: 'Mosquito Coil (10pcs)', quantity: 50, unitPrice: INR(28), gstRate: 12 }], 0),

  // Priya — r4
  makeOrder(USER_IDS.r4, 'ORD-2026-0013', 'DELIVERED',
    [{ productId: PROD_IDS.p6, productName: 'Incense Sticks Agarbatti', quantity: 40, unitPrice: INR(42), gstRate: 5 }], 20),

  makeOrder(USER_IDS.r4, 'ORD-2026-0014', 'DISPATCHED',
    [{ productId: PROD_IDS.p9, productName: 'Toothpaste 100g', quantity: 36, unitPrice: INR(48), gstRate: 12 },
     { productId: PROD_IDS.p7, productName: 'Bath Soap Rose 100g', quantity: 24, unitPrice: INR(32), gstRate: 12 }], 4),

  makeOrder(USER_IDS.r4, 'ORD-2026-0015', 'DELIVERED',
    [{ productId: PROD_IDS.p12, productName: 'Notebook A5 200 Pages', quantity: 20, unitPrice: INR(60), gstRate: 12 },
     { productId: PROD_IDS.p1, productName: 'Jhaadu Classic Broom', quantity: 5, unitPrice: INR(45), gstRate: 5 }], 12),

  // Ankit — r5 (blocked user but has historical orders)
  makeOrder(USER_IDS.r5, 'ORD-2026-0016', 'DELIVERED',
    [{ productId: PROD_IDS.p4, productName: 'Detergent Powder 1kg', quantity: 25, unitPrice: INR(75), gstRate: 18 }], 40),

  makeOrder(USER_IDS.r5, 'ORD-2026-0017', 'DELIVERED',
    [{ productId: PROD_IDS.p3, productName: 'Phenyl Concentrate 1L', quantity: 15, unitPrice: INR(95), gstRate: 18 },
     { productId: PROD_IDS.p2, productName: 'Pochha Mop Refill', quantity: 8, unitPrice: INR(120), gstRate: 5 }], 33),

  makeOrder(USER_IDS.r5, 'ORD-2026-0018', 'CANCELLED',
    [{ productId: PROD_IDS.p8, productName: 'Shampoo Sachet 8ml', quantity: 30, unitPrice: INR(22), gstRate: 18 }], 28),

  // Extra — Ramesh large order
  makeOrder(USER_IDS.r1, 'ORD-2026-0019', 'DELIVERED',
    [{ productId: PROD_IDS.p4, productName: 'Detergent Powder 1kg', quantity: 50, unitPrice: INR(75), gstRate: 18 },
     { productId: PROD_IDS.p3, productName: 'Phenyl Concentrate 1L', quantity: 24, unitPrice: INR(95), gstRate: 18 },
     { productId: PROD_IDS.p1, productName: 'Jhaadu Classic Broom', quantity: 20, unitPrice: INR(45), gstRate: 5 }], 18),

  // Mohan last-minute order
  makeOrder(USER_IDS.r3, 'ORD-2026-0020', 'DELIVERED',
    [{ productId: PROD_IDS.p6, productName: 'Incense Sticks Agarbatti', quantity: 60, unitPrice: INR(42), gstRate: 5 },
     { productId: PROD_IDS.p5, productName: 'Mosquito Coil (10pcs)', quantity: 40, unitPrice: INR(28), gstRate: 12 }], 8),
];

// ──────────────────────────────────────────────
// MAIN SEED FUNCTION
// ──────────────────────────────────────────────
async function seed() {
  console.log('🧹 Clearing old tables...');
  try {
    await db.delete(ledgerEntries);
    await db.delete(orderItems);
    await db.delete(orders);
    await db.delete(retailers);
    await db.delete(vendors);
    await db.delete(users);
    await db.delete(products);
    await db.delete(categories);
    console.log('   ✓ Tables cleared\n');
  } catch (e: any) {
    console.warn(`  ⚠ Failed to clear tables: ${e.message}`);
  }

  // ── Categories ──────────────────────────────
  console.log('📂 Inserting categories...');
  for (const cat of categoryRows) {
    try {
      await db.insert(categories).values(cat).onConflictDoNothing();
    } catch (e: any) { console.warn(`  ⚠ Category ${cat.name}: ${e.message}`); }
  }
  console.log(`   ✓ ${categoryRows.length} categories\n`);

  // ── Products ────────────────────────────────
  console.log('📦 Inserting products...');
  for (const p of productRows) {
    try {
      await db.insert(products).values(p as any).onConflictDoNothing();
    } catch (e: any) { console.warn(`  ⚠ Product ${p.name}: ${e.message}`); }
  }
  console.log(`   ✓ ${productRows.length} products\n`);

  // ── Users ───────────────────────────────────
  console.log('👤 Inserting users...');
  for (const u of userRows) {
    try {
      await db.insert(users).values(u as any).onConflictDoNothing();
    } catch (e: any) { console.warn(`  ⚠ User ${u.mobile}: ${e.message}`); }
  }
  console.log(`   ✓ ${userRows.length} users\n`);

  // ── Vendor Profiles ──────────────────────────
  console.log('🏭 Inserting vendor profiles...');
  for (const v of vendorRows) {
    try {
      await db.insert(vendors).values(v as any).onConflictDoNothing();
    } catch (e: any) { console.warn(`  ⚠ Vendor: ${e.message}`); }
  }
  console.log(`   ✓ ${vendorRows.length} vendors\n`);

  // ── Retailer Profiles ────────────────────────
  console.log('🏪 Inserting retailer profiles...');
  for (const r of retailerRows) {
    try {
      await db.insert(retailers).values(r as any).onConflictDoNothing();
    } catch (e: any) { console.warn(`  ⚠ Retailer: ${e.message}`); }
  }
  console.log(`   ✓ ${retailerRows.length} retailers\n`);

  // ── Orders + Items + Ledger ─────────────────
  console.log('🛒 Inserting orders, items, and ledger entries...');
  let orderCount = 0;
  let itemCount = 0;
  let ledgerCount = 0;

  for (const order of ORDERS) {
    // Calculate totals
    let subtotal = 0;
    let gstAmount = 0;

    const itemsWithCalc = order.items.map(item => {
      const lineBase = item.unitPrice * item.quantity;
      const lineGst = Math.round(lineBase * item.gstRate / 100);
      const lineTotal = lineBase + lineGst;
      subtotal += lineBase;
      gstAmount += lineGst;
      return { ...item, lineTotal, gstAmountLine: lineGst };
    });

    const grandTotal = subtotal + gstAmount;
    const orderId = uid();
    const orderDate = daysAgo(order.daysBack);

    // Insert order
    try {
      await db.insert(orders).values({
        id: orderId,
        userId: order.userId,
        orderNumber: order.orderNumber,
        status: order.status,
        subtotal,
        gstAmount,
        discountAmount: 0,
        grandTotal,
        deliveryAddress: 'As per registered address',
        voiceOrder: false,
        isDeleted: false,
        createdAt: orderDate,
        updatedAt: orderDate,
      } as any).onConflictDoNothing();
      orderCount++;
    } catch (e: any) {
      console.warn(`  ⚠ Order ${order.orderNumber}: ${e.message}`);
      continue;
    }

    // Insert order items
    for (const item of itemsWithCalc) {
      try {
        await db.insert(orderItems).values({
          id: uid(),
          orderId,
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          gstRate: item.gstRate,
          lineTotal: item.lineTotal,
          gstAmount: item.gstAmountLine,
          isDeleted: false,
          createdAt: orderDate,
          updatedAt: orderDate,
        } as any).onConflictDoNothing();
        itemCount++;
      } catch (e: any) { console.warn(`  ⚠ OrderItem: ${e.message}`); }
    }

    // Insert ledger entry (DEBIT = customer owes money) for non-cancelled orders
    if (order.status !== 'CANCELLED') {
      try {
        await db.insert(ledgerEntries).values({
          id: uid(),
          userId: order.userId,
          entryType: 'DEBIT',
          amount: grandTotal,
          referenceType: 'order',
          referenceId: orderId,
          description: `Order ${order.orderNumber} — ${order.items.length} item(s)`,
          isDeleted: false,
          createdAt: orderDate,
          updatedAt: orderDate,
        } as any).onConflictDoNothing();
        ledgerCount++;
      } catch (e: any) { console.warn(`  ⚠ Ledger DEBIT: ${e.message}`); }

      // Add CREDIT for delivered orders (payment received)
      if (order.status === 'DELIVERED') {
        const payDate = new Date(orderDate.getTime() + 2 * 86400_000);
        try {
          await db.insert(ledgerEntries).values({
            id: uid(),
            userId: order.userId,
            entryType: 'CREDIT',
            amount: grandTotal,
            referenceType: 'payment',
            referenceId: orderId,
            description: `Payment received for ${order.orderNumber}`,
            isDeleted: false,
            createdAt: payDate,
            updatedAt: payDate,
          } as any).onConflictDoNothing();
          ledgerCount++;
        } catch (e: any) { console.warn(`  ⚠ Ledger CREDIT: ${e.message}`); }
      }
    }
  }

  console.log(`   ✓ ${orderCount} orders, ${itemCount} line items, ${ledgerCount} ledger entries\n`);

  console.log('════════════════════════════════════════');
  console.log('✅ Seed complete!\n');
  console.log('Login credentials (all users):');
  console.log('  Password : Test@1234\n');
  console.log('  Vendor   : +919876543210  (Rajesh Sharma / Sharma Traders)');
  console.log('  Retailer1: +919812345671  (Ramesh Kumar / Ramesh General Store)');
  console.log('  Retailer2: +919812345672  (Sunita Devi / Sunita Provision Store)');
  console.log('  Retailer3: +919812345673  (Mohan Lal / Mohan Mini Mart)');
  console.log('  Retailer4: +919812345674  (Priya Singh / Priya Sweets)');
  console.log('  Retailer5: +919812345675  (Ankit Verma — BLOCKED)');
  console.log('════════════════════════════════════════\n');

  // ── Discount Coupons ──────────────────────────
  console.log('🏷️ Inserting active coupon codes...');
  const coupons = [
    {
      id: uid(),
      code: 'WELCOME10',
      discountType: 'FLAT',
      value: INR(10),
      minOrderValue: INR(100),
      validFrom: daysAgo(30),
      validUntil: daysAgo(-30),
      isActive: true,
      isDeleted: false,
      description: 'Flat 10 INR off on orders above 100 INR'
    },
    {
      id: uid(),
      code: 'SUPPLY20',
      discountType: 'PERCENTAGE',
      value: 20,
      minOrderValue: INR(500),
      validFrom: daysAgo(30),
      validUntil: daysAgo(-30),
      isActive: true,
      isDeleted: false,
      description: '20% off on bulk orders above 500 INR'
    },
    {
      id: uid(),
      code: 'FESTIVE50',
      discountType: 'FLAT',
      value: INR(50),
      minOrderValue: INR(1000),
      validFrom: daysAgo(30),
      validUntil: daysAgo(-30),
      isActive: true,
      isDeleted: false,
      description: 'Flat 50 INR off on orders above 1000 INR'
    }
  ];

  for (const c of coupons) {
    try {
      await db.insert(discountCodes).values(c as any).onConflictDoNothing();
    } catch (e: any) { console.warn(`  ⚠ Coupon ${c.code}: ${e.message}`); }
  }
  console.log(`   ✓ ${coupons.length} coupons\n`);

  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
