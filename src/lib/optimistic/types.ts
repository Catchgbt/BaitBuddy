export interface OptimisticState<T> {
  data: T;
  isPending: boolean;
  error: Error | null;
  isDirty: boolean;
}

export interface OptimisticAction<T> {
  type: 'OPTIMISTIC' | 'SUCCESS' | 'ERROR' | 'RESET';
  payload?: T;
  error?: Error;
}

export interface MutationConfig<TVariables, TData> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  optimisticData?: (variables: TVariables, currentData: TData) => TData;
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: Error, variables: TVariables) => void;
  onSettled?: () => void;
}

export interface UseOptimisticMutationReturn<TVariables, TData> {
  mutate: (variables: TVariables) => Promise<void>;
  data: TData | null;
  isPending: boolean;
  error: Error | null;
  reset: () => void;
  isDirty: boolean;
}

export interface ActionQueueItem {
  id: string;
  action: () => Promise<void>;
  timestamp: number;
  retries: number;
  maxRetries: number;
}