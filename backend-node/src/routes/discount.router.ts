import { Router } from 'express';
import { getCurrentUser, requireAdmin, AuthenticatedRequest } from '../middleware/auth.js';
import { db } from '../db/index.js';
import { discountCodes, dealerSchemes } from '../db/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { AuditService } from '../services/audit.service.js';
import { AppError } from '../utils/errors.js';
import { z } from 'zod';

const router = Router();
const auditService = new AuditService();

// Zod validation schemas
const discountCodeCreateSchema = z.object({
  code: z.string().min(1).toUpperCase(),
  discount_type: z.enum(['FLAT', 'PERCENTAGE']),
  value: z.number().int().positive(),
  min_order_value: z.number().int().nonnegative().optional(),
  max_usage_count: z.number().int().nonnegative().optional(),
  valid_from: z.string().transform((val) => new Date(val)),
  valid_until: z.string().transform((val) => new Date(val)),
  scope_type: z.string().nullable().optional(),
  scope_id: z.string().uuid().nullable().optional(),
  description: z.string().nullable().optional(),
});

const dealerSchemeCreateSchema = z.object({
  user_id: z.string().uuid().nullable().optional(),
  scheme_type: z.enum(['VOLUME', 'BUY_X_GET_Y']),
  product_id: z.string().uuid().nullable().optional(),
  category_id: z.string().uuid().nullable().optional(),
  min_qty: z.number().int().positive(),
  discount_pct: z.number().int().nonnegative(),
  free_qty: z.number().int().nonnegative(),
  valid_from: z.string().transform((val) => new Date(val)),
  valid_until: z.string().transform((val) => new Date(val)),
  description: z.string().nullable().optional(),
});

// ── Discount Codes Endpoints ─────────────────────────────────

router.get('/discounts', getCurrentUser as any, async (req, res, next) => {
  try {
    const now = new Date();
    const list = await db
      .select()
      .from(discountCodes)
      .where(
        and(
          eq(discountCodes.isDeleted, false),
          eq(discountCodes.isActive, true)
        )
      )
      .orderBy(desc(discountCodes.createdAt));

    const activeCoupons = list.filter(c => c.validFrom <= now && c.validUntil >= now);

    return res.status(200).json(
      activeCoupons.map((c) => ({
        id: c.id,
        code: c.code,
        discount_type: c.discountType.toLowerCase(),
        value: c.value,
        min_order_value: c.minOrderValue,
        description: c.description,
      }))
    );
  } catch (error) {
    next(error);
  }
});

