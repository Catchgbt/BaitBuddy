import { useState, useCallback, useEffect } from 'react';

/**
 * Lightweight navigation stack for managing back navigation state.
 * Works alongside react-router-dom without replacing it.
 */
export function useNavigationStack(initialKey = null) {
  const [stack, setStack] = useState(initialKey ? [initialKey] : []);

  const push = useCallback((key) => {
    setStack(prev => [...prev, key]);
  }, []);

  const pop = useCallback(() => {
    setStack(prev => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }, []);

  const reset = useCallback((key = null) => {
    setStack(key ? [key] : []);
  }, []);

  const current = stack[stack.length - 1] ?? null;
  const canGoBack = stack.length > 1;

  // Sync with browser back button
  useEffect(() => {
    const handlePopState = () => {
      if (canGoBack) pop();
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [canGoBack, pop]);

  return { current, stack, push, pop, reset, canGoBack };
}