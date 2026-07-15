/**
 * useApi
 *
 * Returns the centralized API client instance (src/api/client) so feature code
 * can perform requests without importing the client directly. Keeps a single
 * import surface for data access across the app.
 *
 * Example:
 *   const api = useApi();
 *   const data = await api.get('/roadmap');
 */
import { useMemo } from 'react';
import { api } from '../api/client';

export const useApi = () => {
  return useMemo(() => api, []);
};
