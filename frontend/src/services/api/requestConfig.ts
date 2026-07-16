import type { AxiosRequestConfig } from 'axios';

export interface ExtendedRequestConfig extends AxiosRequestConfig {
  _retryCount?: number;
  _isRetry?: boolean;
}

export const MAX_RETRIES = 2;
export const RETRY_DELAY_MS = 1000;
