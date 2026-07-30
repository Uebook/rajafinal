import { Router } from 'express';
import { getCurrentUser, AuthenticatedRequest } from '../middleware/auth.js';
import { db } from '../db/index.js';
import { carts, cartItems, products, vendorPricing, retailerPricing, productImages, discountCodes } from '../db/schema.js';
import { eq, and, inArray } from 'drizzle-orm';
import { AppError } from '../utils/errors.js';
import { z } from 'zod';

const router = Router();

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

const cartAddSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  quantity: z.number().int().positive('Quantity must be positive'),
});

const cartItemUpdateSchema = z.object({
  quantity: z.number().int().positive('Quantity must be positive'),
});

// Helper to get or create active cart for user
async function getOrCreateCart(userId: string) {
  let [cart] = await db
    .select()
    .from(carts)
    .where(and(eq(carts.userId, userId), eq(carts.isDeleted, false)));

  if (!cart) {
    const [newCart] = await db
      .insert(carts)
      .values({ userId })
      .returning();
    cart = newCart;
  }
  return cart;
}

// ── 1. Get Cart ──────────────────────────────────────────────
router.get('/cart', getCurrentUser as any, async (req: AuthenticatedRequest, res, next) => {
  try {
    const cart = await getOrCreateCart(req.user!.id);

    const items = await db
      .select({
        id: cartItems.id,
        cartId: cartItems.cartId,
        productId: cartItems.productId,
        quantity: cartItems.quantity,
        price_snapshot: cartItems.price_snapshot,
        createdAt: cartItems.createdAt,
        updatedAt: cartItems.updatedAt,
        is_deleted: cartItems.isDeleted,
        product_name: products.name,
        product_sku: products.sku,
        product_image_url: productImages.imageUrl,
        gst_rate: products.gstRate,
        stock_qty: products.stockQty,
      })
      .from(cartItems)
      .innerJoin(products, eq(cartItems.productId, products.id))
      .leftJoin(
        productImages,
        and(
          eq(products.id, productImages.productId),
          eq(productImages.sortOrder, 0),
          eq(productImages.isDeleted, false)
        )
      )
      .where(and(eq(cartItems.cartId, cart.id), eq(cartItems.isDeleted, false)));

    return res.status(200).json({ items });
  } catch (error) {
    next(error);
  }
});

// ── 2. Add to Cart ───────────────────────────────────────────
router.post('/cart/add', getCurrentUser as any, camelCaseMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { productId, quantity } = cartAddSchema.parse(req.body);
    const cart = await getOrCreateCart(req.user!.id);

    // Resolve role-based product price
    const [product] = await db
      .select()
      .from(products)
      .where(and(eq(products.id, productId), eq(products.isDeleted, false)));

    if (!product) {
      throw new AppError(404, 'Product not found', 'NOT_FOUND');
    }

    const [vp] = await db
      .select()
      .from(vendorPricing)
      .where(and(eq(vendorPricing.productId, productId), eq(vendorPricing.isDeleted, false)));

    const [rp] = await db
      .select()
      .from(retailerPricing)
      .where(and(eq(retailerPricing.productId, productId), eq(retailerPricing.isDeleted, false)));

    let resolvedPrice = product.basePrice;
    if (req.user!.role === 'VENDOR' && vp) {
      resolvedPrice = vp.price;
    } else if (req.user!.role === 'RETAILER' && rp) {
      resolvedPrice = rp.price;
    }

    // Check stock limit
    const targetQty = quantity;
    if (targetQty > product.stockQty) {
      throw new AppError(400, `Only ${product.stockQty} units of ${product.name} are available in stock.`, 'BAD_REQUEST');
    }

    // Check if item is already in cart
    const [existing] = await db
      .select()
      .from(cartItems)
      .where(
        and(
          eq(cartItems.cartId, cart.id),
          eq(cartItems.productId, productId),
          eq(cartItems.isDeleted, false)
        )
      );

    if (existing) {
      const newQty = existing.quantity + quantity;
      if (newQty > product.stockQty) {
        throw new AppError(400, `Only ${product.stockQty} units of ${product.name} are available in stock. (You already have ${existing.quantity} in cart)`, 'BAD_REQUEST');
      }

      await db
        .update(cartItems)
        .set({
          quantity: newQty,
          price_snapshot: resolvedPrice,
          updatedAt: new Date(),
        })
        .where(eq(cartItems.id, existing.id));
    } else {
      await db.insert(cartItems).values({
        cartId: cart.id,
        productId,
        quantity,
        price_snapshot: resolvedPrice,
      });
    }

    return res.status(200).json({ success: true, message: 'Added to cart' });
  } catch (error) {
    next(error);
  }
});

// ── 3. Update Cart Item Qty ──────────────────────────────────
router.patch('/cart/items/:id', getCurrentUser as any, camelCaseMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { quantity } = cartItemUpdateSchema.parse(req.body);

    const [item] = await db
      .select()
      .from(cartItems)
      .where(and(eq(cartItems.id, req.params.id), eq(cartItems.isDeleted, false)));

    if (!item) {
      throw new AppError(404, 'Cart item not found', 'NOT_FOUND');
    }

    // Verify stock availability
    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.id, item.productId));

    if (!product) {
      throw new AppError(404, 'Product not found', 'NOT_FOUND');
    }

    if (quantity > product.stockQty) {
      throw new AppError(400, `Only ${product.stockQty} units of ${product.name} are available in stock.`, 'BAD_REQUEST');
    }

    await db
      .update(cartItems)
      .set({
        quantity,
        updatedAt: new Date(),
      })
      .where(eq(cartItems.id, req.params.id));

    return res.status(200).json({ success: true, message: 'Cart item updated' });
  } catch (error) {
    next(error);
  }
});

