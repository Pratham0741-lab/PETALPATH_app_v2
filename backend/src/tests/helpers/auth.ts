import jwt from 'jsonwebtoken';
import { generateAccessToken, generateRefreshToken } from '../../utils/jwt.js';
import { prisma } from '../../config/database.js';

export function getAuthToken(userId: string, role = 'PARENT', childId?: string): string {
  return generateAccessToken({ userId, role, childId });
}

export function getExpiredToken(): string {
  return jwt.sign(
    { userId: crypto.randomUUID(), role: 'PARENT' },
    process.env.JWT_SECRET || 'test-jwt-secret-key-min-16-char',
    { expiresIn: '0s' }
  );
}

export function getMalformedToken(): string {
  return 'invalid-token-format-not-a-valid-jwt';
}

export function getTokenWithWrongSecret(userId: string): string {
  return jwt.sign(
    { userId, role: 'PARENT' },
    'wrong-secret-key-that-does-not-match-min-16-char'
  );
}

export async function createAuthenticatedContext(overrides: Partial<{
  userEmail: string;
  userName: string;
  childName: string;
  childAge: number;
  role: string;
}> = {}) {
  const user = await prisma.user.create({
    data: {
      email: overrides.userEmail || `auth-test-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.com`,
      name: overrides.userName || 'Auth Test User',
      passwordHash: '$2b$10$dummyhash',
      provider: 'email',
      role: overrides.role || 'PARENT',
    },
  });

  const child = await prisma.child.create({
    data: {
      userId: user.id,
      name: overrides.childName || 'Auth Test Child',
      age: overrides.childAge || 5,
      ageGroup: '3-5',
      avatar: 'default-avatar.png',
    },
  });

  const accessToken = generateAccessToken({ userId: user.id, role: user.role, childId: child.id });
  const refreshToken = generateRefreshToken({ userId: user.id });

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return { user, child, accessToken, refreshToken };
}
