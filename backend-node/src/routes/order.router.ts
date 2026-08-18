import { Router } from 'express';
import { getCurrentUser, requireAdmin, AuthenticatedRequest } from '../middleware/auth.js';
import { OrderService } from '../services/order.service.js';
import { AuditService } from '../services/audit.service.js';
import { z } from 'zod';
import { db } from '../db/index.js';
import { orders, orderItems, ledgerEntries, retailers, products, users, carts, cartItems, discountCodes, retailerPricing } from '../db/schema.js';
import { eq, and, inArray, gte, lte, desc } from 'drizzle-orm';
import crypto from 'crypto';
import { AppError } from '../utils/errors.js';

const router = Router();
const orderService = new OrderService();
const auditService = new AuditService();

// Validation schema for status update
const orderStatusUpdateSchema = z.object({
  status: z.string().transform((val) => val.toLowerCase()).pipe(
    z.enum(['pending', 'confirmed', 'dispatched', 'delivered', 'cancelled', 'returned'])
  ),
});

// Zod schemas for pagination and queries
const ordersQuerySchema = z.object({
  order_status: z.string().optional(),
  page: z.string().regex(/^\d+$/).transform(Number).default('1'),
  page_size: z.string().regex(/^\d+$/).transform(Number).default('20'),
});

const ledgerQuerySchema = z.object({
  retailer_id: z.string().uuid().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  entry_type: z.string().optional(),
  page: z.string().regex(/^\d+$/).transform(Number).default('1'),
  page_size: z.string().regex(/^\d+$/).transform(Number).default('200'),
});

const exportQuerySchema = z.object({
  start_date: z.string().transform((val) => new Date(val)).optional(),
  end_date: z.string().transform((val) => new Date(val)).optional(),
  month: z.string().regex(/^\d+$/).transform(Number).optional(),
  year: z.string().regex(/^\d+$/).transform(Number).optional(),
});

const orderCreateSchema = z.object({
  delivery_address: z.string().min(1),
  discount_code: z.string().optional().nullable(),
});

