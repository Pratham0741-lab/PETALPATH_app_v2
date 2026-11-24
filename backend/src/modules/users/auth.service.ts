import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { env } from '../../config/env.js';
import { usersRepository } from './users.repository.js';
import { refreshTokenRepository } from './refresh-token.repository.js';
import { RegisterInput, LoginInput, ResetPasswordInput, RefreshTokenInput, SelectChildInput } from './auth.validator.js';
import { 
  generateAccessToken, 
  generateRefreshToken, 
  verifyRefreshToken,
  parseDurationToMs,
} from '../../utils/jwt.js';
import { 
  ConflictError, 
  UnauthorizedError, 
  ValidationError, 
  NotFoundError 
} from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';
import { prisma } from '../../config/database.js';
import { verifyGoogleIdToken } from './google-token.js';
import { getEmailService } from '../../shared/services/email.service.js';

const client = new OAuth2Client(env.GOOGLE_CLIENT_ID[0]);

/** Reset tokens are valid for 30 minutes. */
export const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

/** Only this hash is stored; the token itself exists only in the email. */
export function hashResetToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function passwordResetEmail(to: string, token: string) {
  return {
    to,
    subject: 'Reset your PetalPath password',
    text: [
      'Someone asked to reset the password for your PetalPath account.',
      '',
      'Your reset code is:',
      token,
      '',
      'Open the PetalPath app, tap "Forgot password", then "I have a reset code", and paste the code.',
      'The code works once and expires in 30 minutes.',
      '',
      "If you didn't ask for this, you can ignore this email. Your password will not change.",
    ].join('\n'),
  };
}

export class AuthService {
  /**
   * Verify a Google ID token (signature, issuer, expiry, audience in
   * GOOGLE_CLIENT_ID, verified email) and return its payload. See google-token.ts.
   *
   * There used to be a shortcut here that accepted any token starting with
   * "mock-google-token-" in every environment, production included, and signed
   * the caller in as <name>@gmail.com without asking Google. Nothing used it,
   * and it allowed anyone to log in as (or take over) a Gmail account holder.
   */
  async verifyGoogleToken(idToken: string) {
    return verifyGoogleIdToken(client, idToken, env.GOOGLE_CLIENT_ID);
  }

  /**
   * Google Sign-in flow: finds or creates user and returns tokens
   */
  async googleSignIn(idToken: string) {
    const payload = await this.verifyGoogleToken(idToken);
    const email = payload.email;
    const name = payload.name || payload.given_name || 'Google User';
    const googleId = payload.sub;
    const profilePicture = payload.picture || null;

    if (!email) {
      throw new ValidationError('Email is required from Google account');
    }

    let user = await usersRepository.findByEmail(email);

    if (user) {
      // If user exists but registered via email and hasn't linked Google
      if (user.provider !== 'google') {
        user = await usersRepository.update(user.id, {
          provider: 'google',
          googleId,
          profilePicture: user.profilePicture || profilePicture,
        });
        logger.info({ userId: user.id }, 'Linked Google credentials to existing email account');
      }
    } else {
      // Create new Google User
      user = await usersRepository.create({
        email,
        name,
        provider: 'google',
        googleId,
        profilePicture,
      });
      logger.info({ userId: user.id }, 'Created new user via Google Sign-In');
    }

    logger.info({ userId: user.id }, 'User logged in via Google');
    return this.createSession(user.id, user.role);
  }

  /**
   * Email registration flow
   */
  async registerUser(data: RegisterInput) {
    const existingUser = await usersRepository.findByEmail(data.email);
    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.password, salt);

    const user = await usersRepository.create({
      email: data.email,
      name: data.name,
      passwordHash,
      provider: 'email',
    });

