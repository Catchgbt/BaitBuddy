import { useReducer, useCallback, useRef, useEffect } from 'react';
import { OptimisticState, OptimisticAction, MutationConfig } from './types';

function optimisticReducer<T>(
  state: OptimisticState<T>,
  action: OptimisticAction<T>
): OptimisticState<T> {
  switch (action.type) {
    case 'OPTIMISTIC':
      return {
        ...state,
        data: action.payload || state.data,
        isPending: true,
        isDirty: true,
        error: null,
      };
    case 'SUCCESS':
      return {
        ...state,
        data: action.payload || state.data,
        isPending: false,
        isDirty: false,
        error: null,
      };
    case 'ERROR':
      return {
        ...state,
        isPending: false,
        error: action.error || null,
      };
    case 'RESET':
      return {
        data: action.payload || state.data,
        isPending: false,
        error: null,
        isDirty: false,
      };
    default:
      return state;
  }
}

export function useOptimisticMutation<TVariables, TData>(
  initialData: TData,
  config: MutationConfig<TVariables, TData>
) {
  const [state, dispatch] = useReducer(optimisticReducer<TData>, {
    data: initialData,
    isPending: false,
    error: null,
    isDirty: false,
  });

  const previousDataRef = useRef<TData>(initialData);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const mutate = useCallback(
    async (variables: TVariables) => {
      try {
        const optimisticData = config.optimisticData?.(variables, state.data);

        if (optimisticData) {
          previousDataRef.current = state.data;
          dispatch({
            type: 'OPTIMISTIC',
            payload: optimisticData,
          });
        }

        const result = await config.mutationFn(variables);

        if (isMountedRef.current) {
          dispatch({
            type: 'SUCCESS',
            payload: result,
          });
          config.onSuccess?.(result, variables);
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));

        if (isMountedRef.current) {
          dispatch({
            type: 'ERROR',
            error: err,
          });

          if (previousDataRef.current) {
            dispatch({
              type: 'RESET',
              payload: previousDataRef.current,
            });
          }

          config.onError?.(err, variables);
        }
      } finally {
        config.onSettled?.();
      }
    },
    [state.data, config]
  );

  const reset = useCallback(() => {
    dispatch({
      type: 'RESET',
      payload: initialData,
    });
    previousDataRef.current = initialData;
  }, [initialData]);

  return {
    mutate,
    data: state.data,
    isPending: state.isPending,
    error: state.error,
    reset,
    isDirty: state.isDirty,
  };
}