// ── P3-10: Place Order (Atomic) ──────────────────────────────
router.post('/orders', getCurrentUser as any, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { delivery_address, discount_code } = orderCreateSchema.parse(req.body);

    if (req.user!.role === 'RETAILER') {
      const [retailer] = await db
        .select()
        .from(retailers)
        .where(eq(retailers.userId, req.user!.id));
      if (retailer && retailer.creditLimit > 0) {
        const entries = await db
          .select()
          .from(ledgerEntries)
          .where(and(eq(ledgerEntries.userId, req.user!.id), eq(ledgerEntries.isDeleted, false)));
        const outstanding = entries.reduce((acc, entry) => {
          if (entry.entryType === 'DEBIT') {
            return acc + entry.amount;
          } else {
            return acc - entry.amount;
          }
        }, 0);

        if (outstanding >= retailer.creditLimit) {
          throw new AppError(402, 'Credit limit exceeded. Please clear outstanding balance.', 'PAYMENT_REQUIRED');
        }
      }
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

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randSuffix = Math.random().toString(36).substring(2, 10).toUpperCase();
    const orderNumber = `ORD-${dateStr}-${randSuffix}`;

    const result = await db.transaction(async (tx) => {
      let subtotal = 0;
      let totalGst = 0;
      const orderItemsData = [];

      for (const cartItem of activeItems) {
        const [product] = await tx
          .select()
          .from(products)
          .where(eq(products.id, cartItem.productId));
        
        if (!product || product.stockQty < cartItem.quantity) {
          throw new AppError(400, `Insufficient stock for ${product ? product.name : 'unknown product'}`, 'BAD_REQUEST');
        }

        await tx
          .update(products)
          .set({ stockQty: product.stockQty - cartItem.quantity })
          .where(eq(products.id, product.id));

        const lineTotal = cartItem.price_snapshot * cartItem.quantity;
        const gstAmount = Math.round(lineTotal * product.gstRate / 100);

        orderItemsData.push({
          id: crypto.randomUUID(),
          productId: product.id,
          productName: product.name,
          quantity: cartItem.quantity,
          unitPrice: cartItem.price_snapshot,
          gstRate: product.gstRate,
          lineTotal: lineTotal,
          gstAmount: gstAmount,
        });

        subtotal += lineTotal;
        totalGst += gstAmount;
      }

      let discountAmount = 0;
      let discountCodeId: string | null = null;
      if (discount_code) {
        const [coupon] = await tx
          .select()
          .from(discountCodes)
          .where(
            and(
              eq(discountCodes.code, discount_code.toUpperCase()),
              eq(discountCodes.isDeleted, false)
            )
          );
        if (!coupon || !coupon.isActive) {
          throw new AppError(400, 'Invalid coupon code', 'BAD_REQUEST');
        }
        const now = new Date();
        if (coupon.validFrom > now || coupon.validUntil < now) {
          throw new AppError(400, 'Coupon is not valid or expired', 'BAD_REQUEST');
        }
        if (subtotal < coupon.minOrderValue) {
          throw new AppError(400, 'Minimum order value requirement not met', 'BAD_REQUEST');
        }

        let scopedSubtotal = 0;
        if (!coupon.scopeType) {
          scopedSubtotal = subtotal;
        } else if (coupon.scopeType === 'product') {
          const scopedItems = orderItemsData.filter(item => item.productId === coupon.scopeId);
          scopedSubtotal = scopedItems.reduce((acc, item) => acc + item.lineTotal, 0);
        } else if (coupon.scopeType === 'category') {
          const productIds = orderItemsData.map(i => i.productId);
          const dbProducts = await tx
            .select({ id: products.id, categoryId: products.categoryId })
            .from(products)
            .where(inArray(products.id, productIds));
          const categoryMap = new Map(dbProducts.map(p => [p.id, p.categoryId]));
          const scopedItems = orderItemsData.filter(item => categoryMap.get(item.productId) === coupon.scopeId);
          scopedSubtotal = scopedItems.reduce((acc, item) => acc + item.lineTotal, 0);
        }

        if (scopedSubtotal === 0) {
          throw new AppError(400, 'Coupon code not applicable to items in cart', 'BAD_REQUEST');
        }

        if (coupon.discountType.toUpperCase() === 'PERCENTAGE') {
          discountAmount = Math.floor((scopedSubtotal * coupon.value) / 100);
        } else {
          discountAmount = Math.min(coupon.value, scopedSubtotal);
        }

        discountCodeId = coupon.id;
        
        await tx
          .update(discountCodes)
          .set({ currentUsage: coupon.currentUsage + 1 })
          .where(eq(discountCodes.id, coupon.id));
      }

      const grandTotal = Math.max(0, subtotal + totalGst - discountAmount);
      const orderId = crypto.randomUUID();

      const [insertedOrder] = await tx
        .insert(orders)
        .values({
          id: orderId,
          userId: req.user!.id,
          orderNumber: orderNumber,
          subtotal: subtotal,
          gstAmount: totalGst,
          discountAmount: discountAmount,
          discountCodeId: discountCodeId,
          grandTotal: grandTotal,
          deliveryAddress: delivery_address,
          status: 'CONFIRMED',
        } as any)
        .returning();

      for (const oi of orderItemsData) {
        await tx.insert(orderItems).values({
          ...oi,
          orderId: orderId,
        } as any);
      }

      await tx.insert(ledgerEntries).values({
        id: crypto.randomUUID(),
        userId: req.user!.id,
        entryType: 'DEBIT',
        amount: grandTotal,
        referenceType: 'order',
        referenceId: orderId,
        description: `Order ${orderNumber}`,
        voucherType: 'SALES',
        debitAccount: `Retailer: ${req.user!.fullName}`,
        creditAccount: 'Sales Account',
      } as any);

      await tx
        .update(cartItems)
        .set({ isDeleted: true, deletedAt: new Date() })
        .where(eq(cartItems.cartId, cart.id));

      return {
        id: insertedOrder.id,
        order_number: insertedOrder.orderNumber,
        grand_total: insertedOrder.grandTotal,
        subtotal: insertedOrder.subtotal,
        gst_amount: insertedOrder.gstAmount,
        discount_amount: insertedOrder.discountAmount,
        delivery_address: insertedOrder.deliveryAddress,
      };
    });

    return res.status(201).json(result);
  } catch (error) {
    console.error('Error in POST /orders:', error);
    next(error);
  }
});

