import React, { useState, useEffect, useMemo, useCallback } from "react";
import { functions } from "@/api/frontendClient";
import { Spot } from "@/entities/Spot";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { Layers, Map as MapIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "@/components/location/LocationManager";
import { useFeatureTracking } from "@/hooks/useFeatureTracking";
import AddSpotModal from "@/components/map/v2/AddSpotModal";
import SpotDetailPanel from "@/components/map/SpotDetailPanel";
import ClusteredMarkers from "@/components/map/v2/ClusteredMarkers";

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

const createIcon = (color) =>
  L.icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
    className: "",
  });

const ICONS = {
  user: createIcon("red"),
  spots: createIcon("green"),
  parks: createIcon("blue"),
  clubs: createIcon("violet"),
  shops: createIcon("orange"),
};

// Einsteigerfreundliche Kategorien (einfache Filter-Chips statt Feature-Wust)
const CATEGORIES = [
  { key: "spots", label: "Meine Spots", emoji: "📍", color: "green", chip: "bg-green-500/20 border-green-500 text-green-300" },
  { key: "parks", label: "Angelparks & Seen", emoji: "🐟", color: "blue", chip: "bg-blue-500/20 border-blue-500 text-blue-300" },
  { key: "clubs", label: "Angelvereine", emoji: "🏛️", color: "violet", chip: "bg-violet-500/20 border-violet-500 text-violet-300" },
  { key: "shops", label: "Angelshops", emoji: "🛒", color: "orange", chip: "bg-orange-500/20 border-orange-500 text-orange-300" },
];

const BASE_LAYERS = {
  standard: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "&copy; Esri, Maxar, Earthstar Geographics",
  },
};

function MapController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, zoom || 13);
  }, [center, zoom, map]);
  return null;
}

function MapClickHandler({ onMapClick }) {
  const map = useMap();
  useEffect(() => {
    const handleClick = (e) => onMapClick(e.latlng);
    map.on("click", handleClick);
    return () => map.off("click", handleClick);
  }, [map, onMapClick]);
  return null;
}

