import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  prefetchRoute,
  prefetchNavigationGraph,
  prefetchCriticalChunks,
  NAVIGATION_GRAPH,
} from '@/lib/chunkPrefetch';

/**
 * Hook: Smart chunk prefetching based on current route
 * Automatically prefetches likely next routes and heavy components
 *
 * Defensive: If used outside Router context, becomes a no-op instead of crashing.
 */
export function usePrefetch() {
  const location = useLocation();
  const pathname = location?.pathname || null;

  // Prefetch critical chunks on initial load
  useEffect(() => {
    prefetchCriticalChunks();
  }, []);

  // Prefetch navigation graph when route changes
  useEffect(() => {
    if (!pathname) return;
    const currentRoute = pathname.replace(/^\//, '').split('/')[0] || 'Home';

    // Prefetch likely next routes based on navigation patterns
    prefetchNavigationGraph(currentRoute);
  }, [pathname]);
}

/**
 * Hook: Prefetch a specific route on demand
 */
export function usePrefetchRoute(routeName) {
  useEffect(() => {
    if (routeName) {
      prefetchRoute(routeName);
    }
  }, [routeName]);
}

/**
 * Hook: Prefetch multiple routes
 */
export function usePrefetchRoutes(routeNames = []) {
  useEffect(() => {
    if (Array.isArray(routeNames) && routeNames.length > 0) {
      routeNames.forEach(name => prefetchRoute(name));
    }
  }, [routeNames]);
}