// ── P3-12: List Orders ───────────────────────────────────────
router.get('/orders', getCurrentUser as any, async (req: AuthenticatedRequest, res, next) => {
  try {
    const filters = ordersQuerySchema.parse(req.query);
    const list = await orderService.getOrdersList(
      req.user!.id,
      req.user!.role,
      filters.order_status,
      filters.page,
      filters.page_size
    );
    return res.status(200).json(list);
  } catch (error) {
    next(error);
  }
});

// ── GET Single Order Details by ID ────────────────────────────
router.get('/orders/:id', getCurrentUser as any, async (req: AuthenticatedRequest, res, next) => {
  try {
    const orderDetails = await orderService.getOrderById(req.params.id);
    return res.status(200).json(orderDetails);
  } catch (error) {
    next(error);
  }
});

router.get('/admin/orders/:id', getCurrentUser as any, requireAdmin as any, async (req: AuthenticatedRequest, res, next) => {
  try {
    const orderDetails = await orderService.getOrderById(req.params.id);
    return res.status(200).json(orderDetails);
  } catch (error) {
    next(error);
  }
});

// ── P3-11: Update Order Status (Admin) ────────────────────────
router.patch('/admin/orders/:id/status', getCurrentUser as any, requireAdmin as any, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { status } = orderStatusUpdateSchema.parse(req.body);
    const order = await orderService.updateOrderStatus(req.params.id, status);

    await auditService.logAction(
      req.user!.id,
      req.user!.role,
      'update_order_status',
      'order',
      req.params.id,
      { status }
    );

    const calcSubtotal = order.subtotal || 0;
    const calcGst = order.gstAmount || 0;
    const calcDiscount = order.discountAmount || 0;
    const calcGrandTotal = order.grandTotal ?? Math.max(0, calcSubtotal + calcGst - calcDiscount);

    return res.status(200).json({
      id: order.id,
      order_number: order.orderNumber,
      orderNumber: order.orderNumber,
      status: order.status.toLowerCase(),
      subtotal: calcSubtotal,
      gst_amount: calcGst,
      gstAmount: calcGst,
      discount_amount: calcDiscount,
      discountAmount: calcDiscount,
      grand_total: calcGrandTotal,
      grandTotal: calcGrandTotal,
    });
  } catch (error) {
    next(error);
  }
});

const adminOrderCreateSchema = z.object({
  retailerId: z.string(), // uuid or 'unregistered'
  deliveryAddress: z.string().optional().default(''),
  items: z.array(z.object({
    productId: z.string().uuid('Invalid product ID'),
    quantity: z.number().positive('Quantity must be greater than 0'),
    unitPrice: z.number().nonnegative('Price must be non-negative').optional(), // price in paise
    unit: z.string().optional(),
  })).min(1, 'At least one item is required'),
  discountAmount: z.number().nonnegative().optional(), // discount in paise
  deliveryCharge: z.number().nonnegative().optional().default(0), // delivery charge in paise
  unregisteredCustomer: z.object({
    name: z.string().min(1, 'Name is required'),
    mobile: z.string().optional(),
    address: z.string().optional(),
  }).optional(),
  // Payment info
  paymentMethod: z.string().optional(),
  paymentAmount: z.number().nonnegative().optional(), // amount received in paise
  paymentRef: z.string().optional(), // UPI txn ID / account number
  // Split payments array (optional)
  payments: z.array(z.object({
    method: z.string(),
    amount: z.number().nonnegative(),
    reference: z.string().optional(),
  })).optional(),
});

const orderDiscountUpdateSchema = z.object({
  discountAmount: z.number().int().nonnegative('Discount must be >= 0'), // discount in paise
});