router.post('/admin/discounts', getCurrentUser as any, requireAdmin as any, async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = discountCodeCreateSchema.parse(req.body);

    const [existing] = await db
      .select()
      .from(discountCodes)
      .where(and(eq(discountCodes.code, data.code), eq(discountCodes.isDeleted, false)));

    if (existing) {
      throw new AppError(400, `Discount code '${data.code}' already exists`, 'BAD_REQUEST');
    }

    const [codeObj] = await db
      .insert(discountCodes)
      .values({
        code: data.code,
        discountType: data.discount_type,
        value: data.value,
        minOrderValue: data.min_order_value !== undefined ? data.min_order_value : 0,
        maxUsageCount: data.max_usage_count !== undefined ? data.max_usage_count : 0,
        validFrom: data.valid_from,
        validUntil: data.valid_until,
        scopeType: data.scope_type || null,
        scopeId: data.scope_id || null,
        description: data.description || null,
      })
      .returning();

    await auditService.logAction(
      req.user!.id,
      req.user!.role,
      'create_discount',
      'discount_code',
      codeObj.id
    );

    return res.status(201).json({
      id: codeObj.id,
      code: codeObj.code,
      discount_type: codeObj.discountType.toLowerCase(),
      value: codeObj.value,
      min_order_value: codeObj.minOrderValue,
      max_usage_count: codeObj.maxUsageCount,
      valid_from: codeObj.validFrom,
      valid_until: codeObj.validUntil,
      scope_type: codeObj.scopeType,
      scope_id: codeObj.scopeId,
      description: codeObj.description,
      is_active: codeObj.isActive,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/admin/discounts', getCurrentUser as any, requireAdmin as any, async (req, res, next) => {
  try {
    const list = await db
      .select()
      .from(discountCodes)
      .where(eq(discountCodes.isDeleted, false))
      .orderBy(desc(discountCodes.createdAt));

    return res.status(200).json(
      list.map((c) => ({
        id: c.id,
        code: c.code,
        discount_type: c.discountType.toLowerCase(),
        value: c.value,
        min_order_value: c.minOrderValue,
        max_usage_count: c.maxUsageCount,
        valid_from: c.validFrom,
        valid_until: c.validUntil,
        scope_type: c.scopeType,
        scope_id: c.scopeId,
        description: c.description,
        is_active: c.isActive,
      }))
    );
  } catch (error) {
    next(error);
  }
});

router.delete('/admin/discounts/:id', getCurrentUser as any, requireAdmin as any, async (req: AuthenticatedRequest, res, next) => {
  try {
    const [codeObj] = await db
      .select()
      .from(discountCodes)
      .where(and(eq(discountCodes.id, req.params.id), eq(discountCodes.isDeleted, false)));

    if (!codeObj) {
      throw new AppError(404, 'Discount code not found', 'NOT_FOUND');
    }

    await db
      .update(discountCodes)
      .set({ isDeleted: true, deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(discountCodes.id, req.params.id));

    await auditService.logAction(
      req.user!.id,
      req.user!.role,
      'delete_discount',
      'discount_code',
      req.params.id
    );

    return res.status(200).json({ message: 'Discount code deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// ── Dealer Schemes Endpoints ─────────────────────────────────

router.post('/admin/dealer-schemes', getCurrentUser as any, requireAdmin as any, async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = dealerSchemeCreateSchema.parse(req.body);

    const [scheme] = await db
      .insert(dealerSchemes)
      .values({
        userId: data.user_id || null,
        schemeType: data.scheme_type,
        productId: data.product_id || null,
        categoryId: data.category_id || null,
        minQty: data.min_qty,
        discountPct: data.discount_pct,
        freeQty: data.free_qty,
        validFrom: data.valid_from,
        validUntil: data.valid_until,
        description: data.description || null,
      })
      .returning();

    await auditService.logAction(
      req.user!.id,
      req.user!.role,
      'create_dealer_scheme',
      'dealer_scheme',
      scheme.id
    );

    return res.status(201).json({
      id: scheme.id,
      user_id: scheme.userId,
      scheme_type: scheme.schemeType.toLowerCase(),
      product_id: scheme.productId,
      category_id: scheme.categoryId,
      min_qty: scheme.minQty,
      discount_pct: scheme.discountPct,
      free_qty: scheme.freeQty,
      valid_from: scheme.validFrom,
      valid_until: scheme.validUntil,
      description: scheme.description,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/admin/dealer-schemes', getCurrentUser as any, requireAdmin as any, async (req, res, next) => {
  try {
    const list = await db
      .select()
      .from(dealerSchemes)
      .where(eq(dealerSchemes.isDeleted, false))
      .orderBy(desc(dealerSchemes.createdAt));

    return res.status(200).json(
      list.map((s) => ({
        id: s.id,
        user_id: s.userId,
        scheme_type: s.schemeType.toLowerCase(),
        product_id: s.productId,
        category_id: s.categoryId,
        min_qty: s.minQty,
        discount_pct: s.discountPct,
        free_qty: s.freeQty,
        valid_from: s.validFrom,
        valid_until: s.validUntil,
        description: s.description,
      }))
    );
  } catch (error) {
    next(error);
  }
});

router.delete('/admin/dealer-schemes/:id', getCurrentUser as any, requireAdmin as any, async (req: AuthenticatedRequest, res, next) => {
  try {
    const [scheme] = await db
      .select()
      .from(dealerSchemes)
      .where(and(eq(dealerSchemes.id, req.params.id), eq(dealerSchemes.isDeleted, false)));

    if (!scheme) {
      throw new AppError(404, 'Dealer scheme not found', 'NOT_FOUND');
    }

    await db
      .update(dealerSchemes)
      .set({ isDeleted: true, deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(dealerSchemes.id, req.params.id));

    await auditService.logAction(
      req.user!.id,
      req.user!.role,
      'delete_dealer_scheme',
      'dealer_scheme',
      req.params.id
    );

    return res.status(200).json({ message: 'Dealer scheme deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
