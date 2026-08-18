import { Router, Response } from 'express';
import { z } from 'zod';
import { db } from '../db/index.js';
import { users, vendors, retailers, ledgerEntries } from '../db/schema.js';
import { eq, and, inArray, sql } from 'drizzle-orm';
import { AuthService } from '../services/auth.service.js';
import { OTPService } from '../services/otp.service.js';
import { AuditService } from '../services/audit.service.js';
import {
  getCurrentUser,
  requireAdmin,
  requireSuperAdmin,
  AuthenticatedRequest,
} from '../middleware/auth.js';
import {
  loginSchema,
  refreshTokenSchema,
  otpSendSchema,
  otpVerifySchema,
  vendorCreateSchema,
  retailerRegisterSchema,
  changePasswordSchema,
  adminCreateSchema,
  userStatusUpdateSchema,
  profileUpdateSchema,
} from '../validation/auth.schema.js';
import { AppError } from '../utils/errors.js';

const router = Router();
const authService = new AuthService();
const otpService = new OTPService();
const auditService = new AuditService();

// Helper to format User response cleanly (equivalent to UserResponse model)
function formatUserResponse(user: typeof users.$inferSelect) {
  return {
    id: user.id,
    mobile: user.mobile,
    email: user.email,
    full_name: user.fullName,
    avatar_url: user.avatarUrl,
    role: user.role.toLowerCase(),
    status: user.status.toLowerCase(),
    is_verified: user.isVerified,
    created_at: user.createdAt,
    updated_at: user.updatedAt,
  };
}

// ── P2-03: Super Admin / Admin Login ─────────────────────────
router.post('/admin/auth/login', async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);
    if (!data.email) {
      throw new AppError(400, 'Email is required for admin login', 'BAD_REQUEST');
    }
    const result = await authService.adminLogin(data.email, data.password);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

// ── P2-01: Token Refresh ────────────────────────────────────
router.post('/auth/token/refresh', async (req, res, next) => {
  try {
    const data = refreshTokenSchema.parse(req.body);
    const result = await authService.refreshAccessToken(data.refresh_token);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

// ── P2-04: Admin Management (Super Admin only) ──────────────
router.post('/admin/users', getCurrentUser as any, requireSuperAdmin as any, async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = adminCreateSchema.parse(req.body);
    const user = await authService.createAdmin(data);
    await auditService.logAction(
      req.user!.id,
      req.user!.role,
      'create_admin',
      'user',
      user.id
    );
    return res.status(201).json(formatUserResponse(user));
  } catch (error) {
    next(error);
  }
});

router.get('/admin/users', getCurrentUser as any, requireSuperAdmin as any, async (req, res, next) => {
  try {
    const results = await db
      .select()
      .from(users)
      .where(and(eq(users.role, 'ADMIN'), eq(users.isDeleted, false)));
    return res.status(200).json(results.map(formatUserResponse));
  } catch (error) {
    next(error);
  }
});

router.get('/admin/vendors', getCurrentUser as any, requireAdmin as any, async (req, res, next) => {
  try {
    const results = await db
      .select({
        user: users,
        vendor: vendors,
      })
      .from(users)
      .leftJoin(vendors, sql`${users.id}::text = ${vendors.userId}::text`)
      .where(and(eq(users.role, 'VENDOR'), eq(users.isDeleted, false)));

    const formatted = results.map(({ user, vendor }) => {
      const resp = formatUserResponse(user) as any;
      if (vendor) {
        resp.vendor_profile = {
          id: vendor.id,
          business_name: vendor.businessName,
          gst_number: vendor.gstNumber,
          pan_number: vendor.panNumber,
          address: vendor.address,
          city: vendor.city,
          state: vendor.state,
          pincode: vendor.pincode,
        };
      } else {
        resp.vendor_profile = null;
      }
      return resp;
    });

    return res.status(200).json(formatted);
  } catch (error) {
    next(error);
  }
});

router.get('/admin/retailers', getCurrentUser as any, requireAdmin as any, async (req, res, next) => {
  try {
    const results = await db
      .select({
        user: users,
        retailer: retailers,
      })
      .from(users)
      .leftJoin(retailers, sql`${users.id}::text = ${retailers.userId}::text`)
      .where(and(eq(users.role, 'RETAILER'), eq(users.isDeleted, false)));

    // Fetch all active ledger entries to aggregate in memory
    const ledgerList = await db
      .select({
        userId: ledgerEntries.userId,
        entryType: ledgerEntries.entryType,
        amount: ledgerEntries.amount,
      })
      .from(ledgerEntries)
      .where(eq(ledgerEntries.isDeleted, false));

    const formatted = results.map(({ user, retailer }) => {
      const resp = formatUserResponse(user) as any;
      
      // Calculate outstanding balance
      const userEntries = ledgerList.filter(l => l.userId === user.id);
      const debits = userEntries.filter(l => l.entryType === 'DEBIT').reduce((acc, curr) => acc + curr.amount, 0);
      const credits = userEntries.filter(l => l.entryType === 'CREDIT').reduce((acc, curr) => acc + curr.amount, 0);
      const outstandingBalance = debits - credits;

      if (retailer) {
        resp.retailer_profile = {
          id: retailer.id,
          business_name: retailer.businessName,
          owner_name: retailer.ownerName,
          business_type: retailer.businessType,
          gst_number: retailer.gstNumber,
          address: retailer.address,
          city: retailer.city,
          state: retailer.state,
          pincode: retailer.pincode,
          credit_limit: retailer.creditLimit,
          used_limit: outstandingBalance,
          available_limit: Math.max(0, retailer.creditLimit - outstandingBalance),
        };
      } else {
        resp.retailer_profile = null;
      }
      return resp;
    });

    return res.status(200).json(formatted);
  } catch (error) {
    next(error);
  }
});

router.patch('/admin/users/:user_id/status', getCurrentUser as any, requireSuperAdmin as any, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { user_id } = req.params;
    const data = userStatusUpdateSchema.parse(req.body);
    const user = await authService.updateUserStatus(user_id, data.status);
    await auditService.logAction(
      req.user!.id,
      req.user!.role,
      'update_admin_status',
      'user',
      user_id,
      { status: data.status }
    );
    return res.status(200).json(formatUserResponse(user));
  } catch (error) {
    next(error);
  }
});

