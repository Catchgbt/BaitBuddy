import { useMutation, useQueryClient } from '@tanstack/react-query';

/**
 * useOptimisticMutation
 *
 * A thin wrapper around useMutation that handles the full optimistic-update
 * lifecycle: cancel in-flight queries, snapshot previous data, apply the
 * optimistic update, roll back on error, and invalidate on settle.
 *
 * Usage:
 *
 *   const mutation = useOptimisticMutation({
 *     queryKey: 'catches',
 *     mutationFn: (data) => base44.entities.Catch.create(data),
 *     optimisticUpdate: (oldList = [], newItem) => [
 *       { id: `tmp-${Date.now()}`, ...newItem },
 *       ...oldList,
 *     ],
 *     onSuccess: () => toast.success('Fang gespeichert'),
 *   });
 *
 *   mutation.mutate(catchData);
 *
 * @param {object}   options
 * @param {string|string[]} options.queryKey        - Query key(s) to update optimistically.
 * @param {Function} options.mutationFn             - Async function that performs the mutation.
 * @param {Function} [options.optimisticUpdate]     - (oldData, variables) => newData.
 *                                                    Called for every provided queryKey.
 * @param {Function} [options.onSuccess]            - Called after a successful mutation.
 * @param {Function} [options.onError]              - Called after a failed mutation (post-rollback).
 * @param {boolean}  [options.invalidateOnSettle]   - Invalidate queries after settle (default: true).
 */
export function useOptimisticMutation({
  queryKey,
  mutationFn,
  optimisticUpdate,
  onSuccess,
  onError,
  invalidateOnSettle = true,
}) {
  const queryClient = useQueryClient();

  // Normalise to an array so callers can pass a single string or an array.
  const keys = Array.isArray(queryKey) ? queryKey : [queryKey];

  return useMutation({
    mutationFn,

    onMutate: async (variables) => {
      // Cancel any outgoing refetches to avoid overwriting our optimistic data.
      await Promise.all(keys.map((k) => queryClient.cancelQueries({ queryKey: [k] })));

      // Snapshot the current data so we can roll back on error.
      const previousValues = Object.fromEntries(
        keys.map((k) => [k, queryClient.getQueryData([k])])
      );

      // Apply optimistic updates immediately.
      if (optimisticUpdate) {
        keys.forEach((k) => {
          queryClient.setQueryData([k], (old) => optimisticUpdate(old, variables));
        });
      }

      return { previousValues };
    },

    onError: (err, variables, context) => {
      // Roll back every affected query to its snapshot.
      if (context?.previousValues) {
        keys.forEach((k) => {
          queryClient.setQueryData([k], context.previousValues[k]);
        });
      }
      onError?.(err, variables, context);
    },

    onSuccess,

    onSettled: () => {
      if (invalidateOnSettle) {
        keys.forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));
      }
    },
  });
}