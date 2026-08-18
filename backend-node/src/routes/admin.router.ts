import { Router } from 'express';
import { getCurrentUser, requireAdmin, AuthenticatedRequest } from '../middleware/auth.js';
import { AdminService } from '../services/admin.service.js';
import { z } from 'zod';
import { db } from '../db/index.js';
import { suppliers, ledgerEntries, users, retailers } from '../db/schema.js';
import { eq, and, desc, sql } from 'drizzle-orm';
import crypto from 'crypto';
import { AppError } from '../utils/errors.js';

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

const dashboardQuerySchema = z.object({
  start_date: z.string().optional(),
  end_date: z.string().optional(),
});

// ── Reports: Dashboard KPIs ──────────────────────────────────
router.get('/reports/dashboard', getCurrentUser as any, requireAdmin as any, async (req, res, next) => {
  try {
    const { start_date, end_date } = dashboardQuerySchema.parse(req.query);
    const kpis = await adminService.getDashboardKPIs(start_date, end_date);
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

// ── Unified Accounting Vouchers: Create ──────────────────────
const voucherCreateSchema = z.object({
  voucherType: z.enum([
    'PAYMENT',
    'RECEIPT',
    'DEBIT_NOTE',
    'CREDIT_NOTE',
    'CREDIT_NOTE_CUSTOMER',
    'DEBIT_NOTE_SUPPLIER',
    'PAYMENT_RECEIVE',
    'SUPPLIER_PAYMENT',
    'CUSTOMER_DUE_ENTRY',
    'SUPPLIER_DUE_ENTRY',
    'CUSTOMER_DUE_PAID',
  ]),
  partyType: z.enum(['RETAILER', 'SUPPLIER']),
  partyId: z.string().uuid(),
  amount: z.number().int().positive('Amount must be positive'), // in paise
  description: z.string().optional(),
  date: z.string().optional(), // optional date string
});

router.post('/vouchers', getCurrentUser as any, requireAdmin as any, async (req: AuthenticatedRequest, res, next) => {
  try {
    const payload = voucherCreateSchema.parse(req.body);
    const adminUserId = req.user!.id;
    const createdAtDate = payload.date ? new Date(payload.date) : new Date();

    const result = await db.transaction(async (tx) => {
      let debitAccount = '';
      let creditAccount = '';
      let entryType: 'DEBIT' | 'CREDIT' = 'DEBIT';
      let userId = adminUserId;
      let refType = 'MANUAL_VOUCHER';
      let refId = crypto.randomUUID();

      if (payload.partyType === 'SUPPLIER') {
        const [supplier] = await tx.select().from(suppliers).where(and(eq(suppliers.id, payload.partyId), eq(suppliers.isDeleted, false)));
        if (!supplier) {
          throw new AppError(404, 'Supplier not found', 'NOT_FOUND');
        }

        // Supplier balance adjustment logic
        let adjustment = 0;
        const vType = payload.voucherType;

        if (vType === 'PAYMENT' || vType === 'RECEIPT' || vType === 'DEBIT_NOTE' || vType === 'DEBIT_NOTE_SUPPLIER' || vType === 'SUPPLIER_PAYMENT') {
          adjustment = -payload.amount; // reduces payable balance owed to supplier
        } else if (vType === 'CREDIT_NOTE' || vType === 'SUPPLIER_DUE_ENTRY') {
          adjustment = payload.amount; // increases payable balance owed to supplier
        }

        const newBalance = Math.max(0, supplier.balance + adjustment);
        await tx.update(suppliers).set({ balance: newBalance, updatedAt: new Date() }).where(eq(suppliers.id, supplier.id));

        // Set accounts for double entry:
        if (vType === 'PAYMENT' || vType === 'SUPPLIER_PAYMENT') {
          debitAccount = `Supplier: ${supplier.name}`;
          creditAccount = 'Cash/Bank Account';
          entryType = 'CREDIT'; // credit cash/bank
        } else if (vType === 'RECEIPT') {
          debitAccount = 'Cash/Bank Account';
          creditAccount = `Supplier: ${supplier.name}`;
          entryType = 'DEBIT'; // debit cash/bank
        } else if (vType === 'DEBIT_NOTE' || vType === 'DEBIT_NOTE_SUPPLIER') {
          debitAccount = `Supplier: ${supplier.name}`;
          creditAccount = 'Purchase Return / Debit Note Account';
          entryType = 'DEBIT';
        } else if (vType === 'CREDIT_NOTE') {
          debitAccount = 'Purchase Account';
          creditAccount = `Supplier: ${supplier.name}`;
          entryType = 'CREDIT';
        } else if (vType === 'SUPPLIER_DUE_ENTRY') {
          debitAccount = 'Opening Balance / Adjustment Account';
          creditAccount = `Supplier: ${supplier.name}`;
          entryType = 'CREDIT';
        }

        const ledgerId = crypto.randomUUID();
        const [inserted] = await tx.insert(ledgerEntries).values({
          id: ledgerId,
          userId: adminUserId,
          entryType,
          amount: payload.amount,
          referenceType: refType,
          referenceId: supplier.id,
          description: payload.description || `${vType} voucher posted for Supplier ${supplier.name}`,
          voucherType: vType,
          debitAccount,
          creditAccount,
          createdAt: createdAtDate,
          updatedAt: new Date(),
        } as any).returning();

        return inserted;

      } else {
        // RETAILER (CUSTOMER)
        let retailer = (await tx.select().from(retailers).where(and(eq(retailers.id, payload.partyId), eq(retailers.isDeleted, false))))[0];
        if (!retailer) {
          // If passed partyId is userId directly
          retailer = (await tx.select().from(retailers).where(and(eq(retailers.userId, payload.partyId), eq(retailers.isDeleted, false))))[0];
        }
        if (!retailer) {
          throw new AppError(404, 'Customer (Retailer) not found', 'NOT_FOUND');
        }

        const [usr] = await tx.select().from(users).where(eq(users.id, retailer.userId));
        const partyName = usr ? usr.fullName : 'Retailer';
        userId = retailer.userId;
        const vType = payload.voucherType;

        // Set accounts for double entry:
        if (vType === 'RECEIPT' || vType === 'PAYMENT_RECEIVE' || vType === 'CUSTOMER_DUE_PAID') {
          debitAccount = 'Cash/Bank Account';
          creditAccount = `Retailer: ${partyName}`;
          entryType = 'CREDIT'; // credit customer to reduce due balance
        } else if (vType === 'PAYMENT') {
          debitAccount = `Retailer: ${partyName}`;
          creditAccount = 'Cash/Bank Account';
          entryType = 'DEBIT'; // debit customer to increase balance
        } else if (vType === 'DEBIT_NOTE') {
          debitAccount = `Retailer: ${partyName}`;
          creditAccount = 'Interest/Charges Account';
          entryType = 'DEBIT';
        } else if (vType === 'CREDIT_NOTE' || vType === 'CREDIT_NOTE_CUSTOMER') {
          debitAccount = 'Sales Return / Discount Account';
          creditAccount = `Retailer: ${partyName}`;
          entryType = 'CREDIT';
        } else if (vType === 'CUSTOMER_DUE_ENTRY') {
          debitAccount = `Retailer: ${partyName}`;
          creditAccount = 'Opening Balance / Adjustment Account';
          entryType = 'DEBIT'; // debit customer to record outstanding due
        }

        const ledgerId = crypto.randomUUID();
        const [inserted] = await tx.insert(ledgerEntries).values({
          id: ledgerId,
          userId: retailer.userId,
          entryType,
          amount: payload.amount,
          referenceType: refType,
          referenceId: refId,
          description: payload.description || `${vType} voucher posted for Customer ${partyName}`,
          voucherType: vType,
          debitAccount,
          creditAccount,
          createdAt: createdAtDate,
          updatedAt: new Date(),
        } as any).returning();

        return inserted;
      }
    });

    return res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

// ── Supplier Ledger entries ───────────────────────────────────
router.get('/suppliers/:supplierId/ledger', getCurrentUser as any, requireAdmin as any, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { supplierId } = req.params;
    
    // 1. Fetch supplier
    const [supplier] = await db.select().from(suppliers).where(and(eq(suppliers.id, supplierId), eq(suppliers.isDeleted, false)));
    if (!supplier) {
      throw new AppError(404, 'Supplier not found', 'NOT_FOUND');
    }

    // 2. Fetch all ledger entries that match the supplier's name
    const supplierAccountName = `Supplier: ${supplier.name}`;
    
    const list = await db.select()
      .from(ledgerEntries)
      .where(
        and(
          eq(ledgerEntries.isDeleted, false),
          sql`${ledgerEntries.debitAccount} = ${supplierAccountName} OR ${ledgerEntries.creditAccount} = ${supplierAccountName}`
        )
      )
      .orderBy(desc(ledgerEntries.createdAt));

    // Map entries to standard format
    const entries = list.map((e) => {
      const isDebit = e.debitAccount === supplierAccountName;
      
      return {
        id: e.id,
        entry_type: isDebit ? 'debit' : 'credit',
        amount: e.amount,
        reference_type: e.referenceType,
        reference_id: e.referenceId,
        description: e.description,
        voucher_type: e.voucherType,
        created_at: e.createdAt,
      };
    });

    return res.status(200).json({
      outstanding_balance: supplier.balance,
      available_balance: 0,
      credit_limit: 0,
      entries,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
