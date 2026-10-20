/**
 * The one way the app refreshes its session.
 *
 * The server rotates refresh tokens: each one works exactly once, and using it
 * deletes it (`auth.service.ts › refreshSession`). The app used to have three
 * separate refresh paths — the `api` fetch client, the axios `apiClient`, and
 * `authService.refreshSession` at start-up — each reading the token from a
 * different store. Whenever two of them ran together (an expired access token
 * makes every in-flight request 401 at once, and on a cold start both
 * `SplashScreen` and `RootNavigator` load the session), both sent the same
 * token; the first rotated it and the second was rejected and logged the user
 * out. To a parent this looked like being signed out every fifteen minutes.
 *
 * Now every caller goes through `refreshSession()`:
 *  - Single-flight: concurrent callers share one request and one result.
 *  - One source of truth for the token, and `appStore.setSession` writes the
 *    rotated pair to every store and to storage, so no path can later read a
 *    token that has already been used.
 *  - Only a definite rejection (4xx) ends the session. No network, a timeout
 *    or a 5xx leaves it intact — a child opening the app offline must not be
 *    logged out because the server could not be reached.
 */

import { getApiUrl, IS_DEV } from '../../config/api';
import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';
import { useChildStore } from '../../store/childStore';
import { storageService, StorageKeys } from '../storage';

/** `rejected`: the session is over and has been cleared. `unavailable`: try later. */
export type RefreshOutcome = 'refreshed' | 'rejected' | 'unavailable';

const REFRESH_TIMEOUT_MS = 15_000;

let inflight: Promise<RefreshOutcome> | null = null;

export function refreshSession(): Promise<RefreshOutcome> {
  if (!inflight) {
    inflight = run().finally(() => {
      inflight = null;
    });
  }
  return inflight;
}

async function currentRefreshToken(): Promise<string | null> {
  return (
    useAppStore.getState().refreshToken ||
    useAuthStore.getState().refreshToken ||
    (await storageService.getItem<string>(StorageKeys.REFRESH_TOKEN)) ||
    null
  );
}

async function endSession(): Promise<void> {
  await useAppStore.getState().clearSession();
}

async function run(): Promise<RefreshOutcome> {
  const refreshToken = await currentRefreshToken();
  if (!refreshToken) {
    await endSession();
    return 'rejected';
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REFRESH_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`${getApiUrl()}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        refreshToken,
        childId: useChildStore.getState().activeChild?.id ?? undefined,
      }),
      signal: controller.signal,
    });
  } catch (error) {
    if (IS_DEV) console.warn('[Auth] Refresh unavailable (network):', error);
    return 'unavailable';
  } finally {
    clearTimeout(timer);
  }

  if (response.status >= 500) {
    if (IS_DEV) console.warn('[Auth] Refresh unavailable: server', response.status);
    return 'unavailable';
  }

  let json: any = null;
  try {
    json = await response.json();
  } catch {
    // A 2xx with an unreadable body is not a verdict on the token.
    if (response.ok) return 'unavailable';
  }

  if (response.ok && json?.success && json.data?.accessToken && json.data?.refreshToken) {
    await useAppStore.getState().setSession(json.data);
    return 'refreshed';
  }

  if (IS_DEV) console.warn('[Auth] Refresh rejected:', response.status, json?.message);
  await endSession();
  return 'rejected';
}
