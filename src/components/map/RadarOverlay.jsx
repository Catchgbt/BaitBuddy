import { useEffect, useRef, useState } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

// Frei verfügbare Niederschlags-/Wetterradar-Kacheln von RainViewer – dieselbe
// Art öffentlicher Tile-Quelle wie die bereits genutzten OpenStreetMap-Kacheln
// (kein eigener Backend-Dienst). Die Farb-/Glättungs-Codes steuern die Darstellung.
export const RADAR_MODES = {
  rain: { name: "Niederschlag", color: 2, smooth: 1 },
  clouds: { name: "Wolken", color: 0, smooth: 1 },
  rainbow: { name: "Regenbogen", color: 4, smooth: 1 },
  storm: { name: "Sturm", color: 6, smooth: 1 },
};

/**
 * Lädt die RainViewer-Frames (Vergangenheit + Nowcast) und steuert die Animation.
 * Geladen wird erst, wenn `active` true ist – im Spots-Modus entsteht kein Traffic.
 */
export function useRainviewerRadar(active) {
  const [frames, setFrames] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [opacity, setOpacity] = useState(0.7);
  const [mode, setMode] = useState("rain");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const playRef = useRef(null);

  // Frames nur einmal laden, sobald der Radar-Modus erstmals aktiv wird.
  useEffect(() => {
    if (!active || frames.length > 0) return;
    let cancelled = false;
    setLoading(true);
    setError(false);
    fetch("https://api.rainviewer.com/public/weather-maps.json")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: Radar data unavailable`);
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        if (!data || !data.radar) {
          setError(true);
          return;
        }
        const past = data.radar?.past || [];
        const nowcast = data.radar?.nowcast || [];
        const all = [...past, ...nowcast];
        setFrames(all);
        setCurrentIndex(past.length > 0 ? past.length - 1 : 0);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [active, frames.length]);

  // Animation: nur laufen lassen, wenn aktiv, abgespielt und Tab sichtbar.
  useEffect(() => {
    if (!active || !isPlaying || frames.length === 0) return;
    const tick = () => {
      if (typeof document !== "undefined" && document.hidden) return;
      setCurrentIndex((prev) => (prev + 1) % frames.length);
    };
    playRef.current = setInterval(tick, 700);
    return () => clearInterval(playRef.current);
  }, [active, isPlaying, frames.length]);

  return {
    frames,
    currentIndex,
    setCurrentIndex,
    isPlaying,
    setIsPlaying,
    opacity,
    setOpacity,
    mode,
    setMode,
    loading,
    error,
    currentFrame: frames[currentIndex],
  };
}

/**
 * Radar-Kachel-Layer, der innerhalb eines <MapContainer> gerendert wird und das
 * aktuelle Frame als halbtransparentes Overlay über die Basiskarte legt.
 */
export function RadarLayer({ frame, opacity = 0.7, mode = "rain" }) {
  const map = useMap();
  const layerRef = useRef(null);

  useEffect(() => {
    if (!frame) return;
    const m = RADAR_MODES[mode] || RADAR_MODES.rain;
    const url = `https://tilecache.rainviewer.com${frame.path}/256/{z}/{x}/{y}/${m.color}/${m.smooth}_1.png`;
    const newLayer = L.tileLayer(url, { opacity, zIndex: 500 });
    newLayer.addTo(map);

    if (layerRef.current) {
      map.removeLayer(layerRef.current);
    }
    layerRef.current = newLayer;

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [frame, opacity, mode, map]);

  return null;
}