// ── P2-05: Vendor Auth (Admin-Created) ──────────────────────
router.post('/vendor/create', getCurrentUser as any, requireAdmin as any, async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = vendorCreateSchema.parse(req.body);
    const user = await authService.createVendor(data);
    await auditService.logAction(
      req.user!.id,
      req.user!.role,
      'create_vendor',
      'vendor',
      user.id
    );
    return res.status(201).json(formatUserResponse(user));
  } catch (error) {
    next(error);
  }
});

router.post('/vendor/auth/password-login', async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);
    if (!data.mobile) {
      throw new AppError(400, 'Mobile is required for vendor password login', 'BAD_REQUEST');
    }
    const result = await authService.vendorPasswordLogin(data.mobile, data.password);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/retailer/auth/password-login', async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);
    if (!data.mobile) {
      throw new AppError(400, 'Mobile is required for retailer password login', 'BAD_REQUEST');
    }
    const result = await authService.retailerPasswordLogin(data.mobile, data.password);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/vendor/auth/login', async (req, res, next) => {
  try {
    const data = otpSendSchema.parse(req.body);
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.mobile, data.mobile), eq(users.isDeleted, false)))
      .limit(1);

    if (!user) {
      throw new AppError(404, 'Mobile number not registered. Please request access.', 'NOT_FOUND');
    }
    if (user.role.toUpperCase() !== 'VENDOR') {
      throw new AppError(403, 'This number is registered as a Retailer, not a Vendor.', 'FORBIDDEN');
    }

    const result = await otpService.sendOtp(data.mobile, 'login');
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/vendor/auth/otp/verify', async (req, res, next) => {
  try {
    const data = otpVerifySchema.parse(req.body);
    await otpService.verifyOtp(data.mobile, data.otp, data.purpose);
    const result = await authService.vendorLogin(data.mobile);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/retailer/auth/register', async (req, res, next) => {
  try {
    const data = retailerRegisterSchema.parse(req.body);
    const user = await authService.registerRetailer(data);
    const tokens = await authService.generateTokens(user);
    return res.status(201).json({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_type: tokens.token_type,
      user: formatUserResponse(user),
    });
  } catch (error) {
    next(error);
  }
});

