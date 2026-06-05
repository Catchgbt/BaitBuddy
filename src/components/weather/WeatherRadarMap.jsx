import React, { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Default Marker Icon Fix
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const BASE_LAYERS = {
  street: {
    name: "Strasse",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap",
  },
  dark: {
    name: "Dunkel",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: "&copy; CARTO",
  },
  satellite: {
    name: "Satellit",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri",
  },
  topo: {
    name: "Topografie",
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenTopoMap",
  },
};

const OVERLAY_MODES = {
  rain: { name: "Niederschlag", color: 2, smooth: 1 },
  clouds: { name: "Wolken", color: 0, smooth: 1 },
  rainbow: { name: "Regenbogen", color: 4, smooth: 1 },
  storm: { name: "Sturm", color: 6, smooth: 1 },
};

function RadarLayer({ frame, opacity, mode }) {
  const map = useMap();
  const layerRef = useRef(null);

  useEffect(() => {
    if (!frame) return;

    const url = `https://tilecache.rainviewer.com${frame.path}/256/{z}/{x}/{y}/${mode.color}/${mode.smooth}_1.png`;
    const newLayer = L.tileLayer(url, {
      opacity: opacity,
      zIndex: 500,
    });

    newLayer.addTo(map);

    if (layerRef.current) {
      map.removeLayer(layerRef.current);
    }
    layerRef.current = newLayer;

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
      }
    };
  }, [frame, opacity, mode, map]);

  return null;
}

export default function WeatherRadarMap() {
  const [center, setCenter] = useState([51.1657, 10.4515]);
  const [frames, setFrames] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [loading, setLoading] = useState(true);
  const [baseLayer, setBaseLayer] = useState("dark");
  const [overlayMode, setOverlayMode] = useState("rain");
  const [opacity, setOpacity] = useState(0.7);
  const playRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem("fm_current_location");
    if (saved) {
      try {
        const loc = JSON.parse(saved);
        if (loc?.lat && loc?.lon) {
          setCenter([loc.lat, loc.lon]);
        }
      } catch (e) {
        console.warn("Standort-Parse-Fehler:", e);
      }
    }
  }, []);

  useEffect(() => {
    const loadFrames = async () => {
      try {
        const res = await fetch("https://api.rainviewer.com/public/weather-maps.json");
        const data = await res.json();
        const allFrames = [
          ...(data.radar?.past || []),
          ...(data.radar?.nowcast || []),
        ];
        setFrames(allFrames);
        setCurrentIndex(data.radar?.past?.length - 1 || 0);
      } catch (e) {
        console.error("RainViewer Fehler:", e);
      } finally {
        setLoading(false);
      }
    };
    loadFrames();
  }, []);

  useEffect(() => {
    if (!isPlaying || frames.length === 0) return;
    playRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % frames.length);
    }, 700);
    return () => clearInterval(playRef.current);
  }, [isPlaying, frames.length]);

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    return new Date(timestamp * 1000).toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const currentFrame = frames[currentIndex];
  const nowSec = Date.now() / 1000;
  const isForecast = currentFrame && currentFrame.time > nowSec;
  const base = BASE_LAYERS[baseLayer];
  const mode = OVERLAY_MODES[overlayMode];

  return (
    <div className="w-full h-full flex flex-col">
      {/* Steuerung oben */}
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <div className="text-xs text-gray-400">
          {loading ? "Lade Radar..." : currentFrame ? (
            <>
              <span className={isForecast ? "text-amber-400" : "text-cyan-400"}>
                {isForecast ? "Vorhersage" : "Aktuell"}
              </span>
              <span className="ml-2">{formatTime(currentFrame.time)}</span>
            </>
          ) : "Keine Daten"}
        </div>
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="px-3 py-1 rounded-md bg-cyan-600/20 hover:bg-cyan-600/40 border border-cyan-500/30 text-xs text-cyan-300 transition-colors"
        >
          {isPlaying ? "Pause" : "Play"}
        </button>
      </div>

      {/* Karten-Stil Auswahl */}
      <div className="mb-2">
        <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Kartenstil</div>
        <div className="flex gap-1 flex-wrap">
          {Object.entries(BASE_LAYERS).map(([key, val]) => (
            <button
              key={key}
              onClick={() => setBaseLayer(key)}
              className={`px-2 py-1 rounded-md text-[11px] border transition-colors ${
                baseLayer === key
                  ? "bg-cyan-600/30 border-cyan-400 text-cyan-200"
                  : "bg-gray-800/50 border-gray-700 text-gray-400 hover:bg-gray-700/50"
              }`}
            >
              {val.name}
            </button>
          ))}
        </div>
      </div>

      {/* Overlay Modus Auswahl */}
      <div className="mb-3">
        <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Wetterlayer</div>
        <div className="flex gap-1 flex-wrap">
          {Object.entries(OVERLAY_MODES).map(([key, val]) => (
            <button
              key={key}
              onClick={() => setOverlayMode(key)}
              className={`px-2 py-1 rounded-md text-[11px] border transition-colors ${
                overlayMode === key
                  ? "bg-emerald-600/30 border-emerald-400 text-emerald-200"
                  : "bg-gray-800/50 border-gray-700 text-gray-400 hover:bg-gray-700/50"
              }`}
            >
              {val.name}
            </button>
          ))}
        </div>
      </div>

      {/* Karte */}
      <div className="flex-1 rounded-xl overflow-hidden border border-gray-800/50 min-h-[280px]">
        <MapContainer
          key={baseLayer}
          center={center}
          zoom={7}
          style={{ height: "100%", width: "100%", minHeight: "280px" }}
          scrollWheelZoom={false}
        >
          <TileLayer attribution={base.attribution} url={base.url} />
          {currentFrame && <RadarLayer frame={currentFrame} opacity={opacity} mode={mode} />}
          <Marker position={center} />
        </MapContainer>
      </div>

      {/* Zeitleiste */}
      {frames.length > 0 && (
        <div className="mt-2">
          <input
            type="range"
            min="0"
            max={frames.length - 1}
            value={currentIndex}
            onChange={(e) => {
              setIsPlaying(false);
              setCurrentIndex(parseInt(e.target.value));
            }}
            className="w-full accent-cyan-500"
          />
        </div>
      )}

      {/* Transparenz */}
      <div className="mt-2 flex items-center gap-2">
        <span className="text-[10px] text-gray-500 uppercase tracking-wider">Transparenz</span>
        <input
          type="range"
          min="0.1"
          max="1"
          step="0.1"
          value={opacity}
          onChange={(e) => setOpacity(parseFloat(e.target.value))}
          className="flex-1 accent-emerald-500"
        />
        <span className="text-[10px] text-gray-400 w-8 text-right">{Math.round(opacity * 100)}%</span>
      </div>

      <div className="text-[10px] text-gray-500 mt-1 text-right">
        Daten: RainViewer
      </div>
    </div>
  );
}