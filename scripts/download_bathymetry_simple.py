#!/usr/bin/env python3
"""
Vereinfachte Bathymetrie Downloader - nur mit numpy + rasterio
Lädt und verarbeitet GEBCO 2026 ohne xarray/rioxarray.
"""

import os
import sys
import requests
from pathlib import Path

# ============================================================
# KONFIGURATION
# ============================================================
OUTPUT_DIR = Path("./bathymetry_data")
OUTPUT_DIR.mkdir(exist_ok=True)

BUNDESLAENDER = {
    "Baden-Württemberg": {"lon_min": 7.5, "lon_max": 10.3, "lat_min": 47.5, "lat_max": 49.6},
    "Bayern": {"lon_min": 8.9, "lon_max": 13.8, "lat_min": 47.3, "lat_max": 50.6},
    "Berlin": {"lon_min": 13.1, "lon_max": 13.8, "lat_min": 52.3, "lat_max": 52.7},
    "Brandenburg": {"lon_min": 11.3, "lon_max": 14.8, "lat_min": 51.4, "lat_max": 53.6},
    "Bremen": {"lon_min": 8.5, "lon_max": 9.0, "lat_min": 53.0, "lat_max": 53.6},
    "Hamburg": {"lon_min": 9.7, "lon_max": 10.4, "lat_min": 53.4, "lat_max": 53.6},
    "Hessen": {"lon_min": 8.0, "lon_max": 10.3, "lat_min": 49.0, "lat_max": 51.6},
    "Mecklenburg-Vorpommern": {"lon_min": 11.7, "lon_max": 14.4, "lat_min": 53.5, "lat_max": 55.0},
    "Niedersachsen": {"lon_min": 6.4, "lon_max": 11.6, "lat_min": 51.4, "lat_max": 54.0},
    "Nordrhein-Westfalen": {"lon_min": 5.8, "lon_max": 9.2, "lat_min": 50.3, "lat_max": 52.5},
    "Rheinland-Pfalz": {"lon_min": 6.1, "lon_max": 8.5, "lat_min": 49.0, "lat_max": 50.9},
    "Saarland": {"lon_min": 6.4, "lon_max": 7.2, "lat_min": 49.1, "lat_max": 49.6},
    "Sachsen": {"lon_min": 12.0, "lon_max": 15.0, "lat_min": 50.2, "lat_max": 51.7},
    "Sachsen-Anhalt": {"lon_min": 10.5, "lon_max": 13.8, "lat_min": 50.8, "lat_max": 53.0},
    "Schleswig-Holstein": {"lon_min": 8.4, "lon_max": 11.6, "lat_min": 53.4, "lat_max": 55.1},
    "Thüringen": {"lon_min": 9.2, "lon_max": 12.6, "lat_min": 50.2, "lat_max": 51.7},
}

GEBCO_TILE_URL = "https://www.bodc.ac.uk/data/open_download/gebco/gebco_2026_tid/gebco_2026_tid_n90.0_s0.0_w0.0_e90.0/"
GEBCO_TILE_FILENAME = "gebco_2026_tid_n90.0_s0.0_w0.0_e90.0.tif"

# ============================================================
# FUNKTIONEN
# ============================================================

def download_file(url, dest_path, chunk_size=8192*1024):
    """Lädt eine Datei mit Fortschrittsanzeige herunter."""
    if dest_path.exists():
        size_mb = dest_path.stat().st_size / (1024*1024)
        print(f"✓ Datei existiert: {dest_path.name} ({size_mb:.1f} MB)")
        return dest_path

    print(f"\n📥 Download: {url}")
    print(f"   Ziel: {dest_path}")
    print(f"   ⚠️  Dies kann 10-20 Minuten dauern (~500MB)...")

    try:
        response = requests.get(url, stream=True, timeout=60)
        response.raise_for_status()

        total_size = int(response.headers.get('content-length', 0))
        downloaded = 0

        with open(dest_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=chunk_size):
                if chunk:
                    f.write(chunk)
                    downloaded += len(chunk)
                    if total_size > 0:
                        percent = (downloaded / total_size) * 100
                        mb = downloaded / (1024*1024)
                        total_mb = total_size / (1024*1024)
                        print(f"\r   {mb:.1f} / {total_mb:.1f} MB ({percent:.1f}%)", end='', flush=True)

        print(f"\n✓ Download fertig!")
        return dest_path

    except Exception as e:
        print(f"\n✗ Download fehlgeschlagen: {e}")
        if dest_path.exists():
            dest_path.unlink()
        return None


