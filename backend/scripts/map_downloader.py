#!/usr/bin/env python3
"""
BaitBuddy Kartendaten-Downloader
Integrierte Lösung für automatisierte Kartendownloads
"""

import os
import sys
import json
import time
import requests
import sqlite3
from pathlib import Path
from datetime import datetime, timedelta
from urllib.parse import urlencode
import logging

# ============================================================
# KONFIGURATION
# ============================================================

BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / "data" / "maps"
DB_FILE = DATA_DIR / "maps_metadata.db"
LOG_FILE = BASE_DIR / "logs" / "map_downloader.log"

DATA_DIR.mkdir(parents=True, exist_ok=True)
LOG_FILE.parent.mkdir(parents=True, exist_ok=True)

# Logging setup
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(LOG_FILE),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Deutschland Bounding Box
DE_BOUNDS = {
    "lon_min": 5.8,
    "lon_max": 15.1,
    "lat_min": 47.2,
    "lat_max": 55.1,
}

# ============================================================
# PRIORISIERTE KARTENDATEN FÜR BAITBUDDY
# ============================================================

PRIORITY_MAPS = {
    # Bathymetrie (für Tiefenkarten)
    "gebco_europe_tile": {
        "name": "GEBCO 2026 Europa (GeoTIFF)",
        "url": "https://www.bodc.ac.uk/data/open_download/gebco/gebco_2026_tid/gebco_2026_tid_n90.0_s0.0_w0.0_e90.0/",
        "filename": "gebco_2026_europe.tif",
        "size": "~500 MB",
        "type": "bathymetry",
        "license": "Public Domain",
        "format": "GeoTIFF",
        "priority": 1,
        "auto_download": True,
        "desc": "Bathymetrie für europäische Gewässer"
    },

    # Höhenmodelle (für Hillshading)
    "eu_dem_25m": {
        "name": "EU-DEM 25m (Europa)",
        "url": "https://files.gpxz.io/eudem_buffered.zip",
        "filename": "eudem_25m.zip",
        "size": "~23 GB",
        "type": "dem",
        "license": "Frei (EEA)",
        "format": "GeoTIFF",
        "priority": 2,
        "auto_download": False,
        "desc": "25m Höhenmodell für Europa"
    },

    "copernicus_dem_30": {
        "name": "Copernicus DEM 30m",
        "url": "https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM",
        "filename": "copernicus_dem_30m",
        "size": "~1 GB pro Tile",
        "type": "dem",
        "license": "Frei (Copernicus)",
        "format": "GeoTIFF",
        "priority": 2,
        "auto_download": False,
        "api": "copernicus",
        "desc": "Digitales Höhenmodell 30m Auflösung"
    },

    # OpenStreetMap
    "osm_germany_pbf": {
        "name": "OSM Deutschland (PBF)",
        "url": "https://download.geofabrik.de/europe/germany-latest.osm.pbf",
        "filename": "germany-latest.osm.pbf",
        "size": "~4.5 GB",
        "type": "vector",
        "license": "ODbL",
        "format": "OSM PBF",
        "priority": 3,
        "auto_download": False,
        "desc": "Komplette OSM-Daten für Deutschland"
    },

    # Amtliche BKG Daten
    "bkg_vg250": {
        "name": "BKG VG250 (Verwaltungsgebiete)",
        "url": "https://gdz.bkg.bund.de/index.php/default/open-data.html",
        "filename": "bkg_vg250",
        "size": "~100 MB",
        "type": "administrative",
        "license": "dl-de/by-2-0",
        "format": "Shapefile",
        "priority": 4,
        "auto_download": False,
        "manual": True,
        "desc": "Verwaltungsgrenzen Deutschland"
    },

    # Topografische Karten
    "opentopomap": {
        "name": "OpenTopoMap (Vector Tiles)",
        "url": "https://a.tile.opentopomap.org/{z}/{x}/{y}.png",
        "filename": "opentopomap_tiles",
        "size": "On-Demand",
        "type": "topographic",
        "license": "CC-BY-SA",
        "format": "PNG Tiles",
        "priority": 5,
        "auto_download": False,
        "is_tms": True,
        "desc": "Topografische Karte basierend auf OSM + SRTM"
    },

    # Specialized services (WMS)
    "wms_nrw_dtk": {
        "name": "WMS NRW DTK (Topografische Karten)",
        "url": "https://www.wms.nrw.de/geobasis/wms_nw_dtk",
        "filename": "wms_nrw_dtk",
        "size": "Service",
        "type": "wms",
        "license": "Frei",
        "format": "WMS",
        "priority": 6,
        "auto_download": False,
        "is_service": True,
        "desc": "WMS für NRW Topografische Karten"
    },
}

# ============================================================
# DATENBANK
# ============================================================

