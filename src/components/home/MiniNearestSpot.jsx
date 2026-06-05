import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useLocation } from "@/components/location/LocationManager";
import { MapPin, Navigation } from "lucide-react";

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

export default function MiniNearestSpot() {
  const { currentLocation } = useLocation();
  const [nearestSpot, setNearestSpot] = useState(null);
  const [distance, setDistance] = useState(null);

  useEffect(() => {
    const findNearestSpot = async () => {
      if (!currentLocation?.lat || !currentLocation?.lon) return;

      try {
        const spots = await base44.entities.Spot.list();
        if (spots.length === 0) return;

        let nearest = null;
        let minDistance = Infinity;

        spots.forEach(spot => {
          if (spot.latitude && spot.longitude) {
            const dist = calculateDistance(
              currentLocation.lat,
              currentLocation.lon,
              spot.latitude,
              spot.longitude
            );

            if (dist < minDistance) {
              minDistance = dist;
              nearest = spot;
            }
          }
        });

        if (nearest && minDistance < 5) {
          setNearestSpot(nearest);
          setDistance(minDistance);
        }
      } catch (error) {
        console.error("Fehler beim Laden der Spots:", error);
      }
    };

    findNearestSpot();
  }, [currentLocation]);

  const formatDistance = (dist) => {
    if (dist < 1) return `${Math.round(dist * 1000)}m`;
    return `${dist.toFixed(1)}km`;
  };

  const getWaterTypeIcon = (waterType) => {
    const safeWaterType = String(waterType || 'unknown');
    switch (safeWaterType) {
      case 'fluss': return '🏞️';
      case 'see': return '🏔️';
      case 'teich': return '🐸';
      case 'kanal': return '🚢';
      case 'meer': return '🌊';
      case 'bach': return '🏞️';
      default: return '🎣';
    }
  };

  if (!currentLocation) {
    return (
      <div className="p-4 bg-gray-800/30 rounded-xl border border-gray-700/50">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-cyan-400 font-medium text-sm drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]">Nächster Spot</h3>
          <Navigation className="w-5 h-5 text-emerald-400" />
        </div>
        <div className="text-center py-4">
          <div className="text-sm text-gray-400">GPS aktivieren</div>
        </div>
      </div>
    );
  }

  if (!nearestSpot) {
    return (
      <div className="p-4 bg-gray-800/30 rounded-xl border border-gray-700/50">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-cyan-400 font-medium text-sm drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]">Nächster Spot</h3>
          <Navigation className="w-5 h-5 text-emerald-400" />
        </div>
        <div className="text-center py-4">
          <div className="text-sm text-gray-400">Keine Spots in der Nähe</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-800/30 rounded-xl border border-gray-700/50">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-cyan-400 font-medium text-sm drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]">Nächster Spot</h3>
        <Navigation className="w-5 h-5 text-emerald-400" />
      </div>
      
      <div className="flex items-center gap-3">
        <div className="text-3xl">{getWaterTypeIcon(nearestSpot.water_type)}</div>
        <div className="flex-1 min-w-0">
          <div className="text-lg font-semibold text-white truncate">
            {String(nearestSpot.name || 'Unbenannter Spot')}
          </div>
          <div className="flex items-center gap-2 text-sm text-emerald-400">
            <MapPin className="w-3 h-3" />
            <span>{formatDistance(distance)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}