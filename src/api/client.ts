/**
 * PetalPath API Client
 *
 * Centralized fetch-based HTTP client with:
 * - JWT auto-attach from appStore
 * - 20-second timeout via AbortController
 * - Automatic token refresh on 401
 * - Structured error handling (ApiError)
 * - Development-only request logging
 *
 * Usage:
 *   import { api } from '../api/client';
 *   const data = await api.get('/roadmap');
 */

import { API_URL, IS_DEV } from '../config/api';
import { useAppStore } from '../store/appStore';
import { useChildStore } from '../store/childStore';
import { ApiError } from './errors';

const TIMEOUT_MS = 20_000;

class ApiClient {
  private async request<T = any>(
    method: string,
    path: string,
    body?: any,
    isRetry = false,
  ): Promise<T> {
    const state = useAppStore.getState();
    const token = state.token;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config: RequestInit = {
      method,
      headers,
    };

    if (body) {
      config.body = JSON.stringify(body);
    }

    // Timeout via AbortController
    const controller = new AbortController();
    config.signal = controller.signal;
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const url = `${API_URL}${path}`;
    const startTime = IS_DEV ? Date.now() : 0;

    if (IS_DEV) {
      console.log(`[API] ${method} ${url}`);
    }

    try {
      const response = await fetch(url, config);

      if (IS_DEV) {
        const elapsed = Date.now() - startTime;
        console.log(`[API] ${response.status} ${method} ${path} (${elapsed}ms)`);
      }

      // Handle 401 — attempt token refresh
      if (response.status === 401 && !isRetry && state.refreshToken) {
        const refreshed = await this.refreshToken(state.refreshToken);
        if (refreshed) {
          return this.request<T>(method, path, body, true);
        }
      }

      // Parse response body
      let json: any;
      try {
        json = await response.json();
      } catch {
        json = {};
      }

      if (!response.ok || json.success === false) {
        const serverMessage = json.message || `Request failed with status ${response.status}`;
        throw new ApiError(
          response.status,
          serverMessage,
          this.getUserMessage(response.status, serverMessage),
        );
      }

      return json as T;
    } catch (error) {
      clearTimeout(timeoutId);

      // Already an ApiError — re-throw as-is
      if (error instanceof ApiError) {
        throw error;
      }

      // Timeout
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ApiError(
          0,
          'Request timed out',
          'Server took too long to respond. Please try again.',
          true,
        );
      }

      // Network error (no internet, server down, DNS failure, etc.)
      throw new ApiError(
        0,
        (error instanceof Error ? error.message : 'Network error'),
        'Unable to connect to PetalPath servers. Check your internet connection.',
        true,
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private getUserMessage(statusCode: number, serverMessage: string): string {
    switch (statusCode) {
      case 401:
        return 'Please login again.';
      case 403:
        return 'You don\'t have permission to do that.';
      case 404:
        return 'The requested resource was not found.';
      case 422:
        // Validation errors — pass the server message through
        return serverMessage;
      case 429:
        return 'Too many requests. Please wait a moment and try again.';
      default:
        if (statusCode >= 500) {
          return 'Server error. Please try again later.';
        }
        return serverMessage || 'Something went wrong. Please try again.';
    }
  }

  private async refreshToken(token: string): Promise<boolean> {
    try {
      const activeChild = useChildStore.getState().activeChild;
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          refreshToken: token,
          childId: activeChild?.id || undefined,
        }),
      });

      const json = await response.json();
      if (response.ok && json.success) {
        useAppStore.getState().setSession(json.data);
        return true;
      }
    } catch (error) {
      if (IS_DEV) {
        console.warn('[API] Token refresh failed:', error);
      }
    }

    // Refresh failed — log out
    useAppStore.getState().clearSession();
    return false;
  }

  async get<T = any>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  async post<T = any>(path: string, body?: any): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  async put<T = any>(path: string, body?: any): Promise<T> {
    return this.request<T>('PUT', path, body);
  }

  async delete<T = any>(path: string): Promise<T> {
    return this.request<T>('DELETE', path);
  }
}

export const api = new ApiClient();
