import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { latitude, longitude, spotName, spotId, saveHistory } = await req.json();

    if (!latitude || !longitude) {
      return Response.json({ error: 'Missing coordinates' }, { status: 400 });
    }

    // Parallel: Wetter + Satellitendaten
    const [weatherData, satelliteData] = await Promise.allSettled([
      fetchWeatherData(latitude, longitude),
      base44.functions.invoke('getSatelliteData', { latitude, longitude })
    ]);

    const weather = weatherData.status === 'fulfilled' ? weatherData.value : null;
    const satellite = satelliteData.status === 'fulfilled' ? satelliteData.value?.data : null;

    if (!weather) {
      throw new Error('Failed to fetch weather data');
    }

    const airTemp = weather.current.temperature_2m;
    const waterTemp = satellite?.satellite_sst || estimateWaterTemp(airTemp);
    const waveHeight = weather.marine?.wave_height || 0;
    const visibility = estimateVisibility(waveHeight, satellite?.turbidity_ntu);
    
    const qualityScore = calculateQualityScore(
      waterTemp, 
      waveHeight, 
      weather.current.wind_speed_10m,
      satellite?.chlorophyll_a,
      satellite?.turbidity_ntu
    );
    
    const fishingForecast = generateFishingForecast(
      waterTemp, 
      weather.current.weather_code, 
      weather.current.wind_speed_10m,
      satellite?.chlorophyll_a,
      satellite?.algae_risk
    );
    
    const weatherImpact = calculateWeatherImpact(weather.current.weather_code, weather.current.wind_speed_10m);
    const recommendations = generateRecommendations(
      waterTemp, 
      waveHeight, 
      weather.current.wind_speed_10m,
      satellite?.chlorophyll_a,
      satellite?.turbidity_ntu
    );

    const result = {
      temperature: waterTemp,
      satellite_sst: satellite?.satellite_sst || null,
      chlorophyll_a: satellite?.chlorophyll_a || null,
      turbidity_ntu: satellite?.turbidity_ntu || null,
      algae_risk: satellite?.algae_risk || null,
      wind_speed: weather.current.wind_speed_10m,
      wind_direction: weather.current.wind_direction_10m,
      wave_height: waveHeight,
      visibility: visibility,
      quality_score: qualityScore,
      fishing_forecast: fishingForecast,
      weather_condition: getWeatherDescription(weather.current.weather_code),
      weather_impact: weatherImpact,
      recommendations: recommendations,
      satellite_data_available: satellite?.satellite_data_available || false,
      data_sources: satellite?.data_sources || {},
      raw_data: {
        weather: weather.current,
        satellite: satellite
      }
    };

    // Speichere Historie wenn gewünscht
    if (saveHistory !== false) {
      try {
        await base44.entities.WaterAnalysisHistory.create({
          spot_id: spotId || null,
          spot_name: spotName || 'Unbekannter Ort',
          latitude: latitude,
          longitude: longitude,
          temperature: waterTemp,
          satellite_sst: satellite?.satellite_sst || null,
          chlorophyll_a: satellite?.chlorophyll_a || null,
          turbidity_ntu: satellite?.turbidity_ntu || null,
          algae_risk: satellite?.algae_risk || null,
          wind_speed: weather.current.wind_speed_10m,
          wind_direction: weather.current.wind_direction_10m,
          wave_height: waveHeight,
          visibility: visibility,
          quality_score: qualityScore,
          weather_impact: weatherImpact,
          weather_condition: getWeatherDescription(weather.current.weather_code),
          fishing_forecast: fishingForecast,
          satellite_data_available: satellite?.satellite_data_available || false,
          analyzed_at: new Date().toISOString()
        });
      } catch (historyError) {
        console.error('Failed to save history:', historyError);
      }
    }

    return Response.json(result);

  } catch (error) {
    console.error('Water Data Error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});

async function fetchWeatherData(lat, lon) {
  const marineUrl = `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}&current=wave_height,wave_direction,wave_period&timezone=auto`;
  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,wind_speed_10m,wind_direction_10m,weather_code&timezone=auto`;

  const [marineRes, weatherRes] = await Promise.all([
    fetch(marineUrl),
    fetch(weatherUrl)
  ]);

  const marine = await marineRes.json();
  const weather = await weatherRes.json();

  return {
    current: weather.current,
    marine: marine.current
  };
}

function estimateWaterTemp(airTemp) {
  const offset = airTemp > 20 ? 3 : 2;
  return Math.round(Math.max(4, airTemp - offset));
}

function estimateVisibility(waveHeight, turbidity) {
  let baseVisibility = 5;
  
  // Wellenhöhe reduziert Sicht
  if (waveHeight > 1.0) baseVisibility -= 2;
  else if (waveHeight > 0.6) baseVisibility -= 1;
  
  // Trübung reduziert Sicht
  if (turbidity) {
    if (turbidity > 20) baseVisibility = Math.min(baseVisibility, 1);
    else if (turbidity > 10) baseVisibility = Math.min(baseVisibility, 2);
    else if (turbidity > 5) baseVisibility = Math.min(baseVisibility, 3);
  }
  
  return Math.max(1, baseVisibility);
}

function calculateQualityScore(waterTemp, waveHeight, windSpeed, chlorophyll, turbidity) {
  let score = 70;

  // Temperatur
  if (waterTemp >= 15 && waterTemp <= 22) score += 15;
  else if (waterTemp >= 10 && waterTemp <= 25) score += 5;
  else score -= 10;

  // Wellen
  if (waveHeight < 0.5) score += 10;
  else if (waveHeight > 1.5) score -= 15;

  // Wind
  if (windSpeed < 3) score += 5;
  else if (windSpeed > 8) score -= 10;

  // Chlorophyll (Produktivität)
  if (chlorophyll) {
    if (chlorophyll > 2 && chlorophyll < 8) score += 10; // Optimale Produktivität
    else if (chlorophyll > 15) score -= 15; // Algenblüte
  }

  // Trübung
  if (turbidity) {
    if (turbidity < 5) score += 5; // Klares Wasser
    else if (turbidity > 15) score -= 10; // Sehr trüb
  }

  return Math.max(0, Math.min(100, score));
}

function generateFishingForecast(waterTemp, weatherCode, windSpeed, chlorophyll, algaeRisk) {
  const forecasts = [];

  if (waterTemp >= 15 && waterTemp <= 20) {
    forecasts.push("Optimale Wassertemperatur für Raubfische");
  } else if (waterTemp < 10) {
    forecasts.push("Niedrige Wassertemperatur - Fische sind weniger aktiv");
  } else if (waterTemp > 25) {
    forecasts.push("Hohe Wassertemperatur - Morgen-/Abenddämmerung bevorzugen");
  }

  if (windSpeed < 3) {
    forecasts.push("Ruhige Bedingungen ideal für Oberflächenköder");
  } else if (windSpeed > 7) {
    forecasts.push("Starker Wind - Tiefere Gewässerbereiche bevorzugen");
  }

  if (weatherCode === 0 || weatherCode === 1) {
    forecasts.push("Klare Sicht - Natürliche Köderfarben empfohlen");
  } else if ([61, 63, 65, 80, 81, 82].includes(weatherCode)) {
    forecasts.push("Regen erhöht Fischaktivität - Gute Fangchancen");
  }

  // Satellitendaten-basierte Prognosen
  if (chlorophyll && chlorophyll > 3 && chlorophyll < 10) {
    forecasts.push("Gute Nahrungsgrundlage - Erhöhte Fischaktivität erwartet");
  }

  if (algaeRisk === 'high') {
    forecasts.push("⚠️ Algenblüte-Warnung - Sauerstoffmangel möglich");
  }

  return forecasts.length > 0 ? forecasts.join(" | ") : "Durchschnittliche Fangbedingungen";
}

function calculateWeatherImpact(weatherCode, windSpeed) {
  let impact = 50;

  if (weatherCode === 0 || weatherCode === 1) impact += 10;
  else if ([61, 63, 80, 81].includes(weatherCode)) impact += 20;
  else if (weatherCode >= 95) impact -= 30;

  if (windSpeed < 4) impact += 10;
  else if (windSpeed > 8) impact -= 20;

  return Math.max(0, Math.min(100, impact));
}

function getWeatherDescription(code) {
  const descriptions = {
    0: "Klar", 1: "Leicht bewölkt", 2: "Teilweise bewölkt", 3: "Bewölkt",
    45: "Nebel", 48: "Gefrierender Nebel", 51: "Leichter Nieselregen",
    61: "Leichter Regen", 63: "Mäßiger Regen", 65: "Starker Regen",
    80: "Regenschauer", 95: "Gewitter"
  };
  return descriptions[code] || "Variabel";
}

function generateRecommendations(waterTemp, waveHeight, windSpeed, chlorophyll, turbidity) {
  const recommendations = [];

  if (waterTemp >= 15 && waterTemp <= 20) {
    recommendations.push({
      icon: "🎣",
      title: "Aktive Köderführung",
      description: "Ideale Temperatur für aggressive Köderpräsentation"
    });
  } else if (waterTemp < 12) {
    recommendations.push({
      icon: "🐌",
      title: "Langsame Köderführung",
      description: "Niedrige Temperaturen erfordern langsamere Bewegungen"
    });
  }

  if (waveHeight < 0.4) {
    recommendations.push({
      icon: "🎯",
      title: "Präzises Angeln",
      description: "Ruhige Bedingungen ermöglichen gezielte Würfe"
    });
  }

  if (windSpeed > 6) {
    recommendations.push({
      icon: "⚓",
      title: "Windgeschützte Bereiche",
      description: "Starker Wind - fische in windgeschützten Buchten"
    });
  }

  // Satellitendaten-basierte Empfehlungen
  if (chlorophyll && chlorophyll < 2) {
    recommendations.push({
      icon: "🔍",
      title: "Klares Wasser - Vorsicht",
      description: "Niedrige Produktivität - Fische sind vorsichtiger"
    });
  }

  if (turbidity && turbidity > 10) {
    recommendations.push({
      icon: "🌫️",
      title: "Trübes Wasser - Kontrast",
      description: "Verwende auffällige, kontrastreiche Köder"
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      icon: "📍",
      title: "Standard-Taktik",
      description: "Normale Bedingungen - bewährte Methoden anwenden"
    });
  }

  return recommendations;
}