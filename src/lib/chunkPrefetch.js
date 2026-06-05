/**
 * Dynamic chunk prefetching utility with adaptive network quality detection
 * Prefetches code-split chunks based on user navigation patterns and network conditions
 * Reduces initial page load and improves perceived performance
 */

const PREFETCH_TIMEOUT = 5000; // 5 second delay before prefetch
const PREFETCH_IDLE_DEADLINE = 2000; // Max wait for requestIdleCallback
const PREFETCH_THROTTLE = 100; // Minimum time between prefetch requests

let lastPrefetchTime = 0;
const prefetchedChunks = new Set();

/**
 * Detect effective network type and return adaptive prefetch strategy
 */
function getNetworkQuality() {
  if (typeof navigator === 'undefined' || !navigator.connection) {
    return { type: 'unknown', timeout: PREFETCH_TIMEOUT, strategy: 'normal' };
  }

  const connection = navigator.connection;
  const effectiveType = connection.effectiveType || '4g';
  const saveData = connection.saveData || false;

  if (saveData) {
    return {
      type: 'savedata',
      timeout: PREFETCH_TIMEOUT * 2,
      strategy: 'critical-only',
      maxParallel: 1
    };
  }

  switch (effectiveType) {
    case 'slow-2g':
    case '2g':
      return {
        type: effectiveType,
        timeout: PREFETCH_TIMEOUT * 3,
        strategy: 'critical-only',
        maxParallel: 1
      };
    case '3g':
      return {
        type: '3g',
        timeout: PREFETCH_TIMEOUT * 1.5,
        strategy: 'selective',
        maxParallel: 2
      };
    case '4g':
    default:
      return {
        type: '4g',
        timeout: PREFETCH_TIMEOUT,
        strategy: 'aggressive',
        maxParallel: 4
      };
  }
}

/**
 * Get all chunk imports for components
 * Used for prefetching on route changes
 */
export const CHUNK_ROUTES = {
  // Map page
  Map: () => import('@/pages/Map'),
  MapPage: () => import('@/pages/MapPage'),
  
  // Analysis pages
  Analysis: () => import('@/pages/Analysis'),
  WaterAnalysis: () => import('@/pages/WaterAnalysis'),
  
  // Depth analysis
  Devices: () => import('@/pages/Devices'),
  BathymetricCrowdsourcing: () => import('@/pages/BathymetricCrowdsourcing'),
  
  // AI features
  AI: () => import('@/pages/AI'),
  AIAssistant: () => import('@/pages/AIAssistant'),
  ARView: () => import('@/pages/ARView'),
  
  // Heavy components
  WaterCharts: () => import('@/components/water/WaterCharts'),
  ARWater3D: () => import('@/components/ar/ARWater3D'),
  BiteDetectorSection: () => import('@/components/ai/BiteDetectorSection'),
  MapController: () => import('@/components/map/v2/MapController'),
  DepthSection: () => import('@/components/depth/DepthSection'),
};

/**
 * Routes that typically follow from current page
 * Used to predict next navigation
 */
export const NAVIGATION_GRAPH = {
  Home: ['Dashboard', 'Map', 'Weather'],
  Dashboard: ['Map', 'Logbook', 'AIAssistant'],
  Map: ['WaterAnalysis', 'ARView', 'Analysis'],
  Logbook: ['Analysis', 'AIAssistant', 'Map'],
  Weather: ['Map', 'Dashboard', 'WaterAnalysis'],
  AIAssistant: ['Map', 'Logbook', 'Dashboard'],
  Profile: ['Settings', 'Licenses', 'Premium'],
};

/**
 * Prefetch a route's chunks
 */
export async function prefetchRoute(routeName) {
  if (!routeName || prefetchedChunks.has(routeName)) {
    return;
  }

  const now = Date.now();
  if (now - lastPrefetchTime < PREFETCH_THROTTLE) {
    return;
  }
  lastPrefetchTime = now;

  const chunkImporter = CHUNK_ROUTES[routeName];
  if (!chunkImporter) {
    return;
  }

  try {
    await chunkImporter();
    prefetchedChunks.add(routeName);
  } catch (error) {
    console.debug(`Chunk prefetch failed for ${routeName}:`, error.message);
  }
}

/**
 * Prefetch multiple routes
 */
export async function prefetchRoutes(routeNames) {
  const promises = routeNames.map(name => prefetchRoute(name));
  await Promise.allSettled(promises);
}

/**
 * Smart prefetch based on navigation graph with network-aware adaptation
 * Prefetches likely next pages after current page based on network conditions
 */
export function prefetchNavigationGraph(currentRoute) {
  const nextRoutes = NAVIGATION_GRAPH[currentRoute] || [];
  const networkQuality = getNetworkQuality();
  
  let routesToPrefetch = nextRoutes;
  
  // Adaptive prefetching based on network quality
  if (networkQuality.strategy === 'critical-only') {
    routesToPrefetch = nextRoutes.slice(0, 1); // Only prefetch most likely next page
  } else if (networkQuality.strategy === 'selective') {
    routesToPrefetch = nextRoutes.slice(0, 2); // Prefetch top 2 routes
  }
  // 'aggressive' strategy prefetches all routes (default behavior)
  
  const timeout = Math.max(networkQuality.timeout, PREFETCH_TIMEOUT);
  
  if (typeof requestIdleCallback !== 'undefined') {
    requestIdleCallback(
      () => prefetchRoutes(routesToPrefetch),
      { timeout: PREFETCH_IDLE_DEADLINE }
    );
  } else {
    setTimeout(() => prefetchRoutes(routesToPrefetch), timeout);
  }
}

/**
 * Prefetch critical heavy components on app load with network awareness
 */
export function prefetchCriticalChunks() {
  const networkQuality = getNetworkQuality();
  
  let criticalChunks = [
    'MapController',
    'WaterCharts',
    'BiteDetectorSection',
  ];

  // On slow networks, only prefetch the most essential chunk
  if (networkQuality.strategy === 'critical-only') {
    criticalChunks = ['MapController'];
  } else if (networkQuality.strategy === 'selective') {
    criticalChunks = criticalChunks.slice(0, 2);
  }

  const timeout = Math.max(networkQuality.timeout, PREFETCH_TIMEOUT);

  if (typeof requestIdleCallback !== 'undefined') {
    requestIdleCallback(
      () => prefetchRoutes(criticalChunks),
      { timeout: PREFETCH_IDLE_DEADLINE }
    );
  } else {
    setTimeout(() => prefetchRoutes(criticalChunks), timeout);
  }
}

/**
 * Reset prefetch cache (useful for testing or memory management)
 */
export function clearPrefetchCache() {
  prefetchedChunks.clear();
  lastPrefetchTime = 0;
}

/**
 * Get prefetch stats including network quality
 */
export function getPrefetchStats() {
  return {
    prefetched: Array.from(prefetchedChunks),
    count: prefetchedChunks.size,
    networkQuality: getNetworkQuality(),
  };
}