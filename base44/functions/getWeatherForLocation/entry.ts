import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { latitude, longitude, spotName } = await req.json();

    if (!latitude || !longitude) {
      return Response.json({ 
        error: 'Latitude und Longitude sind erforderlich' 
      }, { status: 400 });
    }

    // Open-Meteo API für Wetterdaten
    const weatherUrl = new URL('https://api.open-meteo.com/v1/forecast');
    weatherUrl.searchParams.set('latitude', latitude.toString());
    weatherUrl.searchParams.set('longitude', longitude.toString());
    weatherUrl.searchParams.set('current', 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m,visibility');
    weatherUrl.searchParams.set('hourly', 'temperature_2m,precipitation_probability,weather_code');
    weatherUrl.searchParams.set('daily', 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,uv_index_max');
    weatherUrl.searchParams.set('timezone', 'auto');

    const weatherResponse = await fetch(weatherUrl.toString());
    
    if (!weatherResponse.ok) {
      return Response.json({ 
        error: 'Fehler beim Abrufen der Wetterdaten' 
      }, { status: 500 });
    }

    const weatherData = await weatherResponse.json();

    // Wetter-Code interpretieren
    const getWeatherDescription = (code) => {
      if ([0, 1].includes(code)) return "Sonnig & klar";
      if ([2, 3].includes(code)) return "Teilweise bewölkt";
      if ([45, 48].includes(code)) return "Nebelig";
      if ([51, 53, 55].includes(code)) return "Leichter Nieselregen";
      if ([61, 63, 65].includes(code)) return "Regen";
      if ([71, 73, 75, 77].includes(code)) return "Schneefall";
      if ([80, 81, 82].includes(code)) return "Schauer";
      if ([95, 96, 99].includes(code)) return "Gewitter";
      return "Wechselhaft";
    };

    // Angel-Bedingungen bewerten
    const current = weatherData.current;
    let fishingScore = 0;
    const fishingFactors = [];

    if (current.pressure_msl > 1020) {
      fishingScore += 2;
      fishingFactors.push("Stabiler Hochdruck (gut)");
    } else if (current.pressure_msl < 1000) {
      fishingScore += 3;
      fishingFactors.push("Tiefdruck - Fische sehr aktiv!");
    } else {
      fishingScore += 1;
      fishingFactors.push("Normaler Luftdruck");
    }

    if (current.wind_speed_10m < 5) {
      fishingScore += 2;
      fishingFactors.push("Wenig Wind (optimal)");
    } else if (current.wind_speed_10m > 15) {
      fishingScore -= 1;
      fishingFactors.push("Starker Wind (erschwert)");
    } else {
      fishingScore += 1;
      fishingFactors.push("Mäßiger Wind");
    }

    if (current.cloud_cover > 50 && current.cloud_cover < 90) {
      fishingScore += 1;
      fishingFactors.push("Gute Bewölkung");
    }

    if (current.temperature_2m >= 10 && current.temperature_2m <= 22) {
      fishingScore += 1;
      fishingFactors.push("Optimale Temperatur");
    }

    let fishingCondition = "Schwierig";
    if (fishingScore >= 5) fishingCondition = "Ausgezeichnet";
    else if (fishingScore >= 3) fishingCondition = "Gut";
    else if (fishingScore >= 1) fishingCondition = "Mittel";

    const result = {
      location: {
        latitude,
        longitude,
        spotName: spotName || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
      },
      current: {
        temperature: Math.round(current.temperature_2m),
        feels_like: Math.round(current.apparent_temperature),
        humidity: current.relative_humidity_2m,
        pressure: Math.round(current.pressure_msl),
        wind_speed: Math.round(current.wind_speed_10m * 3.6), // m/s zu km/h
        wind_gusts: Math.round(current.wind_gusts_10m * 3.6),
        wind_direction: current.wind_direction_10m,
        cloud_cover: current.cloud_cover,
        visibility: Math.round(current.visibility / 1000), // Meter zu Kilometer
        precipitation: current.precipitation || 0,
        weather_description: getWeatherDescription(current.weather_code)
      },
      forecast: {
        today: {
          max_temp: Math.round(weatherData.daily.temperature_2m_max[0]),
          min_temp: Math.round(weatherData.daily.temperature_2m_min[0]),
          precipitation_probability: weatherData.daily.precipitation_probability_max[0],
          precipitation_sum: weatherData.daily.precipitation_sum[0],
          uv_index: weatherData.daily.uv_index_max[0]
        },
        next_hours: weatherData.hourly.temperature_2m.slice(0, 6).map((temp, i) => ({
          hour: i,
          temperature: Math.round(temp),
          precipitation_probability: weatherData.hourly.precipitation_probability[i]
        }))
      },
      fishing: {
        condition: fishingCondition,
        score: fishingScore,
        factors: fishingFactors,
        recommendation: fishingScore >= 4 
          ? "Perfekte Bedingungen zum Angeln! Nutze die Gelegenheit." 
          : fishingScore >= 2
          ? "Gute Bedingungen. Ein Versuch lohnt sich!"
          : "Bedingungen sind nicht ideal, aber mit der richtigen Technik kann es trotzdem klappen."
      }
    };

    return Response.json(result);

  } catch (error) {
    console.error('Fehler in getWeatherForLocation:', error);
    return Response.json({ 
      error: error.message || 'Interner Serverfehler' 
    }, { status: 500 });
  }
});