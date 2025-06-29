import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';
import { config } from '@/config/app.config';
import { UnauthorizedError, asyncHandler } from './error.middleware';
import { logger } from '@/utils/logger';

// Initialize Supabase client
const supabase = createClient(config.supabase.url, config.supabase.anonKey);

export const requireAuth = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('No token provided');
  }

  const token = authHeader.substring(7);

  try {
    // Verify JWT token and extract payload
    const decoded = jwt.verify(token, config.jwt.secret) as any;
    
    // Extract user information from JWT payload
    if (!decoded.sub || !decoded.email) {
      throw new UnauthorizedError('Invalid token payload');
    }

    // Attach user to request
    req.user = {
      id: decoded.sub,
      email: decoded.email,
      created_at: decoded.created_at || (decoded.iat ? new Date(decoded.iat * 1000).toISOString() : new Date().toISOString()),
      ...(decoded.email_confirmed_at && { email_confirmed_at: decoded.email_confirmed_at }),
      ...(decoded.last_sign_in_at && { last_sign_in_at: decoded.last_sign_in_at }),
      ...(decoded.app_metadata && { app_metadata: decoded.app_metadata }),
      ...(decoded.user_metadata && { user_metadata: decoded.user_metadata }),
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new UnauthorizedError('Invalid token');
    }
    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Token expired');
    }
    throw new UnauthorizedError('Authentication failed');
  }
});

// Optional auth middleware (doesn't throw error if no token)
export const optionalAuth = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.substring(7);

  try {
    // Verify JWT token and extract payload
    const decoded = jwt.verify(token, config.jwt.secret) as any;
    
    // Extract user information from JWT payload
    if (decoded.sub && decoded.email) {
      req.user = {
        id: decoded.sub,
        email: decoded.email,
        created_at: decoded.created_at || (decoded.iat ? new Date(decoded.iat * 1000).toISOString() : new Date().toISOString()),
        ...(decoded.email_confirmed_at && { email_confirmed_at: decoded.email_confirmed_at }),
        ...(decoded.last_sign_in_at && { last_sign_in_at: decoded.last_sign_in_at }),
        ...(decoded.app_metadata && { app_metadata: decoded.app_metadata }),
        ...(decoded.user_metadata && { user_metadata: decoded.user_metadata }),
      };
    }
  } catch (error) {
    // Silently fail for optional auth
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.debug('Optional auth failed:', { error: errorMessage });
  }

  next();
});

// Role-based access control (if needed in future)
export const requireRole = (roles: string[]) => {
  return asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    const userRole = req.user.app_metadata?.role || 'user';
    
    if (!roles.includes(userRole)) {
      throw new UnauthorizedError('Insufficient permissions');
    }

    next();
  });
};

// Check if user owns resource
export const requireOwnership = (resourceKey: string = 'userId') => {
  return asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    const resourceUserId = req.params[resourceKey] || req.body[resourceKey];
    
    if (resourceUserId && resourceUserId !== req.user.id) {
      throw new UnauthorizedError('Access denied');
    }

    next();
  });
};