// ── Place Order on Behalf of Customer (Admin) ─────────────────
router.post('/admin/orders', getCurrentUser as any, requireAdmin as any, async (req: AuthenticatedRequest, res, next) => {
  try {
    const {
      retailerId: inputRetailerId,
      deliveryAddress,
      items,
      discountAmount = 0,
      deliveryCharge = 0,
      unregisteredCustomer,
      paymentMethod,
      paymentAmount = 0,
      paymentRef,
      payments,
    } = adminOrderCreateSchema.parse(req.body);

    let retailerId = inputRetailerId;
    let customerName = '';

    if (retailerId === 'unregistered') {
      if (!unregisteredCustomer) {
        throw new AppError(400, 'Unregistered customer details are required', 'BAD_REQUEST');
      }

      // Check if user already exists with this mobile number (only if mobile provided)
      if (unregisteredCustomer.mobile) {
        const [existingUser] = await db
          .select()
          .from(users)
          .where(and(eq(users.mobile, unregisteredCustomer.mobile), eq(users.isDeleted, false)));

        if (existingUser) {
          retailerId = existingUser.id;
          customerName = existingUser.fullName;
        }
      }

      if (retailerId === 'unregistered') {
        // Create new guest user — mobile optional
        const newUserId = crypto.randomUUID();
        const randomPassword = crypto.randomBytes(16).toString('hex');
        const guestMobile = unregisteredCustomer.mobile || `GUEST-${newUserId.slice(0, 8)}`;
        const guestEmail = `guest_${newUserId.replace(/-/g, '')}@supplysetu.app`;

        await db
          .insert(users)
          .values({
            id: newUserId,
            fullName: unregisteredCustomer.name,
            mobile: guestMobile,
            email: guestEmail,
            role: 'RETAILER',
            passwordHash: randomPassword,
          } as any);

        await db
          .insert(retailers)
          .values({
            id: crypto.randomUUID(),
            userId: newUserId,
            businessName: unregisteredCustomer.name,
            ownerName: unregisteredCustomer.name,
            address: unregisteredCustomer.address || '',
          } as any);

        retailerId = newUserId;
        customerName = unregisteredCustomer.name;
      }
    } else {
      // 1. Verify retailer user exists
      const [retailerUser] = await db
        .select()
        .from(users)
        .where(and(eq(users.id, retailerId), eq(users.isDeleted, false)));
      if (!retailerUser) {
        throw new AppError(404, 'Retailer user not found', 'NOT_FOUND');
      }
      customerName = retailerUser.fullName;
    }

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randSuffix = Math.random().toString(36).substring(2, 10).toUpperCase();
    const orderNumber = `ORD-BEHALF-${dateStr}-${randSuffix}`;

    const result = await db.transaction(async (tx) => {
      let subtotal = 0;
      let totalGst = 0;
      const orderItemsData = [];

      for (const item of items) {
        const [product] = await tx
          .select()
          .from(products)
          .where(eq(products.id, item.productId));
        
        if (!product || product.stockQty < item.quantity) {
          throw new AppError(400, `Insufficient stock for ${product ? product.name : 'unknown product'}`, 'BAD_REQUEST');
        }

        // Deduct stock
        await tx
          .update(products)
          .set({ stockQty: product.stockQty - item.quantity })
          .where(eq(products.id, product.id));

        // Resolve unit price: override if provided, otherwise check retailerPricing, then basePrice
        let unitPrice = item.unitPrice;
        if (unitPrice === undefined) {
          const [rp] = await tx
            .select()
            .from(retailerPricing)
            .where(and(eq(retailerPricing.productId, product.id), eq(retailerPricing.isDeleted, false)));
          unitPrice = rp ? rp.price : product.basePrice;
        }

        const lineTotal = Math.round(unitPrice * item.quantity);
        const gstAmount = Math.round(lineTotal * product.gstRate / 100);

        orderItemsData.push({
          id: crypto.randomUUID(),
          productId: product.id,
          productName: product.name,
          quantity: item.quantity,
          unitPrice: Math.round(unitPrice),
          gstRate: product.gstRate,
          lineTotal: lineTotal,
          gstAmount: gstAmount,
          unit: item.unit || product.unit || 'pcs',
        });

        subtotal += lineTotal;
        totalGst += gstAmount;
      }

      const grandTotal = Math.max(0, subtotal + totalGst - Math.round(discountAmount) + Math.round(deliveryCharge));
      const orderId = crypto.randomUUID();

      // Normalize payment details (supporting split payments array)
      const paymentListToProcess: Array<{ method: string; amount: number; reference?: string }> = [];
      if (payments && Array.isArray(payments) && payments.length > 0) {
        for (const p of payments) {
          if (p.method !== 'credit' && p.amount > 0) {
            paymentListToProcess.push({
              method: p.method,
              amount: Math.round(p.amount),
              reference: p.reference,
            });
          }
        }
      } else if (paymentMethod && paymentMethod !== 'credit' && paymentAmount && paymentAmount > 0) {
        paymentListToProcess.push({
          method: paymentMethod,
          amount: Math.round(paymentAmount),
          reference: paymentRef,
        });
      }

      const totalPaidPaise = paymentListToProcess.reduce((sum, p) => sum + p.amount, 0);
      const combinedMethod = paymentListToProcess.length === 1
        ? paymentListToProcess[0].method
        : paymentListToProcess.length > 1
        ? paymentListToProcess.map(p => p.method).join(', ')
        : (paymentMethod || null);
      
      const combinedRef = paymentListToProcess
        .filter(p => p.reference)
        .map(p => `${p.method.toUpperCase()}: ${p.reference}`)
        .join(' | ') || (paymentRef || null);

      const [insertedOrder] = await tx
        .insert(orders)
        .values({
          id: orderId,
          userId: retailerId,
          orderNumber: orderNumber,
          subtotal: Math.round(subtotal),
          gstAmount: Math.round(totalGst),
          discountAmount: Math.round(discountAmount),
          grandTotal: Math.round(grandTotal),
          deliveryAddress: deliveryAddress || '',
          status: 'CONFIRMED',
          // Payment fields
          paymentMethod: combinedMethod,
          paymentAmount: totalPaidPaise,
          paymentRef: combinedRef,
        } as any)
        .returning();

      for (const oi of orderItemsData) {
        await tx.insert(orderItems).values({
          ...oi,
          orderId: orderId,
        } as any);
      }

      // Debit ledger entry — full order amount
      await tx.insert(ledgerEntries).values({
        id: crypto.randomUUID(),
        userId: retailerId,
        entryType: 'DEBIT',
        amount: Math.round(grandTotal),
        referenceType: 'order',
        referenceId: orderId,
        description: `Order ${orderNumber} placed by Admin`,
        voucherType: 'SALES',
        debitAccount: `Retailer: ${customerName}`.substring(0, 100),
        creditAccount: 'Sales Account',
      } as any);

      // Credit ledger entry for each payment method received
      for (const p of paymentListToProcess) {
        const methodLabel = p.method === 'cash' ? 'Cash'
          : p.method === 'upi' ? `UPI${p.reference ? ` (${p.reference})` : ''}`
          : `Account${p.reference ? ` (${p.reference})` : ''}`;

        await tx.insert(ledgerEntries).values({
          id: crypto.randomUUID(),
          userId: retailerId,
          entryType: 'CREDIT',
          amount: p.amount,
          referenceType: 'order',
          referenceId: orderId,
          description: `Payment received via ${methodLabel} for Order ${orderNumber}`,
          voucherType: 'RECEIPT',
          debitAccount: p.method === 'cash' ? 'Cash Account' : p.method === 'upi' ? 'UPI Account' : 'Bank Account',
          creditAccount: `Retailer: ${customerName}`.substring(0, 100),
        } as any);
      }

      return insertedOrder;
    });

    await auditService.logAction(
      req.user!.id,
      req.user!.role,
      'create_order_behalf',
      'order',
      result.id,
      { retailerId, orderNumber }
    );

    const calcSubtotal = result.subtotal || 0;
    const calcGst = result.gstAmount || 0;
    const calcDiscount = result.discountAmount || 0;
    const calcGrandTotal = result.grandTotal ?? Math.max(0, calcSubtotal + calcGst - calcDiscount);

    return res.status(201).json({
      ...result,
      id: result.id,
      order_number: result.orderNumber,
      orderNumber: result.orderNumber,
      status: result.status.toLowerCase(),
      subtotal: calcSubtotal,
      gst_amount: calcGst,
      gstAmount: calcGst,
      discount_amount: calcDiscount,
      discountAmount: calcDiscount,
      grand_total: calcGrandTotal,
      grandTotal: calcGrandTotal,
      delivery_address: result.deliveryAddress,
      deliveryAddress: result.deliveryAddress,
    });
  } catch (error) {
    console.error('Error in POST /admin/orders:', error);
    next(error);
  }
});

