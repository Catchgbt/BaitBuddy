import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useLocation } from "@/components/location/LocationManager";
import { Map, MapPin, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

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

export default function MiniKarte() {
  const { currentLocation } = useLocation();
  const [nearbyCount, setNearbyCount] = useState(0);
  const [totalLocations, setTotalLocations] = useState(0);
  const [breakdown, setBreakdown] = useState({ spots: 0, clubs: 0, parks: 0 });

  useEffect(() => {
    const loadLocations = async () => {
      try {
        // Lade sowohl persönliche Spots als auch öffentliche Angelvereine/Parks
        const [spots, fishingClubs] = await Promise.all([
          base44.entities.Spot.list(),
          base44.entities.FishingClub.list()
        ]);

        // Zähle verschiedene Kategorien
        const clubCount = fishingClubs.filter(fc => fc.category === 'club').length;
        const parkCount = fishingClubs.filter(fc => fc.category === 'spot').length;
        
        setBreakdown({
          spots: spots.length,
          clubs: clubCount,
          parks: parkCount
        });

        const total = spots.length + fishingClubs.length;
        setTotalLocations(total);

        if (currentLocation?.lat && currentLocation?.lon) {
          let nearbySpots = 0;
          let nearbyClubs = 0;

          // Prüfe persönliche Spots in der Nähe
          spots.forEach(spot => {
            if (spot.latitude && spot.longitude) {
              const dist = calculateDistance(
                currentLocation.lat,
                currentLocation.lon,
                spot.latitude,
                spot.longitude
              );
              if (dist < 10) nearbySpots++;
            }
          });

          // Prüfe Angelvereine und Parks in der Nähe
          fishingClubs.forEach(club => {
            if (club.coordinates?.lat && club.coordinates?.lng) {
              const dist = calculateDistance(
                currentLocation.lat,
                currentLocation.lon,
                club.coordinates.lat,
                club.coordinates.lng
              );
              if (dist < 10) nearbyClubs++;
            }
          });

          setNearbyCount(nearbySpots + nearbyClubs);
        }
      } catch (error) {
        console.error("Fehler beim Laden der Locations:", error);
      }
    };

    loadLocations();
  }, [currentLocation]);

  return (
    <div className="p-4 bg-gray-800/30 rounded-xl border border-gray-700/50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-cyan-400 font-medium text-sm drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]">
          Angel-Karte
        </h3>
        <Map className="w-5 h-5 text-blue-400" />
      </div>
      
      <div className="space-y-3">
        {totalLocations > 0 ? (
          <>
            {/* Hauptanzeige */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <MapPin className="w-6 h-6 text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-2xl font-bold text-white">
                  {nearbyCount > 0 ? nearbyCount : totalLocations}
                </div>
                <div className="text-xs text-gray-400">
                  {nearbyCount > 0 ? 'Locations in der Nähe (10km)' : 'Locations gespeichert'}
                </div>
                {nearbyCount > 0 && (
                  <div className="text-xs text-blue-400 mt-1 flex items-center gap-1">
                    🎯 Jetzt entdecken!
                  </div>
                )}
              </div>
            </div>

            {/* Aufschlüsselung */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-700/50">
              <div className="text-center">
                <div className="text-sm font-bold text-emerald-400">{breakdown.spots}</div>
                <div className="text-[10px] text-gray-500">Meine Spots</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-bold text-cyan-400">{breakdown.clubs}</div>
                <div className="text-[10px] text-gray-500">Vereine</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-bold text-blue-400">{breakdown.parks}</div>
                <div className="text-[10px] text-gray-500">Angelparks</div>
              </div>
            </div>

            {/* Button zur Karte */}
            <Link to={createPageUrl('Map')}>
              <button className="w-full mt-2 px-3 py-2 bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/30 rounded-lg text-cyan-400 text-xs font-medium transition-all flex items-center justify-center gap-2">
                <Map className="w-3 h-3" />
                Zur Karte
              </button>
            </Link>
            <div className="text-[10px] text-center text-gray-500 mt-2">
              Tipp: Auf der Karte kannst du Routen zu Spots festlegen
            </div>
          </>
        ) : (
          <div className="text-center py-2">
            <div className="text-base font-semibold text-white mb-2">
              Entdecke Angelplätze! 🗺️
            </div>
            <div className="text-xs text-gray-400 mb-3">
              Finde Vereine, Angelparks und speichere deine eigenen Spots
            </div>
            <Link to={createPageUrl('Map')}>
              <button className="w-full px-3 py-2 bg-blue-600/70 hover:bg-blue-700/80 border border-blue-500/40 text-white rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-2">
                <Plus className="w-3 h-3" />
                Karte erkunden
              </button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}