import React, { useState, useEffect } from "react";
import { functions } from "@/api/frontendClient";
import { entities } from "@/api/frontendClient";
import { Spot } from "@/entities/Spot";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Ruler } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "@/components/location/LocationManager";
import AddSpotModal from "@/components/map/v2/AddSpotModal";
import SpotDetailPanel from "@/components/map/SpotDetailPanel";
import { useFeatureTracking } from "@/hooks/useFeatureTracking";
import NewFeaturesNotification from "@/components/map/NewFeaturesNotification";
import MapFeaturesInfo from "@/components/map/MapFeaturesInfo";
import MapLayerControls from "@/components/map/v2/MapLayerControls";
import HillshadeLayer from "@/components/map/v2/HillshadeLayer";
import Terrain3DLayer from "@/components/map/v2/Terrain3DLayer";
import HydrographicAnalysis from "@/components/map/v2/HydrographicAnalysis";
import SatelliteOverlayLayer from "@/components/map/v2/SatelliteOverlayLayer";
import AdvancedCacheManager from "@/components/map/v2/AdvancedCacheManager";
import MapNavigationHub from "@/components/map/MapNavigationHub";
import MapModeManager from "@/components/map/MapModeManager";

// Leaflet CSS laden
if (typeof document !== "undefined") {
  const existingLink = document.querySelector('link[data-leaflet]');
  if (!existingLink) {
    const link = document.createElement("link");
    link.setAttribute("data-leaflet", "1");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);
  }
}

// Standard Leaflet Icons - Fix für className
const createIcon = (iconUrl, shadowUrl) => {
  return L.icon({
    iconUrl,
    shadowUrl,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
    className: '' // Leerer String statt undefined
  });
};

const defaultIcon = createIcon(
  "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png"
);

const userIcon = createIcon(
  "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png"
);

const greenIcon = createIcon(
  "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png"
);

function MapController({ center, zoom }) {
  const map = useMap();
  
  useEffect(() => {
    if (center) {
      map.setView(center, zoom || 13);
    }
  }, [center, zoom, map]);
  
  return null;
}

function MapClickHandler({ onMapClick }) {
  const map = useMap();
  
  useEffect(() => {
    const handleClick = (e) => {
      onMapClick(e.latlng);
    };
    
    map.on('click', handleClick);
    
    return () => {
      map.off('click', handleClick);
    };
  }, [map, onMapClick]);
  
  return null;
}

