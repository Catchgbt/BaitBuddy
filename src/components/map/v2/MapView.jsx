import React from "react";
import { MapContainer, Marker, Popup, Polyline, Polygon, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { entities } from "@/api/frontendClient";
import OfflineMapLayer from "./OfflineMapLayer";
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
  const svgUrl = `data:image/svg+xml;base64,${btoa(svgString)}`;
  return L.icon({
    iconUrl: svgUrl,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2 + 10]
  });
};

const spotIcon = createCustomIcon("#3b82f6", "📍");
const clubIcon = createCustomIcon("#10b981", "🏛️");
const locationIcon = createCustomIcon("#ef4444", "📌");
const newSpotIcon = createCustomIcon("#f59e0b", "⭐");

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
  waterBodies = [],
  currentLocation,
  newSpotMarker,
  onMapClick,
  onLocationClick,
  onSpotClick,
  onClubClick,
  onWaterBodiesLoad,
  onReviewsLoad,
  isOnline
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
    </MapContainer>
  );
}