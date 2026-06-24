import { getMarkerImage, getMarkerImageFallbacks } from '@/api/imageLoaderService';

export async function normalizeRiver(river) {
  const heroImage = await getMarkerImage(
    'fluss',
    river.id,
    river.name,
    'fluss'
  );

  return {
    title: river.name,
    region: river.bundeslaender?.join(', ') || 'Deutschland',

    heroImage: {
      src: heroImage,
      fallbacks: getMarkerImageFallbacks(river.koordinaten?.lat, river.koordinaten?.lng),
      alt: `${river.name} River`
    },

    infos: [
      {
        icon: '📏',
        label: 'Länge',
        value: `${river.laenge_km} km`
      },
      {
        icon: '🗺️',
        label: 'Verlauf',
        value: river.verlauf
      },
      {
        icon: '🏘️',
        label: 'Bundesländer',
        value: Array.isArray(river.bundeslaender)
          ? river.bundeslaender.join(', ')
          : river.bundeslaender
      },
      {
        icon: '🎣',
        label: 'Fischarten',
        value: river.fischarten
      },
      {
        icon: '⚡',
        label: 'Schwierigkeit',
        value: river.schwierigkeit
      },
      river.wichtige_orte && {
        icon: '🏙️',
        label: 'Wichtige Orte',
        value: Array.isArray(river.wichtige_orte)
          ? river.wichtige_orte.join(', ')
          : river.wichtige_orte
      },
      river.angelgewaesser && {
        icon: '🎯',
        label: 'Angelgewässer',
        value: river.angelgewaesser
      }
    ].filter(Boolean),

    description: river.beschreibung || null,

    actions: [
      {
        id: 'show-on-map',
        label: '🗺️ Auf Karte zeigen',
        icon: '🗺️',
        variant: 'primary'
      },
      {
        id: 'add-to-trips',
        label: '📋 Zur Reise hinzufügen',
        icon: '📋',
        variant: 'secondary'
      }
    ]
  };
}

export function getMarkerType() {
  return 'fluss';
}

export default {
  normalizeRiver,
  getMarkerType
};
