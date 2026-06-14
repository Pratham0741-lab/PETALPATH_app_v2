import { useAppStore } from '../store/appStore';
import { useChildStore } from '../store/childStore';
import { API_URL } from '../config/env';

const BASE_URL = API_URL;

class ApiClient {
  private async request(method: string, path: string, body?: any, isRetry = false): Promise<any> {
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

    try {
      const response = await fetch(`${BASE_URL}${path}`, config);
      const json = await response.json();

      if (response.status === 401 && !isRetry && state.refreshToken) {
        // Token might have expired. Try to refresh
        const refreshed = await this.refreshToken(state.refreshToken);
        if (refreshed) {
          // Retry the original request
          return this.request(method, path, body, true);
        }
      }

      if (!response.ok || json.success === false) {
        throw new Error(json.message || 'Request failed');
      }

      return json;
    } catch (error) {
      throw error;
    }
  }

  private async refreshToken(token: string): Promise<boolean> {
    try {
      const activeChild = useChildStore.getState().activeChild;
      const response = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
      console.warn('Failed to refresh authentication session:', error);
    }

    // Refresh failed. Log out user
    useAppStore.getState().clearSession();
    return false;
  }

  async get(path: string): Promise<any> {
    return this.request('GET', path);
  }

  async post(path: string, body: any): Promise<any> {
    return this.request('POST', path, body);
  }

  async put(path: string, body: any): Promise<any> {
    return this.request('PUT', path, body);
  }

  async delete(path: string): Promise<any> {
    return this.request('DELETE', path);
  }
}

export const api = new ApiClient();
