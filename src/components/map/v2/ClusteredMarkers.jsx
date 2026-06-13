import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.markercluster";

// MarkerCluster-CSS einmalig laden (analog zur Leaflet-CSS in MapPage)
if (typeof document !== "undefined") {
  const styles = [
    ["leaflet-mc", "https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css"],
    ["leaflet-mc-default", "https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css"],
  ];
  styles.forEach(([key, href]) => {
    if (!document.querySelector(`link[data-${key}]`)) {
      const link = document.createElement("link");
      link.setAttribute(`data-${key}`, "1");
      link.rel = "stylesheet";
      link.href = href;
      document.head.appendChild(link);
    }
  });
}

/**
 * Rendert beliebig viele Punkte performant als geclusterte Leaflet-Marker.
 * Statt hunderte React-<Marker> zu mounten (langsam, Map hängt), werden die
 * Marker imperativ über leaflet.markercluster verwaltet.
 *
 * @param {Array<{id,name,lat,lng,raw}>} points  Normalisierte Punkte
 * @param {L.Icon} icon                          Icon für diese Kategorie
 * @param {(point)=>void} onSelect               Klick-Handler
 */
export default function ClusteredMarkers({ points = [], icon, onSelect }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    const group = L.markerClusterGroup({
      chunkedLoading: true,        // große Mengen häppchenweise → kein Einfrieren
      maxClusterRadius: 60,
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
    });

    points.forEach((p) => {
      const lat = Number(p.lat);
      const lng = Number(p.lng);
      if (Number.isNaN(lat) || Number.isNaN(lng)) return;

      const marker = L.marker([lat, lng], icon ? { icon } : undefined);
      if (p.name) marker.bindTooltip(p.name, { direction: "top" });
      marker.on("click", () => onSelect && onSelect(p));
      group.addLayer(marker);
    });

    map.addLayer(group);

    return () => {
      map.removeLayer(group);
    };
  }, [map, points, icon, onSelect]);

  return null;
}