// ── 4. Remove Cart Item ──────────────────────────────────────
router.delete('/cart/items/:id', getCurrentUser as any, async (req: AuthenticatedRequest, res, next) => {
  try {
    const [item] = await db
      .select()
      .from(cartItems)
      .where(and(eq(cartItems.id, req.params.id), eq(cartItems.isDeleted, false)));

    if (!item) {
      throw new AppError(404, 'Cart item not found', 'NOT_FOUND');
    }

    await db
      .update(cartItems)
      .set({
        isDeleted: true,
        deletedAt: new Date(),
      })
      .where(eq(cartItems.id, req.params.id));

    return res.status(200).json({ success: true, message: 'Item removed from cart' });
  } catch (error) {
    next(error);
  }
});

// ── 5. Validate Cart (MOV Validation) ────────────────────────
router.get('/cart/validate', getCurrentUser as any, async (req: AuthenticatedRequest, res, next) => {
  try {
    const cart = await getOrCreateCart(req.user!.id);

    const activeItems = await db
      .select()
      .from(cartItems)
      .where(and(eq(cartItems.cartId, cart.id), eq(cartItems.isDeleted, false)));

    if (activeItems.length === 0) {
      return res.status(200).json({ valid: false, reason: 'Cart is empty', shortfall_amount: 0 });
    }

    const total = activeItems.reduce((acc, curr) => acc + curr.price_snapshot * curr.quantity, 0);
    const mov = 50000; // 500 INR in paise

    if (total < mov) {
      return res.status(200).json({
        valid: false,
        reason: 'Minimum order value not met',
        shortfall_amount: mov - total,
      });
    }

    return res.status(200).json({ valid: true, shortfall_amount: 0 });
  } catch (error) {
    next(error);
  }
});

// ── 6. Apply Coupon ──────────────────────────────────────────
router.post('/cart/apply-coupon', getCurrentUser as any, camelCaseMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { code } = req.body;
    if (!code) {
      throw new AppError(400, 'Coupon code is required', 'BAD_REQUEST');
    }

    const [cart] = await db
      .select()
      .from(carts)
      .where(and(eq(carts.userId, req.user!.id), eq(carts.isDeleted, false)));

    if (!cart) {
      throw new AppError(400, 'Cart is empty', 'BAD_REQUEST');
    }

    const activeItems = await db
      .select()
      .from(cartItems)
      .where(and(eq(cartItems.cartId, cart.id), eq(cartItems.isDeleted, false)));

    if (activeItems.length === 0) {
      throw new AppError(400, 'Cart is empty', 'BAD_REQUEST');
    }

    const [coupon] = await db
      .select()
      .from(discountCodes)
      .where(
        and(
          eq(discountCodes.code, code.toUpperCase()),
          eq(discountCodes.isDeleted, false)
        )
      );

    if (!coupon) {
      throw new AppError(400, 'Invalid coupon code', 'BAD_REQUEST');
    }

    if (!coupon.isActive) {
      throw new AppError(400, 'Coupon is not active', 'BAD_REQUEST');
    }

    const now = new Date();
    if (coupon.validFrom > now) {
      throw new AppError(400, 'Coupon is not yet valid', 'BAD_REQUEST');
    }
    if (coupon.validUntil < now) {
      throw new AppError(400, 'Coupon has expired', 'BAD_REQUEST');
    }

    const subtotal = activeItems.reduce((acc, item) => acc + item.price_snapshot * item.quantity, 0);
    if (subtotal < coupon.minOrderValue) {
      throw new AppError(400, `Minimum order value of INR ${(coupon.minOrderValue / 100).toFixed(2)} not met`, 'BAD_REQUEST');
    }

    let scopedSubtotal = 0;
    if (!coupon.scopeType) {
      scopedSubtotal = subtotal;
    } else if (coupon.scopeType === 'product') {
      const scopedItems = activeItems.filter(item => item.productId === coupon.scopeId);
      scopedSubtotal = scopedItems.reduce((acc, item) => acc + item.price_snapshot * item.quantity, 0);
    } else if (coupon.scopeType === 'category') {
      const productIds = activeItems.map(i => i.productId).filter(Boolean) as string[];
      if (productIds.length > 0) {
        const dbProducts = await db
          .select({ id: products.id, categoryId: products.categoryId })
          .from(products)
          .where(inArray(products.id, productIds));
        
        const categoryMap = new Map(dbProducts.map(p => [p.id, p.categoryId]));
        const scopedItems = activeItems.filter(item => categoryMap.get(item.productId) === coupon.scopeId);
        scopedSubtotal = scopedItems.reduce((acc, item) => acc + item.price_snapshot * item.quantity, 0);
      }
    }

    if (scopedSubtotal === 0) {
      throw new AppError(400, 'Coupon code not applicable to items in cart', 'BAD_REQUEST');
    }

    let discountAmount = 0;
    if (coupon.discountType.toUpperCase() === 'PERCENTAGE') {
      discountAmount = Math.floor((scopedSubtotal * coupon.value) / 100);
    } else {
      discountAmount = Math.min(coupon.value, scopedSubtotal);
    }

    return res.status(200).json({
      discount_amount: discountAmount
    });
  } catch (error) {
    next(error);
  }
});

export default router;
