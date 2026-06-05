import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Geocodes all FishingClubs that are missing coordinates.
// Uses OpenStreetMap Nominatim (free, no key required).
// Rate-limited to ~1 request/sec to comply with Nominatim usage policy.

async function nominatimQuery(query) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'CatchGBT/1.0 (fishing app geocoder)',
      'Accept': 'application/json'
    }
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) return null;
  const lat = parseFloat(data[0].lat);
  const lng = parseFloat(data[0].lon);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return { lat, lng };
}

async function geocodeClub(club) {
  const address = club.address || {};
  const addrParts = [address.street, address.postal_code, address.city, address.country]
    .filter(p => p && String(p).trim().length > 0);

  // Try 1: full address
  if (addrParts.length > 0) {
    const result = await nominatimQuery(addrParts.join(', '));
    if (result) return result;
  }

  // Try 2: name + city/country
  if (club.name) {
    const cityParts = [address.city, address.country].filter(p => p && String(p).trim().length > 0);
    const q = cityParts.length > 0 ? `${club.name}, ${cityParts.join(', ')}` : `${club.name}, Deutschland`;
    await new Promise(r => setTimeout(r, 1100));
    const result = await nominatimQuery(q);
    if (result) return result;
  }

  return null;
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const batchSize = Math.min(Math.max(parseInt(body.batchSize) || 40, 1), 100);

    const allClubs = await base44.asServiceRole.entities.FishingClub.list('-created_date', 5000);
    const missing = allClubs.filter(c =>
      (!c.coordinates || c.coordinates.lat == null || c.coordinates.lng == null) &&
      !c.geocoded_at
    );
    const batch = missing.slice(0, batchSize);

    let updated = 0;
    let failed = 0;
    const failures = [];

    for (const club of batch) {
      try {
        const coords = await geocodeClub(club);
        if (coords) {
          await base44.asServiceRole.entities.FishingClub.update(club.id, {
            coordinates: coords,
            geocoded_at: new Date().toISOString()
          });
          updated++;
        } else {
          // Mark as attempted so we don't keep retrying
          await base44.asServiceRole.entities.FishingClub.update(club.id, {
            geocoded_at: new Date().toISOString()
          });
          failed++;
          failures.push({ id: club.id, name: club.name, reason: 'no_result' });
        }
      } catch (err) {
        failed++;
        failures.push({ id: club.id, name: club.name, reason: err.message });
      }
      // Nominatim policy: max 1 request/sec
      await sleep(1100);
    }

    return Response.json({
      total_clubs: allClubs.length,
      missing_before: missing.length,
      processed: batch.length,
      updated,
      failed,
      remaining: missing.length - updated,
      failures: failures.slice(0, 20)
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});