import { QueryClient } from '@tanstack/react-query';

export function invalidateQueries(
  queryClient: QueryClient,
  queryKey: ReadonlyArray<unknown>,
) {
  return queryClient.invalidateQueries({ queryKey });
}

export function invalidateAllQueries(queryClient: QueryClient) {
  return queryClient.invalidateQueries();
}

export function optimisticUpdate<TData>(
  queryClient: QueryClient,
  queryKey: ReadonlyArray<unknown>,
  updater: (oldData: TData | undefined) => TData,
) {
  const previousData = queryClient.getQueryData<TData>(queryKey);
  queryClient.setQueryData<TData>(queryKey, updater(previousData));
  return { previousData };
}

export function rollbackOptimisticUpdate<TData>(
  queryClient: QueryClient,
  queryKey: ReadonlyArray<unknown>,
  previousData: TData | undefined,
) {
  queryClient.setQueryData(queryKey, previousData);
}
