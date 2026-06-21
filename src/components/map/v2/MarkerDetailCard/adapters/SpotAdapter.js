import { getMarkerImage, getMarkerImageFallbacks } from '@/api/imageLoaderService';

export async function normalizeSpot(spot) {
  const heroImage = await getMarkerImage(
    'spot',
    spot.id,
    `${spot.name} fishing spot`,
    'spot'
  );

  return {
    title: spot.name,
    subtitle: spot.water_type && `${spot.water_type.charAt(0).toUpperCase() + spot.water_type.slice(1)}`,
    region: spot.city || 'Mein Spot',

    heroImage: {
      src: heroImage,
      fallbacks: getMarkerImageFallbacks(spot.latitude, spot.longitude),
      alt: spot.name
    },

    infos: [
      spot.water_type && {
        icon: '',
        label: 'Gewässer',
        value: spot.water_type.charAt(0).toUpperCase() + spot.water_type.slice(1)
      },
      spot.depth_meters && {
        icon: '',
        label: 'Tiefe',
        value: `${spot.depth_meters}m`
      },
      spot.fish_species && {
        icon: '',
        label: 'Fischarten',
        value: spot.fish_species
      },
      {
        icon: '',
        label: 'Koordinaten',
        value: `${spot.latitude.toFixed(4)}, ${spot.longitude.toFixed(4)}`
      }
    ].filter(Boolean),

    description: spot.notes || null,

    actions: [
      {
        id: 'set-location',
        label: 'Als Standort',
        icon: '',
        variant: 'primary'
      },
      {
        id: 'sports',
        label: 'Sportarten',
        icon: '',
        variant: 'secondary'
      },
      {
        id: 'navigate',
        label: 'Navigation',
        icon: '',
        variant: 'secondary'
      },
      {
        id: 'edit',
        label: 'Bearbeiten',
        icon: '',
        variant: 'secondary'
      }
    ]
  };
}

export function getMarkerType() {
  return 'spot';
}

export default {
  normalizeSpot,
  getMarkerType
};
