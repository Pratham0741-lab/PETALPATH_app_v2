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
  errorDetails?: string;
  requestedUrl?: string;
}

/**
 * Ping the backend health endpoint.
 * Returns `{ status, isHealthy }`.
 * Never throws — returns `isHealthy: false` on any failure.
 */
export async function checkServerHealth(): Promise<HealthResponse> {
  const url = `${API_URL}/health`;

  // DEBUG ONLY - REMOVE AFTER NETWORK DIAGNOSIS
  console.log("=== START HEALTH CHECK ===");
  console.log("URL:", url);
  // END DEBUG ONLY

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8_000);

    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // DEBUG ONLY - REMOVE AFTER NETWORK DIAGNOSIS
    console.log("FETCH STATUS", response.status);
    try {
      const text = await response.clone().text();
      console.log(text);
    } catch (e) {
      console.log("Error reading response text:", e);
    }
    // END DEBUG ONLY

    if (response.ok) {
      const json = await response.json();
      return { status: json.status || 'ok', isHealthy: true, requestedUrl: url };
    }

    return { 
      status: `HTTP ${response.status}`, 
      isHealthy: false, 
      errorDetails: `HTTP Status Code: ${response.status}`,
      requestedUrl: url 
    };
  } catch (error: any) {
    // DEBUG ONLY - REMOVE AFTER NETWORK DIAGNOSIS
    console.log("FETCH ERROR");
    console.log(error);
    // END DEBUG ONLY

    let errorDetails = 'Unknown network error';
    if (error) {
      errorDetails = error.message || String(error);
      if (error.code) {
        errorDetails += ` (code: ${error.code})`;
      }
    }

    return { 
      status: 'unreachable', 
      isHealthy: false, 
      errorDetails,
      requestedUrl: url
    };
  }
}
