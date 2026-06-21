import { getMarkerImage, getMarkerImageFallbacks } from '@/api/imageLoaderService';

export async function normalizeClub(club) {
  const heroImage = await getMarkerImage(
    'club',
    club.id,
    club.name,
    'club'
  );

  const isClub = club.category === 'club';

  return {
    title: club.name,
    region: club.address?.city || club.city || 'Deutschland',

    heroImage: {
      src: heroImage,
      fallbacks: getMarkerImageFallbacks(
        club.coordinates?.lat || club.latitude,
        club.coordinates?.lng || club.longitude
      ),
      alt: club.name
    },

    infos: [
      {
        icon: isClub ? '' : '',
        label: isClub ? 'Typ' : 'Typ',
        value: isClub ? 'Angelverein' : 'Angelpark'
      },
      club.address?.street && {
        icon: '',
        label: 'Adresse',
        value: `${club.address.street}${club.address.city ? `, ${club.address.city}` : ''}`
      },
      club.phone && {
        icon: '',
        label: 'Telefon',
        value: club.phone
      },
      club.email && {
        icon: '',
        label: 'Email',
        value: club.email
      },
      club.website && {
        icon: '',
        label: 'Website',
        value: club.website.replace(/^https?:\/\//, '')
      }
    ].filter(Boolean),

    description: club.description || null,

    actions: [
      club.website && {
        id: 'website',
        label: 'Website besuchen',
        icon: '',
        variant: 'primary'
      },
      club.phone && {
        id: 'call',
        label: 'Anrufen',
        icon: '',
        variant: 'primary'
      },
      {
        id: 'navigate',
        label: 'Navigation',
        icon: '',
        variant: 'secondary'
      }
    ].filter(Boolean)
  };
}

export function getMarkerType() {
  return 'club';
}

export default {
  normalizeClub,
  getMarkerType
};
