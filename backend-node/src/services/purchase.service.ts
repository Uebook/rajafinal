import { db } from '../db/index.js';
import { purchases, purchaseItems, suppliers, products, ledgerEntries, users, orders } from '../db/schema.js';
import { eq, desc, sql, and, gte, lte } from 'drizzle-orm';
import { AppError } from '../utils/errors.js';

export interface PurchaseItemInput {
  productId: string;
  quantity: number;
  purchaseRate: number; // in rupees or sub-units
}

export interface CreatePurchaseInput {
  supplierId: string;
  invoiceDate?: string;
  items: PurchaseItemInput[];
  paidAmount?: number;
  notes?: string;
  adminUserId: string;
}

export class PurchaseService {

  // Create Supplier
  async createSupplier(data: { name: string; contactPerson?: string; mobile?: string; email?: string; gstin?: string; address?: string }) {
    const [supplier] = await db.insert(suppliers).values({
      name: data.name,
      contactPerson: data.contactPerson,
      mobile: data.mobile,
      email: data.email,
      gstin: data.gstin,
      address: data.address,
    }).returning();
    return supplier;
  }

  // Get Suppliers list
  async getSuppliers() {
    return await db.select().from(suppliers).where(eq(suppliers.isDeleted, false)).orderBy(suppliers.name);
  }

