import { Router } from 'express';
import { authController } from './auth.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { baselineController } from '../baseline/baseline.controller.js';
import {
  passwordResetAttemptLimiter,
  passwordResetEmailLimiter,
  passwordResetIpLimiter,
} from '../../middleware/rate-limit.middleware.js';

const router = Router();

router.post('/google', authController.googleSignIn);
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.post('/refresh', authController.refresh);
// Rate limited in every environment (not only production like the others).
router.post('/forgot-password', passwordResetIpLimiter, passwordResetEmailLimiter, authController.forgotPassword);
router.post('/reset-password', passwordResetAttemptLimiter, authController.resetPassword);

// Protected routes
router.get('/me', authMiddleware as any, authController.me as any);
router.put('/update-profile', authMiddleware as any, authController.updateProfile as any);
router.post('/select-child', authMiddleware as any, authController.selectChild as any);
router.post('/consent', authMiddleware as any, baselineController.consent as any);

export { router as authRoutes };
