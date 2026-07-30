import crypto from 'crypto';
import { db } from '../db/index.js';
import { orders, vendors, retailers, auditLog, users } from '../db/schema.js';
import { eq, and, count, sum, gte, lte, desc, ilike, ne } from 'drizzle-orm';
import { AppError } from '../utils/errors.js';
import PDFDocument from 'pdfkit';

export class AdminService {
  // ── P4-07: Reports & Analytics (Dashboard KPIs) ──────────────

  async getDashboardKPIs() {
    // Total orders count
    const [totalOrdersRes] = await db
      .select({ count: count(orders.id) })
      .from(orders)
      .where(eq(orders.isDeleted, false));

    // Total revenue sum (excluding cancelled orders)
    const [totalRevenueRes] = await db
      .select({ sum: sum(orders.grandTotal) })
      .from(orders)
      .where(and(eq(orders.isDeleted, false), ne(orders.status, 'CANCELLED')));

    // Active vendors count
    const [activeVendorsRes] = await db
      .select({ count: count(vendors.id) })
      .from(vendors)
      .where(eq(vendors.isDeleted, false));

    // Active retailers count
    const [activeRetailersRes] = await db
      .select({ count: count(retailers.id) })
      .from(retailers)
      .where(eq(retailers.isDeleted, false));

    return {
      total_orders: totalOrdersRes?.count || 0,
      total_revenue: totalRevenueRes?.sum ? Number(totalRevenueRes.sum) : 0,
      active_vendors: activeVendorsRes?.count || 0,
      active_retailers: activeRetailersRes?.count || 0,
    };
  }

  // ── Sales Report Trend Analytics ─────────────────────────────

