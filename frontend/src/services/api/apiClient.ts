import axios, { type AxiosInstance, type AxiosError, type AxiosResponse } from 'axios';
import { API_URL, IS_DEV } from '../../config/api';
import { ApiError } from '../../api/errors';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import { useChildStore } from '../../store/childStore';
import type { ApiResponse } from '../../types/api';
import type { User } from '../../types/auth';
import type { ExtendedRequestConfig } from './requestConfig';
import { MAX_RETRIES, RETRY_DELAY_MS } from './requestConfig';

const logger = IS_DEV
  ? {
      info: (...args: unknown[]) => { console.info('[API]', ...args); },
      warn: (...args: unknown[]) => { console.warn('[API]', ...args); },
      error: (...args: unknown[]) => { console.error('[API]', ...args); },
    }
  : {
      info: () => {},
      warn: () => {},
      error: () => {},
    };

interface PendingRequest {
  resolve: (value: AxiosResponse) => void;
  reject: (reason: unknown) => void;
  config: ExtendedRequestConfig;
}

export class ApiClient {
  private readonly instance: AxiosInstance;
  private isRefreshing = false;
  private refreshQueue: PendingRequest[] = [];

  constructor() {
    this.instance = axios.create({
      baseURL: `${API_URL}`,
      timeout: 20_000,
      headers: { 'Content-Type': 'application/json' },
    });

    this.instance.interceptors.request.use(
      (config) => {
        const token = useAuthStore.getState().token;
        if (token && config.headers) {
          (config.headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
        }

        if (IS_DEV && config.url) {
          const method = (config.method ?? 'GET').toUpperCase();
          logger.info(`${method} ${config.url}`);
          (config as { _startTime?: number })._startTime = Date.now();
        }

        return config;
      },
      (error) => Promise.reject(error),
    );

    this.instance.interceptors.response.use(
      (response: AxiosResponse) => {
        if (IS_DEV && response.config.url) {
          const startTime = (response.config as { _startTime?: number })._startTime;
          if (startTime) {
            const elapsed = Date.now() - startTime;
            logger.info(`${response.status} ${response.config.method?.toUpperCase()} ${response.config.url} (${elapsed}ms)`);
          }
        }
        return response;
      },
      async (error: AxiosError) => {
        if (IS_DEV) {
          console.error('[API Error]', error.message, 'code:', error.code, 'url:', error.config?.url);
        }
        const config = error.config as ExtendedRequestConfig | undefined;
        if (!config) return Promise.reject(this.parseError(error));

        const status = error.response?.status;

        // Handle 401 — attempt token refresh once per request
        if (
          status === 401 &&
          !config._isRetry &&
          !config.url?.includes('/auth/refresh')
        ) {
          if (!this.isRefreshing) {
            this.isRefreshing = true;
            try {
              const refreshed = await this.refreshAuthToken();
              if (refreshed) {
                const newToken = useAuthStore.getState().token;
                if (newToken && config.headers) {
                  (config.headers as Record<string, string>)['Authorization'] = `Bearer ${newToken}`;
                }
                this.processRefreshQueue(null);
                return this.instance.request({
                  ...config,
                  _isRetry: true,
                  _retryCount: (config._retryCount ?? 0) + 1,
                } as ExtendedRequestConfig);
              }
              this.processRefreshQueue(new Error('Token refresh returned no token'));
            } catch (refreshError) {
              this.processRefreshQueue(refreshError);
            } finally {
              this.isRefreshing = false;
            }
          } else {
            return new Promise<AxiosResponse>((resolve, reject) => {
              this.refreshQueue.push({ resolve, reject, config });
            });
          }
          // Refresh failed — reject original request
          return Promise.reject(this.parseError(error));
        }

        // Check retry quota
        const retryCount = config._retryCount ?? 0;
        if (retryCount >= MAX_RETRIES) {
          return Promise.reject(this.parseError(error));
        }

        // Don't retry 4xx errors (except 401 handled above)
        if (status && status >= 400 && status < 500) {
          return Promise.reject(this.parseError(error));
        }

        // Retry 5xx and network errors with backoff
        await delay(RETRY_DELAY_MS * (retryCount + 1));
        return this.instance.request({
          ...config,
          _retryCount: retryCount + 1,
          _isRetry: true,
        } as ExtendedRequestConfig);
      },
    );
  }

  private async refreshAuthToken(): Promise<boolean> {
    const refreshToken = useAuthStore.getState().refreshToken;
    if (!refreshToken) {
      useAuthStore.getState().clearSession();
      useAppStore.getState().clearSession();
      return false;
    }

    try {
      const activeChild = useChildStore.getState().activeChild;
      const response = await axios.post(`${API_URL}/auth/refresh`, {
        refreshToken,
        childId: activeChild?.id ?? undefined,
      });

      const json = response.data as ApiResponse<{ accessToken: string; refreshToken: string; user: User }>;
      if (response.status === 200 && json.success && json.data) {
        await useAuthStore.getState().setSession(json.data);
        await useAppStore.getState().setSession(json.data);
        return true;
      }
    } catch (error) {
      logger.warn('Token refresh failed:', error);
    }

    useAuthStore.getState().clearSession();
    useAppStore.getState().clearSession();
    return false;
  }

  private processRefreshQueue(error: unknown): void {
    const queue = [...this.refreshQueue];
    this.refreshQueue = [];

    if (error === null) {
      const token = useAuthStore.getState().token;
      queue.forEach(({ resolve, reject, config }) => {
        if (token && config.headers) {
          (config.headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
        }
        this.instance
          .request({ ...config, _isRetry: true } as ExtendedRequestConfig)
          .then(resolve)
          .catch(reject);
      });
    } else {
      queue.forEach(({ reject }) => reject(error));
    }
  }

  private parseError(error: AxiosError): ApiError {
    if (error.response) {
      const data = error.response.data as Record<string, unknown> | undefined;
      const serverMessage =
        (data?.message as string) ?? `Request failed with status ${error.response.status}`;
      return new ApiError(
        error.response.status,
        serverMessage,
        this.getUserMessage(error.response.status, serverMessage),
      );
    }

    if (error.code === 'ECONNABORTED') {
      return new ApiError(
        0,
        'Request timed out',
        'Server took too long to respond. Please try again.',
        true,
      );
    }

    return new ApiError(
      0,
      error.message || 'Network error',
      'Unable to connect to PetalPath servers. Check your internet connection.',
      true,
    );
  }

  private getUserMessage(statusCode: number, serverMessage: string): string {
    switch (statusCode) {
      case 401:
        return 'Please login again.';
      case 403:
        return "You don't have permission to do that.";
      case 404:
        return 'The requested resource was not found.';
      case 422:
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

  getUri(path: string): string {
    return this.instance.getUri({ url: path });
  }

  async get<T>(path: string, config?: ExtendedRequestConfig): Promise<T> {
    const response = await this.instance.get<T>(path, config);
    return response.data;
  }

  async post<T>(path: string, data?: unknown, config?: ExtendedRequestConfig): Promise<T> {
    const response = await this.instance.post<T>(path, data, config);
    return response.data;
  }

  async put<T>(path: string, data?: unknown, config?: ExtendedRequestConfig): Promise<T> {
    const response = await this.instance.put<T>(path, data, config);
    return response.data;
  }

  async patch<T>(path: string, data?: unknown, config?: ExtendedRequestConfig): Promise<T> {
    const response = await this.instance.patch<T>(path, data, config);
    return response.data;
  }

  async delete<T>(path: string, config?: ExtendedRequestConfig): Promise<T> {
    const response = await this.instance.delete<T>(path, config);
    return response.data;
  }
}

export const apiClient = new ApiClient();

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
