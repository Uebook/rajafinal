import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';

export interface AuthenticatedRequest extends Request {
  user?: typeof users.$inferSelect;
}

export async function getCurrentUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or missing authorization header',
      error_code: 'UNAUTHORIZED',
      data: null,
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const jwtSecret = process.env.JWT_SECRET_KEY || 'change-me';
    const payload = jwt.verify(token, jwtSecret) as any;

    if (!payload || payload.type !== 'access') {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
        error_code: 'UNAUTHORIZED',
        data: null,
      });
    }

    const userId = payload.sub;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token payload',
        error_code: 'UNAUTHORIZED',
        data: null,
      });
    }

    // Fetch user from Drizzle
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, userId), eq(users.isDeleted, false)));

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
        error_code: 'UNAUTHORIZED',
        data: null,
      });
    }

    if (user.status.toUpperCase() === 'BLOCKED') {
      return res.status(403).json({
        success: false,
        message: 'Account is blocked',
        error_code: 'FORBIDDEN',
        data: null,
      });
    }

    if (user.status.toUpperCase() === 'DEACTIVATED') {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated',
        error_code: 'FORBIDDEN',
        data: null,
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
      error_code: 'UNAUTHORIZED',
      data: null,
    });
  }
}

export function requireRoles(allowedRoles: ('super_admin' | 'admin' | 'vendor' | 'retailer')[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        error_code: 'UNAUTHORIZED',
        data: null,
      });
    }

    if (!allowedRoles.map(r => r.toUpperCase()).includes(req.user.role.toUpperCase() as any)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        error_code: 'FORBIDDEN',
        data: null,
      });
    }

    next();
  };
}

export const requireSuperAdmin = requireRoles(['super_admin']);
export const requireAdmin = requireRoles(['super_admin', 'admin']);
export const requireVendor = requireRoles(['super_admin', 'admin', 'vendor']);
export const requireRetailer = requireRoles(['super_admin', 'admin', 'retailer']);
export const requireAnyAuthenticated = requireRoles(['super_admin', 'admin', 'vendor', 'retailer']);
