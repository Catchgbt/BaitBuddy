import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { bounds } = await req.json();

        if (!bounds || !bounds.north || !bounds.south || !bounds.east || !bounds.west) {
            return Response.json({ error: 'Bounds required' }, { status: 400 });
        }

        const overpassQuery = `
[out:json][timeout:60];
(
  way["waterway"~"river|canal"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
  relation["waterway"~"river|canal"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
  way["natural"="water"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
  relation["natural"="water"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
  way["landuse"="reservoir"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
  relation["landuse"="reservoir"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
);
out geom;
`;

        let data = { elements: [] };
        try {
            const response = await fetch('https://overpass-api.de/api/interpreter', {
                method: 'POST',
                body: overpassQuery,
                headers: { 'Content-Type': 'text/plain' },
                signal: AbortSignal.timeout(30000)
            });

            if (response.ok) {
                data = await response.json();
            }
        } catch (err) {
            console.warn('Overpass API unavailable:', err.message);
        }
        
        const elements = data.elements || [];

        const features = [];

        for (const el of elements) {
            const tags = el.tags || {};
            const name = tags.name;
            
            if (!name) continue;

            let typ = 'lake';
            if (tags.waterway) {
                typ = tags.waterway === 'river' ? 'river' : 'canal';
            } else if (tags.landuse === 'reservoir') {
                typ = 'reservoir';
            }

            const geom = el.geometry;
            if (!geom || geom.length < 2) continue;

            const coords = geom.map(p => [p.lon, p.lat]);
            
            const xs = geom.map(p => p.lon);
            const ys = geom.map(p => p.lat);
            const centerLon = xs.reduce((a, b) => a + b, 0) / xs.length;
            const centerLat = ys.reduce((a, b) => a + b, 0) / ys.length;

            let geometry;
            if (typ === 'river' || typ === 'canal') {
                geometry = {
                    type: 'LineString',
                    coordinates: coords
                };
            } else {
                geometry = {
                    type: 'Polygon',
                    coordinates: [coords]
                };
            }

            features.push({
                type: 'Feature',
                properties: {
                    id: `osm_${el.id}`,
                    name,
                    typ,
                    osm_id: el.id
                },
                geometry,
                center: { lat: centerLat, lng: centerLon }
            });
        }

        return Response.json({ 
            type: 'FeatureCollection',
            features 
        });

    } catch (error) {
        console.error('Error loading water bodies:', error);
        return Response.json({ 
            type: 'FeatureCollection',
            features: []
        }, { status: 200 });
    }
});