def extract_bundesland_from_tif(input_tif, bundesland, bounds):
    """Schneidet ein Bundesland aus GeoTIFF aus."""
    try:
        import rasterio
        from rasterio.windows import from_bounds as window_from_bounds
    except ImportError:
        print("✗ rasterio nicht installiert. Skript abgebrochen.")
        return None

    output_file = OUTPUT_DIR / f"Bathymetrie_{bundesland.replace(' ', '_')}.tif"

    if output_file.exists():
        size_mb = output_file.stat().st_size / (1024*1024)
        print(f"  ✓ {bundesland:25s} | {size_mb:7.1f} MB")
        return output_file

    try:
        with rasterio.open(input_tif) as src:
            # Fenster für Bundesland erstellen
            window = window_from_bounds(
                bounds['lon_min'], bounds['lat_min'],
                bounds['lon_max'], bounds['lat_max'],
                src.transform
            )

            # Daten lesen
            data = src.read(1, window=window)

            # Neue Transform
            transform = rasterio.windows.transform(window, src.transform)

            # Metadaten
            profile = src.profile.copy()
            profile.update({
                'height': data.shape[0],
                'width': data.shape[1],
                'transform': transform,
                'compress': 'lzw',
            })

            # Speichern
            with rasterio.open(output_file, 'w', **profile) as dst:
                dst.write(data, 1)

        size_mb = output_file.stat().st_size / (1024*1024)
        depth_min = float(data.min())
        depth_max = float(data.max())

        print(f"  ✓ {bundesland:25s} | {size_mb:7.1f} MB | {depth_min:7.0f}m - {depth_max:6.0f}m")
        return output_file

    except Exception as e:
        print(f"  ✗ {bundesland}: {e}")
        return None


def check_dependencies():
    """Prüft benötigte Python-Pakete."""
    required = ['requests', 'numpy', 'rasterio']

    print("\n📦 Abhängigkeiten:")
    missing = []
    for module in required:
        try:
            __import__(module)
            print(f"  ✓ {module}")
        except ImportError:
            print(f"  ✗ {module}")
            missing.append(module)

    if missing:
        print(f"\n⚠️  Fehlende Pakete:")
        print(f"   pip install {' '.join(missing)}")
        return False
    return True


# ============================================================
# MAIN
# ============================================================

def main():
    print("=" * 80)
    print("🇩🇪 Deutsche Bathymetrie - GEBCO 2026 (Vereinfacht)")
    print("=" * 80)

    if not check_dependencies():
        sys.exit(1)

    # Download GEBCO Tile
    tile_path = OUTPUT_DIR / GEBCO_TILE_FILENAME

    if not tile_path.exists():
        print(f"\n📥 GEBCO 2026 Tile herunterladen...")
        downloaded = download_file(GEBCO_TILE_URL, tile_path)
        if not downloaded:
            print("✗ Download fehlgeschlagen.")
            sys.exit(1)
    else:
        size_mb = tile_path.stat().st_size / (1024*1024)
        print(f"\n✓ GEBCO Tile vorhanden: {size_mb:.1f} MB")

    # Alle Bundesländer extrahieren
    print(f"\n📍 Extrahiere {len(BUNDESLAENDER)} Bundesländer...")
    print("-" * 80)

    results = {}
    failed = []

    for bundesland, bounds in BUNDESLAENDER.items():
        result = extract_bundesland_from_tif(tile_path, bundesland, bounds)
        if result:
            results[bundesland] = result
        else:
            failed.append(bundesland)

    # Zusammenfassung
    print("-" * 80)
    print(f"\n✅ Erfolgreiche Extraktion: {len(results)}/{len(BUNDESLAENDER)}")

    if failed:
        print(f"⚠️  Fehler: {', '.join(failed)}")

    # Metadaten speichern
    import json
    metadata = {
        "version": "GEBCO 2026",
        "resolution": "15 arcseconds (~500m)",
        "count": len(results),
        "bundeslaender": list(results.keys()),
    }

    metadata_file = OUTPUT_DIR / "metadata.json"
    with open(metadata_file, 'w') as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)

    print(f"✓ metadata.json erstellt")

    # Fertig
    print("\n" + "=" * 80)
    print("✅ FERTIG!")
    print("=" * 80)
    print(f"\n📁 Ausgabeverzeichnis: {OUTPUT_DIR.absolute()}")
    print(f"📊 {len(results)} Bathymetrie-Dateien (GeoTIFF)")
    print(f"📋 metadata.json")
    print("\n💾 Dateien in /public/assets/bathymetry/ kopieren:")
    print("   cp bathymetry_data/*.tif /home/user/BaitBuddy/public/assets/bathymetry/")
    print("\n" + "=" * 80)


if __name__ == "__main__":
    main()
