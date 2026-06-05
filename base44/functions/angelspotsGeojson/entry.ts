import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Lade alle FishingClubs aus der Datenbank
    const fishingClubs = await base44.asServiceRole.entities.FishingClub.list();
    
    console.log(`Loaded ${fishingClubs.length} fishing clubs from database`);
    
    // GeoJSON Features erstellen
    const features = [];
    
    for (const club of fishingClubs) {
      // Prüfe ob Koordinaten vorhanden sind
      if (club.coordinates && club.coordinates.lat && club.coordinates.lng) {
        features.push({
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [club.coordinates.lng, club.coordinates.lat]
          },
          properties: {
            id: club.id,
            name: club.name,
            category: club.category || "club",
            address: club.address || {},
            website: club.website || null,
            phone: club.phone || null,
            email: club.email || null,
            source: club.source || "database",
            is_validated: club.is_validated || false,
            updated_at: club.updated_date || club.created_date
          }
        });
      } else {
        console.warn(`Club ${club.name} has no valid coordinates`);
      }
    }
    
    // GeoJSON FeatureCollection erstellen
    const geojson = {
      type: "FeatureCollection",
      features: features,
      metadata: {
        generated_at: new Date().toISOString(),
        total_features: features.length,
        clubs: features.filter(f => f.properties.category === "club").length,
        spots: features.filter(f => f.properties.category === "spot").length
      }
    };
    
    return Response.json(geojson, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=3600', // 1 Stunde Cache
        'Access-Control-Allow-Origin': '*'
      }
    });
    
  } catch (error) {
    console.error("Error generating GeoJSON:", error);
    
    // Fallback: Leeres GeoJSON
    const fallback = {
      type: "FeatureCollection",
      features: [],
      metadata: {
        generated_at: new Date().toISOString(),
        error: error.message || "Failed to generate data"
      }
    };
    
    return Response.json(fallback, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
});