import { useCallback } from 'react';
import { useOptimisticMutation } from '@/lib/optimistic/useOptimisticMutation';
import { useActionQueue } from '@/lib/optimistic/useActionQueue';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export interface Catch {
  id: string;
  species: string;
  length_cm?: number;
  weight_kg?: number;
  photo_url?: string;
  catch_time: string;
  created_date: string;
}

export function useOptimisticCatch(initialCatches: Catch[] = []) {
  const actionQueue = useActionQueue();

  const {
    mutate: optimisticCreate,
    data: catches,
    isPending,
    error,
    isDirty,
  } = useOptimisticMutation<Partial<Catch>, Catch[]>(
    initialCatches,
    {
      mutationFn: async (catchData) => {
        const created = await base44.entities.Catch.create(catchData);
        return [created, ...initialCatches];
      },
      optimisticData: (variables, current) => [
        {
          id: `temp-${Date.now()}`,
          species: variables.species || '',
          ...variables,
          created_date: new Date().toISOString(),
        } as Catch,
        ...current,
      ],
      onSuccess: (data) => {
        toast.success('Fang gespeichert');
      },
      onError: (error) => {
        toast.error(`Fehler: ${error.message}`);
      },
    }
  );

  const addCatch = useCallback(
    async (catchData: Partial<Catch>) => {
      const actionId = actionQueue.enqueue(async () => {
        await optimisticCreate(catchData);
      });
      actionQueue.scheduleProcessing();
    },
    [optimisticCreate, actionQueue]
  );

  return {
    catches,
    addCatch,
    isPending,
    error,
    isDirty,
    queuedActions: actionQueue.items.length,
    failedActions: actionQueue.failedItems.length,
  };
}