router.post('/retailer/auth/otp/verify', async (req, res, next) => {
  try {
    const data = otpVerifySchema.parse(req.body);
    await otpService.verifyOtp(data.mobile, data.otp, data.purpose);
    const result = await authService.retailerLogin(data.mobile);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

// ── P2-07: OTP Service Endpoints ────────────────────────────
router.post('/otp/send', async (req, res, next) => {
  try {
    const data = otpSendSchema.parse(req.body);
    if (data.purpose === 'login') {
      const [user] = await db
        .select()
        .from(users)
        .where(and(eq(users.mobile, data.mobile), eq(users.isDeleted, false)))
        .limit(1);

      if (!user) {
        throw new AppError(404, 'Mobile number not registered. Please register first.', 'NOT_FOUND');
      }
      if (user.role.toUpperCase() !== 'RETAILER') {
        throw new AppError(403, 'This number is registered as a Vendor, not a Retailer.', 'FORBIDDEN');
      }
    }

    const result = await otpService.sendOtp(data.mobile, data.purpose);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/otp/verify', async (req, res, next) => {
  try {
    const data = otpVerifySchema.parse(req.body);
    await otpService.verifyOtp(data.mobile, data.otp, data.purpose);
    return res.status(200).json({ verified: true });
  } catch (error) {
    next(error);
  }
});

// ── P2-08: Profile APIs ─────────────────────────────────────
router.get('/me', getCurrentUser as any, async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.status(200).json(formatUserResponse(req.user!));
  } catch (error) {
    next(error);
  }
});

router.patch('/me', getCurrentUser as any, async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = profileUpdateSchema.parse(req.body);
    const updateData: any = {};
    if (data.full_name !== undefined) updateData.fullName = data.full_name;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.avatar_url !== undefined) updateData.avatarUrl = data.avatar_url;

    if (Object.keys(updateData).length > 0) {
      const [updatedUser] = await db
        .update(users)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(users.id, req.user!.id))
        .returning();
      return res.status(200).json(formatUserResponse(updatedUser));
    }

    return res.status(200).json(formatUserResponse(req.user!));
  } catch (error) {
    next(error);
  }
});

router.patch('/me/password', getCurrentUser as any, async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = changePasswordSchema.parse(req.body);
    await authService.changePassword(req.user!, data.old_password, data.new_password);
    return res.status(200).json({ message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
});

// ── P2-09: Admin Block / Unblock Users ──────────────────────
router.patch('/admin/vendors/:vendor_id/status', getCurrentUser as any, requireAdmin as any, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { vendor_id } = req.params;
    const data = userStatusUpdateSchema.parse(req.body);
    const user = await authService.updateUserStatus(vendor_id, data.status);
    await auditService.logAction(
      req.user!.id,
      req.user!.role,
      'update_vendor_status',
      'vendor',
      vendor_id,
      { status: data.status }
    );
    return res.status(200).json(formatUserResponse(user));
  } catch (error) {
    next(error);
  }
});

router.patch('/admin/retailers/:retailer_id/status', getCurrentUser as any, requireAdmin as any, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { retailer_id } = req.params;
    const data = userStatusUpdateSchema.parse(req.body);
    const user = await authService.updateUserStatus(retailer_id, data.status);
    await auditService.logAction(
      req.user!.id,
      req.user!.role,
      'update_retailer_status',
      'retailer',
      retailer_id,
      { status: data.status }
    );
    return res.status(200).json(formatUserResponse(user));
  } catch (error) {
    next(error);
  }
});

const creditLimitUpdateSchema = z.object({
  credit_limit: z.number().nonnegative('Credit limit must be a positive number or zero'),
});

router.patch('/admin/vendors/:vendor_id/credit-limit', getCurrentUser as any, requireAdmin as any, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { vendor_id } = req.params;
    const { credit_limit } = creditLimitUpdateSchema.parse(req.body);
    const limitInPaise = Math.round(credit_limit * 100);
    const updatedVendor = await authService.updateVendorCreditLimit(vendor_id, limitInPaise);
    await auditService.logAction(
      req.user!.id,
      req.user!.role,
      'update_vendor_credit_limit',
      'vendor',
      vendor_id,
      { credit_limit: limitInPaise }
    );
    return res.status(200).json({ success: true, vendor: updatedVendor });
  } catch (error) {
    next(error);
  }
});

router.patch('/admin/retailers/:retailer_id/credit-limit', getCurrentUser as any, requireAdmin as any, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { retailer_id } = req.params;
    const { credit_limit } = creditLimitUpdateSchema.parse(req.body);
    const limitInPaise = Math.round(credit_limit * 100);
    const updatedRetailer = await authService.updateRetailerCreditLimit(retailer_id, limitInPaise);
    await auditService.logAction(
      req.user!.id,
      req.user!.role,
      'update_retailer_credit_limit',
      'retailer',
      retailer_id,
      { credit_limit: limitInPaise }
    );
    return res.status(200).json({ success: true, retailer: updatedRetailer });
  } catch (error) {
    next(error);
  }
});

export default router;