  // Create Purchase Voucher with Transaction
  async createPurchase(input: CreatePurchaseInput) {
    if (!input.items || input.items.length === 0) {
      throw new AppError(400, 'Purchase must contain at least one item', 'BAD_REQUEST');
    }

    return await db.transaction(async (tx) => {
      // 1. Verify Supplier exists
      const [supplier] = await tx.select().from(suppliers).where(and(eq(suppliers.id, input.supplierId), eq(suppliers.isDeleted, false)));
      if (!supplier) {
        throw new AppError(404, 'Supplier not found', 'NOT_FOUND');
      }

      // Calculate total amount
      let totalAmount = 0;
      for (const item of input.items) {
        if (item.quantity <= 0 || item.purchaseRate < 0) {
          throw new AppError(400, 'Invalid quantity or purchase rate', 'BAD_REQUEST');
        }
        totalAmount += item.quantity * item.purchaseRate;
      }

      const purchaseNumber = `PUR-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
      const paidAmount = input.paidAmount || 0;
      const paymentStatus = paidAmount >= totalAmount ? 'PAID' : paidAmount > 0 ? 'PARTIAL' : 'UNPAID';

      // 2. Insert Purchase Record
      const [purchase] = await tx.insert(purchases).values({
        purchaseNumber,
        supplierId: input.supplierId,
        invoiceDate: input.invoiceDate ? new Date(input.invoiceDate) : new Date(),
        totalAmount,
        paidAmount,
        paymentStatus,
        notes: input.notes,
      }).returning();

      // 3. Process items: Save purchase item & AUTO-INCREMENT product stock ONLY (leave selling price untouched!)
      for (const item of input.items) {
        const itemTotal = item.quantity * item.purchaseRate;

        // Insert Purchase Item record
        await tx.insert(purchaseItems).values({
          purchaseId: purchase.id,
          productId: item.productId,
          quantity: item.quantity,
          purchaseRate: item.purchaseRate,
          totalAmount: itemTotal,
        });

        // Update product stock only: stock_qty = stock_qty + item.quantity
        const [existingProd] = await tx.select().from(products).where(eq(products.id, item.productId));
        if (!existingProd) {
          throw new AppError(404, `Product ${item.productId} not found`, 'NOT_FOUND');
        }

        await tx.update(products)
          .set({
            stockQty: existingProd.stockQty + item.quantity,
            updatedAt: new Date(),
          })
          .where(eq(products.id, item.productId));
      }

      // 4. Update Supplier Payable Balance
      const updatedBalance = supplier.balance + (totalAmount - paidAmount);
      await tx.update(suppliers)
        .set({ balance: updatedBalance, updatedAt: new Date() })
        .where(eq(suppliers.id, input.supplierId));

      // 5. Post Tally Double-Entry Ledger Vouchers
      // Debit: Purchase Account, Credit: Supplier Account
      await tx.insert(ledgerEntries).values({
        userId: input.adminUserId,
        entryType: 'DEBIT',
        amount: totalAmount,
        referenceType: 'PURCHASE',
        referenceId: purchase.id,
        description: `Purchase #${purchaseNumber} from ${supplier.name}`,
        voucherType: 'PURCHASE',
        debitAccount: 'Purchase Account',
        creditAccount: `Supplier: ${supplier.name}`,
      });

      if (paidAmount > 0) {
        // Payment voucher if amount was paid immediately
        await tx.insert(ledgerEntries).values({
          userId: input.adminUserId,
          entryType: 'CREDIT',
          amount: paidAmount,
          referenceType: 'PURCHASE_PAYMENT',
          referenceId: purchase.id,
          description: `Payment for Purchase #${purchaseNumber} to ${supplier.name}`,
          voucherType: 'PAYMENT',
          debitAccount: `Supplier: ${supplier.name}`,
          creditAccount: 'Cash/Bank Account',
        });
      }

      return purchase;
    });
  }

  // Get Purchase History
  async getPurchaseHistory(filters?: { supplierId?: string; startDate?: string; endDate?: string }) {
    const conditions = [eq(purchases.isDeleted, false)];
    if (filters?.supplierId) {
      conditions.push(eq(purchases.supplierId, filters.supplierId));
    }
    if (filters?.startDate) {
      conditions.push(gte(purchases.invoiceDate, new Date(filters.startDate)));
    }
    if (filters?.endDate) {
      conditions.push(lte(purchases.invoiceDate, new Date(filters.endDate)));
    }

    const list = await db.select({
      id: purchases.id,
      purchaseNumber: purchases.purchaseNumber,
      supplierId: purchases.supplierId,
      supplierName: suppliers.name,
      invoiceDate: purchases.invoiceDate,
      totalAmount: purchases.totalAmount,
      paidAmount: purchases.paidAmount,
      paymentStatus: purchases.paymentStatus,
      createdAt: purchases.createdAt,
    })
    .from(purchases)
    .innerJoin(suppliers, eq(purchases.supplierId, suppliers.id))
    .where(and(...conditions))
    .orderBy(desc(purchases.invoiceDate));

    return list;
  }

  // Get Detailed Single Purchase with Items
  async getPurchaseDetails(purchaseId: string) {
    const [purchase] = await db.select({
      id: purchases.id,
      purchaseNumber: purchases.purchaseNumber,
      supplierId: purchases.supplierId,
      supplierName: suppliers.name,
      supplierGstin: suppliers.gstin,
      supplierMobile: suppliers.mobile,
      invoiceDate: purchases.invoiceDate,
      totalAmount: purchases.totalAmount,
      paidAmount: purchases.paidAmount,
      paymentStatus: purchases.paymentStatus,
      notes: purchases.notes,
      createdAt: purchases.createdAt,
    })
    .from(purchases)
    .innerJoin(suppliers, eq(purchases.supplierId, suppliers.id))
    .where(and(eq(purchases.id, purchaseId), eq(purchases.isDeleted, false)));

    if (!purchase) throw new AppError(404, 'Purchase not found', 'NOT_FOUND');

    const items = await db.select({
      id: purchaseItems.id,
      productId: purchaseItems.productId,
      productName: products.name,
      productSku: products.sku,
      unit: products.unit,
      quantity: purchaseItems.quantity,
      purchaseRate: purchaseItems.purchaseRate,
      totalAmount: purchaseItems.totalAmount,
    })
    .from(purchaseItems)
    .innerJoin(products, eq(purchaseItems.productId, products.id))
    .where(and(eq(purchaseItems.purchaseId, purchaseId), eq(purchaseItems.isDeleted, false)));

    return { ...purchase, items };
  }

  // Get Tally-like Unified Daybook (Purchase + Sales + Payments)
  async getTallyDaybook(filters?: { startDate?: string; endDate?: string }) {
    const conditions = [eq(ledgerEntries.isDeleted, false)];
    if (filters?.startDate) {
      conditions.push(gte(ledgerEntries.createdAt, new Date(filters.startDate)));
    }
    if (filters?.endDate) {
      conditions.push(lte(ledgerEntries.createdAt, new Date(filters.endDate)));
    }

    const vouchers = await db.select({
      id: ledgerEntries.id,
      createdAt: ledgerEntries.createdAt,
      entryType: ledgerEntries.entryType,
      voucherType: ledgerEntries.voucherType,
      debitAccount: ledgerEntries.debitAccount,
      creditAccount: ledgerEntries.creditAccount,
      amount: ledgerEntries.amount,
      description: ledgerEntries.description,
      referenceType: ledgerEntries.referenceType,
      referenceId: ledgerEntries.referenceId,
    })
    .from(ledgerEntries)
    .where(and(...conditions))
    .orderBy(desc(ledgerEntries.createdAt));

    return vouchers;
  }
}
