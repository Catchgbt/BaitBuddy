import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

// Grüner Marker für öffentliche Angelvereine/Parks/Spots — identisch zum
// bisher in MapPage genutzten greenIcon, damit die Legende gleich bleibt.
const publicIcon = L.icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
  className: "",
});

// HTML-Escaping für Popup-Inhalte, da Name/Adresse aus Datendateien stammen.
const esc = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const categoryLabel = (location) => {
  if (location.category === "club") return "Angelverein";
  if (location.category === "angelpark") return "Angelpark";
  if (location.category === "spot") {
    return location.water_type
      ? location.water_type.charAt(0).toUpperCase() + location.water_type.slice(1)
      : "Angelspot";
  }
  return "Angelort";
};

const buildPopup = (location) => {
  const parts = [
    `<div style="min-width:180px">`,
    `<div style="font-weight:600;font-size:14px;margin-bottom:2px">${esc(location.name || "Unbenannt")}</div>`,
    `<div style="font-size:12px;color:#4b5563">${esc(categoryLabel(location))}</div>`,
  ];
  const city = location.address?.city;
  if (city) {
    parts.push(`<div style="font-size:11px;color:#6b7280;margin-top:2px">${esc(city)}</div>`);
  }
  if (location.website) {
    const href = location.website.startsWith("http")
      ? location.website
      : `https://${location.website}`;
    parts.push(
      `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer" style="font-size:11px;color:#0e7490;text-decoration:underline;margin-top:4px;display:inline-block">Website</a>`
    );
  }
  parts.push(`</div>`);
  return parts.join("");
};

/**
 * PublicSpotsClusterLayer — rendert die öffentlichen Angelvereine/Parks/Spots
 * als geclusterte Marker. Clustering ist zwingend, weil es ~800 Standorte sind;
 * einzelne React-Marker würden auf Low-End-Geräten (≤2GB RAM) ruckeln.
 */
export default function PublicSpotsClusterLayer({ locations = [], visible = true }) {
  const map = useMap();
  const clusterRef = useRef(null);

  useEffect(() => {
    if (!map) return undefined;

    const cluster = L.markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 60,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
    });

    locations.forEach((location) => {
      const lat = Number(location.coordinates?.lat);
      const lng = Number(location.coordinates?.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      const marker = L.marker([lat, lng], { icon: publicIcon });
      marker.bindPopup(buildPopup(location));
      cluster.addLayer(marker);
    });

    clusterRef.current = cluster;
    if (visible) map.addLayer(cluster);

    return () => {
      if (clusterRef.current) {
        map.removeLayer(clusterRef.current);
        clusterRef.current = null;
      }
    };
  }, [map, locations]);

  useEffect(() => {
    if (!map || !clusterRef.current) return;
    if (visible) {
      if (!map.hasLayer(clusterRef.current)) map.addLayer(clusterRef.current);
    } else if (map.hasLayer(clusterRef.current)) {
      map.removeLayer(clusterRef.current);
    }
  }, [visible, map]);

  return null;
}