// ── Update Order Discount (Admin) ─────────────────────────────
router.patch('/admin/orders/:id/discount', getCurrentUser as any, requireAdmin as any, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { discountAmount } = orderDiscountUpdateSchema.parse(req.body);
    const { id } = req.params;

    const [order] = await db
      .select()
      .from(orders)
      .where(and(eq(orders.id, id), eq(orders.isDeleted, false)));
    if (!order) {
      throw new AppError(404, 'Order not found', 'NOT_FOUND');
    }

    const newGrandTotal = Math.max(0, order.subtotal + order.gstAmount - discountAmount);

    const result = await db.transaction(async (tx) => {
      const [updatedOrder] = await tx
        .update(orders)
        .set({
          discountAmount: discountAmount,
          grandTotal: newGrandTotal,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, id))
        .returning();

      // Update the DEBIT ledger entry associated with this order
      await tx
        .update(ledgerEntries)
        .set({
          amount: newGrandTotal,
          updatedAt: new Date(),
        })
        .where(and(
          eq(ledgerEntries.referenceId, id),
          eq(ledgerEntries.entryType, 'DEBIT'),
          eq(ledgerEntries.isDeleted, false)
        ));

      return updatedOrder;
    });

    await auditService.logAction(
      req.user!.id,
      req.user!.role,
      'update_order_discount',
      'order',
      id,
      { oldDiscount: order.discountAmount, newDiscount: discountAmount, newGrandTotal }
    );

    return res.status(200).json({
      ...result,
      id: result.id,
      order_number: result.orderNumber,
      orderNumber: result.orderNumber,
      status: result.status.toLowerCase(),
      subtotal: result.subtotal,
      gst_amount: result.gstAmount,
      gstAmount: result.gstAmount,
      discount_amount: result.discountAmount,
      discountAmount: result.discountAmount,
      grand_total: result.grandTotal,
      grandTotal: result.grandTotal,
    });
  } catch (error) {
    console.error('Error in PATCH /admin/orders/:id/discount:', error);
    next(error);
  }
});