    logger.info({ userId: user.id }, 'User registered via email');
    return this.createSession(user.id, user.role);
  }

  /**
   * Email login flow
   */
  async loginUser(data: LoginInput) {
    const user = await usersRepository.findByEmail(data.email);
    if (!user || user.provider !== 'email' || !user.passwordHash) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(data.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid email or password');
    }

    logger.info({ userId: user.id }, 'User logged in via email');
    return this.createSession(user.id, user.role);
  }

  /**
   * Invalidate session / delete refresh token
   */
  async logoutUser(token: string) {
    try {
      const dbToken = await refreshTokenRepository.findToken(token);
      if (dbToken) {
        await refreshTokenRepository.deleteToken(token);
        logger.info({ userId: dbToken.userId }, 'User logged out and refresh token invalidated');
      }
    } catch (error) {
      // Token might be already deleted or expired, swallow to make logout idempotent
      logger.warn(error as Error, 'Logout failed or token already invalidated');
    }
  }

  /**
   * Issue new access token using refresh token rotation
   */
  async refreshSession(refreshToken: string, childId?: string) {
    try {
      const decoded = verifyRefreshToken(refreshToken);
      const dbToken = await refreshTokenRepository.findToken(refreshToken);

      if (!dbToken || dbToken.expiresAt < new Date()) {
        if (dbToken) {
          await refreshTokenRepository.deleteToken(refreshToken);
        }
        throw new UnauthorizedError('Invalid or expired refresh token');
      }

      // Rotate token: delete old, create new
      await refreshTokenRepository.deleteToken(refreshToken);

      const user = await usersRepository.findById(decoded.userId);
      if (!user) {
        throw new UnauthorizedError('User not found');
      }

      if (childId) {
        const child = await prisma.child.findFirst({
          where: { id: childId, userId: user.id, deletedAt: null },
        });
        if (!child) {
          throw new UnauthorizedError('Invalid child context for session refresh');
        }
      }

      logger.info({ userId: user.id }, 'Refreshed access and refresh tokens');
      return this.createSession(user.id, user.role, childId);
    } catch (error) {
      logger.warn(error as Error, 'Token refresh failed');
      throw new UnauthorizedError('Invalid or expired refresh token');
    }
  }

  /**
   * Start a password reset.
   *
   * Always resolves the same way, whether or not the email belongs to an
   * account (or to a Google-only account), so the response cannot reveal who
   * has an account. Nothing about the token is ever returned or logged.
   *
   * For an email account: a random token is generated, only its SHA-256 hash is
   * stored, with a 30-minute expiry. Storing a new hash overwrites the previous
   * one, so a newer request invalidates any older token. The plain token exists
   * only in the email.
   */
  async requestPasswordReset(email: string): Promise<void> {
    logger.info('reset requested');

    const user = await usersRepository.findByEmail(email.trim());
    // Unknown email, or an account that signs in with Google: nothing to do.
    if (!user || user.provider !== 'email' || !user.passwordHash) return;

    const token = crypto.randomBytes(32).toString('base64url');
    await usersRepository.update(user.id, {
      resetPasswordToken: hashResetToken(token),
      resetPasswordExpires: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    });

    const mail = getEmailService();
    if (!mail.enabled) return;

    // Not awaited: the response should not take longer for a real account than
    // for an unknown one. A failure is logged without any detail of the token.
    void mail.send(passwordResetEmail(user.email, token)).catch((error: unknown) => {
      logger.error({ error: (error as Error)?.name ?? 'Error' }, 'reset email failed');
    });
  }

  /**
   * Complete a password reset with a token from the email. Single use: the
   * stored hash is cleared on success. Every session is revoked: refresh tokens
   * are deleted, and passwordChangedAt makes authMiddleware reject access tokens
   * issued before now.
   */
  async resetPassword(data: ResetPasswordInput) {
    const user = await usersRepository.findByResetToken(hashResetToken(data.token.trim()));
    if (!user || user.provider !== 'email') {
      throw new ValidationError('Invalid or expired reset token');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.newPassword, salt);

    await usersRepository.update(user.id, {
      passwordHash,
      resetPasswordToken: null,
      resetPasswordExpires: null,
      passwordChangedAt: new Date(),
    });

    await refreshTokenRepository.deleteUserTokens(user.id);

    logger.info({ userId: user.id }, 'Password reset completed and sessions revoked');
  }

  /**
   * Returns current authenticated user metadata
   */
  /** Updates the signed-in parent's display name. */
  async updateProfile(userId: string, name: string) {
    await this.getCurrentUser(userId);
    return usersRepository.update(userId, { name });
  }

  async getCurrentUser(userId: string) {
    const user = await usersRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return user;
  }

  /**
   * Authenticate and sign token context for selected child profile
   */
  async selectChild(userId: string, role: string, childId: string) {
    const child = await prisma.child.findFirst({
      where: { id: childId, userId, deletedAt: null },
    });
    if (!child) {
      throw new NotFoundError('Child profile not found or does not belong to user');
    }

    const accessToken = generateAccessToken({ userId, role, childId });

    return {
      accessToken,
      user: {
        id: userId,
        role,
        childId,
      },
    };
  }

  /**
   * Private helper to issue tokens and store refresh token
   */
  private async createSession(userId: string, role: string, childId?: string) {
    const accessToken = generateAccessToken({ userId, role, childId });
    const refreshToken = generateRefreshToken({ userId });

    // Store in DB. Calculate expiresAt based on configured expiry string.
    const expiresAt = new Date(Date.now() + parseDurationToMs(env.REFRESH_TOKEN_EXPIRY));

    await refreshTokenRepository.createToken(userId, refreshToken, expiresAt);

    // The app stores this user as-is. Without name/email it believed every
    // account had no name and showed "Your Profile" after every login.
    const profile = await usersRepository.findById(userId);

    return {
      accessToken,
      refreshToken,
      user: {
        id: userId,
        email: profile?.email ?? '',
        name: profile?.name ?? '',
        role,
        childId,
      },
    };
  }
}

export const authService = new AuthService();
