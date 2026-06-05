import { QueryClient } from '@tanstack/react-query';

export const queryClientInstance = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      // Keep data fresh for 30 seconds before treating it as stale.
      staleTime: 30_000,
      // Keep unused query data in cache for 5 minutes.
      gcTime: 5 * 60_000,
    },
    mutations: {
      // Do not retry failed mutations — surface errors immediately.
      retry: 0,
    },
  },
});