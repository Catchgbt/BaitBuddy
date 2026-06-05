import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

// Geocoding mit Nominatim (OpenStreetMap)
async function geocodeAddress(address) {
  if (!address) return null;
  
  try {
    const addressString = typeof address === 'string' ? address : 
      `${address.street || ''} ${address.city || ''} ${address.country || 'Deutschland'}`.trim();
    
    if (!addressString) return null;
    
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressString)}&limit=1&countrycodes=de`
    );
    
    const data = await response.json();
    
    if (data && data.length > 0) {
      return {
        lng: parseFloat(data[0].lon),
        lat: parseFloat(data[0].lat)
      };
    }
  } catch (error) {
    console.warn(`Geocoding failed for address: ${address}`, error);
  }
  
  return null;
}

// Sample data - in production würden diese aus einer Datenbank kommen
const communityEntities = [
  {
    "name": "Angelsport-Verein München e.V.",
    "address": {
      "street": "Münchener Straße 15",
      "city": "München",
      "country": "DE"
    },
    "website": "https://asv-muenchen.de"
  },
  {
    "name": "Berliner Angler-Verband e.V.",
    "address": {
      "street": "Unter den Linden 42",
      "city": "Berlin",
      "country": "DE"
    },
    "website": "https://berliner-angler.de"
  },
  {
    "name": "Hamburger Sportfischer-Verein",
    "address": {
      "street": "Hafenstraße 123",
      "city": "Hamburg",
      "country": "DE"
    },
    "website": "https://hsv-angler.de"
  },
  {
    "name": "Fischereiverein Dresden e.V.",
    "address": {
      "street": "Elbufer 45",
      "city": "Dresden",
      "country": "DE"
    },
    "website": "https://fv-dresden.de"
  },
  {
    "name": "Anglerverband Köln",
    "address": {
      "street": "Rheinufer 78",
      "city": "Köln",
      "country": "DE"
    },
    "website": "https://av-koeln.de"
  }
];

const nextSpots = [
  {
    "name": "Angelpark Forellenhof",
    "address": {
      "street": "Waldweg 7",
      "city": "Bad Homburg",
      "country": "DE"
    },
    "website": "https://forellenhof-badhomburg.de"
  },
  {
    "name": "Rhein-Angelpark Düsseldorf",
    "address": {
      "street": "Am Rheinufer 89",
      "city": "Düsseldorf",
      "country": "DE"
    },
    "website": "https://rhein-angelpark.de"
  },
  {
    "name": "Forellenteich Bavaria",
    "address": {
      "street": "Seestraße 23",
      "city": "Garmisch-Partenkirchen",
      "country": "DE"
    },
    "website": "https://forellenteich-bavaria.de"
  },
  {
    "name": "Angelpark Elbe",
    "address": {
      "street": "Elbstraße 56",
      "city": "Magdeburg",
      "country": "DE"
    },
    "website": "https://angelpark-elbe.de"
  }
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Alle Daten sammeln und normalisieren
    const allEntities = [
      ...communityEntities.map(entity => ({
        ...entity,
        category: "club",
        source: "community_entities"
      })),
      ...nextSpots.map(entity => ({
        ...entity,
        category: "spot", 
        source: "next_spots"
      }))
    ];
    
    // GeoJSON Features erstellen
    const features = [];
    
    for (let i = 0; i < allEntities.length; i++) {
      const entity = allEntities[i];
      
      // Koordinaten durch Geocoding ermitteln
      const coords = await geocodeAddress(entity.address);
      
      if (coords) {
        features.push({
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [coords.lng, coords.lat]
          },
          properties: {
            id: `${entity.category}_${i + 1}`,
            name: entity.name,
            category: entity.category,
            address: entity.address,
            website: entity.website || null,
            source: entity.source,
            updated_at: new Date().toISOString().split('T')[0]
          }
        });
      } else {
        console.warn(`Keine Koordinaten für ${entity.name} gefunden`);
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
        error: "Failed to generate data"
      }
    };
    
    return Response.json(fallback, {
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
});