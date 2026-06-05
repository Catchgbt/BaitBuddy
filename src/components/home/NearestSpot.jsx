
import React, { useEffect, useState } from "react";
import { Spot } from "@/entities/Spot";
import { useLocation } from "@/components/location/LocationManager";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, ArrowRight, Fish } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

// Haversine-Formel für Distanzberechnung
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Erdradius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

export default function NearestSpot() {
  const { currentLocation } = useLocation();
  const [nearestSpot, setNearestSpot] = useState(null);
  const [distance, setDistance] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const findNearestSpot = async () => {
      if (!currentLocation?.lat || !currentLocation?.lon) {
        setLoading(false);
        return;
      }

      try {
        const spots = await Spot.list();

        if (spots.length === 0) {
          setLoading(false);
          return;
        }

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

        if (nearest) {
          setNearestSpot(nearest);
          setDistance(minDistance);
        }
      } catch (error) {
        console.error("Fehler beim Laden der Spots:", error);
      } finally {
        setLoading(false);
      }
    };

    findNearestSpot();
  }, [currentLocation]);

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

  const formatDistance = (dist) => {
    if (dist < 1) {
      return `${Math.round(dist * 1000)}m`;
    }
    return `${dist.toFixed(1)}km`;
  };

  if (loading) {
    return (
      <div className="p-4 bg-gray-800/30 rounded-xl border border-gray-700/50">
        <div className="text-gray-400 text-center text-sm">Nächsten Spot suchen...</div>
      </div>
    );
  }

  if (!currentLocation) {
    return (
      <div className="p-4 bg-gray-800/30 rounded-xl border border-gray-700/50">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 text-cyan-400 text-sm mb-2 font-medium drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]">
            <Navigation className="w-4 h-4" />
            <span>Standort benötigt</span>
          </div>
          <div className="text-xs text-gray-500">
            GPS aktivieren für Spot-Empfehlung
          </div>
        </div>
      </div>
    );
  }

  if (!nearestSpot) {
    return (
      <div className="p-4 bg-gray-800/30 rounded-xl border border-gray-700/50">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 text-cyan-400 text-sm mb-2 font-medium drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]">
            <Fish className="w-4 h-4" />
            <span>Keine Spots gefunden</span>
          </div>
          <Link to={createPageUrl('Map')}>
            <Button size="sm" variant="outline" className="text-xs">
              Spots hinzufügen
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const spotName = String(nearestSpot.name || 'Unbenannter Spot');
  const spotNotes = String(nearestSpot.notes || '');

  return (
    <div className="p-4 bg-gray-800/30 rounded-xl border border-gray-700/50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-cyan-400 font-medium text-sm drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]">Nächster Spot</h3>
        <div className="flex items-center gap-1 text-xs text-emerald-400">
          <Navigation className="w-3 h-3" />
          <span>{formatDistance(distance)}</span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-start gap-3">
          <div className="text-lg">{getWaterTypeIcon(nearestSpot.water_type)}</div>
          <div className="flex-1 min-w-0">
            <h4 className="text-white font-medium text-sm truncate">
              {spotName}
            </h4>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <MapPin className="w-3 h-3" />
              <span className="capitalize">{String(nearestSpot.water_type || 'Unbekannt')}</span>
              {nearestSpot.depth_meters && (
                <>
                  <span>•</span>
                  <span>{nearestSpot.depth_meters}m tief</span>
                </>
              )}
            </div>
          </div>
        </div>

        {spotNotes && (
          <div className="text-xs text-gray-300 line-clamp-2">
            {spotNotes}
          </div>
        )}

        <Link to={createPageUrl(`Map?lat=${nearestSpot.latitude}&lon=${nearestSpot.longitude}`)}>
          <Button size="sm" className="w-full text-xs bg-cyan-600/70 hover:bg-cyan-700/80 border border-cyan-500/40 text-white rounded-lg">
            <ArrowRight className="w-3 h-3 mr-1" />
            Auf Karte zeigen
          </Button>
        </Link>
      </div>
    </div>
  );
}
