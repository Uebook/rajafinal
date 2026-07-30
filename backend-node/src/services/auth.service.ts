import jwt from 'jsonwebtoken';
import { db } from '../db/index.js';
import { users, refreshTokens, vendors, retailers } from '../db/schema.js';
import { eq, and, inArray, gt } from 'drizzle-orm';
import { hashPassword, verifyPassword } from '../utils/security.js';
import { AppError } from '../utils/errors.js';

export class AuthService {
  // ── Token Generation ─────────────────────────────────────

  async generateTokens(user: typeof users.$inferSelect) {
    const jwtSecret = process.env.JWT_SECRET_KEY || 'change-me';
    const accessExpireMinutes = process.env.ACCESS_TOKEN_EXPIRE_MINUTES
      ? parseInt(process.env.ACCESS_TOKEN_EXPIRE_MINUTES, 10)
      : 15;
    const refreshExpireDays = process.env.REFRESH_TOKEN_EXPIRE_DAYS
      ? parseInt(process.env.REFRESH_TOKEN_EXPIRE_DAYS, 10)
      : 7;

    const tokenData = {
      sub: user.id,
      role: user.role.toLowerCase(),
    };

    const accessToken = jwt.sign(
      { ...tokenData, type: 'access' },
      jwtSecret,
      { expiresIn: `${accessExpireMinutes}m` }
    );

    const refreshToken = jwt.sign(
      { ...tokenData, type: 'refresh' },
      jwtSecret,
      { expiresIn: `${refreshExpireDays}d` }
    );

    const expiresAt = new Date(Date.now() + refreshExpireDays * 24 * 60 * 60 * 1000);

    // Save refresh token to database
    await db.insert(refreshTokens).values({
      userId: user.id,
      tokenHash: hashPassword(refreshToken),
      expiresAt,
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'bearer',
      role: user.role.toLowerCase(),
      user_id: user.id,
    };
  }

  // ── Admin/SuperAdmin Login ───────────────────────────────

  async adminLogin(email: string, password: string) {
    const [user] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.email, email),
          inArray(users.role, ['SUPER_ADMIN', 'ADMIN']),
          eq(users.isDeleted, false)
        )
      )
      .limit(1);

    if (!user || !user.passwordHash) {
      throw new AppError(401, 'Invalid credentials', 'UNAUTHORIZED');
    }

    if (!verifyPassword(password, user.passwordHash)) {
      throw new AppError(401, 'Invalid credentials', 'UNAUTHORIZED');
    }

    if (user.status.toUpperCase() === 'BLOCKED') {
      throw new AppError(403, 'Account is blocked', 'FORBIDDEN');
    }

    return this.generateTokens(user);
  }

  // ── Vendor Login ───────────────────────────

  async vendorLogin(mobile: string) {
    const [user] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.mobile, mobile),
          eq(users.role, 'VENDOR'),
          eq(users.isDeleted, false)
        )
      )
      .limit(1);

    if (!user) {
      throw new AppError(400, 'Vendor account not found', 'BAD_REQUEST');
    }

    if (user.status.toUpperCase() === 'BLOCKED') {
      throw new AppError(403, 'Account is blocked', 'FORBIDDEN');
    }

    if (user.status.toUpperCase() === 'PENDING') {
      throw new AppError(400, 'Account pending verification', 'BAD_REQUEST');
    }

    return this.generateTokens(user);
  }

  // ── Retailer Login ───────────────────────────

  async retailerLogin(mobile: string) {
    const [user] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.mobile, mobile),
          eq(users.role, 'RETAILER'),
          eq(users.isDeleted, false)
        )
      )
      .limit(1);

    if (!user) {
      throw new AppError(400, 'Retailer account not found', 'BAD_REQUEST');
    }

    if (user.status.toUpperCase() === 'BLOCKED' || user.status.toUpperCase() === 'CREDIT_BLOCKED') {
      throw new AppError(403, 'Account is blocked', 'FORBIDDEN');
    }

    return this.generateTokens(user);
  }

  // ── Refresh Token ────────────────────────────────────────

  async refreshAccessToken(refreshTokenStr: string) {
    const jwtSecret = process.env.JWT_SECRET_KEY || 'change-me';
    let payload: any;
    try {
      payload = jwt.verify(refreshTokenStr, jwtSecret);
    } catch (e) {
      throw new AppError(401, 'Invalid refresh token', 'UNAUTHORIZED');
    }

    if (!payload || payload.type !== 'refresh') {
      throw new AppError(401, 'Invalid refresh token', 'UNAUTHORIZED');
    }

    const userId = payload.sub;

    // Find all valid non-revoked, non-deleted refresh tokens for this user
    const dbTokens = await db
      .select()
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.userId, userId),
          eq(refreshTokens.isRevoked, false),
          eq(refreshTokens.isDeleted, false),
          gt(refreshTokens.expiresAt, new Date())
        )
      );

    let matchedToken = null;
    for (const rt of dbTokens) {
      if (verifyPassword(refreshTokenStr, rt.tokenHash)) {
        matchedToken = rt;
        break;
      }
    }

    if (!matchedToken) {
      throw new AppError(401, 'Refresh token not found or already used', 'UNAUTHORIZED');
    }

    // Revoke old refresh token (single-use)
    await db
      .update(refreshTokens)
      .set({ isRevoked: true, updatedAt: new Date() })
      .where(eq(refreshTokens.id, matchedToken.id));

    // Fetch user
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, userId), eq(users.isDeleted, false)))
      .limit(1);

    if (!user) {
      throw new AppError(401, 'User not found', 'UNAUTHORIZED');
    }

    return this.generateTokens(user);
  }

  // ── Admin Creates Vendor ─────────────────────────────────

  async createVendor(data: any) {
    // Check duplicate mobile
    const [existing] = await db
      .select()
      .from(users)
      .where(and(eq(users.mobile, data.mobile), eq(users.isDeleted, false)))
      .limit(1);

    if (existing) {
      throw new AppError(400, 'Mobile number already registered', 'BAD_REQUEST');
    }

    return db.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({
          mobile: data.mobile,
          fullName: data.full_name,
          role: 'VENDOR',
          status: 'ACTIVE',
          isVerified: true,
          passwordHash: hashPassword(data.password),
          geoLocation: data.geo_location || null,
        })
        .returning();

      await tx.insert(vendors).values({
        userId: user.id,
        businessName: data.business_name,
        gstNumber: data.gst_number || null,
        panNumber: data.pan_number || null,
        address: data.address || null,
        city: data.city || null,
        state: data.state || null,
        pincode: data.pincode || null,
      });

      return user;
    });
  }

  // ── Vendor Password Login ─────────────────────────────────

  async vendorPasswordLogin(mobile: string, password: string) {
    const [user] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.mobile, mobile),
          eq(users.role, 'VENDOR'),
          eq(users.isDeleted, false)
        )
      )
      .limit(1);

    if (!user || !user.passwordHash) {
      throw new AppError(401, 'Invalid credentials', 'UNAUTHORIZED');
    }

    if (!verifyPassword(password, user.passwordHash)) {
      throw new AppError(401, 'Invalid credentials', 'UNAUTHORIZED');
    }

    if (user.status.toUpperCase() === 'BLOCKED') {
      throw new AppError(403, 'Account is blocked', 'FORBIDDEN');
    }

    return this.generateTokens(user);
  }

  // ── Retailer Password Login ───────────────────────────────

  async retailerPasswordLogin(mobile: string, password: string) {
    const [user] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.mobile, mobile),
          eq(users.role, 'RETAILER'),
          eq(users.isDeleted, false)
        )
      )
      .limit(1);

    if (!user || !user.passwordHash) {
      throw new AppError(401, 'Invalid credentials', 'UNAUTHORIZED');
    }

    if (!verifyPassword(password, user.passwordHash)) {
      throw new AppError(401, 'Invalid credentials', 'UNAUTHORIZED');
    }

    if (user.status.toUpperCase() === 'BLOCKED') {
      throw new AppError(403, 'Account is blocked', 'FORBIDDEN');
    }

    return this.generateTokens(user);
  }

  // ── Retailer Self-Registration ───────────────────────────

  async registerRetailer(data: any) {
    // Check duplicate mobile
    const [existing] = await db
      .select()
      .from(users)
      .where(and(eq(users.mobile, data.mobile), eq(users.isDeleted, false)))
      .limit(1);

    if (existing) {
      throw new AppError(400, 'Mobile number already registered', 'BAD_REQUEST');
    }

    return db.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({
          mobile: data.mobile,
          fullName: data.owner_name,
          role: 'RETAILER',
          status: 'PENDING',
          isVerified: false,
          geoLocation: data.geo_location || null,
        })
        .returning();

      await tx.insert(retailers).values({
        userId: user.id,
        businessName: data.business_name,
        ownerName: data.owner_name,
        businessType: data.business_type || null,
        gstNumber: data.gst_number || null,
        address: data.address || null,
        city: data.city || null,
        state: data.state || null,
        pincode: data.pincode || null,
        creditLimit: 0,
      });

      return user;
    });
  }

  // ── Admin CRUD ───────────────────────────────────────────

  async createAdmin(data: any) {
    const [existing] = await db
      .select()
      .from(users)
      .where(and(eq(users.email, data.email), eq(users.isDeleted, false)))
      .limit(1);

    if (existing) {
      throw new AppError(400, 'Email already registered', 'BAD_REQUEST');
    }

    const [user] = await db
      .insert(users)
      .values({
        email: data.email,
        mobile: data.mobile,
        fullName: data.full_name,
        role: 'ADMIN',
        status: 'ACTIVE',
        isVerified: true,
        passwordHash: hashPassword(data.password),
      })
      .returning();

    return user;
  }

  async updateUserStatus(userId: string, newStatus: 'active' | 'blocked' | 'pending' | 'credit_blocked' | 'deactivated') {
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, userId), eq(users.isDeleted, false)))
      .limit(1);

    if (!user) {
      throw new AppError(400, 'User not found', 'BAD_REQUEST');
    }

    const [updatedUser] = await db
      .update(users)
      .set({ status: newStatus.toUpperCase() as any, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();

    return updatedUser;
  }

  async getUserById(userId: string) {
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, userId), eq(users.isDeleted, false)))
      .limit(1);

    return user || null;
  }

  async changePassword(user: typeof users.$inferSelect, oldPassword: string, newPassword: string) {
    if (!user.passwordHash || !verifyPassword(oldPassword, user.passwordHash)) {
      throw new AppError(400, 'Incorrect old password', 'BAD_REQUEST');
    }

    await db
      .update(users)
      .set({ passwordHash: hashPassword(newPassword), updatedAt: new Date() })
      .where(eq(users.id, user.id));
  }

  async updateRetailerCreditLimit(userId: string, newLimit: number) {
    const [retailer] = await db
      .select()
      .from(retailers)
      .where(and(eq(retailers.userId, userId), eq(retailers.isDeleted, false)))
      .limit(1);

    if (!retailer) {
      throw new AppError(400, 'Retailer profile not found', 'BAD_REQUEST');
    }

    const [updatedRetailer] = await db
      .update(retailers)
      .set({ creditLimit: newLimit, updatedAt: new Date() })
      .where(eq(retailers.userId, userId))
      .returning();

    return updatedRetailer;
  }
}
