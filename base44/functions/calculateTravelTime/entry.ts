import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Auth check
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { fromLat, fromLon, toLat, toLon } = await req.json();

    if (!fromLat || !fromLon || !toLat || !toLon) {
      return Response.json({ 
        error: 'Missing coordinates' 
      }, { status: 400 });
    }

    const apiKey = Deno.env.get('OPEN_ROUTE_SERVICE_API_KEY');
    
    if (!apiKey) {
      return Response.json({ 
        error: 'API key not configured' 
      }, { status: 500 });
    }

    // OpenRouteService Directions API
    const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${apiKey}&start=${fromLon},${fromLat}&end=${toLon},${toLat}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error('OpenRouteService error:', await response.text());
      return Response.json({ 
        error: 'Failed to calculate route' 
      }, { status: 500 });
    }

    const data = await response.json();
    
    const route = data.features?.[0];
    if (!route) {
      return Response.json({ 
        error: 'No route found' 
      }, { status: 404 });
    }

    const durationSeconds = route.properties.segments[0].duration;
    const distanceMeters = route.properties.segments[0].distance;

    return Response.json({
      duration_seconds: durationSeconds,
      duration_minutes: Math.round(durationSeconds / 60),
      distance_km: (distanceMeters / 1000).toFixed(1),
      distance_meters: distanceMeters
    });

  } catch (error) {
    console.error('Travel time calculation error:', error);
    return Response.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
});