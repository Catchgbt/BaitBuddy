import { useReducer, useCallback } from 'react';
import { OptimisticState, OptimisticAction, MutationConfig } from './types';

interface UndoState<T> extends OptimisticState<T> {
  history: T[];
  historyIndex: number;
}

type UndoAction<T> = OptimisticAction<T> | { type: 'UNDO' } | { type: 'REDO' };

function undoReducer<T>(state: UndoState<T>, action: UndoAction<T>): UndoState<T> {
  switch (action.type) {
    case 'OPTIMISTIC':
      return {
        ...state,
        data: action.payload || state.data,
        history: [...state.history, state.data],
        historyIndex: state.historyIndex + 1,
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
    case 'UNDO':
      if (state.historyIndex > 0) {
        const newIndex = state.historyIndex - 1;
        return {
          ...state,
          data: state.history[newIndex],
          historyIndex: newIndex,
          isDirty: true,
        };
      }
      return state;
    case 'REDO':
      if (state.historyIndex < state.history.length - 1) {
        const newIndex = state.historyIndex + 1;
        return {
          ...state,
          data: state.history[newIndex],
          historyIndex: newIndex,
          isDirty: true,
        };
      }
      return state;
    case 'RESET':
      return {
        data: action.payload || state.data,
        history: [action.payload || state.data],
        historyIndex: 0,
        isPending: false,
        error: null,
        isDirty: false,
      };
    default:
      return state;
  }
}

export function useMutationWithUndo<TVariables, TData>(
  initialData: TData,
  config: MutationConfig<TVariables, TData>
) {
  const [state, dispatch] = useReducer(undoReducer<TData>, {
    data: initialData,
    history: [initialData],
    historyIndex: 0,
    isPending: false,
    error: null,
    isDirty: false,
  });

  const mutate = useCallback(
    async (variables: TVariables) => {
      try {
        const optimisticData = config.optimisticData?.(variables, state.data);

        if (optimisticData) {
          dispatch({
            type: 'OPTIMISTIC',
            payload: optimisticData,
          });
        }

        const result = await config.mutationFn(variables);
        dispatch({
          type: 'SUCCESS',
          payload: result,
        });
        config.onSuccess?.(result, variables);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        dispatch({
          type: 'ERROR',
          error: err,
        });
        config.onError?.(err, variables);
      } finally {
        config.onSettled?.();
      }
    },
    [state.data, config]
  );

  const undo = useCallback(() => {
    dispatch({ type: 'UNDO' });
  }, []);

  const redo = useCallback(() => {
    dispatch({ type: 'REDO' });
  }, []);

  const reset = useCallback(() => {
    dispatch({
      type: 'RESET',
      payload: initialData,
    });
  }, [initialData]);

  const canUndo = state.historyIndex > 0;
  const canRedo = state.historyIndex < state.history.length - 1;

  return {
    mutate,
    data: state.data,
    isPending: state.isPending,
    error: state.error,
    reset,
    isDirty: state.isDirty,
    undo,
    redo,
    canUndo,
    canRedo,
  };
}