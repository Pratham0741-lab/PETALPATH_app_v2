/**
 * Centralized API Configuration
 *
 * Reads EXPO_PUBLIC_API_URL from environment variables (set via .env files).
 * Supports dynamic base URL fallback if primary route is unreachable.
 */
import Constants from 'expo-constants';

export const IS_DEV: boolean = typeof __DEV__ !== 'undefined' ? __DEV__ : false;

let currentBaseUrl: string = '';

export function setDynamicApiBaseUrl(newUrl: string) {
  currentBaseUrl = newUrl.replace(/\/+$/, '');
}

export function getApiBaseUrl(): string {
  if (currentBaseUrl) {
    return currentBaseUrl;
  }

  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl && envUrl.trim() !== '') {
    return envUrl.replace(/\/+$/, '');
  }

  // Fallback: auto-detect host IP from Expo Metro connection in development
  if (IS_DEV) {
    const hostUri = Constants.expoConfig?.hostUri || (Constants as any).manifest?.debuggerHost;
    if (hostUri) {
      const devIp = hostUri.split(':')[0];
      if (devIp && devIp !== 'localhost' && devIp !== '127.0.0.1') {
        return `http://${devIp}:5000`;
      }
    }
    // Network fallback to PC LAN IP if hostUri is unavailable
    return 'http://10.0.1.18:5000';
  }

  return 'http://10.0.1.18:5000';
}

export function getApiUrl(): string {
  return `${getApiBaseUrl()}/api`;
}

export function getStorageUrl(): string {
  return `${getApiBaseUrl()}/storage`;
}

export const API_BASE_URL: string = getApiBaseUrl();
export const API_URL: string = getApiUrl();
export const STORAGE_URL: string = getStorageUrl();
