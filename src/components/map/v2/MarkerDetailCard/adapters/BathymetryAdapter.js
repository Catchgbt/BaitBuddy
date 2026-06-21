import { getMarkerImage, getMarkerImageFallbacks } from '@/api/imageLoaderService';

export async function normalizeBathymetry(bathymetry) {
  const heroImage = await getMarkerImage(
    'bathymetrie',
    bathymetry.id || bathymetry.bundesland,
    `${bathymetry.bundesland} bathymetry depth map`,
    'bathymetrie'
  );

  // Calculate center of bounding box
  const bbox = bathymetry.bounding_box;
  const centerLat = (bbox.minLat + bbox.maxLat) / 2;
  const centerLng = (bbox.minLng + bbox.maxLng) / 2;

  return {
    title: bathymetry.name || bathymetry.bundesland,
    subtitle: 'Bathymetrische Daten',
    region: bathymetry.bundesland || 'Deutschland',

    heroImage: {
      src: heroImage,
      fallbacks: getMarkerImageFallbacks(centerLat, centerLng),
      alt: `${bathymetry.bundesland} Bathymetrie`
    },

    infos: [
      {
        icon: '',
        label: 'Typ',
        value: 'Bathymetrie-Daten'
      },
      {
        icon: '',
        label: 'Bundesland',
        value: bathymetry.bundesland
      },
      bathymetry.data_source && {
        icon: '',
        label: 'Quelle',
        value: bathymetry.data_source
      },
      bathymetry.resolution && {
        icon: '',
        label: 'Auflösung',
        value: bathymetry.resolution
      },
      bathymetry.year && {
        icon: '',
        label: 'Jahr',
        value: bathymetry.year
      },
      bathymetry.coverage && {
        icon: '',
        label: 'Abdeckung',
        value: bathymetry.coverage
      }
    ].filter(Boolean),

    description:
      bathymetry.description ||
      `Hochauflösende Bathymetriedaten für ${bathymetry.bundesland}.
      Zeigt Wassertiefenmessungen und Gewässermorphologie für präzises Angeln.`,

    actions: [
      {
        id: 'view-map',
        label: 'Karte anzeigen',
        icon: '',
        variant: 'primary'
      },
      {
        id: 'download-data',
        label: 'Daten laden',
        icon: '',
        variant: 'secondary'
      },
      {
        id: 'info',
        label: 'ℹDetails',
        icon: 'ℹ',
        variant: 'secondary'
      }
    ]
  };
}

export function getMarkerType() {
  return 'bathymetrie';
}

export default {
  normalizeBathymetry,
  getMarkerType
};
