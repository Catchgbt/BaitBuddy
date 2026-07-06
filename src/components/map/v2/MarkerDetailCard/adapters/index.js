export { normalizeSpot } from './SpotAdapter';
export { normalizeClub } from './ClubAdapter';
export { normalizeRiver } from './RiverAdapter';
export { normalizeDepthMap } from './DepthMapAdapter';
export { normalizeTroutLake } from './TroutLakeAdapter';
export { normalizeBathymetry } from './BathymetryAdapter';

const adapters = {
  spot: () => import('./SpotAdapter').then(m => m.normalizeSpot),
  club: () => import('./ClubAdapter').then(m => m.normalizeClub),
  angelpark: () => import('./ClubAdapter').then(m => m.normalizeClub),
  fluss: () => import('./RiverAdapter').then(m => m.normalizeRiver),
  tiefenkarte: () => import('./DepthMapAdapter').then(m => m.normalizeDepthMap),
  forellensee: () => import('./TroutLakeAdapter').then(m => m.normalizeTroutLake),
  bathymetrie: () => import('./BathymetryAdapter').then(m => m.normalizeBathymetry)
};

export async function normalizeMarker(marker, markerType) {
  const adapter = adapters[markerType];
  if (!adapter) {
    console.warn(`No adapter found for type: ${markerType}`);
    return null;
  }

  const normalizeFn = await adapter();
  return normalizeFn(marker);
}

export default {
  adapters,
  normalizeMarker
};
