import { Router } from 'express';
import { getCurrentUser, AuthenticatedRequest } from '../middleware/auth.js';
import { db } from '../db/index.js';
import { orders, payments, ledgerEntries } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { AppError } from '../utils/errors.js';
import crypto from 'crypto';
import { z } from 'zod';

const router = Router();

const initiateSchema = z.object({
  order_id: z.string().uuid(),
});

const verifySchema = z.object({
  razorpay_order_id: z.string(),
  razorpay_payment_id: z.string(),
  razorpay_signature: z.string(),
});

// ── 1. Initiate Payment ──────────────────────────────────────
router.post('/payments/initiate', getCurrentUser as any, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { order_id } = initiateSchema.parse(req.body);

    const [order] = await db
      .select()
      .from(orders)
      .where(and(eq(orders.id, order_id), eq(orders.isDeleted, false)));

    if (!order) {
      throw new AppError(404, 'Order not found', 'NOT_FOUND');
    }

    if (order.userId !== req.user!.id) {
      throw new AppError(403, 'Not authorized to pay for this order', 'FORBIDDEN');
    }

    const [existingPay] = await db
      .select()
      .from(payments)
      .where(and(eq(payments.orderId, order.id), eq(payments.status, 'SUCCESS')));

    if (existingPay) {
      throw new AppError(400, 'Order is already paid', 'BAD_REQUEST');
    }

    const gatewayOrderId = `pay_ord_${crypto.randomUUID().substring(0, 12)}`;

    const [payment] = await db
      .insert(payments)
      .values({
        id: crypto.randomUUID(),
        orderId: order.id,
        userId: req.user!.id,
        amount: order.grandTotal,
        status: 'INITIATED',
        method: 'ONLINE',
        gatewayOrderId,
      } as any)
      .returning();

    return res.status(200).json({
      id: payment.id,
      order_id: payment.orderId,
      gateway_order_id: payment.gatewayOrderId,
      amount: payment.amount,
      status: payment.status,
    });
  } catch (error) {
    next(error);
  }
});

// ── 2. Verify Payment ────────────────────────────────────────
router.post('/payments/verify', getCurrentUser as any, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = verifySchema.parse(req.body);

    const [payment] = await db
      .select()
      .from(payments)
      .where(and(eq(payments.gatewayOrderId, razorpay_order_id), eq(payments.isDeleted, false)));

    if (!payment) {
      throw new AppError(404, 'Payment record not found', 'NOT_FOUND');
    }

    await db.transaction(async (tx) => {
      await tx
        .update(payments)
        .set({
          status: 'SUCCESS',
          gatewayPaymentId: razorpay_payment_id,
          gatewaySignature: razorpay_signature,
          updatedAt: new Date(),
        })
        .where(eq(payments.id, payment.id));

      const [order] = await tx
        .select()
        .from(orders)
        .where(eq(orders.id, payment.orderId));

      if (order) {
        await tx
          .update(orders)
          .set({
            status: 'CONFIRMED',
            updatedAt: new Date(),
          })
          .where(eq(orders.id, order.id));

        await tx.insert(ledgerEntries).values({
          id: crypto.randomUUID(),
          userId: payment.userId,
          entryType: 'CREDIT',
          amount: payment.amount,
          referenceType: 'payment',
          referenceId: payment.id,
          description: `Razorpay online payment - Order ${order.orderNumber}`,
        } as any);
      }
    });

    return res.status(200).json({ success: true, message: 'Payment verified and order confirmed' });
  } catch (error) {
    next(error);
  }
});

export default router;
