import React from "react";
import { MapContainer, Marker, Popup, Polyline, Polygon, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { entities } from "@/api/frontendClient";
import OfflineMapLayer from "./OfflineMapLayer";
import OfflineMapManager from "./OfflineMapManager";
import HillshadeLayer from "./HillshadeLayer";
import Terrain3DLayer from "./Terrain3DLayer";
import HydrographicAnalysis from "./HydrographicAnalysis";
import SatelliteOverlayLayer from "./SatelliteOverlayLayer";
import AdvancedCacheManager from "./AdvancedCacheManager";
import "leaflet.markercluster";

// Fix default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const createCustomIcon = (color, emoji, size = 32) => {
  const svgString = `
    <svg width="${size}" height="${size}" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="14" fill="${color}" opacity="0.95" stroke="white" stroke-width="2"/>
      <circle cx="16" cy="16" r="12" fill="${color}" opacity="0.3"/>
      <text x="16" y="20" text-anchor="middle" font-size="18" dominant-baseline="middle">${emoji}</text>
    </svg>
  `;
  const svgUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
  return L.icon({
    iconUrl: svgUrl,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2 + 10]
  });
};

const spotIcon = createCustomIcon("#3b82f6", "📍");
const clubIcon = createCustomIcon("#10b981", "🏛️");
const angelshopIcon = createCustomIcon("#eab308", "🛒", 28);
const angelParkEuIcon = createCustomIcon("#ea580c", "🌍", 28);
const locationIcon = createCustomIcon("#ef4444", "📌");
const newSpotIcon = createCustomIcon("#f59e0b", "⭐");
const tiefenkartenIcon = createCustomIcon("#a855f7", "🗻", 36);
const forellenIcon = createCustomIcon("#ec4899", "🎣", 32);
const bathymetrieIcon = createCustomIcon("#0ea5e9", "🌊", 34);
const flussIcon = createCustomIcon("#06b6d4", "🏞️", 34);

function MapEvents({ onMapClick }) {
  useMapEvents({
    click: (e) => {
      onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
    }
  });
  return null;
}

function RecenterMap({ center }) {
  const map = useMap();
  
  React.useEffect(() => {
    if (center) {
      map.setView([center.lat, center.lng], map.getZoom());
    }
  }, [center, map]);

  return null;
}

function ReviewsMarkerLoader({ onReviewsLoad }) {
  const map = useMap();
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    const loadReviews = async () => {
      if (isLoading) return;
      
      setIsLoading(true);
      try {
        const reviews = await entities.WaterReview.list('-reviewed_at', 500);
        onReviewsLoad(reviews);
      } catch (error) {
        console.error('Error loading reviews:', error);
      }
      setIsLoading(false);
    };

    const handleMoveEnd = () => {
      loadReviews();
    };

    map.on('moveend', handleMoveEnd);
    handleMoveEnd();

    return () => {
      map.off('moveend', handleMoveEnd);
    };
  }, [map, onReviewsLoad]);

  return null;
}

function WaterBodiesLoader({ onWaterBodiesLoad }) {
  const map = useMap();
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    const loadWaterBodies = async () => {
      if (isLoading) return;
      
      const bounds = map.getBounds();
      const payload = {
        bounds: {
          north: bounds.getNorth(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          west: bounds.getWest()
        }
      };

      setIsLoading(true);
      try {
        const { loadWaterBodies } = await import('@/functions/loadWaterBodies');
        const response = await loadWaterBodies(payload);
        if (response.data?.features) {
          onWaterBodiesLoad(response.data.features);
        }
      } catch (error) {
        console.error('Error loading water bodies:', error);
      }
      setIsLoading(false);
    };

    const handleMoveEnd = () => {
      const zoom = map.getZoom();
      if (zoom >= 11) {
        loadWaterBodies();
      } else {
        onWaterBodiesLoad([]);
      }
    };

    map.on('moveend', handleMoveEnd);
    handleMoveEnd();

    return () => {
      map.off('moveend', handleMoveEnd);
    };
  }, [map, onWaterBodiesLoad]);

  return null;
}

