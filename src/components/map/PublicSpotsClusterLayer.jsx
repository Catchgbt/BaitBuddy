import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

// Lokales Vektor-Icon: keine externen Marker-Bilder beim Öffnen der Karte.
const publicIcon = L.divIcon({
  className: 'bb-map-pin bb-map-pin-public',
  html: '<span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 12c4-7 10-7 14 0-4 7-10 7-14 0Z M6 12l-4-4v8Z"/><circle cx="16" cy="11" r="1"/></svg></span>',
  iconSize: [38, 46],
  iconAnchor: [19, 46],
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
export default function PublicSpotsClusterLayer({ locations = [], visible = true, onSelect }) {
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
      if (onSelect) marker.on('click', () => onSelect(location));
      else marker.bindPopup(buildPopup(location));
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
  }, [map, locations, onSelect]);

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
