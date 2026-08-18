import { db } from '../db/index.js';
import { ledgerEntries, suppliers, users, purchases, orders, retailers } from '../db/schema.js';
import { eq, and, desc, sql } from 'drizzle-orm';
import { AppError } from '../utils/errors.js';
import crypto from 'crypto';

export interface AccountingVoucherInput {
  partyType: 'CUSTOMER' | 'SUPPLIER';
  partyId: string; // userId for Customer, supplierId for Supplier
  voucherType: 
    | 'CREDIT_NOTE_CUSTOMER'
    | 'DEBIT_NOTE_SUPPLIER'
    | 'PAYMENT_RECEIVE'
    | 'SUPPLIER_PAYMENT'
    | 'CUSTOMER_DUE_ENTRY'
    | 'SUPPLIER_DUE_ENTRY'
    | 'CUSTOMER_DUE_PAID';
  amount: number; // in rupees or sub-units
  paymentMethod?: 'CASH' | 'CHEQUE' | 'UPI' | 'ONLINE' | 'MANUAL';
  referenceId?: string;
  notes?: string;
  adminUserId: string;
}

export class AccountingService {
  
  // ── 1. Create Financial Voucher ────────────────────────────────
  async createVoucher(input: AccountingVoucherInput) {
    if (!input.amount || input.amount <= 0) {
      throw new AppError(400, 'Voucher amount must be greater than 0', 'BAD_REQUEST');
    }

    return await db.transaction(async (tx) => {
      const voucherId = crypto.randomUUID();
      const now = new Date();

      if (input.partyType === 'CUSTOMER') {
        // Verify Customer User Exists
        const [customer] = await tx.select().from(users).where(and(eq(users.id, input.partyId), eq(users.isDeleted, false)));
        if (!customer) {
          throw new AppError(404, 'Customer user not found', 'NOT_FOUND');
        }

        let entryType: 'DEBIT' | 'CREDIT' = 'CREDIT';
        let debitAccount = '';
        let creditAccount = '';
        let description = input.notes || '';
        let vType = 'GENERAL';

        switch (input.voucherType) {
          case 'CREDIT_NOTE_CUSTOMER':
            entryType = 'CREDIT';
            vType = 'CREDIT_NOTE';
            debitAccount = 'Sales Returns / Discount Account';
            creditAccount = `Customer: ${customer.fullName}`;
            if (!description) description = `Credit Note for Customer ${customer.fullName}`;
            break;

          case 'PAYMENT_RECEIVE':
            entryType = 'CREDIT';
            vType = 'RECEIPT';
            debitAccount = `${input.paymentMethod || 'Cash/Bank'} Account`;
            creditAccount = `Customer: ${customer.fullName}`;
            if (!description) description = `Payment Received from ${customer.fullName} via ${input.paymentMethod || 'Cash'}`;
            break;

          case 'CUSTOMER_DUE_ENTRY':
            entryType = 'DEBIT';
            vType = 'CUSTOMER_DUE';
            debitAccount = `Customer: ${customer.fullName}`;
            creditAccount = 'Opening Balance / Adjustment Account';
            if (!description) description = `Customer Outstanding Due Entry for ${customer.fullName}`;
            break;

          case 'CUSTOMER_DUE_PAID':
            entryType = 'CREDIT';
            vType = 'CUSTOMER_DUE_PAID';
            debitAccount = `${input.paymentMethod || 'Cash/Bank'} Account`;
            creditAccount = `Customer: ${customer.fullName}`;
            if (!description) description = `Customer Due Paid Settlement by ${customer.fullName}`;
            break;

          default:
            throw new AppError(400, 'Invalid voucher type for customer', 'BAD_REQUEST');
        }

        // Insert into ledgerEntries
        const [entry] = await tx.insert(ledgerEntries).values({
          id: voucherId,
          userId: customer.id,
          entryType,
          amount: Math.round(input.amount),
          referenceType: input.voucherType,
          referenceId: input.referenceId ? input.referenceId : voucherId,
          description,
          voucherType: vType,
          debitAccount,
          creditAccount,
        } as any).returning();

        return { success: true, voucher: entry };

      } else if (input.partyType === 'SUPPLIER') {
        // Verify Supplier Exists
        const [supplier] = await tx.select().from(suppliers).where(and(eq(suppliers.id, input.partyId), eq(suppliers.isDeleted, false)));
        if (!supplier) {
          throw new AppError(404, 'Supplier not found', 'NOT_FOUND');
        }

        let entryType: 'DEBIT' | 'CREDIT' = 'DEBIT';
        let debitAccount = '';
        let creditAccount = '';
        let description = input.notes || '';
        let vType = 'GENERAL';

        switch (input.voucherType) {
          case 'DEBIT_NOTE_SUPPLIER':
            entryType = 'DEBIT';
            vType = 'DEBIT_NOTE';
            debitAccount = `Supplier: ${supplier.name}`;
            creditAccount = 'Purchase Returns / Debit Note Account';
            if (!description) description = `Debit Note for Supplier ${supplier.name}`;
            // Reduce Supplier Balance Owed
            await tx.update(suppliers)
              .set({ balance: Math.max(0, supplier.balance - Math.round(input.amount)), updatedAt: now })
              .where(eq(suppliers.id, supplier.id));
            break;

          case 'SUPPLIER_PAYMENT':
            entryType = 'CREDIT'; // Payment credited from cash/bank
            vType = 'PAYMENT';
            debitAccount = `Supplier: ${supplier.name}`;
            creditAccount = `${input.paymentMethod || 'Cash/Bank'} Account`;
            if (!description) description = `Supplier Payment to ${supplier.name} via ${input.paymentMethod || 'Cash'}`;
            // Reduce Supplier Balance Owed
            await tx.update(suppliers)
              .set({ balance: Math.max(0, supplier.balance - Math.round(input.amount)), updatedAt: now })
              .where(eq(suppliers.id, supplier.id));
            break;

          case 'SUPPLIER_DUE_ENTRY':
            entryType = 'DEBIT';
            vType = 'SUPPLIER_DUE';
            debitAccount = 'Opening Balance / Adjustment Account';
            creditAccount = `Supplier: ${supplier.name}`;
            if (!description) description = `Supplier Due Amount Entry for ${supplier.name}`;
            // Increase Supplier Balance Owed
            await tx.update(suppliers)
              .set({ balance: supplier.balance + Math.round(input.amount), updatedAt: now })
              .where(eq(suppliers.id, supplier.id));
            break;

          default:
            throw new AppError(400, 'Invalid voucher type for supplier', 'BAD_REQUEST');
        }

        // Insert into ledgerEntries (attached to admin user who created it)
        const [entry] = await tx.insert(ledgerEntries).values({
          id: voucherId,
          userId: input.adminUserId,
          entryType,
          amount: Math.round(input.amount),
          referenceType: `SUPPLIER_${input.voucherType}`,
          referenceId: supplier.id,
          description,
          voucherType: vType,
          debitAccount,
          creditAccount,
        } as any).returning();

        return { success: true, voucher: entry, supplierBalance: supplier.balance };
      }

      throw new AppError(400, 'Invalid party type', 'BAD_REQUEST');
    });
  }