export default function MapView({
  center,
  zoom,
  spots,
  fishingClubs,
  angelshops = [],
  angelparksEu = [],
  waterBodies = [],
  tiefenkarten = [],
  forellenseen = [],
  bathymetrie = [],
  fluesse = [],
  currentLocation,
  newSpotMarker,
  onMapClick,
  onLocationClick,
  onSpotClick,
  onClubClick,
  onAngelshopClick,
  onAngelParkEuClick,
  onWaterBodiesLoad,
  onReviewsLoad,
  isOnline,
  showHillshade = false,
  show3DTerrain = false,
  showHydrographic = false,
  showSatellite = false
}) {
  if (!center) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-900">
        <div className="text-cyan-400">Karte wird geladen...</div>
      </div>
    );
  }

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={zoom}
      style={{ width: "100%", height: "100%" }}
      className="rounded-2xl"
      role="region"
      aria-label="Interactive fishing map showing user spots, fishing clubs, and water bodies. Click locations to view details or add new spots."
    >
      <OfflineMapLayer isOnline={isOnline} />

      {/* Advanced Map Layers */}
      <HillshadeLayer visible={showHillshade} opacity={0.4} blendMode="multiply" />
      <Terrain3DLayer visible={show3DTerrain} mode="canvas" />
      <HydrographicAnalysis visible={showHydrographic} bounds={center ? L.latLngBounds([[center.lat - 0.5, center.lng - 0.5], [center.lat + 0.5, center.lng + 0.5]]) : null} />
      <SatelliteOverlayLayer visible={showSatellite} opacity={0.6} />

      <MapEvents onMapClick={onMapClick} />
      <RecenterMap center={center} />
      {onReviewsLoad && <ReviewsMarkerLoader onReviewsLoad={onReviewsLoad} />}
      {onWaterBodiesLoad && <WaterBodiesLoader onWaterBodiesLoad={onWaterBodiesLoad} />}

      {/* Water Bodies */}
      {waterBodies.map((feature, idx) => {
        const { geometry, properties } = feature;
        const isRiver = properties.typ === 'river' || properties.typ === 'canal';
        
        if (isRiver && geometry.type === 'LineString') {
          return (
            <Polyline
              key={`water_${idx}`}
              positions={geometry.coordinates.map(c => [c[1], c[0]])}
              color="#3b82f6"
              weight={3}
              opacity={0.6}
            >
              <Popup>
                <div className="text-sm">
                  <strong>{properties.name}</strong>
                  <p className="text-xs text-gray-600 mt-1">
                    {properties.typ === 'river' ? 'Fluss' : 'Kanal'}
                  </p>
                </div>
              </Popup>
            </Polyline>
          );
        } else if (geometry.type === 'Polygon') {
          return (
            <Polygon
              key={`water_${idx}`}
              positions={geometry.coordinates[0].map(c => [c[1], c[0]])}
              color="#3b82f6"
              fillColor="#3b82f6"
              fillOpacity={0.3}
              weight={2}
            >
              <Popup>
                <div className="text-sm">
                  <strong>{properties.name}</strong>
                  <p className="text-xs text-gray-600 mt-1">
                    {properties.typ === 'lake' ? 'See' : properties.typ === 'reservoir' ? 'Stausee' : 'Gewässer'}
                  </p>
                </div>
              </Popup>
            </Polygon>
          );
        }
        return null;
      })}

      {/* Current Location */}
      {currentLocation && currentLocation.lat != null && currentLocation.lon != null && (
        <Marker
          position={[currentLocation.lat, currentLocation.lon]}
          icon={locationIcon}
          alt="Your current location on the map"
          aria-label="Current user location marker"
        >
          <Popup>
            <div className="text-sm">
              <strong>Mein Standort</strong>
              <p className="text-xs text-gray-600 mt-1">
                {currentLocation.name || "Aktueller Standort"}
              </p>
            </div>
          </Popup>
        </Marker>
      )}

      {/* Review Markers with Stars */}
      {onReviewsLoad && ((() => {
        const reviewsBySpot = {};
        return (
          <>
            {Object.entries(reviewsBySpot).map(([spotId, reviews]) => {
              const review = reviews[0];
              const avgRating = (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1);

              return (
                <Marker
                  key={`review_${spotId}`}
                  position={[review.latitude, review.longitude]}
                  icon={new L.DivIcon({
                    html: `<div style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;background:#fbbf24;border-radius:50%;font-size:14px;font-weight:bold;color:#000;box-shadow:0 2px 4px rgba(0,0,0,0.3);">*</div>`,
                    iconSize: [32, 32],
                    className: 'review-marker'
                  })}
                  eventHandlers={{
                    click: () => onSpotClick && onSpotClick(review)
                  }}
                >
                  <Popup>
                    <div className="text-sm">
                      <strong>{review.spot_name}</strong>
                      <p className="text-xs text-gray-600 mt-1">
                        Bewertung: {avgRating} * ({reviews.length})
                      </p>
                      {review.comment && (
                        <p className="text-xs text-gray-600 mt-1">{review.comment}</p>
                      )}
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </>
        );
      })())}

      {/* User Spots */}
      {spots.filter(spot => spot.latitude != null && spot.longitude != null).map((spot) => (
        <Marker
          key={spot.id}
          position={[spot.latitude, spot.longitude]}
          icon={spotIcon}
          eventHandlers={{
            click: () => onSpotClick(spot)
          }}
          alt={`Fishing spot: ${spot.name} on ${spot.water_type}. ${spot.notes || 'No additional notes'}`}
          aria-label={`Spot marker for ${spot.name}`}
        >
          <Popup>
            <div className="text-sm max-w-xs">
              <strong className="text-base text-cyan-400">{spot.name}</strong>
              <p className="text-xs text-gray-400 mt-1">
                {spot.water_type} {spot.distance_km && `• ${spot.distance_km.toFixed(1)} km`}
              </p>
              {spot.notes && <p className="text-xs text-gray-300 mt-2">{spot.notes}</p>}
              <div className="flex gap-1 mt-2 flex-wrap text-xs">
                {spot.fish_species && spot.fish_species.split(',').slice(0, 3).map((fish, i) => (
                  <span key={i} className="bg-blue-900/40 text-blue-300 px-2 py-0.5 rounded">
                    {fish.trim()}
                  </span>
                ))}
              </div>
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Fishing Clubs/Parks */}
      {fishingClubs.filter(club => club.coordinates && club.coordinates.lat != null && club.coordinates.lng != null).map((club) => (
        <Marker
          key={club.id}
          position={[club.coordinates.lat, club.coordinates.lng]}
          icon={clubIcon}
          eventHandlers={{
            click: () => onClubClick(club)
          }}
          alt={`${club.category === 'club' ? 'Fishing club' : 'Fishing park'}: ${club.name} in ${club.address?.city || 'location unknown'}`}
          aria-label={`${club.category === 'club' ? 'Club' : 'Park'} marker for ${club.name}`}
        >
          <Popup>
            <div className="text-sm max-w-xs">
              <strong className="text-base text-emerald-400">{club.name}</strong>
              <p className="text-xs text-gray-400 mt-1">
                {club.category === 'club' ? '🏛️ Angelverein' : (club.typ ? `🎣 ${club.typ}` : '🎣 Angelpark')}
              </p>
              {club.address && (
                <p className="text-xs text-gray-400 mt-1">
                  📍 {club.address.city}
                </p>
              )}
              {Array.isArray(club.fische) && club.fische.length > 0 && (
                <div className="flex gap-1 mt-2 flex-wrap">
                  {club.fische.slice(0, 4).map((fish, i) => (
                    <span key={i} className="text-xs bg-emerald-900/40 text-emerald-300 px-1.5 py-0.5 rounded">
                      {fish}
                    </span>
                  ))}
                  {club.fische.length > 4 && <span className="text-xs text-gray-400">+{club.fische.length - 4}</span>}
                </div>
              )}
              {club.website && (
                <a
                  href={club.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-cyan-400 underline mt-2 inline-block hover:text-cyan-300"
                >
                  🌐 Website
                </a>
              )}
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Angelshops */}
      {angelshops.filter(shop => shop.coordinates && shop.coordinates.lat != null && shop.coordinates.lng != null).map((shop) => (
        <Marker
          key={shop.id}
          position={[shop.coordinates.lat, shop.coordinates.lng]}
          icon={angelshopIcon}
          eventHandlers={{
            click: () => onAngelshopClick && onAngelshopClick(shop)
          }}
          alt={`Fishing shop: ${shop.name} in ${shop.city}`}
          aria-label={`Shop marker for ${shop.name}`}
        >
          <Popup>
            <div className="text-sm max-w-xs">
              <strong className="text-base text-yellow-400">{shop.name}</strong>
              <p className="text-xs text-gray-400 mt-1">
                🛒 Angelshop
              </p>
              <p className="text-xs text-gray-400 mt-1">
                📍 {shop.city}
              </p>
              {shop.street && (
                <p className="text-xs text-gray-400 mt-1">
                  📮 {shop.street}
                </p>
              )}
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Europäische Angelparks */}
      {angelparksEu.filter(park => park.coordinates && park.coordinates.lat != null && park.coordinates.lng != null).map((park) => (
        <Marker
          key={park.id}
          position={[park.coordinates.lat, park.coordinates.lng]}
          icon={angelParkEuIcon}
          eventHandlers={{
            click: () => onAngelParkEuClick && onAngelParkEuClick(park)
          }}
          alt={`Fishing park: ${park.name} in ${park.country}`}
          aria-label={`Park marker for ${park.name}`}
        >
          <Popup>
            <div className="text-sm max-w-xs">
              <strong className="text-base text-orange-400">{park.name}</strong>
              <p className="text-xs text-gray-400 mt-1">
                🌍 {park.type || 'Angelpark'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                📍 {park.country}
              </p>
              {park.address && (
                <p className="text-xs text-gray-400 mt-1">
                  📮 {park.address}
                </p>
              )}
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Deutsche Flüsse */}
      {fluesse.map((fluss) => (
        <Marker
          key={fluss.id}
          position={[fluss.koordinaten.lat, fluss.koordinaten.lng]}
          icon={flussIcon}
          eventHandlers={{
            click: () => onLocationClick && onLocationClick(fluss, 'fluss')
          }}
          alt={`Fluss: ${fluss.name}`}
          aria-label={`${fluss.name} Angelgewässer`}
        >
          <Popup>
            <div className="text-sm max-w-xs">
              <strong className="text-base text-cyan-300">🏞️ {fluss.name}</strong>
              <p className="text-xs text-gray-400 mt-1">
                📏 {fluss.laenge_km} km • {fluss.verlauf}
              </p>
              <p className="text-xs text-gray-300 mt-2">
                <strong>🎣 Fischarten:</strong><br/>
                {fluss.fischarten}
              </p>
              <p className="text-xs text-gray-300 mt-1">
                <strong>📍 Angelplätze:</strong><br/>
                {fluss.angelgewaesser}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Schwierigkeit: {fluss.schwierigkeit}
              </p>
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Bathymetrie Bundesländer */}
      {bathymetrie.map((bd) => (
        <Marker
          key={bd.name}
          position={[bd.bounds.lat_min + (bd.bounds.lat_max - bd.bounds.lat_min) / 2,
                     bd.bounds.lon_min + (bd.bounds.lon_max - bd.bounds.lon_min) / 2]}
          icon={bathymetrieIcon}
          eventHandlers={{
            click: () => onLocationClick && onLocationClick(bd, 'bathymetrie')
          }}
          alt={`Bathymetrie: ${bd.name}`}
          aria-label={`Bathymetrie für ${bd.name}`}
        >
          <Popup>
            <div className="text-sm max-w-xs">
              <strong className="text-base text-cyan-400">🌊 {bd.name}</strong>
              <p className="text-xs text-gray-400 mt-1">
                Bathymetrie (Tiefenkarte)
              </p>
              <p className="text-xs text-gray-300 mt-2">
                📊 GEBCO 2026 Daten<br/>
                📏 ~500m Auflösung<br/>
                🗺️ Bounding Box verfügbar
              </p>
              <p className="text-xs text-gray-500 mt-2">
                <em>Daten verfügbar sobald GeoTIFF heruntergeladen</em>
              </p>
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Forellenseen */}
      {forellenseen.map((fs) => (
        <Marker
          key={fs.id}
          position={[fs.lat, fs.lng]}
          icon={forellenIcon}
          eventHandlers={{
            click: () => onLocationClick && onLocationClick(fs, 'forellensee')
          }}
          alt={`Forellensee: ${fs.name}`}
          aria-label={`Forellensee ${fs.name}`}
        >
          <Popup>
            <div className="text-sm max-w-xs">
              <strong className="text-base text-pink-400">{fs.name}</strong>
              <p className="text-xs text-gray-400 mt-1">
                🌍 {fs.land} • {fs.region}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                🎣 {fs.forellenarten}
              </p>
              {fs.bemerkungen && (
                <p className="text-xs text-gray-300 mt-1">
                  💡 {fs.bemerkungen}
                </p>
              )}
              {fs.website && (
                <a
                  href={`https://${fs.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-pink-400 underline mt-2 inline-block hover:text-pink-300"
                >
                  🌐 Website
                </a>
              )}
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Tiefenkarten */}
      {tiefenkarten.map((tk) => (
        <Marker
          key={tk.id}
          position={[tk.koordinaten.lat, tk.koordinaten.lng]}
          icon={tiefenkartenIcon}
          eventHandlers={{
            click: () => window.open(tk.url, '_blank')
          }}
          alt={`Tiefenkarte: ${tk.name}`}
          aria-label={`Tiefenkarte für ${tk.fluss}`}
        >
          <Popup>
            <div className="text-sm max-w-xs">
              <strong className="text-base text-violet-400">{tk.name}</strong>
              <p className="text-xs text-gray-400 mt-1">
                📍 {tk.region}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {tk.beschreibung}
              </p>
              <a
                href={tk.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-violet-400 underline mt-2 inline-block hover:text-violet-300"
              >
                📄 PDF öffnen
              </a>
            </div>
          </Popup>
        </Marker>
      ))}

      {/* New Spot Marker (temporary) */}
      {newSpotMarker && (
        <Marker
          position={[newSpotMarker.lat, newSpotMarker.lng]}
          icon={newSpotIcon}
        >
          <Popup>
            <div className="text-sm">
              <strong>Neuer Spot</strong>
              <p className="text-xs text-gray-600 mt-1">
                Klicke auf "Spot hinzufügen" um Details einzugeben
              </p>
            </div>
          </Popup>
        </Marker>
      )}

      {/* Offline Tile Caching Manager */}
      <OfflineMapManager autoCache={true} showStats={false} />

      {/* Advanced Cache Optimization Manager */}
      <AdvancedCacheManager visible={true} />
    </MapContainer>
  );
}