def init_db():
    """Initialisiert die Metadaten-Datenbank."""
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()

    c.execute('''CREATE TABLE IF NOT EXISTS map_downloads (
        id INTEGER PRIMARY KEY,
        source_id TEXT UNIQUE,
        name TEXT,
        url TEXT,
        filename TEXT,
        size TEXT,
        type TEXT,
        license TEXT,
        format TEXT,
        priority INTEGER,
        status TEXT,
        downloaded_at TIMESTAMP,
        file_size_bytes INTEGER,
        checksum TEXT,
        auto_update BOOLEAN,
        last_update_check TIMESTAMP
    )''')

    conn.commit()
    conn.close()


def update_map_metadata(source_id, status, file_size_bytes=None, checksum=None):
    """Aktualisiert Metadaten nach Download."""
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()

    m = PRIORITY_MAPS[source_id]

    c.execute('''INSERT OR REPLACE INTO map_downloads
        (source_id, name, url, filename, size, type, license, format,
         priority, status, downloaded_at, file_size_bytes, checksum, auto_update, last_update_check)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
        (source_id, m['name'], m['url'], m['filename'], m['size'], m['type'],
         m['license'], m['format'], m['priority'], status, datetime.now(),
         file_size_bytes, checksum, m.get('auto_download', False), datetime.now())
    )

    conn.commit()
    conn.close()
    logger.info(f"✓ Metadaten aktualisiert: {source_id} -> {status}")


def get_map_status(source_id):
    """Holt Status einer Kartendatenquelle."""
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()

    c.execute('SELECT status, downloaded_at, file_size_bytes FROM map_downloads WHERE source_id = ?', (source_id,))
    result = c.fetchone()
    conn.close()

    if result:
        return {
            "status": result[0],
            "downloaded_at": result[1],
            "file_size_mb": result[2] / (1024*1024) if result[2] else None
        }
    return {"status": "not_downloaded"}


def get_all_map_status():
    """Holt Status aller Kartendaten."""
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()

    c.execute('SELECT source_id, name, status, downloaded_at, file_size_bytes FROM map_downloads ORDER BY priority')
    results = c.fetchall()
    conn.close()

    return [
        {
            "source_id": r[0],
            "name": r[1],
            "status": r[2],
            "downloaded_at": r[3],
            "file_size_mb": r[4] / (1024*1024) if r[4] else None
        }
        for r in results
    ]

# ============================================================
# DOWNLOAD-FUNKTIONEN
# ============================================================

def download_file(url, dest_path, timeout=300):
    """Lädt eine Datei mit Fortschrittsanzeige herunter."""
    dest_path = Path(dest_path)
    dest_path.parent.mkdir(parents=True, exist_ok=True)

    logger.info(f"Download startet: {url}")
    logger.info(f"Ziel: {dest_path}")

    try:
        response = requests.get(url, stream=True, timeout=timeout)
        response.raise_for_status()

        total_size = int(response.headers.get('content-length', 0))
        downloaded = 0

        with open(dest_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192*1024):
                if chunk:
                    f.write(chunk)
                    downloaded += len(chunk)

                    if total_size > 0:
                        percent = (downloaded / total_size) * 100
                        mb = downloaded / (1024*1024)
                        total_mb = total_size / (1024*1024)
                        logger.info(f"  {mb:.1f} / {total_mb:.1f} MB ({percent:.1f}%)")

        file_size = dest_path.stat().st_size
        logger.info(f"✓ Download erfolgreich: {dest_path} ({file_size / (1024*1024):.1f} MB)")

        return True, file_size

    except Exception as e:
        logger.error(f"✗ Download fehlgeschlagen: {e}")
        if dest_path.exists():
            dest_path.unlink()
        return False, 0


def download_map_source(source_id):
    """Lädt eine spezifische Kartendatenquelle herunter."""
    if source_id not in PRIORITY_MAPS:
        logger.error(f"Unbekannte Quelle: {source_id}")
        return False

    m = PRIORITY_MAPS[source_id]

    logger.info(f"\n{'='*70}")
    logger.info(f"KARTE: {m['name']}")
    logger.info(f"Typ: {m['type']}")
    logger.info(f"Format: {m['format']}")
    logger.info(f"Lizenz: {m['license']}")
    logger.info(f"{'='*70}")

    dest = DATA_DIR / m['filename']

    # Direkter Download
    if m.get('url', '').startswith('http') and not m.get('is_service') and not m.get('is_tms'):
        if not dest.exists():
            success, file_size = download_file(m['url'], dest)
            if success:
                update_map_metadata(source_id, "downloaded", file_size_bytes=file_size)
                return True
            else:
                update_map_metadata(source_id, "download_failed")
                return False
        else:
            logger.info(f"✓ Datei bereits vorhanden: {dest}")
            file_size = dest.stat().st_size
            update_map_metadata(source_id, "downloaded", file_size_bytes=file_size)
            return True

    # WMS Service
    elif m.get('is_service'):
        logger.info(f"WMS-Service: {m['url']}")
        logger.info("Speichern als Service-Referenz...")

        service_info = {
            "name": m['name'],
            "url": m['url'],
            "type": m['type'],
            "format": m['format'],
            "license": m['license'],
            "capabilities_url": f"{m['url']}?SERVICE=WMS&REQUEST=GetCapabilities"
        }

        info_file = DATA_DIR / f"{m['filename']}_info.json"
        with open(info_file, 'w', encoding='utf-8') as f:
            json.dump(service_info, f, indent=2)

        update_map_metadata(source_id, "service_registered")
        return True

    # TMS Service
    elif m.get('is_tms'):
        logger.info(f"TMS-Service (Tile Map Service): {m['url']}")
        logger.info("Speichern als Tile-Service-Referenz...")

        service_info = {
            "name": m['name'],
            "url": m['url'],
            "type": m['type'],
            "format": m['format'],
            "license": m['license'],
            "is_tms": True,
            "attribution": "OpenTopoMap contributors"
        }

        info_file = DATA_DIR / f"{m['filename']}_info.json"
        with open(info_file, 'w', encoding='utf-8') as f:
            json.dump(service_info, f, indent=2)

        update_map_metadata(source_id, "service_registered")
        return True

    else:
        logger.warning(f"Manuelle Quelle: {m['name']}")
        logger.warning(f"Besuche: {m['url']}")

        info_file = DATA_DIR / f"{m['filename']}_INFO.txt"
        with open(info_file, 'w', encoding='utf-8') as f:
            f.write(f"Karte: {m['name']}\n")
            f.write(f"URL: {m['url']}\n")
            f.write(f"Format: {m['format']}\n")
            f.write(f"Lizenz: {m['license']}\n\n")
            f.write("Download-Anleitung:\n")
            f.write("1. Besuche die obige URL\n")
            f.write("2. Folge den Download-Anweisungen auf der Website\n")
            f.write("3. Speichere die Dateien in diesem Ordner\n")

        update_map_metadata(source_id, "manual_download_required")
        return False


def download_auto_maps():
    """Lädt alle automatisch-downloadbaren Karten herunter."""
    auto_maps = [k for k, v in PRIORITY_MAPS.items() if v.get('auto_download')]

    logger.info(f"\nStarte Auto-Download: {len(auto_maps)} Quellen")

    success = 0
    failed = 0

    for source_id in auto_maps:
        m = PRIORITY_MAPS[source_id]

        logger.info(f"\n[{success+failed+1}/{len(auto_maps)}] {m['name']}")

        if download_map_source(source_id):
            success += 1
        else:
            failed += 1

        time.sleep(2)  # Rate limiting

    logger.info(f"\n{'='*70}")
    logger.info(f"Auto-Download abgeschlossen:")
    logger.info(f"  Erfolgreich: {success}")
    logger.info(f"  Fehlgeschlagen: {failed}")
    logger.info(f"{'='*70}")

    return success, failed

# ============================================================
# CLI & MAIN
# ============================================================

def show_status():
    """Zeigt Status aller verfügbaren Kartendaten."""
    print(f"\n{'='*70}")
    print("KARTENDATEN STATUS")
    print(f"{'='*70}\n")

    all_status = get_all_map_status()

    for item in all_status:
        status_icon = "✓" if item['status'] == "downloaded" else "✗"
        size_str = f"{item['file_size_mb']:.1f} MB" if item['file_size_mb'] else "N/A"
        print(f"{status_icon} {item['name']:<50} [{size_str}]")
        if item['downloaded_at']:
            print(f"   Heruntergeladen: {item['downloaded_at']}")

    print()


def main():
    """Hauptprogramm."""
    init_db()

    if len(sys.argv) < 2:
        print("\nBaitBuddy Kartendaten-Downloader")
        print("Verwendung:")
        print("  python map_downloader.py auto      - Auto-Downloads")
        print("  python map_downloader.py download <source_id>")
        print("  python map_downloader.py status    - Status zeigen")
        print("  python map_downloader.py list      - Verfügbare Quellen")
        return

    command = sys.argv[1]

    if command == "auto":
        download_auto_maps()
    elif command == "download" and len(sys.argv) > 2:
        source_id = sys.argv[2]
        download_map_source(source_id)
    elif command == "status":
        show_status()
    elif command == "list":
        print("\nVerfügbare Kartendaten-Quellen:\n")
        for source_id, m in PRIORITY_MAPS.items():
            auto = "🔄" if m.get('auto_download') else "📋"
            print(f"{auto} {source_id:<30} {m['name']}")
        print()
    else:
        print(f"Unbekannter Befehl: {command}")


if __name__ == "__main__":
    main()
