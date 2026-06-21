import { getMarkerImage, getMarkerImageFallbacks } from '@/api/imageLoaderService';

export async function normalizeTroutLake(see) {
  const heroImage = await getMarkerImage(
    'forellensee',
    see.id || see.name,
    `${see.name} trout lake`,
    'forellensee'
  );

  return {
    title: see.name,
    region: `${see.land || 'Europa'} • ${see.region || ''}`.trim(),

    heroImage: {
      src: heroImage,
      fallbacks: getMarkerImageFallbacks(see.lat, see.lng),
      alt: see.name
    },

    infos: [
      {
        icon: '',
        label: 'Typ',
        value: 'Forellensee'
      },
      see.land && {
        icon: '',
        label: 'Land',
        value: see.land
      },
      see.region && {
        icon: '',
        label: 'Region',
        value: see.region
      },
      see.forellenarten && {
        icon: '',
        label: 'Forellensorten',
        value: Array.isArray(see.forellenarten)
          ? see.forellenarten.join(', ')
          : see.forellenarten
      },
      see.adresse && {
        icon: '',
        label: 'Adresse',
        value: see.adresse
      },
      see.bemerkungen && {
        icon: '',
        label: 'Besonderheiten',
        value: see.bemerkungen
      }
    ].filter(Boolean),

    description: see.description || null,

    actions: [
      see.website && {
        id: 'website',
        label: 'Website',
        icon: '',
        variant: 'primary'
      },
      {
        id: 'navigate',
        label: 'Navigation',
        icon: '',
        variant: 'primary'
      },
      {
        id: 'add-trip',
        label: 'Zu Reise hinzufügen',
        icon: '',
        variant: 'secondary'
      }
    ].filter(Boolean)
  };
}

export function getMarkerType() {
  return 'forellensee';
}

export default {
  normalizeTroutLake,
  getMarkerType
};
