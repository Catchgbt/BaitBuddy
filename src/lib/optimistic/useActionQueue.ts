import { useReducer, useCallback, useRef } from 'react';
import { ActionQueueItem } from './types';

interface ActionQueueState {
  items: ActionQueueItem[];
  isProcessing: boolean;
  failedItems: ActionQueueItem[];
}

type QueueAction =
  | { type: 'ADD'; payload: ActionQueueItem }
  | { type: 'REMOVE'; payload: string }
  | { type: 'PROCESS_START' }
  | { type: 'PROCESS_END' }
  | { type: 'RETRY'; payload: string }
  | { type: 'MARK_FAILED'; payload: string };

function queueReducer(state: ActionQueueState, action: QueueAction): ActionQueueState {
  switch (action.type) {
    case 'ADD':
      return {
        ...state,
        items: [...state.items, action.payload],
      };
    case 'REMOVE':
      return {
        ...state,
        items: state.items.filter(item => item.id !== action.payload),
      };
    case 'PROCESS_START':
      return { ...state, isProcessing: true };
    case 'PROCESS_END':
      return { ...state, isProcessing: false };
    case 'RETRY':
      return {
        ...state,
        items: state.items.map(item =>
          item.id === action.payload
            ? { ...item, retries: item.retries + 1 }
            : item
        ),
      };
    case 'MARK_FAILED':
      return {
        ...state,
        failedItems: state.items.filter(item => item.id === action.payload),
        items: state.items.filter(item => item.id !== action.payload),
      };
    default:
      return state;
  }
}

export function useActionQueue() {
  const [state, dispatch] = useReducer(queueReducer, {
    items: [],
    isProcessing: false,
    failedItems: [],
  });

  const processQueueRef = useRef<NodeJS.Timeout | null>(null);

  const enqueue = useCallback((action: () => Promise<void>, maxRetries = 3) => {
    const item: ActionQueueItem = {
      id: `${Date.now()}-${Math.random()}`,
      action,
      timestamp: Date.now(),
      retries: 0,
      maxRetries,
    };
    dispatch({ type: 'ADD', payload: item });
    return item.id;
  }, []);

  const processQueue = useCallback(async () => {
    if (state.isProcessing || state.items.length === 0) return;

    dispatch({ type: 'PROCESS_START' });

    for (const item of state.items) {
      try {
        await item.action();
        dispatch({ type: 'REMOVE', payload: item.id });
      } catch (error) {
        if (item.retries < item.maxRetries) {
          dispatch({ type: 'RETRY', payload: item.id });
        } else {
          dispatch({ type: 'MARK_FAILED', payload: item.id });
        }
      }
    }

    dispatch({ type: 'PROCESS_END' });
  }, [state.items, state.isProcessing]);

  const scheduleProcessing = useCallback(() => {
    if (processQueueRef.current) clearTimeout(processQueueRef.current);
    processQueueRef.current = setTimeout(processQueue, 1000);
  }, [processQueue]);

  const clearFailed = useCallback(() => {
    dispatch({ type: 'PROCESS_END' });
  }, []);

  return {
    enqueue,
    processQueue,
    scheduleProcessing,
    items: state.items,
    failedItems: state.failedItems,
    isProcessing: state.isProcessing,
    clearFailed,
  };
}