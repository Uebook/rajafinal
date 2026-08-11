import { Router } from 'express';
import { getCurrentUser, requireAdmin } from '../middleware/auth.js';
import { PurchaseService } from '../services/purchase.service.js';
import { z } from 'zod';

const router = Router();
const purchaseService = new PurchaseService();

const createSupplierSchema = z.object({
  name: z.string().min(1, 'Supplier name is required'),
  contactPerson: z.string().optional(),
  mobile: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  gstin: z.string().optional(),
  address: z.string().optional(),
});

const purchaseItemSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  quantity: z.number().positive('Quantity must be greater than 0'),
  purchaseRate: z.number().nonnegative('Purchase rate must be >= 0'),
  unit: z.string().optional(),
});

const createPurchaseSchema = z.object({
  supplierId: z.string().uuid('Invalid supplier ID'),
  invoiceDate: z.string().optional(),
  items: z.array(purchaseItemSchema).min(1, 'At least one product item is required'),
  paidAmount: z.number().nonnegative().optional(),
  notes: z.string().optional(),
});

// ── Suppliers Endpoints ──
router.get('/purchases/suppliers', getCurrentUser as any, requireAdmin as any, async (req, res, next) => {
  try {
    const suppliersList = await purchaseService.getSuppliers();
    return res.status(200).json(suppliersList);
  } catch (error) {
    next(error);
  }
});

router.post('/purchases/suppliers', getCurrentUser as any, requireAdmin as any, async (req, res, next) => {
  try {
    const data = createSupplierSchema.parse(req.body);
    const supplier = await purchaseService.createSupplier(data);
    return res.status(201).json(supplier);
  } catch (error) {
    next(error);
  }
});

// ── Purchases History & Voucher Creation ──
router.get('/purchases', getCurrentUser as any, requireAdmin as any, async (req, res, next) => {
  try {
    const { supplierId, startDate, endDate } = req.query as { supplierId?: string; startDate?: string; endDate?: string };
    const history = await purchaseService.getPurchaseHistory({ supplierId, startDate, endDate });
    return res.status(200).json(history);
  } catch (error) {
    next(error);
  }
});

router.post('/purchases', getCurrentUser as any, requireAdmin as any, async (req: any, res, next) => {
  try {
    const payload = createPurchaseSchema.parse(req.body);
    const purchase = await purchaseService.createPurchase({
      ...payload,
      adminUserId: req.user!.id,
    });
    return res.status(201).json(purchase);
  } catch (error) {
    next(error);
  }
});

const updatePaymentSchema = z.object({
  paidAmount: z.number().positive('Payment amount must be greater than 0'),
});

router.get('/purchases/:id', getCurrentUser as any, requireAdmin as any, async (req, res, next) => {
  try {
    const details = await purchaseService.getPurchaseDetails(req.params.id);
    return res.status(200).json(details);
  } catch (error) {
    next(error);
  }
});

router.patch('/purchases/:id/payment', getCurrentUser as any, requireAdmin as any, async (req: any, res, next) => {
  try {
    const { id } = req.params;
    const { paidAmount } = updatePaymentSchema.parse(req.body);
    const purchase = await purchaseService.updatePurchasePayment(id, paidAmount, req.user!.id);
    return res.status(200).json(purchase);
  } catch (error) {
    next(error);
  }
});

// ── Tally Daybook Report ──
router.get('/tally-daybook', getCurrentUser as any, requireAdmin as any, async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
    const daybook = await purchaseService.getTallyDaybook({ startDate, endDate });
    return res.status(200).json(daybook);
  } catch (error) {
    next(error);
  }
});

export default router;