// ── P3-16: Ledger entries ────────────────────────────────────
router.get('/ledger', getCurrentUser as any, async (req: AuthenticatedRequest, res, next) => {
  try {
    const query = ledgerQuerySchema.parse(req.query);
    const ledgerData = await orderService.getLedgerEntries(
      req.user!.id,
      query.retailer_id,
      req.user!.role,
      query.page,
      query.page_size,
      {
        startDate: query.start_date ? new Date(query.start_date) : undefined,
        endDate: query.end_date ? new Date(query.end_date) : undefined,
        entryType: query.entry_type,
      }
    );
    return res.status(200).json(ledgerData);
  } catch (error) {
    next(error);
  }
});

// ── Daily Collection Summary (Admin) ─────────────────────────
router.get('/admin/orders/daily-collection', getCurrentUser as any, requireAdmin as any, async (req: AuthenticatedRequest, res, next) => {
  try {
    const dateFrom = req.query.date_from ? new Date(req.query.date_from as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const dateTo = req.query.date_to ? new Date(req.query.date_to as string) : new Date();

    // Set dateTo to end of day
    dateTo.setHours(23, 59, 59, 999);

    const rows = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.isDeleted, false),
          gte(orders.createdAt, dateFrom),
          lte(orders.createdAt, dateTo)
        )
      )
      .orderBy(desc(orders.createdAt));

    // Group by date
    const dailyMap = new Map<string, {
      date: string;
      total_orders: number;
      grand_total: number;
      cash_amount: number; cash_count: number;
      upi_amount: number;  upi_count: number;
      account_amount: number; account_count: number;
      credit_amount: number; credit_count: number;
      unpaid_amount: number; unpaid_count: number;
    }>();

    for (const o of rows) {
      const dateKey = new Date(o.createdAt).toISOString().slice(0, 10); // YYYY-MM-DD
      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, {
          date: dateKey,
          total_orders: 0, grand_total: 0,
          cash_amount: 0, cash_count: 0,
          upi_amount: 0,  upi_count: 0,
          account_amount: 0, account_count: 0,
          credit_amount: 0, credit_count: 0,
          unpaid_amount: 0, unpaid_count: 0,
        });
      }
      const day = dailyMap.get(dateKey)!;
      day.total_orders += 1;
      day.grand_total += o.grandTotal;

      const method = o.paymentMethod?.toLowerCase();
      const paid = o.paymentAmount || 0;

      if (method === 'cash')    { day.cash_amount += paid;    day.cash_count += 1; }
      else if (method === 'upi')     { day.upi_amount += paid;     day.upi_count += 1; }
      else if (method === 'account') { day.account_amount += paid; day.account_count += 1; }
      else if (method === 'credit')  { day.credit_amount += o.grandTotal; day.credit_count += 1; }
      else                           { day.unpaid_amount += o.grandTotal; day.unpaid_count += 1; }
    }

    const result = Array.from(dailyMap.values()).sort((a, b) => b.date.localeCompare(a.date));
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

