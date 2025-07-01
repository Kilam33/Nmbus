import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { ApiResponse } from '../types';

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public code?: string | undefined;
  public details?: any;

  constructor(message: string, statusCode: number = 500, code?: string, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = code;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED_ERROR');
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, 'FORBIDDEN_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND_ERROR');
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict') {
    super(message, 409, 'CONFLICT_ERROR');
  }
}

export class DatabaseError extends AppError {
  constructor(message: string = 'Database error', details?: any) {
    super(message, 500, 'DATABASE_ERROR', details);
  }
}

export class CacheError extends AppError {
  constructor(message: string = 'Cache error', details?: any) {
    super(message, 500, 'CACHE_ERROR', details);
  }
}

// Global error handler
export const errorHandler = (
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let statusCode = 500;
  let message = 'Internal Server Error';
  let code = 'INTERNAL_SERVER_ERROR';
  let details: any = undefined;

  // Handle operational errors
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
    code = error.code || 'OPERATIONAL_ERROR';
    details = error.details;
  }

  // Handle specific error types
  if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
    code = 'VALIDATION_ERROR';
    details = error.message;
  }

  if (error.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
    code = 'INVALID_ID';
  }

  if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
    code = 'INVALID_TOKEN';
  }

  if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
    code = 'TOKEN_EXPIRED';
  }

  // Handle PostgreSQL errors
  if (
    (error instanceof AppError && error.code === '23505') ||
    (!(error instanceof AppError) && (error as any).code === '23505')
  ) {
    statusCode = 409;
    message = 'Resource already exists';
    code = 'DUPLICATE_RESOURCE';
  }

  if (
    (error instanceof AppError && error.code === '23503') ||
    (!(error instanceof AppError) && (error as any).code === '23503')
  ) {
    statusCode = 400;
    message = 'Foreign key constraint violation';
    code = 'FOREIGN_KEY_ERROR';
  }

  if (
    (error instanceof AppError && error.code === '23502') ||
    (!(error instanceof AppError) && (error as any).code === '23502')
  ) {
    statusCode = 400;
    message = 'Required field missing';
    code = 'REQUIRED_FIELD_MISSING';
  }

  // Log error
  logger.error('API Error:', {
    message: error.message,
    stack: error.stack,
    statusCode,
    code,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
    requestId: req.id,
    body: req.body,
    query: req.query,
    params: req.params,
  });

  // Send error response
  const response: ApiResponse = {
    success: false,
    error: {
      message,
      code,
      statusCode,
      ...(details && { details }),
    },
  };

  // Don't leak error details in production
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    response.error!.message = 'Internal Server Error';
    delete response.error!.details;
  }

  res.status(statusCode).json(response);
};

// Async error handler wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 404 handler
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const error = new NotFoundError(`Route ${req.originalUrl} not found`);
  next(error);
};
