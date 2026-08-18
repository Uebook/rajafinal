import { Router } from 'express';
import { getCurrentUser, requireAdmin } from '../middleware/auth.js';
import { AccountingService } from '../services/accounting.service.js';
import { z } from 'zod';

const router = Router();
const accountingService = new AccountingService();

const createVoucherSchema = z.object({
  partyType: z.enum(['CUSTOMER', 'SUPPLIER']),
  partyId: z.string().min(1, 'Party ID is required'),
  voucherType: z.enum([
    'CREDIT_NOTE_CUSTOMER',
    'DEBIT_NOTE_SUPPLIER',
    'PAYMENT_RECEIVE',
    'SUPPLIER_PAYMENT',
    'CUSTOMER_DUE_ENTRY',
    'SUPPLIER_DUE_ENTRY',
    'CUSTOMER_DUE_PAID',
  ]),
  amount: z.number().positive('Amount must be greater than 0'),
  paymentMethod: z.enum(['CASH', 'CHEQUE', 'UPI', 'ONLINE', 'MANUAL']).optional(),
  referenceId: z.string().optional(),
  notes: z.string().optional(),
});

// ── 1. Create Financial Voucher (Credit Note, Debit Note, Payment Received, Supplier Payment, Dues)
router.post('/accounting/vouchers', getCurrentUser as any, requireAdmin as any, async (req: any, res, next) => {
  try {
    const payload = createVoucherSchema.parse(req.body);
    const result = await accountingService.createVoucher({
      ...payload,
      adminUserId: req.user!.id,
    });
    return res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

// ── 2. Get Customer Ledger Statement ──────────────────────────────────────
router.get('/accounting/customer-ledger/:customerId', getCurrentUser as any, requireAdmin as any, async (req, res, next) => {
  try {
    const { customerId } = req.params;
    const ledger = await accountingService.getCustomerLedger(customerId);
    return res.status(200).json(ledger);
  } catch (error) {
    next(error);
  }
});

// ── 3. Get Supplier Ledger Statement ──────────────────────────────────────
router.get('/accounting/supplier-ledger/:supplierId', getCurrentUser as any, requireAdmin as any, async (req, res, next) => {
  try {
    const { supplierId } = req.params;
    const ledger = await accountingService.getSupplierLedger(supplierId);
    return res.status(200).json(ledger);
  } catch (error) {
    next(error);
  }
});

// ── 4. Overall Financial Accounting Summary ────────────────────────────────
router.get('/accounting/summary', getCurrentUser as any, requireAdmin as any, async (req, res, next) => {
  try {
    const summary = await accountingService.getAccountingSummary();
    return res.status(200).json(summary);
  } catch (error) {
    next(error);
  }
});

export default router;
