import { Router } from 'express';
import { getCurrentUser, requireAdmin } from '../middleware/auth.js';
import { ProductService } from '../services/product.service.js';
import { AuditService } from '../services/audit.service.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import multer from 'multer';
import { z } from 'zod';
import path from 'path';
import fs from 'fs';
import { db } from '../db/index.js';
import { sql } from 'drizzle-orm';
import crypto from 'crypto';

const router = Router();
const productService = new ProductService();
const auditService = new AuditService();

// Helper to convert snake_case object keys to camelCase
function toCamel(s: string): string {
  return s.replace(/([-_][a-z])/ig, ($1) => {
    return $1.toUpperCase()
      .replace('-', '')
      .replace('_', '');
  });
}

function keysToCamel(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(v => keysToCamel(v));
  } else if (obj !== null && obj !== undefined && obj.constructor === Object) {
    return Object.keys(obj).reduce(
      (result, key) => ({
        ...result,
        [toCamel(key)]: keysToCamel(obj[key]),
      }),
      {}
    );
  }
  return obj;
}

const camelCaseMiddleware = (req: any, res: any, next: any) => {
  if (req.body) {
    req.body = keysToCamel(req.body);
  }
  next();
};

// Multer Memory storage config for file uploads
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!['.png', '.jpg', '.jpeg', '.webp', '.gif', '.csv', '.xlsx', '.xls'].includes(ext)) {
      return cb(new Error('File format not supported'));
    }
    cb(null, true);
  },
});

// Zod validation schemas
const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  image_url: z.string().optional(),
  parentId: z.string().nullable().optional(),
  parent_id: z.string().nullable().optional(),
  visibleToVendor: z.boolean().optional(),
  visible_to_vendor: z.boolean().optional(),
  visibleToRetailer: z.boolean().optional(),
  visible_to_retailer: z.boolean().optional(),
  isActive: z.boolean().optional(),
  is_active: z.boolean().optional(),
});

const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  sku: z.string().min(1, 'SKU is required'),
  description: z.string().optional(),
  returnPolicy: z.string().optional(),
  returnWindowDays: z.number().int().nonnegative().optional(),
  unit: z.string().optional(),
  hsnCode: z.string().optional(),
  basePrice: z.number().int().positive('Base price must be positive'),
  gstRate: z.number().int().nonnegative(),
  stockQty: z.number().int().nonnegative().optional(),
  lowStockThreshold: z.number().int().nonnegative().optional(),
  status: z.enum(['ACTIVE', 'HIDDEN']).optional(),
  categoryId: z.string(),
  subCategoryId: z.string().nullable().optional(),
  imageUrls: z.array(z.string()).optional(),
  vendorPrice: z.number().int().nonnegative().nullable().optional(),
  retailerPrice: z.number().int().nonnegative().nullable().optional(),
});

const stockAdjustmentSchema = z.object({
  adjustment: z.number().int(),
  reason: z.string().min(1, 'Adjustment reason is required'),
});

router.post('/upload', getCurrentUser as any, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    const ext = path.extname(req.file.originalname).toLowerCase();
    const filename = `${crypto.randomUUID()}${ext}`;
    const mimeType = req.file.mimetype;
    
    // Save image to the database table for persistent serverless storage
    await db.execute(sql`
      INSERT INTO uploaded_files (filename, mime_type, binary_data)
      VALUES (${filename}, ${mimeType}, ${req.file.buffer})
    `);

    const hostHeader = req.get('x-forwarded-host') || req.get('host');
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const backendUrl = process.env.BACKEND_URL || (process.env.VERCEL ? `${protocol}://${hostHeader}` : 'http://localhost:8000');
    const cleanUrl = backendUrl.endsWith('/') ? backendUrl.slice(0, -1) : backendUrl;
    const imageUrl = `${cleanUrl}/uploads/${filename}`;
    return res.status(200).json({ image_url: imageUrl });
  } catch (error) {
    next(error);
  }
});

// ── Categories Endpoints ─────────────────────────────────────
router.post('/categories', getCurrentUser as any, requireAdmin as any, camelCaseMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = categorySchema.parse(req.body);
    const category = await productService.createCategory(data);
    await auditService.logAction(
      req.user!.id,
      req.user!.role,
      'create_category',
      'category',
      category.id
    );
    return res.status(201).json(category);
  } catch (error) {
    next(error);
  }
});

router.get('/categories/tree', async (req, res, next) => {
  try {
    const tree = await productService.getCategoryTree();
    return res.status(200).json(tree);
  } catch (error) {
    next(error);
  }
});

