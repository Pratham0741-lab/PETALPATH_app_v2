/**
 * Health Check API
 *
 * Used during app startup to verify backend + database connectivity
 * before allowing the user to proceed.
 */

import { API_URL, IS_DEV } from '../config/api';

interface HealthResponse {
  status: string;
  isHealthy: boolean;
}

/**
 * Ping the backend health endpoint.
 * Returns `{ status, isHealthy }`.
 * Never throws — returns `isHealthy: false` on any failure.
 */
export async function checkServerHealth(): Promise<HealthResponse> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8_000);

    const response = await fetch(`${API_URL}/health`, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const json = await response.json();
      return { status: json.status || 'ok', isHealthy: true };
    }

    return { status: `HTTP ${response.status}`, isHealthy: false };
  } catch (error) {
    if (IS_DEV) {
      console.warn('[Health] Server unreachable:', error);
    }
    return { status: 'unreachable', isHealthy: false };
  }
}
