import { Router } from 'express';
import { getCurrentUser, requireAdmin } from '../middleware/auth.js';
import { AdminService } from '../services/admin.service.js';
import { z } from 'zod';

const router = Router();
const adminService = new AdminService();

// Validation schema for sales report query params
const salesReportQuerySchema = z.object({
  range: z.enum(['daily', 'weekly', 'monthly', 'custom']).default('monthly'),
  month: z.string().regex(/^\d+$/).transform(Number).optional(),
  year: z.string().regex(/^\d+$/).transform(Number).optional(),
});

// Validation schema for eway-bill update
const ewayBillSchema = z.object({
  eway_bill_no: z.string().min(1, 'E-way bill number cannot be empty'),
});

// Validation schema for audit logs filter
const auditLogsQuerySchema = z.object({
  actor_id: z.string().uuid().optional(),
  action: z.string().optional(),
  entity_type: z.string().optional(),
  page: z.string().regex(/^\d+$/).transform(Number).default('1'),
  page_size: z.string().regex(/^\d+$/).transform(Number).default('50'),
});

// Validation schema for notification send
const sendNotificationSchema = z.object({
  title: z.string().min(1).max(80),
  body: z.string().min(1).max(256),
  target_audience: z.enum(['all', 'vendors', 'retailers']).default('all'),
});

// ── Reports: Dashboard KPIs ──────────────────────────────────
router.get('/reports/dashboard', getCurrentUser as any, requireAdmin as any, async (req, res, next) => {
  try {
    const kpis = await adminService.getDashboardKPIs();
    return res.status(200).json(kpis);
  } catch (error) {
    next(error);
  }
});

// ── Reports: Sales Trend Analytics ───────────────────────────
router.get('/reports/sales', getCurrentUser as any, requireAdmin as any, async (req, res, next) => {
  try {
    const { range, month, year } = salesReportQuerySchema.parse(req.query);
    const data = await adminService.getSalesReport(range, month, year);
    return res.status(200).json(data);
  } catch (error) {
    next(error);
  }
});

// ── Reports: Download Sales Report PDF ────────────────────────
router.get('/reports/sales/pdf', getCurrentUser as any, requireAdmin as any, async (req, res, next) => {
  try {
    const { range, month, year } = salesReportQuerySchema.parse(req.query);
    const pdfDoc = await adminService.generateSalesReportPDF(range, month, year);

    const filename = `sales_report_${range}_${new Date().toISOString().slice(0, 10)}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

    pdfDoc.pipe(res);
  } catch (error) {
    next(error);
  }
});

// ── Audit Log ──────────────────────────────────────────────
router.get('/audit-log', getCurrentUser as any, requireAdmin as any, async (req, res, next) => {
  try {
    const filters = auditLogsQuerySchema.parse(req.query);
    const logs = await adminService.getAuditLogs(
      filters.actor_id,
      filters.action,
      filters.entity_type,
      filters.page,
      filters.page_size
    );
    return res.status(200).json(logs);
  } catch (error) {
    next(error);
  }
});

// ── Enter E-way Bill for order ──────────────────────────────
router.patch('/orders/:order_id/eway-bill', getCurrentUser as any, requireAdmin as any, async (req, res, next) => {
  try {
    const { order_id } = req.params;
    const { eway_bill_no } = ewayBillSchema.parse(req.body);
    const result = await adminService.setEWayBill(order_id, eway_bill_no);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

// ── Notifications: List ─────────────────────────────────────
router.get('/notifications', getCurrentUser as any, requireAdmin as any, async (req, res, next) => {
  try {
    const pageSize = Number(req.query.page_size) || 50;
    const notifications = await adminService.getNotifications(pageSize);
    return res.status(200).json({ notifications, stats: {
      total: notifications.length,
      sent: notifications.filter((n: any) => n.status === 'sent').length,
      failed: notifications.filter((n: any) => n.status === 'failed').length,
    }});
  } catch (error) {
    next(error);
  }
});

// ── Notifications: Send ─────────────────────────────────────
router.post('/notifications/send', getCurrentUser as any, requireAdmin as any, async (req: any, res, next) => {
  try {
    const payload = sendNotificationSchema.parse(req.body);
    const result = await adminService.sendNotification(
      payload.title,
      payload.body,
      payload.target_audience,
      req.user!.id
    );
    return res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
