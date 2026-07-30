import bcryptjs from 'bcryptjs';

export function hashPassword(password: string): string {
  // Truncate to 72 bytes like in python to prevent bcrypt overflow limitations
  const truncated = Buffer.from(password).slice(0, 72).toString();
  return bcryptjs.hashSync(truncated, 10);
}

export function verifyPassword(plain: string, hashed: string): boolean {
  try {
    const truncated = Buffer.from(plain).slice(0, 72).toString();
    return bcryptjs.compareSync(truncated, hashed);
  } catch (error) {
    return false;
  }
}

export function hashOtp(otp: string): string {
  return bcryptjs.hashSync(otp, 10);
}

export function verifyOtp(plainOtp: string, hashedOtp: string): boolean {
  try {
    return bcryptjs.compareSync(plainOtp, hashedOtp);
  } catch (error) {
    return false;
  }
}
