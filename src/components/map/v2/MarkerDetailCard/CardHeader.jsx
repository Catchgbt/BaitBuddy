import React from 'react';
import { MapPin, Landmark, Waves, Mountain, Fish, Trees } from 'lucide-react';

function CardHeader({ marker, markerType }) {
  const getTypeIcon = () => {
    const iconMap = {
      spot: MapPin,
      club: Landmark,
      fluss: Waves,
      tiefenkarte: Mountain,
      forellensee: Fish,
      bathymetrie: Waves,
      park: Trees
    };
    const Icon = iconMap[markerType] || MapPin;
    return <Icon className="w-7 h-7" />;
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
