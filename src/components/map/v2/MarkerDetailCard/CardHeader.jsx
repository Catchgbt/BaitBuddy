import React from 'react';

function CardHeader({ marker, markerType }) {
  const getTypeIcon = () => {
    const iconMap = {
      spot: '📍',
      club: '🏛️',
      fluss: '🏞️',
      tiefenkarte: '🗻',
      forellensee: '🎣',
      bathymetrie: '🌊',
      park: '🌳'
    };
    return iconMap[markerType] || '📍';
  };

  const getRegionDisplay = () => {
    if (marker.region) return marker.region;

    if (marker.bundeslaender && Array.isArray(marker.bundeslaender)) {
      const bundeslander = marker.bundeslaender.join(', ');
      if (marker.land) {
        return `${marker.land} • ${bundeslander}`;
      }
      return bundeslander;
    }

    if (marker.land) return marker.land;
    if (marker.city) return marker.city;

    return null;
  };

  const getCountryFlag = () => {
    if (marker.land === 'Österreich') return '🇦🇹';
    if (marker.land === 'Schweiz') return '🇨🇭';
    if (marker.land === 'Slowenien') return '🇸🇮';
    if (marker.land === 'Deutschland' || !marker.land) return '🇩🇪';
    return '🌍';
  };

  const regionDisplay = getRegionDisplay();

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <h2 className="text-lg sm:text-xl font-bold text-white break-words">
            {marker.title || marker.name || 'Ohne Name'}
          </h2>
          {regionDisplay && (
            <p className="text-xs sm:text-sm text-gray-400 mt-1 flex items-center gap-1">
              <span>{getCountryFlag()}</span>
              {regionDisplay}
            </p>
          )}
        </div>
        <div className="text-3xl flex-shrink-0">{getTypeIcon()}</div>
      </div>

      {marker.subtitle && (
        <p className="text-xs sm:text-sm text-gray-500 italic">
          {marker.subtitle}
        </p>
      )}
    </div>
  );
}

export default CardHeader;
