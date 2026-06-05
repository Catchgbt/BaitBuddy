import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

// Proxy für Bathymetrie-Tiles (CORS-Umgehung)
// Unterstützt verschiedene Tile-Provider:
// - GEBCO (General Bathymetric Chart of the Oceans)
// - EMODnet (European Marine Observation and Data Network)
// - NOAA (National Oceanic and Atmospheric Administration)

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Optional: Auth prüfen für API-Rate-Limiting
    const isAuth = await base44.auth.isAuthenticated();
    
    const url = new URL(req.url);
    const provider = url.searchParams.get('provider') || 'gebco';
    const z = url.searchParams.get('z');
    const x = url.searchParams.get('x');
    const y = url.searchParams.get('y');

    if (!z || !x || !y) {
      return Response.json({ error: 'Missing z, x, or y parameter' }, { status: 400 });
    }

    // Tile-Provider URLs
    const providers = {
      // GEBCO - Globale Bathymetrie (frei verfügbar)
      gebco: `https://tiles.arcgis.com/tiles/C8EMgrsFcRFL6LrL/arcgis/rest/services/GEBCO_basemap_NCEI/MapServer/tile/${z}/${y}/${x}`,
      
      // OpenSeaMap - Alternative (fokussiert auf Navigation)
      openseamap: `https://tiles.openseamap.org/seamark/${z}/${x}/${y}.png`,
      
      // NOAA - US-Gewässer (hohe Auflösung)
      noaa: `https://gis.ngdc.noaa.gov/arcgis/rest/services/web_mercator/etopo1_hillshade/MapServer/tile/${z}/${y}/${x}`,
    };

    const tileUrl = providers[provider];
    
    if (!tileUrl) {
      return Response.json({ error: 'Unknown provider' }, { status: 400 });
    }

    // Tile vom Provider abrufen
    const tileResponse = await fetch(tileUrl, {
      headers: {
        'User-Agent': 'CatchGbt-AR-App/1.0',
        'Accept': 'image/png,image/jpeg,image/*',
      },
    });

    if (!tileResponse.ok) {
      console.error(`Tile fetch failed: ${tileResponse.status} ${tileResponse.statusText}`);
      return Response.json({ 
        error: 'Tile not available',
        status: tileResponse.status 
      }, { status: 404 });
    }

    const imageData = await tileResponse.arrayBuffer();

    // CORS-Header setzen und Bild zurückgeben
    return new Response(imageData, {
      status: 200,
      headers: {
        'Content-Type': tileResponse.headers.get('Content-Type') || 'image/png',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'public, max-age=86400', // 24h Cache
      },
    });

  } catch (error) {
    console.error('Bathymetry Proxy Error:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});