  async getSalesReport(range: 'daily' | 'weekly' | 'monthly' | 'custom', month?: number, year?: number) {
    const now = new Date();
    let startDate = new Date();
    let endDate = new Date();

    const isMonthFilter = month !== undefined && year !== undefined;

    if (isMonthFilter) {
      startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
      endDate = new Date(year, month, 0, 23, 59, 59, 999);
    } else {
      if (range === 'daily') {
        startDate.setDate(now.getDate() - 1);
      } else if (range === 'weekly') {
        startDate.setDate(now.getDate() - 7);
      } else if (range === 'monthly') {
        startDate.setDate(now.getDate() - 30);
      } else {
        startDate.setDate(now.getDate() - 30);
      }
    }

    const [totalOrdersRes] = await db
      .select({ count: count(orders.id) })
      .from(orders)
      .where(
        and(
          eq(orders.isDeleted, false),
          gte(orders.createdAt, startDate),
          isMonthFilter ? lte(orders.createdAt, endDate) : undefined
        )
      );

    const [totalRevenueRes] = await db
      .select({ sum: sum(orders.grandTotal) })
      .from(orders)
      .where(
        and(
          eq(orders.isDeleted, false),
          ne(orders.status, 'CANCELLED'),
          gte(orders.createdAt, startDate),
          isMonthFilter ? lte(orders.createdAt, endDate) : undefined
        )
      );

    const [pendingOrdersRes] = await db
      .select({ count: count(orders.id) })
      .from(orders)
      .where(
        and(
          eq(orders.isDeleted, false),
          eq(orders.status, 'PENDING'),
          gte(orders.createdAt, startDate),
          isMonthFilter ? lte(orders.createdAt, endDate) : undefined
        )
      );

    // Fetch order list to build chart data
    const ordersList = await db
      .select({
        createdAt: orders.createdAt,
        grandTotal: orders.grandTotal,
        status: orders.status,
      })
      .from(orders)
      .where(
        and(
          eq(orders.isDeleted, false),
          gte(orders.createdAt, startDate),
          isMonthFilter ? lte(orders.createdAt, endDate) : undefined
        )
      )
      .orderBy(orders.createdAt);

    const trendData: any[] = [];

    if (isMonthFilter) {
      // Loop over each day of the month
      const totalDays = endDate.getDate();
      for (let day = 1; day <= totalDays; day++) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const label = `${months[startDate.getMonth()]} ${String(day).padStart(2, '0')}`;
        const key = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        trendData.push({ label, revenue: 0, orders: 0, key });
      }

      for (const order of ordersList) {
        const oDate = new Date(order.createdAt);
        const key = `${oDate.getFullYear()}-${String(oDate.getMonth() + 1).padStart(2, '0')}-${String(oDate.getDate()).padStart(2, '0')}`;
        const match = trendData.find((item) => item.key === key);
        if (match) {
          if (order.status !== 'CANCELLED') {
            match.revenue += Number(order.grandTotal) / 100;
          }
          match.orders += 1;
        }
      }
    } else if (range === 'daily') {
      // Last 24 hours trend
      for (let i = 23; i >= 0; i--) {
        const dt = new Date(now.getTime() - i * 60 * 60 * 1000);
        const label = `${String(dt.getHours()).padStart(2, '0')}:00`;
        const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')} ${String(dt.getHours()).padStart(2, '0')}`;
        trendData.push({ label, revenue: 0, orders: 0, key });
      }

      for (const order of ordersList) {
        const oDate = new Date(order.createdAt);
        const key = `${oDate.getFullYear()}-${String(oDate.getMonth() + 1).padStart(2, '0')}-${String(oDate.getDate()).padStart(2, '0')} ${String(oDate.getHours()).padStart(2, '0')}`;
        const match = trendData.find((item) => item.key === key);
        if (match) {
          if (order.status !== 'CANCELLED') {
            match.revenue += Number(order.grandTotal) / 100;
          }
          match.orders += 1;
        }
      }
    } else {
      // Weekly or monthly daily intervals
      const daysCount = range === 'weekly' ? 7 : 30;
      for (let i = daysCount - 1; i >= 0; i--) {
        const dt = new Date();
        dt.setDate(now.getDate() - i);
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const label = `${months[dt.getMonth()]} ${String(dt.getDate()).padStart(2, '0')}`;
        const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
        trendData.push({ label, revenue: 0, orders: 0, key });
      }

      for (const order of ordersList) {
        const oDate = new Date(order.createdAt);
        const key = `${oDate.getFullYear()}-${String(oDate.getMonth() + 1).padStart(2, '0')}-${String(oDate.getDate()).padStart(2, '0')}`;
        const match = trendData.find((item) => item.key === key);
        if (match) {
          if (order.status !== 'CANCELLED') {
            match.revenue += Number(order.grandTotal) / 100;
          }
          match.orders += 1;
        }
      }
    }

    // Convert revenue to standard decimal (Rupees)
    for (const item of trendData) {
      item.revenue = Math.round((item.revenue) * 100) / 100;
      delete item.key;
    }

