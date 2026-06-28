import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service.js';
import {
  GoogleAuthSchema,
  RegisterSchema,
  LoginSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
} from './auth.validator.js';
import { ValidationError } from '../../utils/errors.js';
import { AuthenticatedRequest } from '../../middleware/auth.middleware.js';

export class AuthController {
  async googleSignIn(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = GoogleAuthSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Validation failed', parsed.error.format());
      }
      const data = await authService.googleSignIn(parsed.data.idToken);
      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = RegisterSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Validation failed', parsed.error.format());
      }
      const data = await authService.registerUser(parsed.data);
      return res.status(201).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = LoginSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Validation failed', parsed.error.format());
      }
      const data = await authService.loginUser(parsed.data);
      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        throw new ValidationError('Refresh token is required');
      }
      await authService.logoutUser(refreshToken);
      return res.status(200).json({
        success: true,
        data: { message: 'Logged out successfully' },
      });
    } catch (error) {
      next(error);
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken, childId } = req.body;
      if (!refreshToken) {
        throw new ValidationError('Refresh token is required');
      }
      const data = await authService.refreshSession(refreshToken, childId);
      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = ForgotPasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Validation failed', parsed.error.format());
      }
      const resetToken = await authService.forgotPassword(parsed.data.email);
      return res.status(200).json({
        success: true,
        data: { 
          message: 'Password reset link generated successfully',
          resetToken
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = ResetPasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Validation failed', parsed.error.format());
      }
      await authService.resetPassword(parsed.data);
      return res.status(200).json({
        success: true,
        data: { message: 'Password reset completed successfully' },
      });
    } catch (error) {
      next(error);
    }
  }

  async me(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new ValidationError('User context is missing');
      }
      const user = await authService.getCurrentUser(req.user.userId);
      return res.status(200).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            provider: user.provider,
            profilePicture: user.profilePicture,
            role: user.role,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async selectChild(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const role = req.user!.role;
      const { childId } = req.body;
      if (!childId) {
        throw new ValidationError('childId is required');
      }
      const data = await authService.selectChild(userId, role, childId);
      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
