import { db } from '../db/index.js';
import { otps, users } from '../db/schema.js';
import { eq, and, gt, desc } from 'drizzle-orm';
import { hashOtp, verifyOtp as verifyOtpHash } from '../utils/security.js';
import { AppError } from '../utils/errors.js';

export class OTPService {
  async sendOtp(mobile: string, purpose: string) {
    const resendCooldown = process.env.OTP_RESEND_COOLDOWN_SECONDS
      ? parseInt(process.env.OTP_RESEND_COOLDOWN_SECONDS, 10)
      : 60;

    const cooldownCutoff = new Date(Date.now() - resendCooldown * 1000);

    // Check resend cooldown
    const existingOtp = await db
      .select()
      .from(otps)
      .where(
        and(
          eq(otps.mobile, mobile),
          eq(otps.purpose, purpose),
          eq(otps.isDeleted, false),
          gt(otps.createdAt, cooldownCutoff)
        )
      )
      .limit(1);

    if (existingOtp.length > 0) {
      throw new AppError(
        400,
        `Please wait ${resendCooldown}s before requesting a new OTP`,
        'BAD_REQUEST'
      );
    }

    // Generate 6-digit OTP (fixed to '123456' for dev just like FastAPI)
    const otpPlain = '123456';
    const otpExpireMinutes = process.env.OTP_EXPIRE_MINUTES
      ? parseInt(process.env.OTP_EXPIRE_MINUTES, 10)
      : 5;

    const expiresAt = new Date(Date.now() + otpExpireMinutes * 60 * 1000);

    const [otpRecord] = await db
      .insert(otps)
      .values({
        mobile,
        otpHash: hashOtp(otpPlain),
        purpose,
        expiresAt,
      })
      .returning();

    console.log(`[DEV] OTP for ${mobile}: ${otpPlain}`);

    return {
      message: 'OTP sent successfully',
      otp_id: otpRecord.id,
    };
  }

  async verifyOtp(mobile: string, otpPlain: string, purpose: string): Promise<boolean> {
    const maxAttempts = process.env.OTP_MAX_ATTEMPTS
      ? parseInt(process.env.OTP_MAX_ATTEMPTS, 10)
      : 3;

    // Fetch the latest OTP
    const [otpRecord] = await db
      .select()
      .from(otps)
      .where(
        and(
          eq(otps.mobile, mobile),
          eq(otps.purpose, purpose),
          eq(otps.isUsed, false),
          eq(otps.isDeleted, false),
          gt(otps.expiresAt, new Date())
        )
      )
      .orderBy(desc(otps.createdAt))
      .limit(1);

    if (!otpRecord) {
      throw new AppError(400, 'OTP expired or not found', 'BAD_REQUEST');
    }

    if (otpRecord.attempts >= maxAttempts) {
      throw new AppError(400, 'Maximum OTP attempts exceeded', 'BAD_REQUEST');
    }

    // Increment attempts
    await db
      .update(otps)
      .set({ attempts: otpRecord.attempts + 1, updatedAt: new Date() })
      .where(eq(otps.id, otpRecord.id));

    // Verify OTP hash
    if (!verifyOtpHash(otpPlain, otpRecord.otpHash)) {
      throw new AppError(400, 'Invalid OTP', 'BAD_REQUEST');
    }

    // Mark as used
    await db
      .update(otps)
      .set({ isUsed: true, updatedAt: new Date() })
      .where(eq(otps.id, otpRecord.id));

    // Activate user if registering/logging in
    if (purpose === 'register' || purpose === 'login') {
      const [user] = await db
        .select()
        .from(users)
        .where(and(eq(users.mobile, mobile), eq(users.isDeleted, false)))
        .limit(1);

      if (user && user.status.toUpperCase() === 'PENDING') {
        await db
          .update(users)
          .set({ status: 'ACTIVE', isVerified: true, updatedAt: new Date() })
          .where(eq(users.id, user.id));
      }
    }

    return true;
  }
}
