import { IS_DEV } from '../../config/api';
import { ApiError } from '../../api/errors';
import { apiClient } from '../api/apiClient';
import { storageService, StorageKeys } from '../storage';
import type { ApiResponse } from '../../types/api';
import type { AuthResponse, User } from '../../types/auth';

const logger = IS_DEV
  ? {
      info: (...args: unknown[]) => { console.info('[AuthService]', ...args); },
      warn: (...args: unknown[]) => { console.warn('[AuthService]', ...args); },
      error: (...args: unknown[]) => { console.error('[AuthService]', ...args); },
    }
  : {
      info: () => {},
      warn: () => {},
      error: () => {},
    };

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  switch (base64.length % 4) {
    case 0:
      break;
    case 2:
      base64 += '==';
      break;
    case 3:
      base64 += '=';
      break;
    default:
      throw new Error('Invalid base64url string');
  }
  return atob(base64);
}

function getTokenPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(base64UrlDecode(parts[1])) as Record<string, unknown>;
    return payload;
  } catch {
    return null;
  }
}

function isTokenExpired(token: string): boolean {
  const payload = getTokenPayload(token);
  if (!payload) return true;
  const exp = payload.exp as number | undefined;
  if (!exp) return true;
  return Date.now() >= exp * 1000;
}

async function storeAuthData(authData: AuthResponse): Promise<void> {
  await Promise.all([
    storageService.setItem(StorageKeys.AUTH_TOKEN, authData.accessToken),
    storageService.setItem(StorageKeys.REFRESH_TOKEN, authData.refreshToken),
    storageService.setItem<User>(StorageKeys.USER, authData.user),
  ]);
}

async function login(email: string, password: string): Promise<AuthResponse> {
  const response = await apiClient.post<ApiResponse<AuthResponse>>('/auth/login', {
    email,
    password,
  });

  if (!response.success || !response.data) {
    throw new ApiError(
      401,
      response.message ?? 'Login failed',
      response.message ?? 'Login failed. Please try again.',
    );
  }

  await storeAuthData(response.data);
  logger.info('User logged in:', response.data.user.email);
  return response.data;
}

async function register(
  name: string,
  email: string,
  password: string,
): Promise<AuthResponse> {
  const response = await apiClient.post<ApiResponse<AuthResponse>>('/auth/register', {
    name,
    email,
    password,
  });

  if (!response.success || !response.data) {
    throw new ApiError(
      400,
      response.message ?? 'Registration failed',
      response.message ?? 'Registration failed. Please try again.',
    );
  }

  await storeAuthData(response.data);
  logger.info('User registered:', response.data.user.email);
  return response.data;
}

async function logout(): Promise<void> {
  try {
    const refreshToken = await storageService.getItem(StorageKeys.REFRESH_TOKEN);
    if (refreshToken) {
      await apiClient.post<ApiResponse<null>>('/auth/logout', {
        refreshToken,
      });
    }
  } catch (error) {
    logger.warn('Logout API call failed, continuing with local cleanup:', error);
  }

  await Promise.all([
    storageService.removeItem(StorageKeys.AUTH_TOKEN),
    storageService.removeItem(StorageKeys.REFRESH_TOKEN),
    storageService.removeItem(StorageKeys.USER),
  ]);

  logger.info('User logged out');
}

async function refreshSession(): Promise<boolean> {
  try {
    const refreshToken = await storageService.getItem(StorageKeys.REFRESH_TOKEN);
    if (!refreshToken) return false;

    const response = await apiClient.post<ApiResponse<AuthResponse>>('/auth/refresh', {
      refreshToken,
    });

    if (response.success && response.data) {
      await storeAuthData(response.data);
      logger.info('Session refreshed');
      return true;
    }

    return false;
  } catch (error) {
    logger.warn('Session refresh failed:', error);
    return false;
  }
}

async function getValidToken(): Promise<string | null> {
  const token = await storageService.getItem(StorageKeys.AUTH_TOKEN);
  if (!token) return null;

  if (isTokenExpired(token)) {
    const refreshed = await refreshSession();
    if (!refreshed) return null;
    return storageService.getItem(StorageKeys.AUTH_TOKEN);
  }

  return token;
}

export const authService = {
  login,
  register,
  logout,
  refreshSession,
  getValidToken,
  isTokenExpired,
  getTokenPayload,
};
