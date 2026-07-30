import { db } from '../db/index.js';
import { orders, orderItems, ledgerEntries, retailers, products, users } from '../db/schema.js';
import { eq, and, desc, sql, gte, lte, inArray } from 'drizzle-orm';
import { AppError } from '../utils/errors.js';

export class OrderService {
  // ── P3-12: List Orders ───────────────────────────────────────

  async getOrdersList(userId?: string, role?: string, status?: string, page = 1, pageSize = 20) {
    const filters = [eq(orders.isDeleted, false)];

    if (role !== 'SUPER_ADMIN' && role !== 'ADMIN' && userId) {
      filters.push(eq(orders.userId, userId));
    }

    if (status) {
      filters.push(eq(orders.status, status.toUpperCase() as any));
    }

    const limit = pageSize;
    const offset = (page - 1) * limit;

    const list = await db
      .select()
      .from(orders)
      .where(and(...filters))
      .orderBy(desc(orders.createdAt))
      .limit(limit)
      .offset(offset);

    if (list.length === 0) return [];

    // Fetch order items
    const itemsList = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.isDeleted, false));

    // Fetch buyer info (users + retailer profiles) for all order users
    const userIds = [...new Set(list.map((o) => o.userId))];
    const buyerUsers = await db
      .select({ id: users.id, fullName: users.fullName, mobile: users.mobile })
      .from(users)
      .where(and(eq(users.isDeleted, false), inArray(users.id, userIds)));

    const buyerRetailers = await db
      .select({ userId: retailers.userId, businessName: retailers.businessName, ownerName: retailers.ownerName })
      .from(retailers)
      .where(and(eq(retailers.isDeleted, false), inArray(retailers.userId, userIds)));

    return list.map((o) => {
      const oItems = itemsList
        .filter((item) => item.orderId === o.id)
        .map((item) => ({
          id: item.id,
          product_id: item.productId,
          product_name: item.productName,
          product_image_url: null,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          gst_rate: item.gstRate,
          line_total: item.lineTotal,
          gst_amount: item.gstAmount,
          return_policy: null,
        }));

      const buyer = buyerUsers.find((u) => u.id === o.userId);
      const retailer = buyerRetailers.find((r) => r.userId === o.userId);

      return {
        id: o.id,
        order_number: o.orderNumber,
        status: o.status.toLowerCase(),
        subtotal: o.subtotal,
        gst_amount: o.gstAmount,
        discount_amount: o.discountAmount,
        grand_total: o.grandTotal,
        delivery_address: o.deliveryAddress,
        created_at: o.createdAt,
        items: oItems,
        return_image_url: o.returnImageUrl || null,
        return_reason: o.returnReason || null,
        // Buyer details
        buyer_name: retailer?.ownerName || buyer?.fullName || null,
        buyer_mobile: buyer?.mobile || null,
        buyer_business: retailer?.businessName || null,
      };
    });
  }


  // ── P3-11: Update Order Status ───────────────────────────────

  async updateOrderStatus(orderId: string, newStatus: string) {
    const [order] = await db
      .select()
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.isDeleted, false)));

    if (!order) {
      throw new AppError(404, 'Order not found', 'NOT_FOUND');
    }

    const oldStatus = order.status;
    const statusUpper = newStatus.toUpperCase();

    return db.transaction(async (tx) => {
      // 1. Release stock if order cancelled
      if (statusUpper === 'CANCELLED' && oldStatus !== 'CANCELLED') {
        const items = await tx
          .select()
          .from(orderItems)
          .where(and(eq(orderItems.orderId, orderId), eq(orderItems.isDeleted, false)));

        for (const item of items) {
          const [p] = await tx
            .select()
            .from(products)
            .where(eq(products.id, item.productId));

          if (p) {
            await tx
              .update(products)
              .set({ stockQty: p.stockQty + item.quantity, updatedAt: new Date() })
              .where(eq(products.id, item.productId));
          }
        }
      }

      // 2. Update order status
      const [updated] = await tx
        .update(orders)
        .set({ status: statusUpper as any, updatedAt: new Date() })
        .where(eq(orders.id, orderId))
        .returning();

      return updated;
    });
  }

  // ── P3-16: Ledger Entries ────────────────────────────────────

  async getLedgerEntries(
    userId: string,
    targetUserId?: string,
    userRole?: string,
    page = 1,
    pageSize = 200,
    filters: { startDate?: Date; endDate?: Date; entryType?: string } = {}
  ) {
    let queryUserId = userId;
    if (['SUPER_ADMIN', 'ADMIN'].includes(userRole || '') && targetUserId) {
      queryUserId = targetUserId;
    }

    const limit = pageSize;
    const offset = (page - 1) * limit;

    const queryFilters = [
      eq(ledgerEntries.userId, queryUserId),
      eq(ledgerEntries.isDeleted, false)
    ];

    if (filters.startDate) {
      queryFilters.push(gte(ledgerEntries.createdAt, filters.startDate));
    }
    if (filters.endDate) {
      queryFilters.push(lte(ledgerEntries.createdAt, filters.endDate));
    }
    if (filters.entryType && filters.entryType.toUpperCase() !== 'ALL') {
      queryFilters.push(eq(ledgerEntries.entryType, filters.entryType.toUpperCase() as any));
    }

    const list = await db
      .select()
      .from(ledgerEntries)
      .where(and(...queryFilters))
      .orderBy(desc(ledgerEntries.createdAt))
      .limit(limit)
      .offset(offset);

    // Calculate outstanding balance: total debits - total credits
    const [balanceRes] = await db
      .select({
        debits: sql<number>`COALESCE(SUM(CASE WHEN ${ledgerEntries.entryType} = 'DEBIT' THEN ${ledgerEntries.amount} ELSE 0 END), 0)`,
        credits: sql<number>`COALESCE(SUM(CASE WHEN ${ledgerEntries.entryType} = 'CREDIT' THEN ${ledgerEntries.amount} ELSE 0 END), 0)`,
      })
      .from(ledgerEntries)
      .where(and(eq(ledgerEntries.userId, queryUserId), eq(ledgerEntries.isDeleted, false)));

    const outstanding = Number(balanceRes?.debits || 0) - Number(balanceRes?.credits || 0);

    // Fetch credit limit
    let creditLimit = 0;
    const [retailer] = await db
      .select()
      .from(retailers)
      .where(and(eq(retailers.userId, queryUserId), eq(retailers.isDeleted, false)));

    if (retailer) {
      creditLimit = retailer.creditLimit;
    }

    const availableBalance = Math.max(0, creditLimit - outstanding);

    return {
      outstanding_balance: outstanding,
      credit_limit: creditLimit,
      available_balance: availableBalance,
      entries: list.map((e) => ({
        id: e.id,
        entry_type: e.entryType.toLowerCase(),
        amount: e.amount,
        reference_type: e.referenceType,
        reference_id: e.referenceId,
        description: e.description || null,
        created_at: e.createdAt,
      })),
    };
  }

  // ── CSV Accounts & Tally Export ──────────────────────────────

  async getTallyExport(startDate: Date, endDate: Date) {
    const list = await db
      .select({
        orderNumber: orders.orderNumber,
        createdAt: orders.createdAt,
        grandTotal: orders.grandTotal,
        businessName: retailers.businessName,
        gstNumber: retailers.gstNumber,
        itemId: orderItems.id,
        productName: orderItems.productName,
        quantity: orderItems.quantity,
        unitPrice: orderItems.unitPrice,
        gstRate: orderItems.gstRate,
        lineTotal: orderItems.lineTotal,
        gstAmount: orderItems.gstAmount,
      })
      .from(orders)
      .leftJoin(retailers, eq(orders.userId, retailers.userId))
      .leftJoin(orderItems, eq(orders.id, orderItems.orderId))
      .where(
        and(
          eq(orders.isDeleted, false),
          gte(orders.createdAt, startDate),
          lte(orders.createdAt, endDate)
        )
      )
      .orderBy(desc(orders.createdAt));

    let csv = 'Voucher Date,Voucher Number,Voucher Type,Party Name,GSTIN,Item Name,HSN/SAC,Quantity,Rate,Amount,CGST Rate,CGST Amount,SGST Rate,SGST Amount,Total Invoice Amount\n';

    for (const row of list) {
      const dateStr = row.createdAt ? new Date(row.createdAt).toLocaleDateString('en-IN') : '';
      const partyName = row.businessName || 'Cash';
      const gstin = row.gstNumber || '';
      const itemName = row.productName || '';
      
      const qty = row.quantity || 0;
      const rate = ((row.unitPrice || 0) / 100).toFixed(2);
      const amount = ((row.lineTotal || 0) / 100).toFixed(2);
      
      const cgstRate = ((row.gstRate || 0) / 2).toFixed(1) + '%';
      const cgstAmt = (((row.gstAmount || 0) / 2) / 100).toFixed(2);
      const sgstRate = ((row.gstRate || 0) / 2).toFixed(1) + '%';
      const sgstAmt = (((row.gstAmount || 0) / 2) / 100).toFixed(2);
      const totalInv = ((row.grandTotal || 0) / 100).toFixed(2);

      csv += `"${dateStr}","${row.orderNumber}","Sales","${partyName}","${gstin}","${itemName}","",${qty},${rate},${amount},"${cgstRate}",${cgstAmt},"${sgstRate}",${sgstAmt},${totalInv}\n`;
    }

    return csv;
  }

  async getDailySummaryExport(startDate: Date, endDate: Date) {
    const list = await db
      .select({
        date: sql<string>`DATE(${orders.createdAt})`,
        count: sql<number>`COUNT(${orders.id})`,
        subtotal: sql<number>`SUM(${orders.subtotal})`,
        gstAmount: sql<number>`SUM(${orders.gstAmount})`,
        discountAmount: sql<number>`SUM(${orders.discountAmount})`,
        grandTotal: sql<number>`SUM(${orders.grandTotal})`,
      })
      .from(orders)
      .where(
        and(
          eq(orders.isDeleted, false),
          gte(orders.createdAt, startDate),
          lte(orders.createdAt, endDate)
        )
      )
      .groupBy(sql`DATE(${orders.createdAt})`)
      .orderBy(sql`DATE(${orders.createdAt})`);

    let csv = 'Date,Total Orders,Taxable Value,GST Amount,Discount Amount,Grand Total\n';

    for (const row of list) {
      const sub = ((row.subtotal || 0) / 100).toFixed(2);
      const gst = ((row.gstAmount || 0) / 100).toFixed(2);
      const disc = ((row.discountAmount || 0) / 100).toFixed(2);
      const grand = ((row.grandTotal || 0) / 100).toFixed(2);
      csv += `"${row.date}",${row.count},${sub},${gst},${disc},${grand}\n`;
    }

    return csv;
  }

  async getMonthlySummaryExport(startDate: Date, endDate: Date) {
    const list = await db
      .select({
        month: sql<string>`TO_CHAR(${orders.createdAt}, 'YYYY-MM')`,
        count: sql<number>`COUNT(${orders.id})`,
        subtotal: sql<number>`SUM(${orders.subtotal})`,
        gstAmount: sql<number>`SUM(${orders.gstAmount})`,
        discountAmount: sql<number>`SUM(${orders.discountAmount})`,
        grandTotal: sql<number>`SUM(${orders.grandTotal})`,
      })
      .from(orders)
      .where(
        and(
          eq(orders.isDeleted, false),
          gte(orders.createdAt, startDate),
          lte(orders.createdAt, endDate)
        )
      )
      .groupBy(sql`TO_CHAR(${orders.createdAt}, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(${orders.createdAt}, 'YYYY-MM')`);

    let csv = 'Month,Total Orders,Taxable Value,GST Amount,Discount Amount,Grand Total\n';

    for (const row of list) {
      const sub = ((row.subtotal || 0) / 100).toFixed(2);
      const gst = ((row.gstAmount || 0) / 100).toFixed(2);
      const disc = ((row.discountAmount || 0) / 100).toFixed(2);
      const grand = ((row.grandTotal || 0) / 100).toFixed(2);
      csv += `"${row.month}",${row.count},${sub},${gst},${disc},${grand}\n`;
    }

    return csv;
  }
}
