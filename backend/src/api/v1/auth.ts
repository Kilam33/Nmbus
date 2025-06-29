import { Router, Request, Response } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';
import { config } from '@/config/app.config';
import { asyncHandler, ValidationError, UnauthorizedError } from '@/middleware/error.middleware';
import { validate } from '@/middleware/validation.middleware';
import { authRateLimit } from '@/middleware/rateLimit.middleware';
import { requireAuth } from '@/middleware/auth.middleware';
import { logger } from '@/utils/logger';
import { redisService } from '@/utils/redis';
import { z } from 'zod';

const router = Router();
const supabase = createClient(config.supabase.url, config.supabase.anonKey);

// Auth schemas
const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signUpSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const resetPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const updatePasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

/**
 * @swagger
 * components:
 *   schemas:
 *     SignInRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *         password:
 *           type: string
 *           minLength: 6
 *     SignUpRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *         password:
 *           type: string
 *           minLength: 8
 *     AuthResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         data:
 *           type: object
 *           properties:
 *             user:
 *               type: object
 *             session:
 *               type: object
 *             access_token:
 *               type: string
 *             refresh_token:
 *               type: string
 */

/**
 * @swagger
 * /api/v1/auth/signin:
 *   post:
 *     summary: Sign in user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SignInRequest'
 *     responses:
 *       200:
 *         description: Successfully signed in
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Too many requests
 */
router.post('/signin', 
  authRateLimit,
  validate({ body: signInSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;

    try {
      // Sign in with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        logger.warn('Sign in failed', { email, error: error.message });
        throw new UnauthorizedError('Invalid email or password');
      }

      if (!data.user || !data.session) {
        throw new UnauthorizedError('Authentication failed');
      }

      // Generate custom JWT token
      const token = jwt.sign(
        { 
          sub: data.user.id,
          email: data.user.email,
          iat: Math.floor(Date.now() / 1000),
          created_at: data.user.created_at,
          email_confirmed_at: data.user.email_confirmed_at,
          last_sign_in_at: data.user.last_sign_in_at,
          app_metadata: data.user.app_metadata,
          user_metadata: data.user.user_metadata,
        },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn } as SignOptions
      );

      // Store session in Redis
      await redisService.setSession(data.user.id, {
        userId: data.user.id,
        email: data.user.email,
        sessionId: data.session.access_token,
        createdAt: new Date().toISOString(),
      });

      logger.info('User signed in successfully', { 
        userId: data.user.id, 
        email: data.user.email 
      });

      res.json({
        success: true,
        data: {
          user: {
            id: data.user.id,
            email: data.user.email,
            created_at: data.user.created_at,
            email_confirmed_at: data.user.email_confirmed_at,
            last_sign_in_at: data.user.last_sign_in_at,
          },
          session: {
            access_token: token,
            refresh_token: data.session.refresh_token,
            expires_at: data.session.expires_at,
          },
        },
        message: 'Successfully signed in',
      });

    } catch (error) {
      if (error instanceof UnauthorizedError) {
        throw error;
      }
      logger.error('Sign in error', { email, error: (error as Error).message });
      throw new UnauthorizedError('Authentication failed');
    }
  })
);

/**
 * @swagger
 * /api/v1/auth/signup:
 *   post:
 *     summary: Sign up new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SignUpRequest'
 *     responses:
 *       201:
 *         description: Successfully signed up
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Invalid input or user already exists
 */
router.post('/signup',
  authRateLimit,
  validate({ body: signUpSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;

    try {
      // Sign up with Supabase
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        logger.warn('Sign up failed', { email, error: error.message });
        if (error.message.includes('already registered')) {
          throw new ValidationError('User already exists');
        }
        throw new ValidationError(error.message);
      }

      if (!data.user) {
        throw new ValidationError('Failed to create user');
      }

      logger.info('User signed up successfully', { 
        userId: data.user.id, 
        email: data.user.email 
      });

      res.status(201).json({
        success: true,
        data: {
          user: {
            id: data.user.id,
            email: data.user.email,
            created_at: data.user.created_at,
          },
          session: data.session,
        },
        message: 'Successfully signed up. Please check your email for verification.',
      });

    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      logger.error('Sign up error', { email, error: (error as Error).message });
      throw new ValidationError('Failed to create account');
    }
  })
);

/**
 * @swagger
 * /api/v1/auth/signout:
 *   post:
 *     summary: Sign out user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully signed out
 */
router.post('/signout',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    try {
      // Sign out from Supabase
      await supabase.auth.signOut();

      // Remove session from Redis
      await redisService.deleteSession(userId);

      logger.info('User signed out successfully', { userId });

      res.json({
        success: true,
        message: 'Successfully signed out',
      });

    } catch (error) {
      logger.error('Sign out error', { userId, error: (error as Error).message });
      // Still return success even if cleanup fails
      res.json({
        success: true,
        message: 'Successfully signed out',
      });
    }
  })
);

