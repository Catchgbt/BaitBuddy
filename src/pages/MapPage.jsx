import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Ruler } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "@/components/location/LocationManager";
import AddSpotModal from "@/components/map/v2/AddSpotModal";
import SpotDetailPanel from "@/components/map/SpotDetailPanel";
import { useFeatureTracking } from "@/hooks/useFeatureTracking";

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
      const response = await base44.functions.invoke('calculateTravelTime', {
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
      const userSpots = await base44.entities.Spot.list();
      setSpots(userSpots);

      try {
        const response = await base44.functions.invoke('angelspotsGeojson');
        
        if (response.data && response.data.features) {
          const locations = response.data.features.map(feature => ({
            id: feature.properties.id,
            name: feature.properties.name,
            category: feature.properties.category,
            coordinates: {
              lng: feature.geometry.coordinates[0],
              lat: feature.geometry.coordinates[1]
            },
            address: feature.properties.address,
            website: feature.properties.website,
            source: feature.properties.source
          }));
          
          setPublicLocations(locations);
          
          toast.success("Karte geladen", {
            description: `${userSpots.length} eigene Spots, ${locations.length} öffentliche Orte`,
            duration: 2000
          });
        } else {
          const clubs = await base44.entities.FishingClub.list();
          setPublicLocations(clubs);
          
          toast.success("Karte geladen", {
            description: `${userSpots.length} eigene Spots gefunden`,
            duration: 2000
          });
        }
      } catch (error) {
        console.warn("Öffentliche Locations konnten nicht geladen werden:", error);
        setPublicLocations([]);
        
        toast.success("Karte geladen", {
          description: `${userSpots.length} eigene Spots gefunden`,
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
      await base44.entities.Spot.create(spotData);
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
    <div className="min-h-screen bg-gray-950 pb-32">
      <div className="max-w-7xl mx-auto p-4 space-y-4">
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.8)]">
              Karte & Spots
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Klicke auf die Karte, um einen neuen Spot hinzuzufügen
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="glass-morphism border-gray-800">
            <CardContent className="p-4">
              <div className="text-xs text-gray-400 mb-2">KARTENFUNKTIONEN</div>
              <div className="space-y-2 text-sm text-gray-300">
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-1.5"></div>
                  <span>Rote Marker = Deine Spots</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-1.5"></div>
                  <span>Grüne Marker = Angelvereine & Parks</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5"></div>
                  <span>Blauer Marker = Dein Standort</span>
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  💡 Klicke auf Marker für Details & Fahrzeit
                </div>
                <div className="text-xs text-cyan-400 mt-2 font-semibold">
                  📍 Klicke auf die Karte zum Hinzufügen
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-morphism border-gray-800">
            <CardContent className="p-4">
              <div className="text-xs text-gray-400 mb-2">ÜBERSICHT</div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">Deine Spots:</span>
                  <span className="text-cyan-400 font-semibold">{spots.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">Öffentliche Orte:</span>
                  <span className="text-green-400 font-semibold">{publicLocations.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {nearestSpot && travelInfo && (
            <Card className="glass-morphism border-cyan-800 bg-cyan-900/10">
              <CardContent className="p-4">
                <div className="text-xs text-cyan-400 mb-2">NÄCHSTER SPOT</div>
                <div className="space-y-2">
                  <div className="text-sm font-semibold text-white truncate">
                    {nearestSpot.name}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-300">
                    <div className="flex items-center gap-1">
                      <Ruler className="w-3 h-3" />
                      <span>{travelInfo.distance_km?.toFixed(1)} km</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{travelInfo.duration_min} Min</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="h-[600px] rounded-2xl overflow-hidden border-2 border-gray-800 shadow-2xl">
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

            {spots.map((spot) => (
              <Marker
                key={spot.id}
                position={[spot.latitude, spot.longitude]}
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
              if (!coords.lat || !coords.lng) return null;
              
              return (
                <Marker
                  key={location.id}
                  position={[coords.lat, coords.lng]}
                  icon={greenIcon}
                  eventHandlers={{
                    click: () => setSelectedLocation({ ...location, type: location.category || 'club' })
                  }}
                >
                  <Popup>
                    <div className="min-w-[200px]">
                      <div className="font-semibold text-base mb-1">{location.name}</div>
                      <div className="text-sm text-gray-600">
                        {location.category === 'club' ? 'Angelverein' : 'Angelpark'}
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
    </div>
  );
}