export default function MapPage() {
  useFeatureTracking("map");
  const { gpsLocation, currentLocation } = useLocation();

  const [spots, setSpots] = useState([]);
  const [parks, setParks] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [clickedCoords, setClickedCoords] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [mapCenter, setMapCenter] = useState([51.1657, 10.4515]);
  const [mapZoom, setMapZoom] = useState(6);
  const [baseLayer, setBaseLayer] = useState("standard");
  const [filters, setFilters] = useState({ spots: true, parks: true, clubs: true, shops: false });

  useEffect(() => {
    loadMapData();
  }, []);

  useEffect(() => {
    if (gpsLocation) {
      setMapCenter([gpsLocation.lat, gpsLocation.lon]);
      setMapZoom(12);
    } else if (currentLocation) {
      setMapCenter([currentLocation.lat, currentLocation.lon]);
      setMapZoom(12);
    }
  }, [gpsLocation, currentLocation]);

  // Normalisiert beliebige Datensätze auf { id, name, lat, lng, raw }
  const normalize = (item, type) => {
    const lat = item.coordinates?.lat ?? item.latitude;
    const lng = item.coordinates?.lng ?? item.longitude;
    if (lat == null || lng == null) return null;
    return { id: item.id, name: item.name, lat: Number(lat), lng: Number(lng), raw: { ...item, type } };
  };

  const loadMapData = async () => {
    setLoading(true);
    try {
      // 1) Eigene Spots aus der DB
      const userSpots = await Spot.list();
      const safeSpots = (Array.isArray(userSpots) ? userSpots : [])
        .map((s) => normalize(s, "spot"))
        .filter(Boolean);
      setSpots(safeSpots);

      // 2) Statische Datensätze der alten Karte (dynamisch geladen → kleineres Initial-Bundle)
      const [{ angelparks }, parksEu, shopsData, clubsData, hotspotsResp] = await Promise.all([
        import("@/data/angelparks.js"),
        import("@/data/angelparks_eu.json").then((m) => m.default),
        import("@/data/angelshops.json").then((m) => m.default),
        import("@/data/fishingClubsCSVExport.json").then((m) => m.default),
        functions.invoke("angelspotsGeojson").catch(() => ({})),
      ]);

      // Öffentliche Hotspots vom Backend (gleiches { hotspots: [...] }-Format)
      const backendHotspots = Array.isArray(hotspotsResp?.hotspots)
        ? hotspotsResp.hotspots.map((h) => normalize(h, "spot")).filter(Boolean)
        : [];

      const parkPoints = [
        ...(angelparks || []).map((p) => normalize(p, "park")),
        ...(Array.isArray(parksEu) ? parksEu : []).map((p) => normalize(p, "park")),
        ...backendHotspots.map((p) => ({ ...p, raw: { ...p.raw, type: "park" } })),
      ].filter(Boolean);
      // Dedupe per id
      const seenParks = new Set();
      setParks(parkPoints.filter((p) => (seenParks.has(p.id) ? false : seenParks.add(p.id))));

      setClubs((Array.isArray(clubsData) ? clubsData : []).map((c) => normalize(c, "club")).filter(Boolean));
      setShops((Array.isArray(shopsData) ? shopsData : []).map((s) => normalize(s, "shop")).filter(Boolean));

      toast.success("Karte geladen", {
        description: `${safeSpots.length} eigene Spots, ${parkPoints.length} Angelparks/Seen`,
        duration: 2000,
      });
    } catch (error) {
      console.error("Fehler beim Laden der Karten-Daten:", error);
      toast.error("Fehler beim Laden der Karte");
    }
    setLoading(false);
  };

  const handleMapClick = useCallback((latlng) => {
    setClickedCoords({ lat: latlng.lat, lng: latlng.lng });
    setShowAddModal(true);
  }, []);

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

  const handleSelect = useCallback((point) => {
    setSelectedLocation(point.raw);
  }, []);

  const toggleFilter = (key) =>
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));

  const pointsByCategory = useMemo(
    () => ({ spots, parks, clubs, shops }),
    [spots, parks, clubs, shops]
  );

  const counts = {
    spots: spots.length,
    parks: parks.length,
    clubs: clubs.length,
    shops: shops.length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
          <div className="text-cyan-400">Lade Karte …</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 pb-24">
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Schlanker Header */}
        <header className="mb-4">
          <h1 className="text-xl font-bold text-cyan-400">🗺️ Karte &amp; Angelspots</h1>
          <p className="text-sm text-gray-400 mt-1">
            Tippe auf eine Markierung für Details — oder auf eine freie Stelle, um einen eigenen Spot zu speichern.
          </p>
        </header>

        {/* Einfache Filter-Chips */}
        <div className="flex flex-wrap gap-2 mb-3">
          {CATEGORIES.map((cat) => {
            const active = filters[cat.key];
            return (
              <button
                key={cat.key}
                onClick={() => toggleFilter(cat.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition
                  ${active ? cat.chip : "bg-gray-900 border-gray-700 text-gray-500"}`}
                aria-pressed={active}
              >
                <span>{cat.emoji}</span>
                <span>{cat.label}</span>
                <span className="opacity-70">({counts[cat.key]})</span>
              </button>
            );
          })}
        </div>

        {/* Karte — kleiner & scroll-freundlich */}
        <div className="relative h-[55vh] min-h-[360px] rounded-2xl overflow-hidden border border-gray-800 shadow-xl">
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            style={{ height: "100%", width: "100%" }}
            zoomControl={true}
            preferCanvas={true}
          >
            <TileLayer
              attribution={BASE_LAYERS[baseLayer].attribution}
              url={BASE_LAYERS[baseLayer].url}
            />

            <MapController center={mapCenter} zoom={mapZoom} />
            <MapClickHandler onMapClick={handleMapClick} />

            {gpsLocation && (
              <Marker position={[gpsLocation.lat, gpsLocation.lon]} icon={ICONS.user}>
                <Popup>
                  <div className="text-center font-semibold">Dein Standort</div>
                </Popup>
              </Marker>
            )}

            {CATEGORIES.map((cat) =>
              filters[cat.key] ? (
                <ClusteredMarkers
                  key={cat.key}
                  points={pointsByCategory[cat.key]}
                  icon={ICONS[cat.key]}
                  onSelect={handleSelect}
                />
              ) : null
            )}
          </MapContainer>

          {/* Karten-Stil umschalten (einfach) */}
          <div className="absolute top-3 right-3 z-[1000] flex rounded-lg overflow-hidden border border-gray-700 shadow-lg">
            <button
              onClick={() => setBaseLayer("standard")}
              className={`flex items-center gap-1 px-2.5 py-1.5 text-xs ${baseLayer === "standard" ? "bg-cyan-600 text-white" : "bg-gray-900/90 text-gray-300"}`}
            >
              <MapIcon className="w-3.5 h-3.5" /> Karte
            </button>
            <button
              onClick={() => setBaseLayer("satellite")}
              className={`flex items-center gap-1 px-2.5 py-1.5 text-xs ${baseLayer === "satellite" ? "bg-cyan-600 text-white" : "bg-gray-900/90 text-gray-300"}`}
            >
              <Layers className="w-3.5 h-3.5" /> Satellit
            </button>
          </div>
        </div>

        <p className="text-xs text-gray-600 mt-2">
          💡 Marker werden bei vielen Orten automatisch zu Gruppen zusammengefasst — zum Vergrößern hineinzoomen.
        </p>
      </div>

      {showAddModal && (
        <AddSpotModal
          isOpen={showAddModal}
          onClose={() => {
            setShowAddModal(false);
            setClickedCoords(null);
          }}
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
