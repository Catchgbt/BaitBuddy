# 🇩🇪 Deutsche Bathymetrie-Daten - GEBCO 2026

Dieses Projekt integriert hochauflösende Tiefendaten (Bathymetrie) für alle 16 deutschen Bundesländer in die BaitBuddy Map.

## 📊 Was ist Bathymetrie?

Bathymetrie sind digitale Tiefenkarten von Gewässern:
- **Höhenauflösung:** 15 Bogensekunden (~500 Meter)
- **Datenquelle:** GEBCO 2026 (General Bathymetric Chart of the Oceans)
- **Lizenz:** Public Domain - frei nutzbar
- **Werte:** Höhe in Metern (negativ = unter Wasser)

## 🚀 Quickstart

### 1. Dependencies installieren
```bash
pip install requests numpy rasterio xarray rioxarray
```

### 2. Skript ausführen
```bash
cd scripts
python3 download_bathymetry_all.py
```

**Das dauert ca. 15-30 Minuten:**
- ~500 MB Download (GEBCO Tile Europa)
- Extraktion für 16 Bundesländer
- Speicherung als komprimierte GeoTIFF-Dateien

### 3. Ausgabe
```
bathymetry_data/
├── Bathymetrie_Baden-Württemberg.tif
├── Bathymetrie_Bayern.tif
├── Bathymetrie_Berlin.tif
├── Bathymetrie_Brandenburg.tif
├── ... (16 Bundesländer)
└── metadata.json
```

## 🗺️ Map-Integration

Die Bathymetrie-Daten können auf mehrere Arten in die Map integriert werden:

### Option 1: Overlay-Layer (einfach)
- Neue "Bathymetrie" Filter-Option in der Map
- GeoTIFF als WMS-Layer anzeigen
- Ein/Ausschalten pro Bundesland

### Option 2: Heatmap (schön)
- Tiefendaten als Farbgradient
- Blau = Tiefe, Braun = Ufer
- Interaktive Tiefenabfrage

### Option 3: Gewässer-Details (praktisch)
- Beim Klick auf ein Gewässer
- "Tiefenprofil" anzeigen
- Durchschnittliche/maximale Tiefe

## 📁 Dateien

| Datei | Größe | Beschreibung |
|-------|-------|-------------|
| `Bathymetrie_*.tif` | 5-50 MB | GeoTIFF pro Bundesland |
| `metadata.json` | < 1 KB | Metadaten & Verzeichnis |

## 🔍 Technische Details

### Koordinatensystem
- **EPSG:4326** (WGS84)
- Geografische Koordinaten (Lon/Lat)

### Datenformat
- **GeoTIFF** (Cloud-optimiert, LZW komprimiert)
- Eindatei pro Bundesland
- Direkt mit Leaflet/QGIS lesbar

### Auflösung
```
15 Bogensekunden = ~500m x ~500m pro Pixel
Bei NRW: ~3000 x 2000 Pixel = 6 Millionen Datenpunkte
```

## 🎣 Anwendungsfälle

1. **Angelplatz-Analyse**
   - Tiefenkarte beim Spot anzeigen
   - "Durchschn. Tiefe: 4.2m" in Details

2. **Gewässer-Vergleich**
   - Verschiedene Seen vergleichen
   - Tiefenprofil visualisieren

3. **Offline-Funktion**
   - Bathymetrie lokal speichern
   - Beim Angeln offline abrufen

4. **Umweltschutz**
   - Sedimenttransport visualisieren
   - Erosion monitoring

## 📚 Quellen

- **GEBCO:** https://www.gebco.net/
- **Dokumentation:** https://www.bodc.ac.uk/products/oceanic/gebco/
- **Download:** https://www.bodc.ac.uk/data/open_download/gebco/

## 📝 Lizenz

- **GEBCO 2026:** Public Domain (CC0)
- Frei nutzbar, keine Angabe erforderlich
- Veränderungen erlaubt

## 🔧 Nächste Schritte

Nach dem Download:
1. GeoTIFF-Dateien in `/public/assets/bathymetry/` speichern
2. MapView.jsx erweitern um Bathymetrie-Layer
3. Neue Filter-Option "Bathymetrie" hinzufügen
4. WMS/Tile-Server für Live-Rendering (optional)

---

**Status:** ✅ Skript bereit | ⏳ Download im Hintergrund