    return {
      total_orders: totalOrdersRes?.count || 0,
      total_revenue: totalRevenueRes?.sum ? Number(totalRevenueRes.sum) : 0,
      pending_orders: pendingOrdersRes?.count || 0,
      trend_data: trendData,
    };
  }

  // ── Sales Report PDF Generation ─────────────────────────────

  async generateSalesReportPDF(range: 'daily' | 'weekly' | 'monthly' | 'custom', month?: number, year?: number): Promise<PDFKit.PDFDocument> {
    const now = new Date();
    let startDate = new Date();
    let endDate = new Date();

    const isMonthFilter = month !== undefined && year !== undefined;

    if (isMonthFilter) {
      startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
      endDate = new Date(year, month, 0, 23, 59, 59, 999);
    } else {
      if (range === 'daily') {
        startDate.setDate(now.getDate() - 1);
      } else if (range === 'weekly') {
        startDate.setDate(now.getDate() - 7);
      } else if (range === 'monthly') {
        startDate.setDate(now.getDate() - 30);
      } else {
        startDate.setDate(now.getDate() - 30);
      }
    }

    const [totalOrdersRes] = await db
      .select({ count: count(orders.id) })
      .from(orders)
      .where(
        and(
          eq(orders.isDeleted, false),
          gte(orders.createdAt, startDate),
          isMonthFilter ? lte(orders.createdAt, endDate) : undefined
        )
      );

    const [totalRevenueRes] = await db
      .select({ sum: sum(orders.grandTotal) })
      .from(orders)
      .where(
        and(
          eq(orders.isDeleted, false),
          ne(orders.status, 'CANCELLED'),
          gte(orders.createdAt, startDate),
          isMonthFilter ? lte(orders.createdAt, endDate) : undefined
        )
      );

    const [pendingOrdersRes] = await db
      .select({ count: count(orders.id) })
      .from(orders)
      .where(
        and(
          eq(orders.isDeleted, false),
          eq(orders.status, 'PENDING'),
          gte(orders.createdAt, startDate),
          isMonthFilter ? lte(orders.createdAt, endDate) : undefined
        )
      );

    const ordersList = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        status: orders.status,
        grandTotal: orders.grandTotal,
        createdAt: orders.createdAt,
        userId: orders.userId,
      })
      .from(orders)
      .where(
        and(
          eq(orders.isDeleted, false),
          gte(orders.createdAt, startDate),
          isMonthFilter ? lte(orders.createdAt, endDate) : undefined
        )
      )
      .orderBy(desc(orders.createdAt))
      .limit(50);

    // Fetch buyer details for the orders to match SQLAlchemy order.user relationship
    const userIds = ordersList.map((o) => o.userId);
    const usersList = userIds.length > 0 ? await db
      .select({ id: users.id, fullName: users.fullName, mobile: users.mobile })
      .from(users)
      .where(and(eq(users.isDeleted, false))) : [];

    const doc = new PDFDocument({ margin: 36 });

    // Design layout using PDFKit
    doc.fillColor('#1e3a8a').fontSize(22).text('Supply Setu - Sales Performance Report', { align: 'left' });
    doc.fillColor('#4b5563').fontSize(10).text(`Generated on: ${now.toISOString()} | Range: ${range.toUpperCase()}`);
    doc.moveDown(2);

    // Summary Section
    doc.fillColor('#1e3a8a').fontSize(14).text('Summary metrics', { underline: true });
    doc.moveDown(0.5);
    doc.fillColor('#000000').fontSize(11);
    doc.text(`Total Orders: ${totalOrdersRes?.count || 0}`);
    doc.text(`Total Revenue: INR ${((totalRevenueRes?.sum ? Number(totalRevenueRes.sum) : 0) / 100).toFixed(2)}`);
    doc.text(`Pending Orders: ${pendingOrdersRes?.count || 0}`);
    doc.moveDown(2);

    // Orders list
    doc.fillColor('#1e3a8a').fontSize(14).text('Recent Orders List (Up to 50)', { underline: true });
    doc.moveDown();

    // Table Header
    doc.fillColor('#000000').fontSize(10);
    const tableTop = doc.y;
    doc.text('Order No', 36, tableTop, { width: 100 });
    doc.text('User', 136, tableTop, { width: 150 });
    doc.text('Status', 286, tableTop, { width: 100 });
    doc.text('Total', 386, tableTop, { width: 100 });
    doc.text('Date', 486, tableTop, { width: 100 });

    doc.moveTo(36, tableTop + 15).lineTo(576, tableTop + 15).stroke();
    doc.moveDown(1);

    let rowY = tableTop + 20;
    for (const ord of ordersList) {
      if (rowY > 700) {
        doc.addPage();
        rowY = 50;
      }
      const buyer = usersList.find((u) => u.id === ord.userId);
      const buyerName = buyer?.fullName || buyer?.mobile || 'N/A';

      doc.text(ord.orderNumber, 36, rowY, { width: 100 });
      doc.text(buyerName, 136, rowY, { width: 150 });
      doc.text(ord.status.toUpperCase(), 286, rowY, { width: 100 });
      doc.text(`INR ${(ord.grandTotal / 100).toFixed(2)}`, 386, rowY, { width: 100 });
      doc.text(new Date(ord.createdAt).toISOString().split('T')[0], 486, rowY, { width: 100 });

      rowY += 20;
    }

    doc.end();
    return doc;
  }

  // ── P4-06: Audit Log Lookup ──────────────────────────────────

  async getAuditLogs(
    actorId?: string,
    action?: string,
    entityType?: string,
    page = 1,
    pageSize = 50
  ) {
    let query = db.select().from(auditLog).where(eq(auditLog.isDeleted, false));

    // Drizzle requires building conditions dynamically
    const filters = [eq(auditLog.isDeleted, false)];
    if (actorId) filters.push(eq(auditLog.actorId, actorId));
    if (action) filters.push(ilike(auditLog.action, `%${action}%`));
    if (entityType) filters.push(eq(auditLog.entityType, entityType));

    const offset = (page - 1) * pageSize;

    const list = await db
      .select({
        id: auditLog.id,
        actor_id: auditLog.actorId,
        role: auditLog.role,
        action: auditLog.action,
        entity_type: auditLog.entityType,
        entity_id: auditLog.entityId,
        diff_json: auditLog.diffJson,
        description: auditLog.description,
        created_at: auditLog.createdAt,
      })
      .from(auditLog)
      .where(and(...filters))
      .orderBy(desc(auditLog.createdAt))
      .limit(pageSize)
      .offset(offset);

    return list;
  }

  // ── P3-22: Enter E-way Bill ──────────────────────────────────

  async setEWayBill(orderId: string, ewayBillNo: string) {
    const [order] = await db
      .select()
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.isDeleted, false)));

    if (!order) {
      throw new AppError(404, 'Order not found', 'NOT_FOUND');
    }

    const [updatedOrder] = await db
      .update(orders)
      .set({ ewayBillNo, updatedAt: new Date() })
      .where(eq(orders.id, orderId))
      .returning();

    return {
      order_id: updatedOrder.id,
      eway_bill_no: updatedOrder.ewayBillNo,
    };
  }

  // ── Notifications: List ──────────────────────────────────────
  // Notifications are stored in the audit_log table with action = 'send_notification'
  async getNotifications(pageSize = 50) {
    const list = await db
      .select({
        id: auditLog.id,
        title: auditLog.description,
        body: auditLog.description,
        status: auditLog.role,         // we reuse role field to store status: 'sent' / 'failed'
        target_audience: auditLog.entityType,
        actor: auditLog.actorId,
        diff_json: auditLog.diffJson,
        created_at: auditLog.createdAt,
      })
      .from(auditLog)
      .where(and(
        eq(auditLog.isDeleted, false),
        eq(auditLog.action, 'send_notification')
      ))
      .orderBy(desc(auditLog.createdAt))
      .limit(pageSize);

    // Re-shape the data from the diff_json where we store proper fields
    return list.map(n => ({
      id: n.id,
      title: (n.diff_json as any)?.title || n.title || '',
      body: (n.diff_json as any)?.body || '',
      target_audience: (n.diff_json as any)?.target_audience || n.target_audience || 'all',
      status: (n.diff_json as any)?.status || 'sent',
      sent_by: (n.diff_json as any)?.sent_by || 'Admin',
      created_at: n.created_at,
    }));
  }

  // ── Notifications: Send ──────────────────────────────────────
  async sendNotification(title: string, body: string, targetAudience: string, actorId: string) {
    // Store the notification record in the audit log (reused as notification log)
    const [record] = await db
      .insert(auditLog)
      .values({
        id: crypto.randomUUID(),
        actorId,
        role: 'admin',
        action: 'send_notification',
        entityType: targetAudience,
        description: title,
        diffJson: {
          title,
          body,
          target_audience: targetAudience,
          status: 'sent',      // In production, update this after FCM dispatch
          sent_by: 'Admin',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        isDeleted: false,
      })
      .returning();

    // TODO: Integrate FCM push dispatch here when FCM credentials are configured
    // const fcmPayload = { notification: { title, body }, topic: targetAudience };
    // await fcmAdmin.messaging().send(fcmPayload);

    return {
      id: record.id,
      title,
      body,
      target_audience: targetAudience,
      status: 'sent',
      message: `Notification queued for ${targetAudience} users.`,
    };
  }
}

