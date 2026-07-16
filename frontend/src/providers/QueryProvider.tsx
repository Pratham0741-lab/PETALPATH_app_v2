import React from 'react';
import { Platform } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import type { ApiError } from '../api/errors';

const IS_DEV = typeof __DEV__ !== 'undefined' ? __DEV__ : false;
const ENABLE_DEVTOOLS = IS_DEV && Platform.OS === 'web';

function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => {
          const apiError = error as ApiError;
          if (apiError?.statusCode && apiError.statusCode >= 400 && apiError.statusCode < 500) {
            return false;
          }
          return failureCount < 2;
        },
        staleTime: 1000 * 60,
        gcTime: 1000 * 60 * 5,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
      },
      mutations: {
        retry: (failureCount, error) => {
          const apiError = error as ApiError;
          if (apiError?.statusCode && apiError.statusCode >= 400 && apiError.statusCode < 500) {
            return false;
          }
          return failureCount < 1;
        },
      },
    },
  });
}

export const queryClient = createQueryClient();

export const QueryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {ENABLE_DEVTOOLS && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
};
