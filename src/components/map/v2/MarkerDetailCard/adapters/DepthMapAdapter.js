import { getMarkerImage, getMarkerImageFallbacks } from '@/api/imageLoaderService';

export async function normalizeDepthMap(tiefenkarte) {
  const heroImage = await getMarkerImage(
    'tiefenkarte',
    tiefenkarte.id,
    `${tiefenkarte.fluss} depth map`,
    'tiefenkarte'
  );

  return {
    title: tiefenkarte.name,
    subtitle: `${tiefenkarte.fluss}`,
    region: tiefenkarte.region || tiefenkarte.bundesland || 'Deutschland',

    heroImage: {
      src: heroImage,
      fallbacks: getMarkerImageFallbacks(tiefenkarte.koordinaten?.lat, tiefenkarte.koordinaten?.lng),
      alt: tiefenkarte.name
    },

    infos: [
      {
        icon: '🗻',
        label: 'Typ',
        value: 'Bathymetrie-Karte'
      },
      {
        icon: '💧',
        label: 'Fluss',
        value: tiefenkarte.fluss
      },
      tiefenkarte.region && {
        icon: '🗺️',
        label: 'Region',
        value: tiefenkarte.region
      },
      tiefenkarte.bundesland && {
        icon: '🏘️',
        label: 'Bundesland',
        value: tiefenkarte.bundesland
      },
      tiefenkarte.tiefenbereich && {
        icon: '📏',
        label: 'Tiefenbereich',
        value: tiefenkarte.tiefenbereich
      },
      tiefenkarte.auflosung && {
        icon: '⚙️',
        label: 'Auflösung',
        value: tiefenkarte.auflosung
      }
    ].filter(Boolean),

    description: tiefenkarte.beschreibung || null,

    actions: [
      {
        id: 'open-map',
        label: 'Karte öffnen',
        icon: '🗺️',
        variant: 'primary'
      },
      {
        id: 'download',
        label: 'Herunterladen',
        icon: '⬇️',
        variant: 'secondary'
      },
      {
        id: 'info',
        label: 'ℹMehr Infos',
        icon: 'ℹ',
        variant: 'secondary'
      }
    ]
  };
}

export function getMarkerType() {
  return 'tiefenkarte';
}

export default {
  normalizeDepthMap,
  getMarkerType
};
