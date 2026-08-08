/**
 * Health Check API
 *
 * Used during app startup to verify backend + database connectivity
 * before allowing the user to proceed.
 */

import { getApiUrl, setDynamicApiBaseUrl, IS_DEV } from '../config/api';
import Constants from 'expo-constants';

interface HealthResponse {
  status: string;
  isHealthy: boolean;
  errorDetails?: string;
  requestedUrl?: string;
}

/**
 * Ping the backend health endpoint.
 * Dynamically probes candidate URLs in development mode to ensure connection success
 * across USB (adb reverse), Emulator (10.0.2.2), and Wi-Fi LAN IP (10.210.56.111).
 */
export async function checkServerHealth(): Promise<HealthResponse> {
  const primaryUrl = `${getApiUrl()}/health`;
  const candidates: string[] = [primaryUrl];

  if (IS_DEV) {
    const devHostUri = Constants.expoConfig?.hostUri || (Constants as any).manifest?.debuggerHost;
    if (devHostUri) {
      const devIp = devHostUri.split(':')[0];
      if (devIp) {
        candidates.push(`http://${devIp}:5000/api/health`);
      }
    }
    candidates.push('http://127.0.0.1:5000/api/health');
    candidates.push('http://10.0.2.2:5000/api/health');
    candidates.push('http://10.210.56.111:5000/api/health');
  }

  const uniqueCandidates = Array.from(new Set(candidates));
  let lastErrorDetails = 'Unknown network error';

  for (const url of uniqueCandidates) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3_000);

      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const json = await response.json();
        const matchedBaseUrl = url.replace(/\/api\/health$/, '');
        setDynamicApiBaseUrl(matchedBaseUrl);

        return {
          status: json.status || 'ok',
          isHealthy: true,
          requestedUrl: url,
        };
      }

      lastErrorDetails = `HTTP ${response.status} at ${url}`;
    } catch (err: unknown) {
      lastErrorDetails = err instanceof Error ? err.message : String(err);
    }
  }

  return {
    status: 'unreachable',
    isHealthy: false,
    errorDetails: lastErrorDetails,
    requestedUrl: primaryUrl,
  };
}