// ── CSV Accounts & Tally Exports (Admin) ──────────────────────
router.get('/admin/orders/export/tally', getCurrentUser as any, requireAdmin as any, async (req: AuthenticatedRequest, res, next) => {
  try {
    const query = exportQuerySchema.parse(req.query);
    let start = query.start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    let end = query.end_date || new Date();

    if (query.month !== undefined && query.year !== undefined) {
      start = new Date(query.year, query.month - 1, 1, 0, 0, 0, 0);
      end = new Date(query.year, query.month, 0, 23, 59, 59, 999);
    }

    const csvContent = await orderService.getTallyExport(start, end);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=Tally_Sales_${start.toISOString().split('T')[0]}_to_${end.toISOString().split('T')[0]}.csv`);
    return res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
});

router.get('/admin/orders/export/daily', getCurrentUser as any, requireAdmin as any, async (req: AuthenticatedRequest, res, next) => {
  try {
    const query = exportQuerySchema.parse(req.query);
    let start = query.start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    let end = query.end_date || new Date();

    if (query.month !== undefined && query.year !== undefined) {
      start = new Date(query.year, query.month - 1, 1, 0, 0, 0, 0);
      end = new Date(query.year, query.month, 0, 23, 59, 59, 999);
    }

    const csvContent = await orderService.getDailySummaryExport(start, end);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=Daily_Sales_${start.toISOString().split('T')[0]}_to_${end.toISOString().split('T')[0]}.csv`);
    return res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
});

router.get('/admin/orders/export/monthly', getCurrentUser as any, requireAdmin as any, async (req: AuthenticatedRequest, res, next) => {
  try {
    const query = exportQuerySchema.parse(req.query);
    let start = query.start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    let end = query.end_date || new Date();

    if (query.month !== undefined && query.year !== undefined) {
      start = new Date(query.year, query.month - 1, 1, 0, 0, 0, 0);
      end = new Date(query.year, query.month, 0, 23, 59, 59, 999);
    }

    const csvContent = await orderService.getMonthlySummaryExport(start, end);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=Monthly_Sales_${start.toISOString().split('T')[0]}_to_${end.toISOString().split('T')[0]}.csv`);
    return res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
});

export default router;
