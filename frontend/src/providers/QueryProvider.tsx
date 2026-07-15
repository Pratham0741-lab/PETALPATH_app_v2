/**
 * React Query (TanStack Query) Provider
 *
 * Centralized QueryClient configuration for the entire app:
 * - Sensible retry policy (no retries on 4xx, limited retries on network/5xx)
 * - Default cache windows (staleTime / gcTime)
 * - Devtools enabled only in development
 *
 * This is the single source of truth for query defaults so that every
 * feature module uses consistent caching and retry behavior.
 */
import React from 'react';
import { Platform } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

const IS_DEV = typeof __DEV__ !== 'undefined' ? __DEV__ : false;

// React Query Devtools render a DOM/overlay surface; enable it in development.
// On native we keep it web-only to avoid platform-specific runtime issues.
const ENABLE_DEVTOOLS = IS_DEV && Platform.OS === 'web';

function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Don't retry client errors; retry transient network/5xx failures once.
        retry: (failureCount, error: any) => {
          const status = error?.statusCode;
          if (status && status >= 400 && status < 500) {
            return false;
          }
          return failureCount < 2;
        },
        staleTime: 1000 * 60, // 1 minute
        gcTime: 1000 * 60 * 5, // 5 minutes
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
      },
      mutations: {
        retry: (failureCount, error: any) => {
          const status = error?.statusCode;
          if (status && status >= 400 && status < 500) {
            return false;
          }
          return failureCount < 1;
        },
      },
    },
  });
}

export const QueryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Keep a single stable QueryClient instance across re-renders.
  const [queryClient] = React.useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {ENABLE_DEVTOOLS && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
};