/**
 * @swagger
 * /api/v1/auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 */
router.get('/me',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    res.json({
      success: true,
      data: {
        user: req.user,
      },
    });
  })
);

/**
 * @swagger
 * /api/v1/auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refresh_token
 *             properties:
 *               refresh_token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 */
router.post('/refresh',
  authRateLimit,
  validate({ 
    body: z.object({
      refresh_token: z.string().min(1, 'Refresh token is required'),
    })
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { refresh_token } = req.body;

    try {
      // Refresh token with Supabase
      const { data, error } = await supabase.auth.refreshSession({
        refresh_token,
      });

      if (error || !data.session || !data.user) {
        throw new UnauthorizedError('Invalid refresh token');
      }

      // Generate new custom JWT token
      const token = jwt.sign(
        { 
          sub: data.user.id,
          email: data.user.email,
          iat: Math.floor(Date.now() / 1000),
          created_at: data.user.created_at,
          email_confirmed_at: data.user.email_confirmed_at,
          last_sign_in_at: data.user.last_sign_in_at,
          app_metadata: data.user.app_metadata,
          user_metadata: data.user.user_metadata,
        },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn } as SignOptions
      );

      // Update session in Redis
      await redisService.setSession(data.user.id, {
        userId: data.user.id,
        email: data.user.email,
        sessionId: data.session.access_token,
        updatedAt: new Date().toISOString(),
      });

      res.json({
        success: true,
        data: {
          session: {
            access_token: token,
            refresh_token: data.session.refresh_token,
            expires_at: data.session.expires_at,
          },
        },
        message: 'Token refreshed successfully',
      });

    } catch (error) {
      logger.error('Token refresh error', { error: (error as Error).message });
      throw new UnauthorizedError('Failed to refresh token');
    }
  })
);

/**
 * @swagger
 * /api/v1/auth/reset-password:
 *   post:
 *     summary: Reset password
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Password reset email sent
 */
router.post('/reset-password',
  authRateLimit,
  validate({ body: resetPasswordSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);

      if (error) {
        logger.warn('Password reset failed', { email, error: error.message });
        // Don't reveal if email exists or not
      }

      logger.info('Password reset requested', { email });

      res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.',
      });

    } catch (error) {
      logger.error('Password reset error', { email, error: (error as Error).message });
      res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.',
      });
    }
  })
);

/**
 * @swagger
 * /api/v1/auth/verify-reset-token:
 *   post:
 *     summary: Verify password reset token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token verified successfully
 *       400:
 *         description: Invalid or expired token
 */
router.post('/verify-reset-token',
  authRateLimit,
  validate({ 
    body: z.object({
      token: z.string().min(1, 'Token is required'),
    })
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.body;

    try {
      // Verify the token with Supabase
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: 'recovery',
      });

      if (error || !data.user) {
        throw new ValidationError('Invalid or expired token');
      }

      res.json({
        success: true,
        data: {
          user: data.user,
        },
        message: 'Token verified successfully',
      });

    } catch (error) {
      logger.error('Token verification error', { error: (error as Error).message });
      throw new ValidationError('Invalid or expired token');
    }
  })
);

/**
 * @swagger
 * /api/v1/auth/update-password:
 *   post:
 *     summary: Update password
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *             properties:
 *               password:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Password updated successfully
 */
router.post('/update-password',
  requireAuth,
  validate({ body: updatePasswordSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { password } = req.body;
    const userId = req.user!.id;

    try {
      // Update password with Supabase
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        logger.warn('Password update failed', { userId, error: error.message });
        throw new ValidationError(error.message);
      }

      logger.info('Password updated successfully', { userId });

      res.json({
        success: true,
        message: 'Password updated successfully',
      });

    } catch (error) {
      logger.error('Password update error', { userId, error: (error as Error).message });
      throw new ValidationError('Failed to update password');
    }
  })
);

/**
 * @swagger
 * /api/v1/auth/generate-api-key:
 *   post:
 *     summary: Generate API key for user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: API key generated successfully
 */
router.post('/generate-api-key',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    try {
      // Generate a new API key
      const apiKey = `nimbus_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Store the API key in the database (you might want to create an api_keys table)
      // For now, we'll just return a generated key
      
      logger.info('API key generated', { userId });

      res.json({
        success: true,
        data: {
          key: apiKey,
        },
        message: 'API key generated successfully',
      });

    } catch (error) {
      logger.error('API key generation error', { userId, error: (error as Error).message });
      throw new ValidationError('Failed to generate API key');
    }
  })
);

export default router;