  // ── 2. Get Customer Ledger Statement ─────────────────────────
  async getCustomerLedger(customerId: string) {
    const [customer] = await db.select({
      id: users.id,
      fullName: users.fullName,
      mobile: users.mobile,
      email: users.email,
      role: users.role,
    }).from(users).where(and(eq(users.id, customerId), eq(users.isDeleted, false)));

    if (!customer) throw new AppError(404, 'Customer not found', 'NOT_FOUND');

    const [retailer] = await db.select({
      businessName: retailers.businessName,
      creditLimit: retailers.creditLimit,
      gstNumber: retailers.gstNumber,
    }).from(retailers).where(eq(retailers.userId, customerId));

    const entries = await db.select()
      .from(ledgerEntries)
      .where(and(eq(ledgerEntries.userId, customerId), eq(ledgerEntries.isDeleted, false)))
      .orderBy(desc(ledgerEntries.createdAt));

    let totalDebit = 0;  // Sales / Customer Dues
    let totalCredit = 0; // Payments / Credit Notes

    entries.forEach(e => {
      if (e.entryType === 'DEBIT') totalDebit += e.amount;
      if (e.entryType === 'CREDIT') totalCredit += e.amount;
    });

    const netOutstanding = totalDebit - totalCredit;

    return {
      customer: {
        ...customer,
        businessName: retailer?.businessName || customer.fullName,
        creditLimit: retailer?.creditLimit || 0,
        gstNumber: retailer?.gstNumber || null,
      },
      summary: {
        totalDebit,
        totalCredit,
        netOutstanding,
      },
      entries,
    };
  }

  // ── 3. Get Supplier Ledger Statement ─────────────────────────
  async getSupplierLedger(supplierId: string) {
    const [supplier] = await db.select().from(suppliers).where(and(eq(suppliers.id, supplierId), eq(suppliers.isDeleted, false)));
    if (!supplier) throw new AppError(404, 'Supplier not found', 'NOT_FOUND');

    // Fetch all purchases
    const purchaseList = await db.select().from(purchases)
      .where(and(eq(purchases.supplierId, supplierId), eq(purchases.isDeleted, false)))
      .orderBy(desc(purchases.invoiceDate));

    // Fetch supplier vouchers from ledgerEntries
    const ledgerList = await db.select().from(ledgerEntries)
      .where(and(
        eq(ledgerEntries.isDeleted, false),
        sql`${ledgerEntries.referenceId} = ${supplierId} OR ${ledgerEntries.creditAccount} LIKE ${`%Supplier: ${supplier.name}%`} OR ${ledgerEntries.debitAccount} LIKE ${`%Supplier: ${supplier.name}%`}`
      ))
      .orderBy(desc(ledgerEntries.createdAt));

    let totalPurchases = 0;
    let totalPaid = 0;

    purchaseList.forEach(p => {
      totalPurchases += p.totalAmount;
      totalPaid += p.paidAmount;
    });

    return {
      supplier,
      summary: {
        totalPurchases,
        totalPaid,
        currentBalance: supplier.balance,
      },
      purchases: purchaseList,
      vouchers: ledgerList,
    };
  }

  // ── 4. Overall Financial Accounting Summary ──────────────────
  async getAccountingSummary() {
    // Total Customer Dues calculation
    const allLedger = await db.select().from(ledgerEntries).where(eq(ledgerEntries.isDeleted, false));
    let totalCustomerDebits = 0;
    let totalCustomerCredits = 0;

    allLedger.forEach(l => {
      if (l.entryType === 'DEBIT') totalCustomerDebits += l.amount;
      if (l.entryType === 'CREDIT') totalCustomerCredits += l.amount;
    });

    // Total Supplier Balance
    const supplierRows = await db.select({ balance: suppliers.balance }).from(suppliers).where(eq(suppliers.isDeleted, false));
    const totalSupplierPayable = supplierRows.reduce((acc, s) => acc + (s.balance || 0), 0);

    return {
      totalCustomerDebits,
      totalCustomerCredits,
      netCustomerOutstanding: Math.max(0, totalCustomerDebits - totalCustomerCredits),
      totalSupplierPayable,
    };
  }
}