router.get('/categories', getCurrentUser as any, async (req, res, next) => {
  try {
    const depth = req.query.depth !== undefined ? Number(req.query.depth) : undefined;
    const parentId = req.query.parent_id ? String(req.query.parent_id) : undefined;
    const isActive = req.query.is_active !== undefined ? req.query.is_active === 'true' : undefined;

    const list = await productService.listCategories(depth, parentId, isActive);
    return res.status(200).json(list);
  } catch (error) {
    next(error);
  }
});

router.get('/categories/:id', getCurrentUser as any, async (req, res, next) => {
  try {
    const category = await productService.getCategoryById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    return res.status(200).json(category);
  } catch (error) {
    next(error);
  }
});

router.patch('/categories/:id', getCurrentUser as any, requireAdmin as any, camelCaseMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = categorySchema.partial().parse(req.body);
    const category = await productService.updateCategory(req.params.id, data);
    await auditService.logAction(
      req.user!.id,
      req.user!.role,
      'update_category',
      'category',
      category.id,
      data
    );
    return res.status(200).json(category);
  } catch (error) {
    next(error);
  }
});

router.delete('/categories/:id', getCurrentUser as any, requireAdmin as any, async (req: AuthenticatedRequest, res, next) => {
  try {
    await productService.softDeleteCategory(req.params.id);
    await auditService.logAction(
      req.user!.id,
      req.user!.role,
      'delete_category',
      'category',
      req.params.id
    );
    return res.status(200).json({ message: 'Category deleted' });
  } catch (error) {
    next(error);
  }
});

// ── Products Endpoints ───────────────────────────────────────
router.post('/products', getCurrentUser as any, requireAdmin as any, camelCaseMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = productSchema.parse(req.body);
    const product = await productService.createProduct(data);
    await auditService.logAction(
      req.user!.id,
      req.user!.role,
      'create_product',
      'product',
      product.id
    );
    return res.status(201).json(product);
  } catch (error) {
    next(error);
  }
});

router.get('/products', getCurrentUser as any, async (req: AuthenticatedRequest, res, next) => {
  try {
    const filters = {
      keyword: req.query.keyword ? String(req.query.keyword) : undefined,
      categoryId: req.query.category_id ? String(req.query.category_id) : undefined,
      subCategoryId: req.query.sub_category_id ? String(req.query.sub_category_id) : undefined,
      priceMin: req.query.price_min !== undefined ? Number(req.query.price_min) : undefined,
      priceMax: req.query.price_max !== undefined ? Number(req.query.price_max) : undefined,
      inStock: req.query.in_stock === 'true',
      status: req.query.status ? String(req.query.status) : undefined,
      page: req.query.page !== undefined ? Number(req.query.page) : 1,
      pageSize: req.query.page_size !== undefined ? Number(req.query.page_size) : 20,
    };

    const list = await productService.listProducts(filters, req.user!.role);
    return res.status(200).json(list);
  } catch (error) {
    next(error);
  }
});

router.get('/products/:id', getCurrentUser as any, async (req: AuthenticatedRequest, res, next) => {
  try {
    const product = await productService.getProductById(req.params.id, req.user!.role);
    return res.status(200).json(product);
  } catch (error) {
    next(error);
  }
});

router.patch('/products/:id', getCurrentUser as any, requireAdmin as any, camelCaseMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = productSchema.partial().parse(req.body);
    const product = await productService.updateProduct(req.params.id, data);
    await auditService.logAction(
      req.user!.id,
      req.user!.role,
      'update_product',
      'product',
      product.id,
      data
    );
    return res.status(200).json(product);
  } catch (error) {
    next(error);
  }
});

router.patch('/products/:id/stock', getCurrentUser as any, requireAdmin as any, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { adjustment, reason } = stockAdjustmentSchema.parse(req.body);
    const result = await productService.adjustStock(req.params.id, adjustment);
    await auditService.logAction(
      req.user!.id,
      req.user!.role,
      'stock_adjustment',
      'product',
      req.params.id,
      { adjustment, reason }
    );
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

// ── Bulk Upload products CSV/XLSX ────────────────────────────
router.post('/products/bulk-upload', getCurrentUser as any, requireAdmin as any, upload.single('file'), async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    const result = await productService.bulkUploadProducts(req.file.buffer || fs.readFileSync(req.file.path), req.file.originalname);
    await auditService.logAction(
      req.user!.id,
      req.user!.role,
      'bulk_upload_products',
      'product',
      null,
      { count: result.success_count }
    );
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
