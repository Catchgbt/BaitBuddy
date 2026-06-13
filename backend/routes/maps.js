const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');

const router = express.Router();

const DATA_DIR = path.join(__dirname, '..', 'data', 'maps');
const DB_FILE = path.join(DATA_DIR, 'maps_metadata.db');
const SCRIPT_PATH = path.join(__dirname, '..', 'scripts', 'map_downloader.py');

// ============================================================
// Utilities
// ============================================================

async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (error) {
    console.error('Error creating data directory:', error);
  }
}

function runPythonScript(args) {
  return new Promise((resolve, reject) => {
    const python = spawn('python3', [SCRIPT_PATH, ...args], {
      cwd: path.dirname(SCRIPT_PATH),
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    python.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    python.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    python.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, output: stdout });
      } else {
        reject(new Error(`Script failed with code ${code}: ${stderr}`));
      }
    });

    python.on('error', (error) => {
      reject(error);
    });
  });
}

// ============================================================
// Routes
// ============================================================

/**
 * GET /api/maps/status
 * Returns status of all available map datasets
 */
router.get('/status', async (req, res) => {
  try {
    await ensureDataDir();

    // List files in data directory
    const files = await fs.readdir(DATA_DIR);
    const maps = {};

    for (const file of files) {
      if (file.endsWith('_info.json')) {
        const sourceId = file.replace('_info.json', '');
        const content = await fs.readFile(
          path.join(DATA_DIR, file),
          'utf-8'
        );
        maps[sourceId] = JSON.parse(content);
      }
    }

    // Get disk usage
    let totalSize = 0;
    for (const file of files) {
      if (!file.endsWith('_info.json') && !file.endsWith('.db')) {
        try {
          const stats = await fs.stat(path.join(DATA_DIR, file));
          totalSize += stats.size;
        } catch (error) {
          console.warn(`Could not stat file ${file}:`, error);
        }
      }
    }

    res.json({
      success: true,
      maps,
      totalSizeMb: (totalSize / (1024 * 1024)).toFixed(2),
      dataDir: DATA_DIR,
    });
  } catch (error) {
    console.error('Error getting map status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/maps/available
 * List all available map sources
 */
router.get('/available', (req, res) => {
  res.json({
    success: true,
    available: [
      {
        id: 'gebco_europe_tile',
        name: 'GEBCO 2026 Europa (GeoTIFF)',
        type: 'bathymetry',
        size: '~500 MB',
        priority: 1,
        autoDownload: true,
        desc: 'Bathymetrie für europäische Gewässer',
      },
      {
        id: 'eu_dem_25m',
        name: 'EU-DEM 25m (Europa)',
        type: 'dem',
        size: '~23 GB',
        priority: 2,
        autoDownload: false,
        desc: '25m Höhenmodell für Europa',
      },
      {
        id: 'copernicus_dem_30',
        name: 'Copernicus DEM 30m',
        type: 'dem',
        size: '~1 GB pro Tile',
        priority: 2,
        autoDownload: false,
        desc: 'Digitales Höhenmodell 30m Auflösung',
      },
      {
        id: 'osm_germany_pbf',
        name: 'OSM Deutschland (PBF)',
        type: 'vector',
        size: '~4.5 GB',
        priority: 3,
        autoDownload: false,
        desc: 'Komplette OSM-Daten für Deutschland',
      },
      {
        id: 'opentopomap',
        name: 'OpenTopoMap (Tile Service)',
        type: 'topographic',
        size: 'On-Demand',
        priority: 5,
        autoDownload: false,
        desc: 'Topografische Karte basierend auf OSM + SRTM',
      },
      {
        id: 'wms_nrw_dtk',
        name: 'WMS NRW DTK (Topografische Karten)',
        type: 'wms',
        size: 'Service',
        priority: 6,
        autoDownload: false,
        desc: 'WMS für NRW Topografische Karten',
      },
    ],
  });
});

/**
 * POST /api/maps/download
 * Trigger download of a specific map source
 */
router.post('/download', async (req, res) => {
  try {
    const { sourceId } = req.body;

    if (!sourceId) {
      return res
        .status(400)
        .json({ success: false, error: 'sourceId required' });
    }

    // Run download in background
    runPythonScript(['download', sourceId])
      .then((result) => {
        console.log('Map download completed:', sourceId);
      })
      .catch((error) => {
        console.error('Map download failed:', error);
      });

    res.json({
      success: true,
      message: `Download started for ${sourceId}`,
      sourceId,
    });
  } catch (error) {
    console.error('Error triggering download:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/maps/download-auto
 * Trigger automatic downloads (priority 1 sources)
 */
router.post('/download-auto', async (req, res) => {
  try {
    // Run auto-download in background
    runPythonScript(['auto'])
      .then((result) => {
        console.log('Auto-download completed');
      })
      .catch((error) => {
        console.error('Auto-download failed:', error);
      });

    res.json({
      success: true,
      message: 'Automatic map downloads started',
    });
  } catch (error) {
    console.error('Error triggering auto-download:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/maps/:sourceId
 * Delete a downloaded map dataset
 */
router.delete('/:sourceId', async (req, res) => {
  try {
    const { sourceId } = req.params;
    await ensureDataDir();

    // Find and delete related files
    const files = await fs.readdir(DATA_DIR);
    let deleted = 0;

    for (const file of files) {
      if (file.startsWith(sourceId)) {
        const filePath = path.join(DATA_DIR, file);
        await fs.unlink(filePath);
        deleted++;
      }
    }

    res.json({
      success: true,
      message: `Deleted ${deleted} files for ${sourceId}`,
      deleted,
    });
  } catch (error) {
    console.error('Error deleting map:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/maps/list
 * List all available sources
 */
router.get('/list', (req, res) => {
  res.json({
    success: true,
    message: 'Available map sources',
    sources: [
      {
        id: 'gebco_europe_tile',
        name: 'GEBCO 2026 Europa',
        type: 'bathymetry',
        priority: 1,
      },
      {
        id: 'eu_dem_25m',
        name: 'EU-DEM 25m',
        type: 'dem',
        priority: 2,
      },
      {
        id: 'copernicus_dem_30',
        name: 'Copernicus DEM 30m',
        type: 'dem',
        priority: 2,
      },
      {
        id: 'osm_germany_pbf',
        name: 'OSM Deutschland',
        type: 'vector',
        priority: 3,
      },
      {
        id: 'opentopomap',
        name: 'OpenTopoMap',
        type: 'topographic',
        priority: 5,
      },
      {
        id: 'wms_nrw_dtk',
        name: 'WMS NRW DTK',
        type: 'wms',
        priority: 6,
      },
    ],
  });
});

module.exports = router;
