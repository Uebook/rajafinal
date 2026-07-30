import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors.js';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // If headers already sent, delegate to default express handler
  if (res.headersSent) {
    return next(err);
  }

  // 1. Zod Validation Errors
  if (err instanceof ZodError) {
    const errors = err.errors;
    let message = 'Validation failed';
    if (errors.length > 0) {
      const firstError = errors[0];
      const fieldPath = firstError.path.join(' -> ');
      message = `Field validation failed: ${fieldPath} (${firstError.message})`;
    }

    return res.status(422).json({
      success: false,
      message,
      error_code: 'VALIDATION_ERROR',
      data: { errors },
    });
  }

  // 2. Custom App Exceptions
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      error_code: err.errorCode,
      data: null,
    });
  }

  // 3. General unexpected exceptions
  console.error('Unhandled Exception:', err);
  return res.status(500).json({
    success: false,
    message: 'Internal server error occurred',
    error_code: 'INTERNAL_SERVER_ERROR',
    data: null,
  });
}
