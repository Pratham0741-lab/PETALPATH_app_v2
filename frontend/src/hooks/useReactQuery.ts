import {
  useQuery,
  useMutation,
  useInfiniteQuery,
  type UseQueryOptions,
  type UseMutationOptions,
  type UseInfiniteQueryOptions,
  type QueryKey,
  type InfiniteData,
} from '@tanstack/react-query';
import type { ApiResponse, PaginatedResponse } from '../types/api';
import type { ApiError } from '../api/errors';

export function useApiQuery<TData, TError = ApiError>(
  queryKey: QueryKey,
  queryFn: () => Promise<ApiResponse<TData>>,
  options?: Omit<
    UseQueryOptions<ApiResponse<TData>, TError, ApiResponse<TData>, QueryKey>,
    'queryKey' | 'queryFn'
  >,
) {
  return useQuery<ApiResponse<TData>, TError>({
    queryKey,
    queryFn,
    staleTime: 1000 * 60,
    gcTime: 1000 * 60 * 5,
    retry: (failureCount, error) => {
      const apiError = error as ApiError;
      if (apiError?.statusCode && apiError.statusCode >= 400 && apiError.statusCode < 500) {
        return false;
      }
      return failureCount < 2;
    },
    ...options,
  });
}

export function useApiMutation<TData, TVariables = void, TError = ApiError>(
  mutationFn: (variables: TVariables) => Promise<ApiResponse<TData>>,
  options?: Omit<
    UseMutationOptions<ApiResponse<TData>, TError, TVariables>,
    'mutationFn'
  >,
) {
  return useMutation<ApiResponse<TData>, TError, TVariables>({
    mutationFn,
    ...options,
  });
}

export function usePaginatedQuery<TData, TError = ApiError>(
  queryKey: QueryKey,
  queryFn: (page: number, pageSize: number) => Promise<ApiResponse<TData>>,
  options?: {
    page?: number;
    pageSize?: number;
  } & Omit<
    UseQueryOptions<ApiResponse<TData>, TError, ApiResponse<TData>, QueryKey>,
    'queryKey' | 'queryFn'
  >,
) {
  const { page = 1, pageSize = 10, ...queryOptions } = options ?? {};
  return useQuery<ApiResponse<TData>, TError>({
    queryKey: [...queryKey, { page, pageSize }],
    queryFn: () => queryFn(page, pageSize),
    staleTime: 1000 * 60,
    gcTime: 1000 * 60 * 5,
    retry: (failureCount, error) => {
      const apiError = error as ApiError;
      if (apiError?.statusCode && apiError.statusCode >= 400 && apiError.statusCode < 500) {
        return false;
      }
      return failureCount < 2;
    },
    ...queryOptions,
  });
}

export function useInfiniteScroll<TData>(
  queryKey: QueryKey,
  queryFn: (page: number) => Promise<PaginatedResponse<TData>>,
  options?: Omit<
    UseInfiniteQueryOptions<
      PaginatedResponse<TData>,
      ApiError,
      InfiniteData<PaginatedResponse<TData>>,
      QueryKey,
      number
    >,
    'queryKey' | 'queryFn' | 'initialPageParam' | 'getNextPageParam'
  >,
) {
  return useInfiniteQuery<
    PaginatedResponse<TData>,
    ApiError,
    InfiniteData<PaginatedResponse<TData>>,
    QueryKey,
    number
  >({
    queryKey,
    queryFn: ({ pageParam }) => queryFn(pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.pagination;
      return page < totalPages ? page + 1 : undefined;
    },
    staleTime: 1000 * 60,
    gcTime: 1000 * 60 * 5,
    ...options,
  });
}