export default function MapPage() {
  useFeatureTracking("map");
  const { currentLocation, gpsLocation, requestGpsLocation } = useLocation();
  const [spots, setSpots] = useState([]);
  const [publicLocations, setPublicLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [clickedCoords, setClickedCoords] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [mapCenter, setMapCenter] = useState([51.1657, 10.4515]);
  const [mapZoom, setMapZoom] = useState(6);
  const [nearestSpot, setNearestSpot] = useState(null);
  const [travelInfo, setTravelInfo] = useState(null);
  const [showHillshade, setShowHillshade] = useState(false);
  const [show3DTerrain, setShow3DTerrain] = useState(false);
  const [showHydrographic, setShowHydrographic] = useState(false);
  const [showSatellite, setShowSatellite] = useState(false);
  const [mapMode, setMapMode] = useState(() => {
    return localStorage.getItem('mapMode') || 'guided';
  });
  const [isFirstTime, setIsFirstTime] = useState(() => {
    return !localStorage.getItem('mapTourCompleted');
  });

  useEffect(() => {
    loadMapData();
  }, []);

  useEffect(() => {
    if (gpsLocation) {
      setMapCenter([gpsLocation.lat, gpsLocation.lon]);
      setMapZoom(13);
      findNearestSpot();
    } else if (currentLocation) {
      setMapCenter([currentLocation.lat, currentLocation.lon]);
      setMapZoom(13);
    }
  }, [gpsLocation, currentLocation, spots]);

  const findNearestSpot = async () => {
    if (!gpsLocation || spots.length === 0) return;

    let nearest = null;
    let minDistance = Infinity;

    spots.forEach(spot => {
      const distance = calculateDistance(
        gpsLocation.lat,
        gpsLocation.lon,
        spot.latitude,
        spot.longitude
      );
      if (distance < minDistance) {
        minDistance = distance;
        nearest = spot;
      }
    });

    if (nearest) {
      setNearestSpot(nearest);
      calculateTravelTime(nearest);
    }
  };

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

  const calculateTravelTime = async (spot) => {
    if (!gpsLocation) return;

    try {
      const response = await functions.invoke('calculateTravelTime', {
        fromLat: gpsLocation.lat,
        fromLon: gpsLocation.lon,
        toLat: spot.latitude,
        toLon: spot.longitude
      });

      if (response.data) {
        setTravelInfo(response.data);
      }
    } catch (error) {
      console.error('Fehler bei Fahrzeitberechnung:', error);
    }
  };

  const loadMapData = async () => {
    setLoading(true);
    try {
      const userSpots = await Spot.list();
      const safeUserSpots = Array.isArray(userSpots) ? userSpots : [];
      setSpots(safeUserSpots);

      try {
        const response = await functions.invoke('angelspotsGeojson');

        // Der Backend-Endpunkt /api/fishing/hotspots liefert
        // { hotspots: [{ id, name, latitude, longitude, water_type }] }.
        // Zusätzlich unterstützen wir echtes GeoJSON ({ features: [...] }),
        // falls die Datenquelle später wechselt.
        let locations = [];

        if (Array.isArray(response?.features)) {
          locations = response.features
            .filter(f => f?.geometry?.coordinates?.length >= 2)
            .map(feature => ({
              id: feature.properties?.id,
              name: feature.properties?.name,
              category: feature.properties?.category,
              coordinates: {
                lng: feature.geometry.coordinates[0],
                lat: feature.geometry.coordinates[1]
              },
              address: feature.properties?.address,
              website: feature.properties?.website,
              source: feature.properties?.source
            }));
        } else if (Array.isArray(response?.hotspots)) {
          locations = response.hotspots
            .filter(h => h.latitude != null && h.longitude != null)
            .map(h => ({
              id: h.id,
              name: h.name,
              category: h.category || 'spot',
              water_type: h.water_type,
              coordinates: {
                lat: Number(h.latitude),
                lng: Number(h.longitude)
              }
            }));
        }

        // Fallback: Wenn keine öffentlichen Orte geliefert wurden, lade
        // Angelvereine & Parks über die FishingClub-Entität.
        if (locations.length === 0) {
          try {
            const clubs = await entities.FishingClub.list() || [];
            locations = clubs
              .filter(club => (club.latitude ?? club.lat) != null && (club.longitude ?? club.lon) != null)
              .map(club => ({
                id: club.id,
                name: club.name || club.club_name,
                category: 'club',
                coordinates: {
                  lat: Number(club.latitude ?? club.lat),
                  lng: Number(club.longitude ?? club.lon)
                },
                address: { city: club.city || club.location },
                website: club.website
              }));
          } catch (clubError) {
            console.warn("FishingClub konnte nicht geladen werden:", clubError);
          }
        }

        setPublicLocations(locations);

        toast.success("Karte geladen", {
          description: `${safeUserSpots.length} eigene Spots${locations.length > 0 ? `, ${locations.length} Angelvereine & Parks` : ''}`,
          duration: 2000
        });
      } catch (error) {
        console.error("Fehler beim Laden öffentlicher Locations:", error);
        setPublicLocations([]);

        toast.success("Karte geladen", {
          description: `${safeUserSpots.length} eigene Spots gefunden`,
          duration: 2000
        });
      }
    } catch (error) {
      console.error("Fehler beim Laden der Karten-Daten:", error);
      toast.error("Fehler beim Laden der Spots");
      setSpots([]);
      setPublicLocations([]);
    }
    setLoading(false);
  };

  const handleMapClick = (latlng) => {
    setClickedCoords({ lat: latlng.lat, lng: latlng.lng });
    setShowAddModal(true);
  };

  const handleAddSpot = async (spotData) => {
    try {
      await Spot.create(spotData);
      toast.success("Spot hinzugefügt!");
      await loadMapData();
      setShowAddModal(false);
      setClickedCoords(null);
    } catch (error) {
      console.error("Fehler beim Hinzufügen des Spots:", error);
      toast.error("Fehler beim Speichern des Spots");
    }
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setClickedCoords(null);
  };

  const handleModeChange = (newMode) => {
    setMapMode(newMode);
    localStorage.setItem('mapMode', newMode);
    toast.success(`Modus gewechselt zu ${newMode === 'guided' ? 'Geführt' : newMode === 'simple' ? 'Einfach' : 'Erweitert'}`);
  };

  const handleFeatureSelect = (featureId) => {
    // Feature-Aktivierung basierend auf auswahl
    switch(featureId) {
      case 'relief-shading':
        setShowHillshade(!showHillshade);
        toast.success(showHillshade ? 'Relief-Shading deaktiviert' : 'Relief-Shading aktiviert');
        break;
      case '3d-terrain':
        setShow3DTerrain(!show3DTerrain);
        toast.success(show3DTerrain ? '3D-Terrain deaktiviert' : '3D-Terrain aktiviert');
        break;
      case 'satellite':
        setShowSatellite(!showSatellite);
        toast.success(showSatellite ? 'Satelliten-Bilder deaktiviert' : 'Satelliten-Bilder aktiviert');
        break;
      case 'hydrographic':
        setShowHydrographic(!showHydrographic);
        toast.success(showHydrographic ? 'Hydrographische Daten deaktiviert' : 'Hydrographische Daten aktiviert');
        break;
      default:
        toast.info(`Feature "${featureId}" wurde selektiert`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
          <div className="text-cyan-400">Lade Karten-Daten...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-950 pb-32 overflow-y-auto">
      {/* Mode Manager & Guided Tour */}
      <MapModeManager
        mapMode={mapMode}
        onModeChange={handleModeChange}
        isFirstTime={isFirstTime}
        onTourComplete={() => setIsFirstTime(false)}
      />

      <div className="max-w-7xl mx-auto p-4 space-y-4 min-h-screen">
        {/* Removed: NewFeaturesNotification - Alle Infos sind jetzt im MapNavigationHub */}
        {/* Removed: MapFeaturesInfo - Integriert in MapNavigationHub */}

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.8)]">
            🗺️ Karte & Spots — Komplett mit 6 Advanced Features
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            🎣 Klicke unten rechts auf den 🟦 Hub um alle neuen Features zu entdecken
          </p>
        </div>

        {/* Simplified Info Cards - nur essenzielle Infos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card className="glass-morphism border-cyan-700 bg-cyan-900/20">
            <CardContent className="p-4">
              <div className="text-xs text-cyan-400 mb-2 font-semibold">✨ NEU: 6 ADVANCED FEATURES</div>
              <div className="space-y-1 text-xs text-cyan-200">
                <div>✅ Offline Tile-Caching (Phase 1)</div>
                <div>✅ Relief-Shading (Phase 2)</div>
                <div>✅ 3D-Terrain (Phase 3)</div>
                <div>✅ Hydrographische Daten (Phase 4)</div>
                <div>✅ Satelliten-Bilder (Phase 5)</div>
                <div>✅ Cache-Optimierung (Phase 6)</div>
              </div>
              <div className="text-xs text-cyan-600 mt-2 italic">
                → Klick den Hub rechts unten um Features zu aktivieren
              </div>
            </CardContent>
          </Card>

          <Card className="glass-morphism border-gray-800">
            <CardContent className="p-4">
              <div className="text-xs text-gray-400 mb-2">DEINE SPOTS & ORTE</div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">📍 Deine Spots:</span>
                  <span className="text-cyan-400 font-semibold">{spots.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">🏛️ Angelvereine & Parks:</span>
                  <span className="text-green-400 font-semibold">{publicLocations.length}</span>
                </div>
                {nearestSpot && travelInfo && (
                  <>
                    <div className="border-t border-gray-700 pt-2 mt-2">
                      <div className="text-xs text-gray-500 mb-1">🎯 Nächster Spot:</div>
                      <div className="font-semibold text-white text-sm">{nearestSpot.name}</div>
                      <div className="flex gap-2 text-xs text-gray-400 mt-1">
                        <span>📏 {travelInfo.distance_km?.toFixed(1)} km</span>
                        <span>⏱️ {travelInfo.duration_min} min</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="h-[600px] rounded-2xl overflow-hidden border-2 border-gray-800 shadow-2xl relative z-10">
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            style={{ height: '100%', width: '100%' }}
            zoomControl={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Advanced Map Layers */}
            <HillshadeLayer visible={showHillshade} opacity={0.4} blendMode="multiply" />
            <Terrain3DLayer visible={show3DTerrain} mode="canvas" />
            <HydrographicAnalysis
              visible={showHydrographic}
              bounds={mapCenter ? L.latLngBounds([[mapCenter[0] - 0.5, mapCenter[1] - 0.5], [mapCenter[0] + 0.5, mapCenter[1] + 0.5]]) : null}
            />
            <SatelliteOverlayLayer visible={showSatellite} opacity={0.6} />

            {/* Layer Controls */}
            <MapLayerControls
              showHillshade={showHillshade}
              show3DTerrain={show3DTerrain}
              showHydrographic={showHydrographic}
              showSatellite={showSatellite}
              onHillshadeToggle={setShowHillshade}
              on3DTerrainToggle={setShow3DTerrain}
              onHydrographicToggle={setShowHydrographic}
              onSatelliteToggle={setShowSatellite}
              hillshadeEnabled={showHillshade}
              terrain3DEnabled={show3DTerrain}
              hydrographicEnabled={showHydrographic}
              satelliteEnabled={showSatellite}
            />

            {/* Advanced Cache Manager */}
            <AdvancedCacheManager visible={true} />

            <MapController center={mapCenter} zoom={mapZoom} />
            <MapClickHandler onMapClick={handleMapClick} />

            {gpsLocation && (
              <Marker
                position={[gpsLocation.lat, gpsLocation.lon]}
                icon={userIcon}
              >
                <Popup>
                  <div className="text-center">
                    <div className="font-semibold">Dein Standort</div>
                    <div className="text-xs text-gray-600">
                      {gpsLocation.lat.toFixed(4)}, {gpsLocation.lon.toFixed(4)}
                    </div>
                  </div>
                </Popup>
              </Marker>
            )}

            {spots.filter(spot => spot.latitude != null && spot.longitude != null).map((spot) => (
              <Marker
                key={spot.id}
                position={[Number(spot.latitude), Number(spot.longitude)]}
                icon={defaultIcon}
                eventHandlers={{
                  click: () => setSelectedLocation({ ...spot, type: 'spot' })
                }}
              >
                <Popup>
                  <div className="min-w-[200px]">
                    <div className="font-semibold text-base mb-1">{spot.name}</div>
                    <div className="text-sm text-gray-600">
                      {spot.water_type && `${spot.water_type.charAt(0).toUpperCase() + spot.water_type.slice(1)}`}
                    </div>
                    {spot.depth_meters && (
                      <div className="text-xs text-gray-500 mt-1">
                        Tiefe: ~{spot.depth_meters}m
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}

            {publicLocations.map((location) => {
              const coords = location.coordinates || {};
              if (coords.lat == null || coords.lng == null) return null;

              const categoryLabel =
                location.category === 'club' ? 'Angelverein'
                : location.category === 'spot' ? (location.water_type ? location.water_type.charAt(0).toUpperCase() + location.water_type.slice(1) : 'Angelspot')
                : 'Angelpark';

              return (
                <Marker
                  key={location.id}
                  position={[Number(coords.lat), Number(coords.lng)]}
                  icon={greenIcon}
                  eventHandlers={{
                    click: () => setSelectedLocation({ ...location, type: location.category || 'club' })
                  }}
                >
                  <Popup>
                    <div className="min-w-[200px]">
                      <div className="font-semibold text-base mb-1">{location.name}</div>
                      <div className="text-sm text-gray-600">
                        {categoryLabel}
                      </div>
                      {location.address && (
                        <div className="text-xs text-gray-500 mt-1">
                          {location.address.city}
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>
      </div>

      {showAddModal && (
        <AddSpotModal
          isOpen={showAddModal}
          onClose={handleCloseModal}
          onSave={handleAddSpot}
          initialCoords={clickedCoords}
        />
      )}

      {selectedLocation && (
        <SpotDetailPanel
          spot={selectedLocation}
          onClose={() => setSelectedLocation(null)}
          onUpdate={loadMapData}
        />
      )}

      {/* Map Navigation Hub - Zentrale Steuerstelle */}
      <MapNavigationHub
        onFeatureSelect={handleFeatureSelect}
        onModeChange={handleModeChange}
        currentMode={mapMode}
      />
    </div>
  );
}